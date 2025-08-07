import type { NextApiRequest, NextApiResponse } from 'next'
import clientPromise from '@/lib/mongodb'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    if (req.method !== 'GET') {
      res.setHeader('Allow', ['GET'])
      return res.status(405).end(`Method ${req.method} Not Allowed`)
    }

    const client = await clientPromise
    const db = client.db(process.env.MONGODB_DB_NAME || 'vrcworld')
    const collection = db.collection('system_taglist')

    // タグ一覧取得（一般公開用）
    const tags = await collection
      .find({})
      .sort({ priority: 1, tagName: 1 })
      .toArray()
    
    // 各タグの使用数を取得
    const worldTagsCollection = db.collection('worlds_tag')
    const tagsWithCount = await Promise.all(
      tags.map(async (tag) => {
        const count = await worldTagsCollection.countDocuments({ 
          tagId: tag._id.toString() 
        })
        return {
          ...tag,
          count
        }
      })
    )
    
    res.status(200).json({ tags: tagsWithCount })
  } catch (error) {
    console.error('API Error:', error)
    res.status(500).json({ error: 'Internal Server Error' })
  }
}
