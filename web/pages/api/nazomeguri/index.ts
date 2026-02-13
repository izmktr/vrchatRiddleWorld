import type { NextApiRequest, NextApiResponse } from 'next'
import clientPromise from '@/lib/mongodb'

const parseNumber = (value: string | string[] | undefined, fallback: number) => {
  if (!value) return fallback
  const raw = Array.isArray(value) ? value[0] : value
  const parsed = Number(raw)
  return Number.isNaN(parsed) ? fallback : parsed
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET'])
    return res.status(405).end(`Method ${req.method} Not Allowed`)
  }

  try {
    const page = Math.max(1, parseNumber(req.query.page, 1))
    const limit = Math.max(1, parseNumber(req.query.limit, 50))
    const skip = (page - 1) * limit

    const client = await clientPromise
    const db = client.db(process.env.MONGODB_DB_NAME || 'vrcworld')
    const collection = db.collection('nazomeguri')

    const total = await collection.countDocuments({})
    const items = await collection
      .find({})
      .sort({ count: -1 })
      .skip(skip)
      .limit(limit)
      .toArray()

    const formatted = items.map((item) => ({
      id: item._id?.toString?.() ?? '',
      count: typeof item.count === 'number' ? item.count : null,
      date: item.date ? new Date(item.date).toISOString() : null,
      worldName: item.worldName || '',
      worldId: item.worldId || '',
      comment: item.comment || ''
    }))

    return res.status(200).json({
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      items: formatted
    })
  } catch (error) {
    console.error('Nazomeguri public API error:', error)
    return res.status(500).json({ error: 'Internal Server Error' })
  }
}
