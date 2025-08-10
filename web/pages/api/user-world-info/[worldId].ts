import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/[...nextauth]'
import clientPromise from '@/lib/mongodb'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const session = await getServerSession(req, res, authOptions)
    const { worldId } = req.query

    if (!worldId || typeof worldId !== 'string') {
      return res.status(400).json({ error: 'World ID is required' })
    }

    const client = await clientPromise
    const db = client.db(process.env.MONGODB_DB_NAME || 'vrcworld')
    const collection = db.collection('user_world_info')

    if (req.method === 'GET') {
      if (!session?.user?.email) {
        return res.status(200).json({
          status: 0,
          cleartime: 0,
          vote: 0
        })
      }

      const userInfo = await collection.findOne({
        user_id: session.user.email,
        world_id: worldId
      })

      return res.status(200).json({
        status: userInfo?.status || 0,
        cleartime: userInfo?.cleartime || 0,
        vote: userInfo?.vote || 0
      })
    }

    if (req.method === 'POST') {
      if (!session?.user?.email) {
        return res.status(401).json({ error: 'Authentication required' })
      }

      const { status, cleartime, vote } = req.body

      // バリデーション
      if (status !== undefined && (status < 0 || status > 5)) {
        return res.status(400).json({ error: 'Invalid status value' })
      }
      if (cleartime !== undefined && (cleartime < 0 || cleartime > 5)) {
        return res.status(400).json({ error: 'Invalid cleartime value' })
      }
      if (vote !== undefined && (vote < -1 || vote > 1)) {
        return res.status(400).json({ error: 'Invalid vote value' })
      }

      const updateData: any = {}
      if (status !== undefined) updateData.status = status
      if (cleartime !== undefined) updateData.cleartime = cleartime
      if (vote !== undefined) updateData.vote = vote

      await collection.updateOne(
        {
          user_id: session.user.email,
          world_id: worldId
        },
        {
          $set: {
            ...updateData,
            updated_at: new Date()
          },
          $setOnInsert: {
            user_id: session.user.email,
            world_id: worldId,
            created_at: new Date()
          }
        },
        { upsert: true }
      )

      return res.status(200).json({ success: true })
    }

    res.setHeader('Allow', ['GET', 'POST'])
    res.status(405).end(`Method ${req.method} Not Allowed`)
  } catch (error) {
    console.error('API Error:', error)
    res.status(500).json({ error: 'Internal Server Error' })
  }
}
