import type { NextApiRequest, NextApiResponse } from 'next'
import clientPromise from '@/lib/mongodb'
import { ObjectId } from 'mongodb'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/[...nextauth]'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    if (req.method === 'GET') {
      const { page = 1, limit = 12, tag, search, author, sort = 'updated_at', userStatus } = req.query
      
      // セッション情報を取得
      const session = await getServerSession(req, res, authOptions)
      
      // MongoDB接続
      const client = await clientPromise
      const db = client.db(process.env.MONGODB_DB_NAME || 'vrcworld')
      const collection = db.collection(process.env.MONGODB_COLLECTION_NAME || 'worlds')
      const userWorldInfoCollection = db.collection('user_world_info')

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

      // ユーザーステータスでフィルタリングする場合の特別処理
      if (userStatus && userStatus !== 'all' && session?.user?.email) {
        const userStatusNum = Number(userStatus)
        
        if (userStatusNum === 0) {
          // 未選択の場合: user_world_infoに記録がないか、statusが0のワールドを取得
          const userWorlds = await userWorldInfoCollection
            .find({ user_id: session.user.email })
            .toArray()
          
          const userWorldIds = userWorlds.map(uw => uw.world_id)
          
          // user_world_infoにないワールド、または明示的にstatus=0のワールド
          const zeroStatusWorldIds = userWorlds
            .filter(uw => uw.status === 0)
            .map(uw => uw.world_id)
          
          if (userWorldIds.length > 0) {
            query.$or = [
              { world_id: { $nin: userWorldIds } },
              { world_id: { $in: zeroStatusWorldIds } }
            ]
          }
          // それ以外の既存の検索条件があれば、$andで結合
          if (search) {
            const searchQuery = query.$or
            delete query.$or
            query.$and = [
              { $or: searchQuery },
              { $or: [
                { world_id: { $nin: userWorldIds } },
                { world_id: { $in: zeroStatusWorldIds } }
              ]}
            ]
          }
        } else {
          // 特定のステータス(1-5)の場合: user_world_infoでそのステータスを持つワールドのみ
          const userWorlds = await userWorldInfoCollection
            .find({ 
              user_id: session.user.email, 
              status: userStatusNum 
            })
            .toArray()
          
          const worldIds = userWorlds.map(uw => uw.world_id)
          
          if (worldIds.length === 0) {
            // 該当するワールドがない場合、空の結果を返す
            return res.status(200).json({
              worlds: [],
              total: 0,
              page: Number(page),
              limit: Number(limit),
              totalPages: 0
            })
          }
          
          query.world_id = { $in: worldIds }
        }
      }

      // 総数を取得
      const total = await collection.countDocuments(query)
      
      // ページネーション
      const skip = (Number(page) - 1) * Number(limit)
      
      // ソート条件を決定
      let sortOption: any = { updated_at: -1 }
      if (sort === 'created_at') sortOption = { created_at: -1 }
      if (sort === 'visits') sortOption = { visits: -1 }
      if (sort === 'favorites') sortOption = { favorites: -1 }

      // データを取得
      const worlds = await collection
        .find(query)
        .sort(sortOption)
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

          // ユーザーの状態を取得（ログインしている場合のみ）
          let userStatus = null
          if (session?.user?.email) {
            const userInfo = await userWorldInfoCollection.findOne({
              user_id: session.user.email,
              world_id: world.world_id || world.id
            })
            if (userInfo) {
              userStatus = {
                status: userInfo.status,
                cleartime: userInfo.cleartime,
                vote: userInfo.vote
              }
            }
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
            visitCount: world.visits || 0,  // フロントエンド用のフィールド追加
            favoriteCount: world.favorites || 0,  // フロントエンド用のフィールド追加
            popularity: world.popularity || 0,
            capacity: world.capacity || 0,
            recommendedCapacity: world.recommendedCapacity || 0,
            releaseStatus: world.releaseStatus || 'unknown',
            source_url: world.source_url || '',
            userStatus: userStatus
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
            visitCount: 0,  // フロントエンド用のフィールド追加
            favoriteCount: 0,  // フロントエンド用のフィールド追加
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
