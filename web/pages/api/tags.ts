import type { NextApiRequest, NextApiResponse } from 'next'
import clientPromise from '@/lib/mongodb'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    if (req.method === 'GET') {
      // MongoDB接続
      const client = await clientPromise
      const db = client.db(process.env.MONGODB_DB_NAME || 'vrcworld')
      const collection = db.collection(process.env.MONGODB_COLLECTION_NAME || 'worlds')

      // 全ワールドのタグを集計（上位10件のみ）
      const pipeline = [
        { $unwind: "$tags" },
        { $group: { _id: "$tags", count: { $sum: 1 } } },
        { $project: { name: "$_id", count: 1, _id: 0 } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]

      const tags = await collection.aggregate(pipeline).toArray()
      
      res.status(200).json(tags)
    } else {
      res.setHeader('Allow', ['GET'])
      res.status(405).end(`Method ${req.method} Not Allowed`)
    }
  } catch (error) {
    console.error('API Error:', error)
    res.status(500).json({ error: 'Internal Server Error' })
  }
}
