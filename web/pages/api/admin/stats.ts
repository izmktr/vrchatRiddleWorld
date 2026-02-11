import type { NextApiRequest, NextApiResponse } from 'next'
import clientPromise from '@/lib/mongodb'
import { checkApiAdminAccess } from '@/lib/auth'
import { getWorldsCacheInfo } from '@/lib/worldsCache'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
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

    const totalUsers = await usersCollection.countDocuments({})
    const cacheInfo = getWorldsCacheInfo()

    res.status(200).json({
      totalUsers,
      lastWorldsCacheAt: cacheInfo.lastUpdatedAt
        ? new Date(cacheInfo.lastUpdatedAt).toISOString()
        : null
    })
  } catch (error) {
    console.error('Admin stats API error:', error)
    res.status(500).json({ error: 'Internal Server Error' })
  }
}
