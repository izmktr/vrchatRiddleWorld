import type { NextApiRequest, NextApiResponse } from 'next'
import clientPromise from '@/lib/mongodb'
import { checkApiAdminAccess } from '@/lib/auth'

const parseObjectId = (value: unknown): string | null => {
  if (typeof value !== 'string' || !value.trim()) return null
  return value.trim()
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const session = await checkApiAdminAccess(req, res)
    if (!session) {
      return
    }

    const client = await clientPromise
    const db = client.db(process.env.MONGODB_DB_NAME || 'vrcworld')
    const collection = db.collection('nazomeguri_candidates')

    if (req.method === 'GET') {
      const items = await collection
        .find({})
        .sort({ createdAt: -1, _id: -1 })
        .toArray()

      const formatted = items.map((item) => ({
        id: item._id?.toString?.() ?? '',
        worldName: item.worldName || '',
        worldId: item.worldId || '',
        comment: item.comment || '',
        createdAt: item.createdAt ? new Date(item.createdAt).toISOString() : null
      }))

      return res.status(200).json({ items: formatted })
    }

    if (req.method === 'POST') {
      const { worldName, worldId, comment } = req.body ?? {}

      if (typeof worldName !== 'string' || !worldName.trim()) {
        return res.status(400).json({ error: 'worldName is required' })
      }

      if (typeof worldId !== 'string' || !worldId.trim()) {
        return res.status(400).json({ error: 'worldId is required' })
      }

      const payload = {
        worldName: worldName.trim(),
        worldId: worldId.trim(),
        comment: typeof comment === 'string' ? comment.trim() : '',
        createdAt: new Date(),
        updatedAt: new Date()
      }

      const result = await collection.insertOne(payload)
      return res.status(201).json({
        id: result.insertedId.toString()
      })
    }

    res.setHeader('Allow', ['GET', 'POST'])
    return res.status(405).end(`Method ${req.method} Not Allowed`)
  } catch (error) {
    console.error('Nazomeguri candidate API error:', error)
    return res.status(500).json({ error: 'Internal Server Error' })
  }
}
