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

    const client = await clientPromise
    const db = client.db(process.env.MONGODB_DB_NAME || 'vrcworld')
    const usersCollection = db.collection('users')

    // ユーザー一覧を取得
    const users = await usersCollection
      .find({})
      .sort({ _id: -1 }) // 新しい順
      .toArray()

    // レスポンス用にデータを整形
    const formattedUsers = users.map(user => ({
      id: user._id.toString(),
      name: user.name || '',
      email: user.email || '',
      image: user.image || null,
      emailVerified: user.emailVerified || null,
      createdAt: user._id.getTimestamp().toISOString(), // ObjectIdから作成日時を取得
    }))

    res.status(200).json({
      success: true,
      users: formattedUsers,
      totalCount: formattedUsers.length
    })
  } catch (error) {
    console.error('API Error:', error)
    res.status(500).json({ error: 'Internal Server Error' })
  }
}
