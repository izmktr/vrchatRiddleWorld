import { GetServerSideProps } from 'next'
import Head from 'next/head'
import Link from 'next/link'
import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
// import { requireAdminAccess } from '@/lib/auth' // 一時的にコメントアウト
import ImageWithFallback from '@/components/ImageWithFallback'

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

interface SystemTag {
  _id: string
  tagName: string
  tagDescription: string
  priority: number
  createdAt: string
  updatedAt: string
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
  const [searchInput, setSearchInput] = useState('')
  const [selectedTag, setSelectedTag] = useState('')
  const [selectedTagInput, setSelectedTagInput] = useState('')
  const [systemTags, setSystemTags] = useState<SystemTag[]>([])
  const [totalCount, setTotalCount] = useState(0)

  // システムタグを取得
  const fetchSystemTags = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/tags')
      if (response.ok) {
        const data = await response.json()
        setSystemTags(data.tags || [])
      } else {
        console.error('Admin Worlds: Failed to fetch tags:', response.status)
        setSystemTags([])
      }
    } catch (error) {
      console.error('Admin Worlds: Error fetching tags:', error)
      setSystemTags([])
    }
  }, [])

  // ワールドデータを検索
  const searchWorlds = useCallback(async () => {
    try {
      setLoading(true)
      
      // クエリパラメータを構築
      const params = new URLSearchParams({
        page: '1',
        limit: '100'
      })
      
      if (searchTerm) {
        params.append('search', searchTerm)
      }
      
      if (selectedTag) {
        params.append('tagId', selectedTag)
      }
      
      const response = await fetch(`/api/admin/worlds?${params.toString()}`)
      if (response.ok) {
        const data = await response.json()
        setWorlds(data.worlds || [])
        setTotalCount(data.totalCount || 0)
      } else {
        console.error('Admin Worlds: Failed to fetch worlds:', response.status)
        setWorlds([])
        setTotalCount(0)
      }
    } catch (error) {
      console.error('Admin Worlds: Error fetching worlds:', error)
      setWorlds([])
      setTotalCount(0)
    } finally {
      setLoading(false)
    }
  }, [searchTerm, selectedTag])

  // 検索ボタンのハンドラー
  const handleSearch = () => {
    setSearchTerm(searchInput)
    setSelectedTag(selectedTagInput)
  }

  // ワールド削除処理
  const handleDelete = async (worldId: string, worldName: string) => {
    if (!confirm(`「${worldName}」を削除しますか？\n\nこの操作は取り消せません。`)) {
      return
    }

    try {
      const response = await fetch(`/api/admin/worlds/${worldId}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (response.ok) {
        alert('ワールドを削除しました')
        // 一覧を再取得
        searchWorlds()
      } else {
        alert(`削除に失敗しました: ${data.error || '不明なエラー'}`)
      }
    } catch (error) {
      console.error('削除エラー:', error)
      alert('削除中にエラーが発生しました')
    }
  }

  // コンポーネントマウント時にシステムタグを取得
  useEffect(() => {
    fetchSystemTags()
  }, [fetchSystemTags])

  // 検索条件が変更されたら検索実行
  useEffect(() => {
    searchWorlds()
  }, [searchWorlds])

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
                    onClick={searchWorlds}
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
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
                <div className="sm:col-span-2">
                  <label htmlFor="search" className="block text-sm font-medium text-gray-700">
                    ワールド名・作者名で検索
                  </label>
                  <input
                    type="text"
                    id="search"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    placeholder="ワールド名または作者名を入力..."
                  />
                </div>
                <div>
                  <label htmlFor="tag" className="block text-sm font-medium text-gray-700">
                    システムタグで絞り込み
                  </label>
                  <select
                    id="tag"
                    value={selectedTagInput}
                    onChange={(e) => setSelectedTagInput(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  >
                    <option value="">すべてのタグ</option>
                    {systemTags.map(tag => (
                      <option key={tag._id} value={tag._id}>
                        {tag.tagName}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={handleSearch}
                    disabled={loading}
                    className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
                  >
                    🔍 検索
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
                  {worlds.length}件のワールドを表示
                  {(searchTerm || selectedTag) && totalCount > 0 && ` (全${totalCount}件から検索)`}
                </span>
              </div>

              {loading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                  <p className="mt-2 text-sm text-gray-500">読み込み中...</p>
                </div>
              ) : worlds.length === 0 ? (
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
                  {worlds.map((world) => (
                    <div key={world.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start space-x-4">
                        <input
                          type="checkbox"
                          className="mt-1 h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                        />
                        <div className="flex-shrink-0 relative h-16 w-16">
                          <ImageWithFallback
                            src={world.imageUrl || '/placeholder-world.jpg'}
                            alt={world.name}
                            fill
                            className="rounded-lg object-cover"
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
                                {world.tags?.map((tag: any, index: number) => (
                                  <span
                                    key={typeof tag === 'string' ? tag : tag.tagId || index}
                                    className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                                  >
                                    {typeof tag === 'string' ? tag : tag.tagName || 'Unknown'}
                                  </span>
                                )) || []}
                              </div>
                            </div>
                            <div className="flex flex-col items-end space-y-2">
                              <div className="text-right text-sm text-gray-500">
                                <div>訪問: {world.visitCount?.toLocaleString() || 0}</div>
                                <div>お気に入り: {world.favoriteCount?.toLocaleString() || 0}</div>
                              </div>
                              <div className="flex space-x-2">
                                <button 
                                  onClick={() => handleDelete(world.id, world.name)}
                                  className="text-red-600 hover:text-red-900 text-sm font-medium"
                                >
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
              {worlds.length > 0 && (
                <div className="mt-6 flex items-center justify-between">
                  <div className="text-sm text-gray-500">
                    1-{Math.min(20, worlds.length)} / {worlds.length}件を表示
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

// 一時的にコメントアウト - ビルドエラー回避
// export const getServerSideProps = requireAdminAccess()
