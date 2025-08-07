import type { NextApiRequest, NextApiResponse } from 'next'
import clientPromise from '@/lib/mongodb'
import { checkApiAdminAccess } from '@/lib/auth'
import { ObjectId } from 'mongodb'

interface SystemTag {
  _id?: ObjectId
  tagName: string
  tagDescription: string
  priority: number
  createdAt: Date
  updatedAt: Date
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // 管理者権限チェック
    const session = await checkApiAdminAccess(req, res)
    
    // sessionがfalsy（void）の場合は既にレスポンスが送信されているので処理を終了
    if (!session) {
      return
    }

    const client = await clientPromise
    const db = client.db(process.env.MONGODB_DB_NAME || 'vrcworld')
    const collection = db.collection('system_taglist')

    switch (req.method) {
      case 'GET':
        // タグ一覧取得
        const tags = await collection
          .find({})
          .sort({ priority: 1, tagName: 1 })
          .toArray()
        
        // 各タグの使用数を取得
        const worldTagsCollection = db.collection('worlds_tag')
        const tagsWithCount = await Promise.all(
          tags.map(async (tag) => {
            const count = await worldTagsCollection.countDocuments({ 
              tagId: tag._id.toString() 
            })
            return {
              ...tag,
              count
            }
          })
        )
        
        res.status(200).json({ tags: tagsWithCount })
        break

      case 'POST':
        // 新しいタグ作成
        const { tagName, tagDescription, priority } = req.body

        if (!tagName || !tagDescription || priority === undefined) {
          return res.status(400).json({ error: 'タグ名、説明、優先度は必須です' })
        }

        // 重複チェック
        const existingTag = await collection.findOne({ tagName })
        if (existingTag) {
          return res.status(400).json({ error: 'このタグ名は既に存在します' })
        }

        const newTag: SystemTag = {
          tagName: tagName.trim(),
          tagDescription: tagDescription.trim(),
          priority: Number(priority),
          createdAt: new Date(),
          updatedAt: new Date()
        }

        const result = await collection.insertOne(newTag)
        
        res.status(201).json({ 
          message: 'タグが作成されました',
          tag: { ...newTag, _id: result.insertedId }
        })
        break

      default:
        res.setHeader('Allow', ['GET', 'POST'])
        res.status(405).end(`Method ${req.method} Not Allowed`)
    }
  } catch (error) {
    console.error('API Error:', error)
    res.status(500).json({ error: 'Internal Server Error' })
  }
}
