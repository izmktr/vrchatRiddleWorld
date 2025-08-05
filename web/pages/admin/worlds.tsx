import { GetServerSideProps } from 'next'
import Head from 'next/head'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { requireAdminAccess } from '@/lib/auth'

interface World {
  id: string
  name: string
  authorName: string
  description: string
  imageUrl: string
  visitCount?: number
  favoriteCount?: number
  createdAt: string
  updatedAt: string
  tags: string[]
}

interface AdminWorldsProps {
  session: any
}

export default function AdminWorlds({ session: serverSession }: AdminWorldsProps) {
  // クライアントサイドのセッション情報も取得
  const { data: clientSession } = useSession()
  
  // クライアントサイドのセッション情報を優先的に使用
  const session = clientSession || serverSession
  
  const [worlds, setWorlds] = useState<World[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTag, setSelectedTag] = useState('')

  // ワールドデータを取得
  const fetchWorlds = async () => {
    try {
      setLoading(true)
      console.log('Admin Worlds: Fetching worlds data...')
      
      const response = await fetch('/api/worlds?page=1&limit=50')
      if (response.ok) {
        const data = await response.json()
        console.log('Admin Worlds: Received data:', data)
        setWorlds(data.worlds || [])
      } else {
        console.error('Admin Worlds: Failed to fetch worlds:', response.status)
        setWorlds([])
      }
    } catch (error) {
      console.error('Admin Worlds: Error fetching worlds:', error)
      setWorlds([])
    } finally {
      setLoading(false)
    }
  }

  // コンポーネントマウント時にデータを取得
  useEffect(() => {
    fetchWorlds()
  }, [])

  // 検索とフィルターに基づいてワールドをフィルタリング
  const filteredWorlds = worlds.filter(world => {
    const matchesSearch = world.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         world.authorName.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesTag = selectedTag === '' || world.tags.includes(selectedTag)
    return matchesSearch && matchesTag
  })

  return (
    <>
      <Head>
        <title>ワールド管理 - NazoWeb Admin</title>
        <meta name="description" content="ワールドデータの管理" />
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          {/* ヘッダー */}
          <div className="bg-white shadow rounded-lg mb-6">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">ワールド管理</h1>
                  <p className="mt-1 text-sm text-gray-500">
                    VRChatワールドデータの閲覧・編集・削除
                  </p>
                </div>
                <div className="flex space-x-3">
                  <Link href="/admin">
                    <button className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                      ← ダッシュボードへ戻る
                    </button>
                  </Link>
                  <button 
                    onClick={fetchWorlds}
                    disabled={loading}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {loading ? '🔄 更新中...' : '🔄 データ更新'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 検索・フィルター */}
          <div className="bg-white shadow rounded-lg mb-6">
            <div className="px-4 py-5 sm:p-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label htmlFor="search" className="block text-sm font-medium text-gray-700">
                    ワールド名で検索
                  </label>
                  <input
                    type="text"
                    id="search"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    placeholder="ワールド名を入力..."
                  />
                </div>
                <div>
                  <label htmlFor="tag" className="block text-sm font-medium text-gray-700">
                    タグで絞り込み
                  </label>
                  <select
                    id="tag"
                    value={selectedTag}
                    onChange={(e) => setSelectedTag(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  >
                    <option value="">すべてのタグ</option>
                    <option value="謎解き">謎解き</option>
                    <option value="ホラー">ホラー</option>
                    <option value="アドベンチャー">アドベンチャー</option>
                    <option value="パズル">パズル</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <button
                    type="button"
                    className="w-full inline-flex justify-center items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    🗑️ 選択削除
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ワールドリスト */}
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-medium text-gray-900">ワールド一覧</h2>
                <span className="text-sm text-gray-500">
                  {filteredWorlds.length}件のワールド
                  {searchTerm || selectedTag ? ` (${worlds.length}件中)` : ''}
                </span>
              </div>

              {loading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                  <p className="mt-2 text-sm text-gray-500">読み込み中...</p>
                </div>
              ) : filteredWorlds.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-4xl mb-4">🌍</div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">ワールドが見つかりません</h3>
                  <p className="text-sm text-gray-500">
                    {searchTerm || selectedTag 
                      ? '検索条件に一致するワールドが見つかりません。'
                      : 'ワールドデータがまだ収集されていません。'
                    }
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredWorlds.map((world) => (
                    <div key={world.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start space-x-4">
                        <input
                          type="checkbox"
                          className="mt-1 h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                        />
                        <div className="flex-shrink-0">
                          <img
                            src={world.imageUrl || '/placeholder-world.jpg'}
                            alt={world.name}
                            className="h-16 w-16 rounded-lg object-cover"
                          />
                        </div>
                        <div className="flex-grow min-w-0">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="text-lg font-medium text-gray-900 truncate">
                                {world.name}
                              </h3>
                              <p className="text-sm text-gray-500">
                                作者: {world.authorName}
                              </p>
                              <p className="mt-1 text-sm text-gray-600 line-clamp-2">
                                {world.description}
                              </p>
                              <div className="mt-2 flex flex-wrap gap-1">
                                {world.tags.map((tag) => (
                                  <span
                                    key={tag}
                                    className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                                  >
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            </div>
                            <div className="flex flex-col items-end space-y-2">
                              <div className="text-right text-sm text-gray-500">
                                <div>訪問: {world.visitCount?.toLocaleString() || 0}</div>
                                <div>お気に入り: {world.favoriteCount?.toLocaleString() || 0}</div>
                              </div>
                              <div className="flex space-x-2">
                                <button className="text-indigo-600 hover:text-indigo-900 text-sm font-medium">
                                  編集
                                </button>
                                <button className="text-red-600 hover:text-red-900 text-sm font-medium">
                                  削除
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* ページネーション */}
              {filteredWorlds.length > 0 && (
                <div className="mt-6 flex items-center justify-between">
                  <div className="text-sm text-gray-500">
                    1-{Math.min(20, filteredWorlds.length)} / {filteredWorlds.length}件を表示
                  </div>
                  <div className="flex space-x-2">
                    <button className="px-3 py-1 border border-gray-300 rounded text-sm text-gray-700 hover:bg-gray-50">
                      前へ
                    </button>
                    <button className="px-3 py-1 border border-gray-300 rounded text-sm text-gray-700 hover:bg-gray-50">
                      次へ
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  return await requireAdminAccess(context)
}
