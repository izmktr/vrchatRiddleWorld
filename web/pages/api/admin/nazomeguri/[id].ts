import type { NextApiRequest, NextApiResponse } from 'next'
import clientPromise from '@/lib/mongodb'
import { checkApiAdminAccess } from '@/lib/auth'
import { ObjectId } from 'mongodb'

const parseDate = (value: unknown): Date | null => {
  if (typeof value === 'string' || typeof value === 'number') {
    const date = new Date(value)
    return isNaN(date.getTime()) ? null : date
  }
  if (value instanceof Date) {
    return isNaN(value.getTime()) ? null : value
  }
  return null
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

    const { id } = req.query
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Invalid id' })
    }

    const client = await clientPromise
    const db = client.db(process.env.MONGODB_DB_NAME || 'vrcworld')
    const collection = db.collection('nazomeguri')

    if (req.method === 'PUT') {
      const { count, date, worldName, worldId, comment } = req.body ?? {}

      if (typeof count !== 'number' || Number.isNaN(count)) {
        return res.status(400).json({ error: 'count must be a number' })
      }

      if (typeof worldName !== 'string' || typeof worldId !== 'string') {
        return res.status(400).json({ error: 'worldName and worldId are required' })
      }

      const parsedDate = parseDate(date)
      if (!parsedDate) {
        return res.status(400).json({ error: 'date is invalid' })
      }

      const result = await collection.updateOne(
        { _id: new ObjectId(id) },
        {
          $set: {
            count,
            date: parsedDate,
            worldName,
            worldId,
            comment: typeof comment === 'string' ? comment : ''
          }
        }
      )

      if (result.matchedCount === 0) {
        return res.status(404).json({ error: 'Not found' })
      }

      return res.status(200).json({ success: true })
    }

    if (req.method === 'DELETE') {
      const result = await collection.deleteOne({ _id: new ObjectId(id) })

      if (result.deletedCount === 0) {
        return res.status(404).json({ error: 'Not found' })
      }

      return res.status(200).json({ success: true })
    }

    res.setHeader('Allow', ['PUT', 'DELETE'])
    return res.status(405).end(`Method ${req.method} Not Allowed`)
  } catch (error) {
    console.error('Nazomeguri update API error:', error)
    res.status(500).json({ error: 'Internal Server Error' })
  }
}
