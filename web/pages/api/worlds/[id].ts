import type { NextApiRequest, NextApiResponse } from 'next'
import clientPromise from '@/lib/mongodb'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query

  try {
    const client = await clientPromise
    const db = client.db(process.env.MONGODB_DB_NAME || 'vrcworld')
    const collection = db.collection('worlds')

    if (req.method === 'GET') {
      const world = await collection.findOne({ world_id: id })

      if (!world) {
        return res.status(404).json({ error: 'World not found' })
      }

      // レスポンス用にデータを整形（実際の構造に合わせる）
      const formattedWorld = {
        id: world.world_id || world.id,
        timestamp: world.scraped_at,
        source: world.source_url,
        raw_data: world // 全データをraw_dataとして返す
      }

      res.status(200).json(formattedWorld)
    } else {
      res.setHeader('Allow', ['GET'])
      res.status(405).end(`Method ${req.method} Not Allowed`)
    }
  } catch (error) {
    console.error('API Error:', error)
    res.status(500).json({ error: 'Internal Server Error' })
  }
}
