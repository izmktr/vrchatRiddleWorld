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
    const session = await checkApiAdminAccess(req, res)
    
    if (!session) {
      return
    }

    if (req.method !== 'GET') {
      res.setHeader('Allow', ['GET'])
      return res.status(405).end(`Method ${req.method} Not Allowed`)
    }

    const { page = 1, limit = 12, search, sort = 'updated_at', tagId } = req.query
    
    const client = await clientPromise
    const db = client.db(process.env.MONGODB_DB_NAME || 'vrcworld')
    const worldsCollection = db.collection(process.env.MONGODB_COLLECTION_NAME || 'worlds')
    const worldTagsCollection = db.collection('worlds_tag')

    // タグIDでフィルタリングする場合、該当するワールドIDを取得
    let worldIdsForTag: string[] | null = null
    if (tagId && typeof tagId === 'string') {
      const worldTagsWithTag = await worldTagsCollection
        .find({ tagId: tagId })
        .toArray()
      worldIdsForTag = worldTagsWithTag.map(wt => wt.worldId)
    }

    // クエリ条件を構築
    let query: any = {}
    
    // タグによる絞り込み
    if (worldIdsForTag !== null) {
      query.world_id = { $in: worldIdsForTag }
    }
    
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

    // ソート条件を決定
    let sortOption: any = { updated_at: -1 }
    if (sort === 'created_at') sortOption = { created_at: -1 }
    if (sort === 'visits') sortOption = { visits: -1 }
    if (sort === 'favorites') sortOption = { favorites: -1 }

    // ワールド一覧を取得
    const worlds = await worldsCollection
      .find(query)
      .sort(sortOption)
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

    // 各ワールドに付与されているタグ情報を取得
    const systemTagsCollection = db.collection('system_taglist') // 修正: system_tags -> system_taglist
    const worldsWithTags = await Promise.all(
      worlds.map(async (world) => {
        // ワールドに付与されているタグを取得
        const worldTags = await worldTagsCollection
          .find({ worldId: world.world_id })
          .toArray()

        // タグの詳細情報を取得
        const tagIds = worldTags.map(wt => wt.tagId)

        const tagDetails = await systemTagsCollection
          .find({ _id: { $in: tagIds.map(id => typeof id === 'string' ? new ObjectId(id) : id) } })
          .toArray()

        const tags = worldTags.map(wt => {
          const tagInfo = tagDetails.find(td => td._id.toString() === wt.tagId.toString())
          return {
            tagId: wt.tagId,
            tagName: tagInfo?.tagName || 'Unknown',
            tagDescription: tagInfo?.tagDescription || '',
            assignedAt: wt.assignedAt
          }
        })

        return {
          id: world.world_id, // idフィールドを明示的に設定
          ...world,
          tagCount: worldTags.length,
          tags
        }
      })
    )

    // 総数を取得
    const total = await worldsCollection.countDocuments(query)

    res.status(200).json({
      worlds: worldsWithTags,
      totalCount: total,
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
