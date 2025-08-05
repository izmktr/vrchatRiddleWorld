import type { NextApiRequest, NextApiResponse } from 'next'
import clientPromise from '@/lib/mongodb'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    if (req.method === 'GET') {
      const { page = 1, limit = 12, tag, search, author } = req.query
      
      // MongoDB接続
      const client = await clientPromise
      const db = client.db(process.env.MONGODB_DB_NAME || 'vrcworld')
      const collection = db.collection(process.env.MONGODB_COLLECTION_NAME || 'worlds')

      // クエリ条件を構築
      let query: any = {}
      
      // タグでフィルタリング
      if (tag && tag !== 'all') {
        query.tags = { $in: [tag] }
      }
      
      // 制作者でフィルタリング
      if (author) {
        query.authorName = { $regex: `^${author}$`, $options: 'i' }
      }
      
      // 検索条件
      if (search) {
        query.$or = [
          { name: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
          { authorName: { $regex: search, $options: 'i' } }
        ]
      }

      // 総数を取得
      const total = await collection.countDocuments(query)
      
      // ページネーション
      const skip = (Number(page) - 1) * Number(limit)
      
      // データを取得（更新日時でソート）
      const worlds = await collection
        .find(query)
        .sort({ updated_at: -1 })
        .skip(skip)
        .limit(Number(limit))
        .toArray()

      // デバッグ用：最初のワールドの構造を確認
      if (worlds.length > 0) {
        console.log('First world structure:', JSON.stringify(worlds[0], null, 2))
      }

      // データをフロントエンド用に変換
      const formattedWorlds = worlds.map((world, index) => {
        try {
          // 日付フィールドの安全な処理
          const getValidDate = (dateString: any): string => {
            if (!dateString) return ''
            if (typeof dateString === 'string' && dateString.trim() === '') return ''
            try {
              const date = new Date(dateString)
              return isNaN(date.getTime()) ? '' : dateString
            } catch {
              return ''
            }
          }

          return {
            id: world.world_id || world.id, // world_idまたはidを使用
            name: world.name || '',
            imageUrl: world.imageUrl || '',
            thumbnailImageUrl: world.thumbnailImageUrl || '',
            authorName: world.authorName || '',
            tags: world.tags || [],
            created_at: getValidDate(world.created_at),
            updated_at: getValidDate(world.updated_at),
            description: world.description || '',
            visits: world.visits || 0,
            favorites: world.favorites || 0,
            popularity: world.popularity || 0,
            capacity: world.capacity || 0,
            recommendedCapacity: world.recommendedCapacity || 0,
            releaseStatus: world.releaseStatus || 'unknown'
          }
        } catch (worldError) {
          console.error(`Error processing world ${index}:`, worldError, 'World data:', world)
          return {
            id: world.world_id || world.id || `error_${index}`,
            name: 'エラー',
            imageUrl: '',
            thumbnailImageUrl: '',
            authorName: '',
            tags: [],
            created_at: '',
            updated_at: '',
            description: 'データ処理エラー',
            visits: 0,
            favorites: 0,
            popularity: 0,
            capacity: 0,
            recommendedCapacity: 0,
            releaseStatus: 'unknown'
          }
        }
      })

      res.status(200).json({
        worlds: formattedWorlds,
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit))
      })
    } else {
      res.setHeader('Allow', ['GET'])
      res.status(405).end(`Method ${req.method} Not Allowed`)
    }
  } catch (error) {
    console.error('API Error:', error)
    res.status(500).json({ error: 'Internal Server Error' })
  }
}
