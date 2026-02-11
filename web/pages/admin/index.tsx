import { GetServerSideProps } from 'next'
import Head from 'next/head'
import Link from 'next/link'
import { useSession, signIn } from 'next-auth/react'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/router'

interface DashboardStats {
  totalWorlds: number
  totalUsers: number
  lastScrapingDate: string | null
  errorCount: number
}

// 管理者メール判定関数（環境変数の安全な取得）
function isAdmin(email?: string | null): boolean {
  if (!email) return false
  
  // 管理者メールアドレスの確認（クライアントサイド）
  const adminEmails = process.env.NEXT_PUBLIC_ADMIN_EMAILS?.split(',') || []
  return adminEmails.includes(email)
}

const formatCacheTimestamp = (dateString: string): string => {
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return '不明'

  const diffMs = Date.now() - date.getTime()
  const hours = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60)))
  const hoursAgo = `${hours}時間前`
  const formatted = date.toLocaleString('ja-JP', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })

  return `${formatted} (${hoursAgo})`
}

export default function AdminDashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  
  // 統計情報の状態管理
  const [stats, setStats] = useState<DashboardStats>({
    totalWorlds: 0,
    totalUsers: 0,
    lastScrapingDate: null,
    errorCount: 0
  })
  const [loading, setLoading] = useState(true)
  const [isClearingCache, setIsClearingCache] = useState(false)
  const [isAdminUser, setIsAdminUser] = useState(false)
  const [adminCheckLoading, setAdminCheckLoading] = useState(true)

  // 認証状態の確認
  // 管理者権限の確認
  const checkAdminStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/check')
      if (response.ok) {
        const data = await response.json()
        setIsAdminUser(data.isAdmin)
        if (!data.isAdmin) {
          router.push('/') // 管理者でない場合はホームにリダイレクト
        }
      } else {
        setIsAdminUser(false)
        router.push('/') // エラーの場合もホームにリダイレクト
      }
    } catch (error) {
      console.error('Admin check failed:', error)
      setIsAdminUser(false)
      router.push('/')
    } finally {
      setAdminCheckLoading(false)
    }
  }, [router])

  useEffect(() => {
    if (status === 'loading') return // まだ読み込み中

    if (status === 'unauthenticated') {
      signIn() // 未認証の場合はサインインページにリダイレクト
      return
    }

    if (session?.user?.email) {
      // 管理者権限をAPIで確認
      checkAdminStatus()
    }
  }, [session, status, checkAdminStatus])

  // 統計情報を取得
  const fetchDashboardStats = useCallback(async () => {
    try {
      setLoading(true)
      
      // ワールド数を取得（エラーハンドリング強化）
      let totalWorlds = 0
      let totalUsers = 0
      let lastScrapingDate: string | null = null

      try {
        const worldsResponse = await fetch('/api/worlds?page=1&limit=1')
        if (worldsResponse.ok) {
          const worldsData = await worldsResponse.json()
          totalWorlds = worldsData.total || 0
        } else {
          console.warn('Worlds API returned:', worldsResponse.status)
        }
      } catch (worldsError) {
        console.warn('Failed to fetch worlds count:', worldsError)
        // エラーでも続行
      }

      try {
        const statsResponse = await fetch('/api/admin/stats')
        if (statsResponse.ok) {
          const statsData = await statsResponse.json()
          totalUsers = statsData.totalUsers || 0
          lastScrapingDate = statsData.lastWorldsCacheAt || null
        } else {
          console.warn('Admin stats API returned:', statsResponse.status)
        }
      } catch (statsError) {
        console.warn('Failed to fetch admin stats:', statsError)
      }

      const newStats = {
        totalWorlds,
        totalUsers,
        lastScrapingDate,
        errorCount: 0 // 後で実装
      }
      
      setStats(newStats)
    } catch (error) {
      console.error('Dashboard: Failed to fetch stats:', error)
      // エラー時もデフォルト値を設定
      setStats({
        totalWorlds: 0,
        totalUsers: 0,
        lastScrapingDate: null,
        errorCount: 0
      })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isAdminUser && !adminCheckLoading) {
      fetchDashboardStats()
    }
  }, [isAdminUser, adminCheckLoading, fetchDashboardStats])

  const handleClearWorldsCache = useCallback(async () => {
    try {
      setIsClearingCache(true)
      const response = await fetch('/api/admin/cache/clear', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ prefix: 'worlds' })
      })

      if (!response.ok) {
        throw new Error(`Cache clear failed: ${response.status}`)
      }

      await fetchDashboardStats()
    } catch (error) {
      console.error('Failed to clear worlds cache:', error)
    } finally {
      setIsClearingCache(false)
    }
  }, [fetchDashboardStats])

  // ローディング中の表示
  if (status === 'loading' || adminCheckLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  // 管理者でない場合は表示しない
  if (!isAdminUser) {
    return null
  }
  
  return (
    <>
      <Head>
        <title>管理ダッシュボード - NazoWeb Admin</title>
        <meta name="description" content="NazoWeb管理ダッシュボード" />
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          {/* ヘッダー */}
          <div className="bg-white overflow-hidden shadow rounded-lg mb-6">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">管理ダッシュボード</h1>
                  <p className="mt-1 text-sm text-gray-500">
                    ようこそ、{session?.user?.name || 'ユーザー'}さん ({session?.user?.email || '不明'})
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-500">最終ログイン</div>
                  <div className="text-lg font-medium text-gray-900">
                    {new Date().toLocaleDateString('ja-JP')}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 統計情報 */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-6">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-indigo-500 rounded-md flex items-center justify-center">
                      <span className="text-white text-sm font-medium">🌍</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        総ワールド数
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {loading ? (
                          <div className="animate-pulse bg-gray-200 h-6 w-16 rounded"></div>
                        ) : (
                          stats.totalWorlds.toLocaleString()
                        )}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                      <span className="text-white text-sm font-medium">👥</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        登録ユーザー数
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {loading ? (
                          <div className="animate-pulse bg-gray-200 h-6 w-16 rounded"></div>
                        ) : (
                          stats.totalUsers.toLocaleString()
                        )}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-yellow-500 rounded-md flex items-center justify-center">
                      <span className="text-white text-sm font-medium">🔄</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        最終キャッシュ
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {loading ? (
                          <div className="animate-pulse bg-gray-200 h-6 w-20 rounded"></div>
                        ) : stats.lastScrapingDate ? (
                          formatCacheTimestamp(stats.lastScrapingDate)
                        ) : (
                          '未キャッシュ'
                        )}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-red-500 rounded-md flex items-center justify-center">
                      <span className="text-white text-sm font-medium">⚠️</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        エラー数
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {loading ? (
                          <div className="animate-pulse bg-gray-200 h-6 w-12 rounded"></div>
                        ) : (
                          stats.errorCount.toLocaleString()
                        )}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 管理メニュー */}
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <div className="px-4 py-5 sm:p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">管理メニュー</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Link href="/admin/new-worlds" className="group">
                  <div className="border border-gray-200 rounded-lg p-6 hover:border-indigo-500 hover:shadow-md transition-all">
                    <div className="flex items-center">
                      <div className="text-2xl mr-4">➕</div>
                      <div>
                        <h3 className="text-lg font-medium text-gray-900 group-hover:text-indigo-600">
                          新規ワールド登録
                        </h3>
                        <p className="text-sm text-gray-500">
                          VRChatワールドURLの追加登録
                        </p>
                      </div>
                    </div>
                  </div>
                </Link>

                <Link href="/admin/worlds" className="group">
                  <div className="border border-gray-200 rounded-lg p-6 hover:border-indigo-500 hover:shadow-md transition-all">
                    <div className="flex items-center">
                      <div className="text-2xl mr-4">🌍</div>
                      <div>
                        <h3 className="text-lg font-medium text-gray-900 group-hover:text-indigo-600">
                          ワールド管理
                        </h3>
                        <p className="text-sm text-gray-500">
                          ワールドデータの閲覧・編集・削除
                        </p>
                      </div>
                    </div>
                  </div>
                </Link>

                <Link href="/admin/users" className="group">
                  <div className="border border-gray-200 rounded-lg p-6 hover:border-indigo-500 hover:shadow-md transition-all">
                    <div className="flex items-center">
                      <div className="text-2xl mr-4">👥</div>
                      <div>
                        <h3 className="text-lg font-medium text-gray-900 group-hover:text-indigo-600">
                          ユーザー管理
                        </h3>
                        <p className="text-sm text-gray-500">
                          ユーザーアカウントの管理
                        </p>
                      </div>
                    </div>
                  </div>
                </Link>


                <Link href="/admin/tags" className="group">
                  <div className="border border-gray-200 rounded-lg p-6 hover:border-indigo-500 hover:shadow-md transition-all">
                    <div className="flex items-center">
                      <div className="text-2xl mr-4">🏷️</div>
                      <div>
                        <h3 className="text-lg font-medium text-gray-900 group-hover:text-indigo-600">
                          タグ管理
                        </h3>
                        <p className="text-sm text-gray-500">
                          システムタグの作成・編集・削除
                        </p>
                      </div>
                    </div>
                  </div>
                </Link>

                <Link href="/admin/world-tags" className="group">
                  <div className="border border-gray-200 rounded-lg p-6 hover:border-indigo-500 hover:shadow-md transition-all">
                    <div className="flex items-center">
                      <div className="text-2xl mr-4">🌍🏷️</div>
                      <div>
                        <h3 className="text-lg font-medium text-gray-900 group-hover:text-indigo-600">
                          ワールドタグ管理
                        </h3>
                        <p className="text-sm text-gray-500">
                          ワールドにシステムタグを付与・削除
                        </p>
                      </div>
                    </div>
                  </div>
                </Link>

              </div>
            </div>
          </div>

          {/* クイックアクション */}
          <div className="mt-6 bg-white shadow overflow-hidden sm:rounded-md">
            <div className="px-4 py-5 sm:p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">クイックアクション</h2>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  📊 レポート生成
                </button>
                <button
                  type="button"
                  onClick={handleClearWorldsCache}
                  disabled={isClearingCache}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isClearingCache ? '🧹 クリア中...' : '🧹 worldsキャッシュクリア'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

// サーバーサイドでの認証確認
export const getServerSideProps: GetServerSideProps = async (context) => {
  try {
    const { requireAdminAccess } = await import('../../lib/auth')
    const adminAuthFunction = requireAdminAccess()
    return await adminAuthFunction(context)
  } catch (error) {
    console.error('Admin authentication error:', error)
    return {
      redirect: {
        destination: '/api/auth/signin',
        permanent: false,
      },
    }
  }
}
