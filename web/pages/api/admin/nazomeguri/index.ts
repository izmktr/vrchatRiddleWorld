import type { NextApiRequest, NextApiResponse } from 'next'
import clientPromise from '@/lib/mongodb'
import { checkApiAdminAccess } from '@/lib/auth'

const getNextWednesday = (baseDate: Date): Date => {
  const date = new Date(baseDate)
  date.setHours(0, 0, 0, 0)
  const day = date.getDay()
  const daysUntilWednesday = (3 - day + 7) % 7 || 7
  date.setDate(date.getDate() + daysUntilWednesday)
  return date
}

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

    const client = await clientPromise
    const db = client.db(process.env.MONGODB_DB_NAME || 'vrcworld')
    const collection = db.collection('nazomeguri')

    if (req.method === 'GET') {
      const previous = await collection
        .find({})
        .sort({ count: -1 })
        .limit(1)
        .toArray()

      const previousEntry = previous[0]
      const previousCount = typeof previousEntry?.count === 'number' ? previousEntry.count : null
      const previousDate = parseDate(previousEntry?.date) ?? null

      const defaultCount = Math.floor(previousCount ?? 0) + 1
      const baseDate = previousDate ?? new Date()
      const defaultDate = getNextWednesday(baseDate)

      return res.status(200).json({
        previous: previousEntry
          ? {
              count: previousEntry.count ?? null,
              date: parseDate(previousEntry.date)?.toISOString() ?? null,
              worldName: previousEntry.worldName ?? '',
              worldId: previousEntry.worldId ?? '',
              comment: previousEntry.comment ?? ''
            }
          : null,
        defaults: {
          count: defaultCount,
          date: defaultDate.toISOString()
        }
      })
    }

    if (req.method === 'POST') {
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

      const payload = {
        count,
        date: parsedDate,
        worldName,
        worldId,
        comment: typeof comment === 'string' ? comment : ''
      }

      const result = await collection.insertOne(payload)
      return res.status(201).json({
        id: result.insertedId.toString()
      })
    }

    res.setHeader('Allow', ['GET', 'POST'])
    return res.status(405).end(`Method ${req.method} Not Allowed`)
  } catch (error) {
    console.error('Nazomeguri API error:', error)
    res.status(500).json({ error: 'Internal Server Error' })
  }
}
