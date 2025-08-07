import { GetServerSideProps } from 'next'
import Head from 'next/head'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { useState, useEffect } from 'react'
import { requireAdminAccess } from '@/lib/auth'

interface AdminDashboardProps {
  session: any
}

interface DashboardStats {
  totalWorlds: number
  totalUsers: number
  lastScrapingDate: string | null
  errorCount: number
}

export default function AdminDashboard({ session: serverSession }: AdminDashboardProps) {
  // クライアントサイドのセッション情報も取得
  const { data: clientSession } = useSession()
  
  // クライアントサイドのセッション情報を優先的に使用
  const session = clientSession || serverSession
  
  // 統計情報の状態管理
  const [stats, setStats] = useState<DashboardStats>({
    totalWorlds: 0,
    totalUsers: 0,
    lastScrapingDate: null,
    errorCount: 0
  })
  const [loading, setLoading] = useState(true)
  
  // デバッグ用ログ
  console.log('Server Session:', serverSession)
  console.log('Client Session:', clientSession)
  console.log('Final Session:', session)

  // 統計情報を取得
  useEffect(() => {
    fetchDashboardStats()
  }, [])

  const fetchDashboardStats = async () => {
    try {
      setLoading(true)
      console.log('Dashboard: Starting to fetch stats...')
      
      // ワールド数を取得
      const worldsResponse = await fetch('/api/worlds?page=1&limit=1')
      console.log('Dashboard: Worlds API response status:', worldsResponse.status)
      
      let totalWorlds = 0

      if (worldsResponse.ok) {
        const worldsData = await worldsResponse.json()
        console.log('Dashboard: Worlds API data:', worldsData)
        totalWorlds = worldsData.total || 0
      }

      const newStats = {
        totalWorlds,
        totalUsers: 0, // 後で実装
        lastScrapingDate: null, // 後で実装
        errorCount: 0 // 後で実装
      }
      
      console.log('Dashboard: Setting stats to:', newStats)
      setStats(newStats)
    } catch (error) {
      console.error('Dashboard: Failed to fetch stats:', error)
      // エラー時もstatsを更新して、再レンダリングを確実にする
      setStats(prev => ({ ...prev }))
    } finally {
      setLoading(false)
    }
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
                        最終スクレイピング
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {loading ? (
                          <div className="animate-pulse bg-gray-200 h-6 w-20 rounded"></div>
                        ) : stats.lastScrapingDate ? (
                          new Date(stats.lastScrapingDate).toLocaleDateString('ja-JP', {
                            month: 'short',
                            day: 'numeric'
                          })
                        ) : (
                          '未実行'
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

                <Link href="/admin/scraper" className="group">
                  <div className="border border-gray-200 rounded-lg p-6 hover:border-indigo-500 hover:shadow-md transition-all">
                    <div className="flex items-center">
                      <div className="text-2xl mr-4">🔄</div>
                      <div>
                        <h3 className="text-lg font-medium text-gray-900 group-hover:text-indigo-600">
                          スクレイパー管理
                        </h3>
                        <p className="text-sm text-gray-500">
                          データ収集の設定・実行・ログ確認
                        </p>
                      </div>
                    </div>
                  </div>
                </Link>

                <Link href="/admin/logs" className="group">
                  <div className="border border-gray-200 rounded-lg p-6 hover:border-indigo-500 hover:shadow-md transition-all">
                    <div className="flex items-center">
                      <div className="text-2xl mr-4">📋</div>
                      <div>
                        <h3 className="text-lg font-medium text-gray-900 group-hover:text-indigo-600">
                          ログ管理
                        </h3>
                        <p className="text-sm text-gray-500">
                          システムログとエラーログの確認
                        </p>
                      </div>
                    </div>
                  </div>
                </Link>

                <Link href="/admin/settings" className="group">
                  <div className="border border-gray-200 rounded-lg p-6 hover:border-indigo-500 hover:shadow-md transition-all">
                    <div className="flex items-center">
                      <div className="text-2xl mr-4">⚙️</div>
                      <div>
                        <h3 className="text-lg font-medium text-gray-900 group-hover:text-indigo-600">
                          システム設定
                        </h3>
                        <p className="text-sm text-gray-500">
                          サイト設定と環境変数の管理
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

                <Link href="/admin/backup" className="group">
                  <div className="border border-gray-200 rounded-lg p-6 hover:border-indigo-500 hover:shadow-md transition-all">
                    <div className="flex items-center">
                      <div className="text-2xl mr-4">💾</div>
                      <div>
                        <h3 className="text-lg font-medium text-gray-900 group-hover:text-indigo-600">
                          バックアップ
                        </h3>
                        <p className="text-sm text-gray-500">
                          データベースのバックアップと復元
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
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  🔄 スクレイピング実行
                </button>
                <button
                  type="button"
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  📊 レポート生成
                </button>
                <button
                  type="button"
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  🧹 キャッシュクリア
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export const getServerSideProps = requireAdminAccess()
