import Head from 'next/head'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import ImageWithFallback from '@/components/ImageWithFallback'

interface YearlyStats {
  [year: number]: {
    total: number
    months: {
      [month: number]: number
    }
  }
}

interface World {
  id: string
  name: string
  authorName: string
  imageUrl: string
  publicationDate: string
  visitCount: number
  favoriteCount: number
  description: string
}

interface MonthData {
  worlds: World[]
  loading: boolean
  visible: boolean
}

export default function TimelinePage() {
  const [stats, setStats] = useState<YearlyStats>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>('')
  const [expandedYears, setExpandedYears] = useState<Set<number>>(new Set())
  const [monthData, setMonthData] = useState<{ [key: string]: MonthData }>({})

  // 統計データを取得
  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      setLoading(true)
      setError('')
      const response = await fetch('/api/worlds/timeline/stats')
      if (response.ok) {
        const data = await response.json()
        console.log('Timeline stats response:', data)
        setStats(data.stats || {})
      } else {
        const errorData = await response.json()
        setError(`データ取得エラー: ${errorData.error || response.statusText}`)
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error)
      setError('データの取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  // 年の展開/折りたたみ
  const toggleYear = (year: number) => {
    const newExpanded = new Set(expandedYears)
    if (newExpanded.has(year)) {
      newExpanded.delete(year)
    } else {
      newExpanded.add(year)
    }
    setExpandedYears(newExpanded)
  }

  // 月のワールドを取得
  const loadMonthWorlds = async (year: number, month: number) => {
    const key = `${year}-${month}`
    
    // 既にロード済みの場合は表示をトグル
    if (monthData[key] && monthData[key].worlds.length > 0) {
      setMonthData(prev => ({
        ...prev,
        [key]: { ...prev[key], visible: !prev[key].visible }
      }))
      return
    }

    // ローディング状態を設定
    setMonthData(prev => ({
      ...prev,
      [key]: { worlds: [], loading: true, visible: true }
    }))

    try {
      const response = await fetch(`/api/worlds/timeline/${year}/${month}`)
      if (response.ok) {
        const data = await response.json()
        setMonthData(prev => ({
          ...prev,
          [key]: { worlds: data.worlds || [], loading: false, visible: true }
        }))
      }
    } catch (error) {
      console.error('Failed to load worlds:', error)
      setMonthData(prev => ({
        ...prev,
        [key]: { worlds: [], loading: false, visible: false }
      }))
    }
  }

  const monthNames = [
    '1月', '2月', '3月', '4月', '5月', '6月',
    '7月', '8月', '9月', '10月', '11月', '12月'
  ]

  const years = Object.keys(stats).map(Number).sort((a, b) => b - a)

  return (
    <>
      <Head>
        <title>タイムライン - VRChat ワールド</title>
        <meta name="description" content="公開日別にVRChatワールドを閲覧" />
      </Head>

      <div className="min-h-screen bg-gray-50">
        <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          {/* ヘッダー */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              📅 ワールドタイムライン
            </h1>
            <p className="text-gray-600">
              公開日を基準にVRChatワールドを探索できます
            </p>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
              <p className="mt-4 text-gray-500">読み込み中...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <div className="text-red-600 mb-4 text-xl">⚠️</div>
              <p className="text-red-600">{error}</p>
              <button
                onClick={fetchStats}
                className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
              >
                再読み込み
              </button>
            </div>
          ) : years.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg shadow">
              <div className="text-gray-400 mb-4 text-4xl">📭</div>
              <p className="text-gray-500 text-lg font-medium mb-2">公開日データがありません</p>
              <p className="text-gray-400 text-sm">
                ワールドに公開日（publicationDate）が設定されていないか、<br />
                データベースにワールドが登録されていない可能性があります。
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {years.map(year => (
                <div key={year} className="bg-white rounded-lg shadow">
                  {/* 年ヘッダー */}
                  <button
                    onClick={() => toggleYear(year)}
                    className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center space-x-4">
                      <span className="text-2xl">
                        {expandedYears.has(year) ? '📂' : '📁'}
                      </span>
                      <span className="text-xl font-bold text-gray-900">
                        {year}年
                      </span>
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-indigo-100 text-indigo-800">
                        {stats[year].total.toLocaleString()}件
                      </span>
                    </div>
                    <svg
                      className={`w-6 h-6 text-gray-400 transition-transform ${
                        expandedYears.has(year) ? 'transform rotate-180' : ''
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>

                  {/* 月リスト */}
                  {expandedYears.has(year) && (
                    <div className="border-t border-gray-200 px-6 py-4">
                      <div className="space-y-3">
                        {Object.entries(stats[year].months)
                          .sort((a, b) => Number(b[0]) - Number(a[0]))
                          .map(([month, count]) => {
                            const monthNum = Number(month)
                            const key = `${year}-${monthNum}`
                            const data = monthData[key]

                            return (
                              <div key={monthNum} className="border border-gray-200 rounded-lg p-3 hover:border-indigo-300 transition-colors">
                                <div className="flex items-center justify-between gap-4">
                                  <div className="flex items-center gap-3 min-w-0 flex-1">
                                    <span className="text-base font-semibold text-gray-900 whitespace-nowrap">
                                      {monthNames[monthNum - 1]}
                                    </span>
                                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                                      <div 
                                        className="bg-indigo-500 h-2 rounded-full transition-all duration-300"
                                        style={{ 
                                          width: `${Math.min(100, (count / Math.max(...Object.values(stats[year].months))) * 100)}%` 
                                        }}
                                      ></div>
                                    </div>
                                    <span className="inline-flex items-center px-2.5 py-1 rounded-md text-sm font-semibold bg-indigo-100 text-indigo-800 whitespace-nowrap">
                                      {count.toLocaleString()}件
                                    </span>
                                  </div>
                                  <div className="flex-shrink-0">
                                    {data?.loading ? (
                                      <div className="px-4">
                                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-600"></div>
                                      </div>
                                    ) : data?.visible ? (
                                      <button
                                        onClick={() => loadMonthWorlds(year, monthNum)}
                                        className="px-4 py-1.5 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300 transition-colors"
                                      >
                                        閉じる
                                      </button>
                                    ) : (
                                      <button
                                        onClick={() => loadMonthWorlds(year, monthNum)}
                                        className="px-4 py-1.5 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700 transition-colors"
                                      >
                                        表示
                                      </button>
                                    )}
                                  </div>
                                </div>
                                
                                {data?.visible && !data.loading && (
                                  <div className="mt-3 border-t border-gray-200 pt-3">
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                      {data.worlds.map(world => (
                                      <Link
                                        key={world.id}
                                        href={`/world/${world.id}`}
                                        className="block hover:shadow-lg transition-shadow bg-white rounded-lg border border-gray-200 overflow-hidden"
                                      >
                                        <div className="aspect-video relative">
                                          <ImageWithFallback
                                            src={world.imageUrl}
                                            alt={world.name}
                                            className="w-full h-full object-cover"
                                            width={320}
                                            height={180}
                                          />
                                        </div>
                                        <div className="p-3">
                                          <h4 className="text-sm font-semibold text-gray-900 line-clamp-2 mb-1">
                                            {world.name}
                                          </h4>
                                          <p className="text-xs text-gray-600 mb-2">
                                            by {world.authorName}
                                          </p>
                                          <div className="flex items-center justify-between text-xs text-gray-500">
                                            <span className="flex items-center">
                                              <span className="mr-1">👁</span>
                                              {world.visitCount.toLocaleString()}
                                            </span>
                                            <span className="flex items-center">
                                              <span className="mr-1">❤️</span>
                                              {world.favoriteCount.toLocaleString()}
                                            </span>
                                          </div>
                                        </div>
                                      </Link>
                                      ))}
                                      </div>
                                    </div>
                                )}
                              </div>
                            )
                          })}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
