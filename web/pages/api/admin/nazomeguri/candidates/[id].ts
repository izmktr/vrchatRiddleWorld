import type { NextApiRequest, NextApiResponse } from 'next'
import { ObjectId } from 'mongodb'
import clientPromise from '@/lib/mongodb'
import { checkApiAdminAccess } from '@/lib/auth'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const session = await checkApiAdminAccess(req, res)
    if (!session) {
      return
    }

    const { id } = req.query
    if (!id || Array.isArray(id)) {
      return res.status(400).json({ error: 'invalid candidate id' })
    }

    const client = await clientPromise
    const db = client.db(process.env.MONGODB_DB_NAME || 'vrcworld')
    const collection = db.collection('nazomeguri_candidates')

    if (req.method === 'PUT') {
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
        updatedAt: new Date()
      }

      const result = await collection.updateOne({ _id: new ObjectId(id) }, { $set: payload })
      if (result.matchedCount === 0) {
        return res.status(404).json({ error: 'candidate not found' })
      }

      return res.status(200).json({ ok: true })
    }

    if (req.method === 'DELETE') {
      const result = await collection.deleteOne({ _id: new ObjectId(id) })
      if (result.deletedCount === 0) {
        return res.status(404).json({ error: 'candidate not found' })
      }

      return res.status(200).json({ ok: true })
    }

    res.setHeader('Allow', ['PUT', 'DELETE'])
    return res.status(405).end(`Method ${req.method} Not Allowed`)
  } catch (error) {
    console.error('Nazomeguri candidate detail API error:', error)
    return res.status(500).json({ error: 'Internal Server Error' })
  }
}
