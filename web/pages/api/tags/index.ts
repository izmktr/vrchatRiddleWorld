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

    console.log('Tags API: Starting to fetch tags...')
    
    // 本番環境では詳細ログを制限
    const isDev = process.env.NODE_ENV === 'development'
    
    // MongoDB接続のテスト
    const client = await clientPromise
    if (isDev) console.log('Tags API: MongoDB client connected')
    
    const dbName = process.env.MONGODB_DB_NAME || 'vrcworld'
    if (isDev) console.log('Tags API: Using database:', dbName)
    
    const db = client.db(dbName)
    const collection = db.collection('system_taglist')
    
    // データベース接続テスト
    const collectionExists = await db.listCollections({ name: 'system_taglist' }).hasNext()
    console.log('Tags API: system_taglist collection exists:', collectionExists)

    if (!collectionExists) {
      console.warn('Tags API: system_taglist collection does not exist, returning empty array')
      return res.status(200).json({ tags: [] })
    }

    // タグ一覧取得（一般公開用）
    const tags = await collection
      .find({})
      .sort({ priority: 1, tagName: 1 })
      .toArray()
    
    console.log('Tags API: Found', tags.length, 'tags')
    
    // 各タグの使用数を取得
    const worldTagsCollection = db.collection('worlds_tag')
    const worldTagsExists = await db.listCollections({ name: 'worlds_tag' }).hasNext()
    
    if (!worldTagsExists) {
      console.warn('Tags API: worlds_tag collection does not exist, returning tags without counts')
      const tagsWithoutCount = tags.map(tag => ({ ...tag, count: 0 }))
      return res.status(200).json({ tags: tagsWithoutCount })
    }
    
    const tagsWithCount = await Promise.all(
      tags.map(async (tag) => {
        try {
          const count = await worldTagsCollection.countDocuments({ 
            tagId: tag._id.toString() 
          })
          return {
            ...tag,
            count
          }
        } catch (countError) {
          console.warn('Error counting tag usage for tag:', tag._id, countError)
          return {
            ...tag,
            count: 0
          }
        }
      })
    )
    
    console.log('Tags API: Successfully processed', tagsWithCount.length, 'tags with counts')
    res.status(200).json({ tags: tagsWithCount })
  } catch (error) {
    console.error('Tags API Error:', error)
    
    // エラーの詳細をログ出力
    if (error instanceof Error) {
      console.error('Error name:', error.name)
      console.error('Error message:', error.message)
      console.error('Error stack:', error.stack)
    }
    
    // エラー時でも空の配列を返してフロントエンドを壊さない
    res.status(200).json({ 
      tags: [],
      error: 'Failed to fetch tags',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}
