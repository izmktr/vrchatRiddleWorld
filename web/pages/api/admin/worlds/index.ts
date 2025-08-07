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

    if (req.method !== 'GET') {
      res.setHeader('Allow', ['GET'])
      return res.status(405).end(`Method ${req.method} Not Allowed`)
    }

    const { page = 1, limit = 12, search } = req.query
    
    const client = await clientPromise
    const db = client.db(process.env.MONGODB_DB_NAME || 'vrcworld')
    const worldsCollection = db.collection(process.env.MONGODB_COLLECTION_NAME || 'worlds')

    // クエリ条件を構築
    let query: any = {}
    
    // 検索条件
    if (search && typeof search === 'string') {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { authorName: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ]
    }

    const pageNumber = parseInt(page as string, 10) || 1
    const limitNumber = parseInt(limit as string, 10) || 12
    const skip = (pageNumber - 1) * limitNumber

    // ワールド一覧を取得
    const worlds = await worldsCollection
      .find(query)
      .sort({ updated_at: -1 })
      .skip(skip)
      .limit(limitNumber)
      .project({
        world_id: 1,
        name: 1,
        authorName: 1,
        description: 1,
        thumbnailImageUrl: 1,
        imageUrl: 1,
        updated_at: 1,
        created_at: 1,
        visits: 1,
        favorites: 1
      })
      .toArray()

    // 各ワールドに付与されているタグ数を取得
    const worldTagsCollection = db.collection('worlds_tag')
    const worldsWithTagCounts = await Promise.all(
      worlds.map(async (world) => {
        const tagCount = await worldTagsCollection.countDocuments({ 
          worldId: world.world_id 
        })
        return {
          ...world,
          tagCount
        }
      })
    )

    // 総数を取得
    const total = await worldsCollection.countDocuments(query)

    res.status(200).json({
      worlds: worldsWithTagCounts,
      pagination: {
        current: pageNumber,
        total: Math.ceil(total / limitNumber),
        limit: limitNumber,
        totalCount: total
      }
    })
  } catch (error) {
    console.error('API Error:', error)
    res.status(500).json({ error: 'Internal Server Error' })
  }
}
