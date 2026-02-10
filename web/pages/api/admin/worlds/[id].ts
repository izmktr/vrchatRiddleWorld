import type { NextApiRequest, NextApiResponse } from 'next'
import clientPromise from '@/lib/mongodb'
import { checkApiAdminAccess } from '@/lib/auth'

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

    const { id } = req.query

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Invalid world ID' })
    }

    const client = await clientPromise
    const db = client.db(process.env.MONGODB_DB_NAME || 'vrcworld')
    const worldsCollection = db.collection(process.env.MONGODB_COLLECTION_NAME || 'worlds')
    const worldTagsCollection = db.collection('worlds_tag')

    switch (req.method) {
      case 'DELETE':
        // ワールドが存在するか確認
        const world = await worldsCollection.findOne({ world_id: id })
        
        if (!world) {
          return res.status(404).json({ error: 'World not found' })
        }

        // ワールドに紐づくタグ情報を削除
        await worldTagsCollection.deleteMany({ worldId: id })

        // ワールドを削除
        const deleteResult = await worldsCollection.deleteOne({ world_id: id })

        if (deleteResult.deletedCount === 0) {
          return res.status(404).json({ error: 'World not found' })
        }

        res.status(200).json({ 
          success: true, 
          message: 'World deleted successfully',
          worldId: id
        })
        break

      default:
        res.setHeader('Allow', ['DELETE'])
        res.status(405).end(`Method ${req.method} Not Allowed`)
    }
  } catch (error) {
    console.error('API Error:', error)
    res.status(500).json({ error: 'Internal Server Error' })
  }
}
