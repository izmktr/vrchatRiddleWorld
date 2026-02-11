import type { NextApiRequest, NextApiResponse } from 'next'
import clientPromise from '@/lib/mongodb'
import { getWorldsCache } from '@/lib/worldsCache'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET'])
    return res.status(405).end(`Method ${req.method} Not Allowed`)
  }

  try {
    const client = await clientPromise
    const db = client.db(process.env.MONGODB_DB_NAME || 'vrcworld')
    const worldsCollection = db.collection(process.env.MONGODB_COLLECTION_NAME || 'worlds')

    const { totalWorlds, sampleWorld, worldsWithPubDate, stats } = await getWorldsCache(
      'worlds:timeline:stats',
      [],
      async () => {
        const totalWorldsValue = await worldsCollection.countDocuments({})
        const sampleWorldValue = await worldsCollection.findOne({})
        const worldsWithPubDateValue = await worldsCollection.countDocuments({
          publicationDate: { $exists: true, $nin: [null, ''] }
        })

        const statsValue = await worldsCollection.aggregate([
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
              pubDate: { $ne: null, $type: "date" }
            }
          },
          {
            $group: {
              _id: {
                year: { $year: "$pubDate" },
                month: { $month: "$pubDate" }
              },
              count: { $sum: 1 }
            }
          },
          {
            $sort: { "_id.year": -1, "_id.month": -1 }
          }
        ]).toArray()

        return {
          totalWorlds: totalWorldsValue,
          sampleWorld: sampleWorldValue,
          worldsWithPubDate: worldsWithPubDateValue,
          stats: statsValue
        }
      }
    )

    // デバッグ: 全ワールド数とpublicationDateのサンプルを確認
    console.log('Debug Stats:')
    console.log('- Total worlds:', totalWorlds)
    console.log('- Worlds with publicationDate:', worldsWithPubDate)
    console.log('- Sample world fields:', sampleWorld ? Object.keys(sampleWorld) : 'No data')
    console.log('- Sample publicationDate:', sampleWorld?.publicationDate)

    // 年月ごとにグループ化
    const yearlyStats: { [key: number]: { total: number; months: { [key: number]: number } } } = {}

    stats.forEach((item) => {
      const year = item._id.year
      const month = item._id.month
      const count = item.count

      if (!yearlyStats[year]) {
        yearlyStats[year] = { total: 0, months: {} }
      }

      yearlyStats[year].months[month] = count
      yearlyStats[year].total += count
    })

    res.status(200).json({
      success: true,
      stats: yearlyStats
    })
  } catch (error) {
    console.error('API Error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    res.status(500).json({ 
      error: 'Internal Server Error',
      details: errorMessage,
      stack: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : undefined) : undefined
    })
  }
}
