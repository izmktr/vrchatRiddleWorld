import type { NextApiRequest, NextApiResponse } from 'next'
import clientPromise from '@/lib/mongodb'
import { checkApiAdminAccess } from '@/lib/auth'
import { ObjectId } from 'mongodb'

interface WorldTag {
  _id?: ObjectId
  worldId: string
  tagId: string
  tagName: string
  assignedAt: Date
  assignedBy: string
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // 管理者権限チェック
    const session = await checkApiAdminAccess(req, res)
    
    if (!session) {
      return
    }

    const { worldId } = req.query
    
    if (!worldId || typeof worldId !== 'string') {
      return res.status(400).json({ error: 'Invalid world ID' })
    }

    const client = await clientPromise
    const db = client.db(process.env.MONGODB_DB_NAME || 'vrcworld')
    const worldTagsCollection = db.collection('worlds_tag')
    const systemTagsCollection = db.collection('system_taglist')

    switch (req.method) {
      case 'GET':
        // 特定ワールドに付与されているタグ一覧を取得
        const worldTags = await worldTagsCollection.find({ worldId }).toArray()
        
        // タグ情報を含めて返す
        const tagsWithInfo = await Promise.all(
          worldTags.map(async (worldTag) => {
            const tagInfo = await systemTagsCollection.findOne({ 
              _id: new ObjectId(worldTag.tagId) 
            })
            return {
              ...worldTag,
              tagInfo
            }
          })
        )
        
        res.status(200).json({ worldTags: tagsWithInfo })
        break

      case 'POST':
        // ワールドにタグを追加
        const { tagId } = req.body

        if (!tagId) {
          return res.status(400).json({ error: 'タグIDは必須です' })
        }

        // タグの存在確認
        const tag = await systemTagsCollection.findOne({ 
          _id: new ObjectId(tagId) 
        })
        
        if (!tag) {
          return res.status(404).json({ error: 'タグが見つかりません' })
        }

        // 既に同じタグが付与されているかチェック
        const existingTag = await worldTagsCollection.findOne({
          worldId,
          tagId
        })

        if (existingTag) {
          return res.status(400).json({ error: '既にこのタグが付与されています' })
        }

        // ワールドタグを追加
        const newWorldTag: WorldTag = {
          worldId,
          tagId,
          tagName: tag.tagName,
          assignedAt: new Date(),
          assignedBy: session.user?.email || 'unknown'
        }

        const result = await worldTagsCollection.insertOne(newWorldTag)
        
        res.status(201).json({ 
          message: 'タグが追加されました',
          worldTag: { ...newWorldTag, _id: result.insertedId }
        })
        break

      case 'DELETE':
        // ワールドからタグを削除
        const { tagId: deleteTagId } = req.body

        if (!deleteTagId) {
          return res.status(400).json({ error: 'タグIDは必須です' })
        }

        const deleteResult = await worldTagsCollection.deleteOne({
          worldId,
          tagId: deleteTagId
        })

        if (deleteResult.deletedCount === 0) {
          return res.status(404).json({ error: 'タグの関連付けが見つかりません' })
        }

        res.status(200).json({ message: 'タグが削除されました' })
        break

      default:
        res.setHeader('Allow', ['GET', 'POST', 'DELETE'])
        res.status(405).end(`Method ${req.method} Not Allowed`)
    }
  } catch (error) {
    console.error('API Error:', error)
    res.status(500).json({ error: 'Internal Server Error' })
  }
}
