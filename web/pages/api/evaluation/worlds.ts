import type { NextApiRequest, NextApiResponse } from 'next'
import clientPromise from '@/lib/mongodb'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/[...nextauth]'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    // セッション情報を取得
    const session = await getServerSession(req, res, authOptions)
    if (!session?.user) {
      return res.status(401).json({ message: 'Unauthorized' })
    }

    // MongoDB接続
    const client = await clientPromise
    const db = client.db(process.env.MONGODB_DB_NAME || 'vrcworld')
    const collection = db.collection(process.env.MONGODB_COLLECTION_NAME || 'worlds')
    const userWorldInfoCollection = db.collection('user_world_info')

    // 全ワールドを取得（評価用なので制限なし）
    const worlds = await collection
      .find({})
      .sort({ updated_at: -1 })
      .toArray()

    // ユーザーの状態情報を一括取得
    const userWorldInfos = await userWorldInfoCollection
      .find({ user_id: session.user.email })
      .toArray()

    // ユーザー状態をマップに変換
    const userStatusMap = new Map()
    userWorldInfos.forEach(info => {
      userStatusMap.set(info.world_id, {
        status: info.status || 0,
        cleartime: info.cleartime || 0,
        vote: info.vote || 0
      })
    })

    // データをフロントエンド用に変換
    const formattedWorlds = worlds.map(world => {
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

      const userStatus = userStatusMap.get(world.world_id || world.id) || null

      return {
        id: world.world_id || world.id || world._id?.toString(),
        world_id: world.world_id || world.id,
        name: world.name || '',
        description: world.description || '',
        authorName: world.authorName || '',
        imageUrl: world.imageUrl || world.thumbnailImageUrl || '',
        visitCount: world.visits || 0,
        favoriteCount: world.favorites || 0,
        tags: world.tags || [],
        created_at: getValidDate(world.created_at),
        updated_at: getValidDate(world.updated_at),
        userStatus
      }
    })

    res.status(200).json({
      worlds: formattedWorlds,
      total: formattedWorlds.length
    })

  } catch (error) {
    console.error('Error in evaluation worlds API:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}
