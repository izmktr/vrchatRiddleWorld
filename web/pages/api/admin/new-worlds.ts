import type { NextApiRequest, NextApiResponse } from 'next'
import clientPromise from '@/lib/mongodb'
import { ObjectId } from 'mongodb'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/[...nextauth]'

// 管理者権限チェック
function isAdminEmail(email?: string | null): boolean {
  if (!email) return false
  const adminEmails = process.env.ADMIN_EMAILS?.split(',').map(e => e.trim()) || []
  return adminEmails.includes(email)
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // セッション確認
    const session = await getServerSession(req, res, authOptions)
    
    if (!session?.user?.email || !isAdminEmail(session.user.email)) {
      return res.status(403).json({ error: 'Forbidden: Admin access required' })
    }

    // MongoDB接続
    const client = await clientPromise
    const db = client.db(process.env.MONGODB_DB_NAME || 'vrcworld')
    const collection = db.collection('new_worlds')

    if (req.method === 'GET') {
      // 登録済みURL一覧を取得
      const newWorlds = await collection
        .find({})
        .sort({ created_at: -1 })
        .toArray()

      res.status(200).json({
        success: true,
        data: newWorlds.map(world => ({
          _id: world._id.toString(),
          url: world.url,
          status: world.status || 'pending',
          created_at: world.created_at,
          created_by: world.created_by,
          processed_at: world.processed_at,
          error_message: world.error_message
        }))
      })
    } else if (req.method === 'POST') {
      // 新規URL追加
      const { urls } = req.body

      if (!urls || !Array.isArray(urls) || urls.length === 0) {
        return res.status(400).json({ 
          success: false, 
          error: 'URLs are required and must be an array' 
        })
      }

      // VRChatワールドURLの形式をチェック
      const vrchatUrlRegex = /^https:\/\/vrchat\.com\/home\/world\/wrld_[a-f0-9\-]+$/i
      const validUrls = []
      const invalidUrls = []

      for (const url of urls) {
        if (typeof url === 'string' && url.trim()) {
          const trimmedUrl = url.trim()
          if (vrchatUrlRegex.test(trimmedUrl)) {
            validUrls.push(trimmedUrl)
          } else {
            invalidUrls.push(trimmedUrl)
          }
        }
      }

      if (validUrls.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No valid VRChat world URLs found',
          invalidUrls
        })
      }

      // 重複チェック
      const existingUrls = await collection
        .find({ url: { $in: validUrls } })
        .toArray()

      const existingUrlSet = new Set(existingUrls.map(doc => doc.url))
      const newUrls = validUrls.filter(url => !existingUrlSet.has(url))

      // 新規URLを挿入
      const insertData = newUrls.map(url => ({
        url,
        status: 'pending',
        created_at: new Date(),
        created_by: session.user.email,
        processed_at: null,
        error_message: null
      }))

      let insertResult = null
      if (insertData.length > 0) {
        insertResult = await collection.insertMany(insertData)
      }

      res.status(200).json({
        success: true,
        data: {
          inserted: insertData.length,
          duplicates: existingUrlSet.size,
          invalid: invalidUrls.length,
          newUrls: newUrls,
          duplicateUrls: Array.from(existingUrlSet),
          invalidUrls: invalidUrls,
          insertedIds: insertResult?.insertedIds || {}
        }
      })
    } else if (req.method === 'DELETE') {
      // URL削除
      const { id } = req.body

      if (!id) {
        return res.status(400).json({ 
          success: false, 
          error: 'ID is required' 
        })
      }

      const result = await collection.deleteOne({ 
        _id: new ObjectId(id) 
      })

      if (result.deletedCount === 0) {
        return res.status(404).json({
          success: false,
          error: 'URL not found'
        })
      }

      res.status(200).json({
        success: true,
        message: 'URL deleted successfully'
      })
    } else {
      res.setHeader('Allow', ['GET', 'POST', 'DELETE'])
      res.status(405).end(`Method ${req.method} Not Allowed`)
    }
  } catch (error) {
    console.error('New worlds API error:', error)
    res.status(500).json({ 
      success: false, 
      error: 'Internal Server Error' 
    })
  }
}
