import type { NextApiRequest, NextApiResponse } from 'next'
import clientPromise from '@/lib/mongodb'
import { ObjectId } from 'mongodb'

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
      
      // タグでフィルタリング（システムタグ対応）
      if (tag && tag !== 'all') {
        // システムタグでフィルタリングする場合、worlds_tagコレクションを使用
        const worldTagsCollection = db.collection('worlds_tag')
        const worldsWithTag = await worldTagsCollection
          .find({ tagId: tag })
          .toArray()
        
        const worldIds = worldsWithTag.map(wt => wt.worldId)
        if (worldIds.length > 0) {
          query.world_id = { $in: worldIds }
        } else {
          // 該当するワールドがない場合
          query.world_id = { $in: [] }
        }
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
      const worldTagsCollection = db.collection('worlds_tag')
      const systemTagsCollection = db.collection('system_taglist')
      
      const formattedWorlds = await Promise.all(worlds.map(async (world, index) => {
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

          // 各ワールドのシステムタグを取得
          const worldTags = await worldTagsCollection
            .find({ worldId: world.world_id || world.id })
            .toArray()
          
          const tagIds = worldTags.map(wt => wt.tagId)
          let systemTags: any[] = []
          
          if (tagIds.length > 0) {
            systemTags = await systemTagsCollection
              .find({ _id: { $in: tagIds.map(id => typeof id === 'string' ? new ObjectId(id) : id) } })
              .toArray()
          }

          return {
            id: world.world_id || world.id, // world_idまたはidを使用
            name: world.name || '',
            imageUrl: world.imageUrl || '',
            thumbnailImageUrl: world.thumbnailImageUrl || '',
            authorName: world.authorName || '',
            tags: systemTags.map(tag => tag.tagName), // システムタグ名を配列で返す
            systemTags: systemTags.map(tag => ({
              _id: tag._id,
              tagName: tag.tagName,
              tagDescription: tag.tagDescription
            })),
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
            systemTags: [],
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
      }))

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
