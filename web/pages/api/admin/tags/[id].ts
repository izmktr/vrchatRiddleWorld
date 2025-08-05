import type { NextApiRequest, NextApiResponse } from 'next'
import clientPromise from '@/lib/mongodb'
import { checkApiAdminAccess } from '@/lib/auth'
import { ObjectId } from 'mongodb'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // 管理者権限チェック
    const authResult = await checkApiAdminAccess(req, res)
    
    if (!authResult.isAuthenticated) {
      return res.status(401).json({ error: 'Not authenticated' })
    }
    
    if (!authResult.isAdmin) {
      return res.status(403).json({ error: 'Insufficient permissions' })
    }

    const { id } = req.query
    
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Invalid tag ID' })
    }

    const client = await clientPromise
    const db = client.db(process.env.MONGODB_DB_NAME || 'vrcworld')
    const collection = db.collection('system_taglist')

    switch (req.method) {
      case 'PUT':
        // タグ更新
        const { tagName, tagDescription, priority } = req.body

        if (!tagName || !tagDescription || priority === undefined) {
          return res.status(400).json({ error: 'タグ名、説明、優先度は必須です' })
        }

        // 重複チェック（自分以外で同じタグ名があるか）
        const existingTag = await collection.findOne({ 
          tagName: tagName.trim(),
          _id: { $ne: new ObjectId(id) }
        })
        
        if (existingTag) {
          return res.status(400).json({ error: 'このタグ名は既に存在します' })
        }

        const updateResult = await collection.updateOne(
          { _id: new ObjectId(id) },
          {
            $set: {
              tagName: tagName.trim(),
              tagDescription: tagDescription.trim(),
              priority: Number(priority),
              updatedAt: new Date()
            }
          }
        )

        if (updateResult.matchedCount === 0) {
          return res.status(404).json({ error: 'タグが見つかりません' })
        }

        res.status(200).json({ message: 'タグが更新されました' })
        break

      case 'DELETE':
        // タグ削除
        const deleteResult = await collection.deleteOne({ _id: new ObjectId(id) })

        if (deleteResult.deletedCount === 0) {
          return res.status(404).json({ error: 'タグが見つかりません' })
        }

        res.status(200).json({ message: 'タグが削除されました' })
        break

      default:
        res.setHeader('Allow', ['PUT', 'DELETE'])
        res.status(405).end(`Method ${req.method} Not Allowed`)
    }
  } catch (error) {
    console.error('API Error:', error)
    res.status(500).json({ error: 'Internal Server Error' })
  }
}
