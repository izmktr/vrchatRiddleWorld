import type { NextApiRequest, NextApiResponse } from 'next'
import clientPromise from '@/lib/mongodb'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET'])
    return res.status(405).end(`Method ${req.method} Not Allowed`)
  }

  const { year, month } = req.query

  if (!year || !month) {
    return res.status(400).json({ error: 'Year and month are required' })
  }

  try {
    const client = await clientPromise
    const db = client.db(process.env.MONGODB_DB_NAME || 'vrcworld')
    const worldsCollection = db.collection(process.env.MONGODB_COLLECTION_NAME || 'worlds')

    const yearNum = parseInt(year as string, 10)
    const monthNum = parseInt(month as string, 10)

    // 指定された年月のワールドを取得
    const worlds = await worldsCollection.aggregate([
      {
        $match: {
          $or: [
            { publicationDate: { $exists: true, $nin: [null, ''] } },
            { created_at: { $exists: true, $nin: [null, ''] } }
          ]
        }
      },
      {
        $addFields: {
          pubDate: {
            $cond: {
              if: { $and: [
                { $ne: ["$publicationDate", null] },
                { $ne: ["$publicationDate", ""] }
              ]},
              then: {
                $cond: {
                  if: { $eq: [{ $type: "$publicationDate" }, "string"] },
                  then: { $dateFromString: { dateString: "$publicationDate", onError: null } },
                  else: "$publicationDate"
                }
              },
              else: {
                $cond: {
                  if: { $eq: [{ $type: "$created_at" }, "string"] },
                  then: { $dateFromString: { dateString: "$created_at", onError: null } },
                  else: "$created_at"
                }
              }
            }
          }
        }
      },
      {
        $match: {
          pubDate: { $ne: null, $type: "date" },
          $expr: {
            $and: [
              { $eq: [{ $year: "$pubDate" }, yearNum] },
              { $eq: [{ $month: "$pubDate" }, monthNum] }
            ]
          }
        }
      },
      {
        $sort: { pubDate: -1 }
      },
      {
        $project: {
          world_id: 1,
          name: 1,
          authorName: 1,
          thumbnailImageUrl: 1,
          imageUrl: 1,
          publicationDate: 1,
          visits: 1,
          favorites: 1,
          description: 1
        }
      }
    ]).toArray()

    // レスポンス用にデータを整形
    const formattedWorlds = worlds.map(world => ({
      id: world.world_id,
      name: world.name || '',
      authorName: world.authorName || '',
      imageUrl: world.thumbnailImageUrl || world.imageUrl || '',
      publicationDate: world.publicationDate || '',
      visitCount: world.visits || 0,
      favoriteCount: world.favorites || 0,
      description: world.description || ''
    }))

    res.status(200).json({
      success: true,
      year: yearNum,
      month: monthNum,
      count: formattedWorlds.length,
      worlds: formattedWorlds
    })
  } catch (error) {
    console.error('API Error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    res.status(500).json({ 
      error: 'Internal Server Error',
      details: errorMessage
    })
  }
}
