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

      // 日付フィールドの安全な処理
      const getValidDate = (dateString: any): string => {
        if (!dateString) return ''
        if (typeof dateString === 'string' && dateString.trim() === '') return ''
        try {
          const date = new Date(dateString)
          return isNaN(date.getTime()) ? '' : dateString
        } catch {
          return ''
        }
      }

      // レスポンス用にデータを整形（実際のMongoDB構造に合わせる）
      const formattedWorld = {
        id: world.world_id || world.id,
        name: world.name || '',
        imageUrl: world.imageUrl || '',
        thumbnailImageUrl: world.thumbnailImageUrl || '',
        authorName: world.authorName || '',
        authorId: world.authorId || '',
        tags: world.tags || [],
        created_at: getValidDate(world.created_at),
        updated_at: getValidDate(world.updated_at),
        description: world.description || '',
        visits: world.visits || 0,
        favorites: world.favorites || 0,
        popularity: world.popularity || 0,
        capacity: world.capacity || 0,
        recommendedCapacity: world.recommendedCapacity || 0,
        releaseStatus: world.releaseStatus || 'unknown',
        organization: world.organization || '',
        labsPublicationDate: getValidDate(world.labsPublicationDate),
        publicationDate: getValidDate(world.publicationDate),
        version: world.version || 0,
        heat: world.heat || 0,
        featured: world.featured || false,
        scraped_at: getValidDate(world.scraped_at),
        source_url: world.source_url || ''
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
