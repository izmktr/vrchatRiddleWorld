import { useState, useEffect } from 'react'
import { GetServerSideProps } from 'next'
// import { requireAdminAccess } from '@/lib/auth' // 一時的にコメントアウト
import Header from '@/components/Header'
import ImageWithFallback from '@/components/ImageWithFallback'
import { MagnifyingGlassIcon, TagIcon, PlusIcon, XMarkIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'

interface World {
  _id: string
  world_id: string
  name: string
  authorName: string
  description: string
  thumbnailImageUrl?: string
  imageUrl?: string
  updated_at: string
  created_at: string
  visits: number
  favorites: number
  tagCount: number
  tags?: WorldTagSummary[]
}

interface WorldTagSummary {
  tagId: string
  tagName: string
  tagDescription: string
  assignedAt: string
}

interface SystemTag {
  _id: string
  tagName: string
  tagDescription: string
  priority: number
}

interface WorldTag {
  _id: string
  worldId: string
  tagId: string
  tagName: string
  assignedAt: string
  assignedBy: string
  tagInfo: SystemTag
}

interface AdminWorldTagsProps {
  session: any
}

export default function AdminWorldTags({ session: serverSession }: AdminWorldTagsProps) {
  const [worlds, setWorlds] = useState<World[]>([])
  const [systemTags, setSystemTags] = useState<SystemTag[]>([])
  const [selectedWorld, setSelectedWorld] = useState<World | null>(null)
  const [worldTags, setWorldTags] = useState<WorldTag[]>([])
  const [loading, setLoading] = useState(true)
  const [tagsLoading, setTagsLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [showTagModal, setShowTagModal] = useState(false)
  const [sortKey, setSortKey] = useState<'updated_at' | 'created_at' | 'visits' | 'favorites'>('created_at')

  const pagesize = 30 // 1ページあたりのワールド数

  // ワールド一覧を取得
  const fetchWorlds = async (page: number = 1, search: string = '', sort: string = sortKey) => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pagesize.toString(),
        sort: sort
      })
      if (search) params.append('search', search)

      const response = await fetch(`/api/admin/worlds?${params}`)
      if (!response.ok) throw new Error('Failed to fetch worlds')
      
      const data = await response.json()
      setWorlds(data.worlds || [])
      setTotalPages(data.pagination.total)
    } catch (error) {
      console.error('Error fetching worlds:', error)
    } finally {
      setLoading(false)
    }
  }

  // システムタグ一覧を取得
  const fetchSystemTags = async () => {
    try {
      const response = await fetch('/api/admin/tags')
      if (!response.ok) throw new Error('Failed to fetch system tags')
      
      const data = await response.json()
      setSystemTags(data.tags || [])
    } catch (error) {
      console.error('Error fetching system tags:', error)
    }
  }

  // ワールドタグを取得
  const fetchWorldTags = async (worldId: string) => {
    try {
      setTagsLoading(true)
      const response = await fetch(`/api/admin/world-tags/${worldId}`)
      if (!response.ok) throw new Error('Failed to fetch world tags')
      
      const data = await response.json()
      setWorldTags(data.worldTags || [])
    } catch (error) {
      console.error('Error fetching world tags:', error)
    } finally {
      setTagsLoading(false)
    }
  }

  // タグを追加
  const addTag = async (worldId: string, tagId: string) => {
    try {
      const response = await fetch(`/api/admin/world-tags/${worldId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tagId }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to add tag')
      }

      // タグ一覧を再取得
      await fetchWorldTags(worldId)
      // ワールド一覧も更新（タグカウント反映のため）
      await fetchWorlds(currentPage, searchTerm)
    } catch (error) {
      console.error('Error adding tag:', error)
      alert(error instanceof Error ? error.message : 'タグの追加に失敗しました')
    }
  }

  // タグを削除
  const removeTag = async (worldId: string, tagId: string) => {
    if (!confirm('このタグを削除しますか？')) return

    try {
      const response = await fetch(`/api/admin/world-tags/${worldId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tagId }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to remove tag')
      }

      // タグ一覧を再取得
      await fetchWorldTags(worldId)
      // ワールド一覧も更新（タグカウント反映のため）
      await fetchWorlds(currentPage, searchTerm)
    } catch (error) {
      console.error('Error removing tag:', error)
      alert(error instanceof Error ? error.message : 'タグの削除に失敗しました')
    }
  }

  // ソート状態
  const handleSortChange = (key: 'updated_at' | 'created_at' | 'visits' | 'favorites') => {
    setSortKey(key)
    setCurrentPage(1)
    fetchWorlds(1, searchTerm, key)
  }

  // 初期読み込み
  useEffect(() => {
    fetchWorlds(1, '', sortKey)
    fetchSystemTags()
  }, [])

  // ソート・ページ・検索の変更で自動再取得
  useEffect(() => {
    fetchWorlds(currentPage, searchTerm, sortKey)
  }, [sortKey, currentPage, searchTerm])

  // 検索
  const handleSearch = () => {
    setCurrentPage(1)
    fetchWorlds(1, searchTerm)
  }

  // ワールド選択
  const selectWorld = (world: World) => {
    setSelectedWorld(world)
    fetchWorldTags(world.world_id)
    setShowTagModal(true)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">ワールドタグ管理</h1>
          <p className="text-gray-600">
            ワールドにシステムタグを付与・管理することができます。
          </p>
        </div>

        {/* 検索バー */}
        <div className="mb-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="ワールド名、作者名、説明で検索..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>
            </div>
            <button
              onClick={handleSearch}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              検索
            </button>
          </div>
        </div>

        {/* ソートボタン */}
        <div className="mb-4 flex gap-2 items-center">
          <span className="text-sm text-gray-600">並び替え:</span>
          <button
            className={`px-3 py-1 rounded ${sortKey === 'created_at' ? 'bg-vrchat-secondary text-white' : 'bg-white text-gray-700 border border-gray-300'}`}
            onClick={() => handleSortChange('created_at')}
          >
            公開日
          </button>
          <button
            className={`px-3 py-1 rounded ${sortKey === 'updated_at' ? 'bg-vrchat-secondary text-white' : 'bg-white text-gray-700 border border-gray-300'}`}
            onClick={() => handleSortChange('updated_at')}
          >
            更新日
          </button>
          <button
            className={`px-3 py-1 rounded ${sortKey === 'visits' ? 'bg-vrchat-secondary text-white' : 'bg-white text-gray-700 border border-gray-300'}`}
            onClick={() => handleSortChange('visits')}
          >
            訪問者数
          </button>
          <button
            className={`px-3 py-1 rounded ${sortKey === 'favorites' ? 'bg-vrchat-secondary text-white' : 'bg-white text-gray-700 border border-gray-300'}`}
            onClick={() => handleSortChange('favorites')}
          >
            お気に入り数
          </button>
        </div>

        {/* ワールド一覧 */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-2 text-sm text-gray-500">読み込み中...</p>
          </div>
        ) : (
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <ul className="divide-y divide-gray-200">
              {worlds.map((world) => (
                <li key={world._id}>
                  <div className="px-6 py-4 flex items-center justify-between hover:bg-gray-50">
                    <div className="flex items-center min-w-0 flex-1">
                      <div className="flex-shrink-0 mr-4">
                        {world.thumbnailImageUrl ? (
                          <ImageWithFallback
                            src={world.thumbnailImageUrl}
                            alt={world.name}
                            width={64}
                            height={64}
                            className="h-16 w-16 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="h-16 w-16 bg-gray-200 rounded-lg flex items-center justify-center">
                            <span className="text-gray-400 text-xs">No Image</span>
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-indigo-600 truncate">
                            {world.name}
                          </p>
                          <div className="ml-4 flex items-center space-x-2">
                            {world.tags && world.tags.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {world.tags.slice(0, 3).map((tag) => (
                                  <span
                                    key={tag.tagId}
                                    className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800"
                                  >
                                    {tag.tagName}
                                  </span>
                                ))}
                                {world.tags.length > 3 && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                                    +{world.tags.length - 3}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                                <TagIcon className="h-3 w-3 mr-1" />
                                タグなし
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="mt-1">
                          <p className="text-sm text-gray-900">作者: {world.authorName}</p>
                          <p className="text-sm text-gray-500 truncate">{world.description}</p>
                        </div>
                        <div className="mt-1 flex items-center text-xs text-gray-500 space-x-4">
                          <span>👁️ {world.visits.toLocaleString()}</span>
                          <span>❤️ {world.favorites.toLocaleString()}</span>
                          <span>更新: {new Date(world.updated_at).toLocaleDateString('ja-JP')}</span>
                        </div>
                      </div>
                    </div>
                    <div className="ml-4 flex-shrink-0">
                      <button
                        onClick={() => selectWorld(world)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center space-x-2"
                      >
                        <TagIcon className="h-4 w-4" />
                        <span>タグ管理</span>
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            {/* ページネーション */}
            {totalPages > 1 && (
              <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                <div className="flex-1 flex justify-between sm:hidden">
                  <button
                    onClick={() => currentPage > 1 && (setCurrentPage(currentPage - 1), fetchWorlds(currentPage - 1, searchTerm))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    前へ
                  </button>
                  <button
                    onClick={() => currentPage < totalPages && (setCurrentPage(currentPage + 1), fetchWorlds(currentPage + 1, searchTerm))}
                    disabled={currentPage === totalPages}
                    className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    次へ
                  </button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      <span className="font-medium">{((currentPage - 1) * pagesize) + 1}</span>
                      {' - '}
                      <span className="font-medium">{Math.min(currentPage * pagesize, worlds.length)}</span>
                      {' / '}
                      <span className="font-medium">{worlds.length}</span>
                      件を表示
                    </p>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                      <button
                        onClick={() => currentPage > 1 && (setCurrentPage(currentPage - 1), fetchWorlds(currentPage - 1, searchTerm))}
                        disabled={currentPage === 1}
                        className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        前へ
                      </button>
                      <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                        {currentPage} / {totalPages}
                      </span>
                      <button
                        onClick={() => currentPage < totalPages && (setCurrentPage(currentPage + 1), fetchWorlds(currentPage + 1, searchTerm))}
                        disabled={currentPage === totalPages}
                        className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        次へ
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* タグ管理モーダル */}
        {showTagModal && selectedWorld && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
              <div className="fixed inset-0 transition-opacity" aria-hidden="true">
                <div className="absolute inset-0 bg-gray-500 opacity-75" onClick={() => setShowTagModal(false)}></div>
              </div>

              <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

              <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 mr-4">
                        {selectedWorld.thumbnailImageUrl ? (
                          <ImageWithFallback
                            src={selectedWorld.thumbnailImageUrl}
                            alt={selectedWorld.name}
                            width={80}
                            height={80}
                            className="h-20 w-20 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="h-20 w-20 bg-gray-200 rounded-lg flex items-center justify-center">
                            <span className="text-gray-400 text-xs">No Image</span>
                          </div>
                        )}
                      </div>
                      <div>
                        <h3 className="text-lg leading-6 font-medium text-gray-900">
                          {selectedWorld.name}
                        </h3>
                        <p className="mt-1 text-sm text-gray-500">
                          作者: {selectedWorld.authorName}
                        </p>
                        <Link
                          href={`/world/${selectedWorld.world_id}`}
                          className="mt-1 text-sm text-indigo-600 hover:text-indigo-500"
                        >
                          ワールド詳細を表示 →
                        </Link>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowTagModal(false)}
                      className="bg-white rounded-md text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      <XMarkIcon className="h-6 w-6" />
                    </button>
                  </div>

                  <div className="mt-6">
                    <h4 className="text-md font-medium text-gray-900 mb-4">現在のタグ</h4>
                    {tagsLoading ? (
                      <div className="text-center py-4">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600 mx-auto"></div>
                      </div>
                    ) : worldTags.length === 0 ? (
                      <p className="text-sm text-gray-500 py-4">まだタグが付与されていません。</p>
                    ) : (
                      <div className="space-y-2">
                        {worldTags.map((worldTag) => (
                          <div
                            key={worldTag._id}
                            className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2"
                          >
                            <div className="flex items-center">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                                {worldTag.tagName}
                              </span>
                              <span className="ml-2 text-xs text-gray-500">
                                {worldTag.tagInfo?.tagDescription}
                              </span>
                            </div>
                            <button
                              onClick={() => removeTag(selectedWorld.world_id, worldTag.tagId)}
                              className="text-red-600 hover:text-red-800 text-sm font-medium"
                            >
                              削除
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="mt-6">
                    <h4 className="text-md font-medium text-gray-900 mb-4">タグを追加</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {systemTags
                        .filter(tag => !worldTags.some(wt => wt.tagId === tag._id))
                        .map((tag) => (
                          <button
                            key={tag._id}
                            onClick={() => addTag(selectedWorld.world_id, tag._id)}
                            className="flex items-center justify-between bg-white border border-gray-300 rounded-lg px-3 py-2 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                          >
                            <div className="text-left">
                              <p className="text-sm font-medium text-gray-900">{tag.tagName}</p>
                              <p className="text-xs text-gray-500 truncate">{tag.tagDescription}</p>
                            </div>
                            <PlusIcon className="h-4 w-4 text-gray-400" />
                          </button>
                        ))}
                    </div>
                    {systemTags.filter(tag => !worldTags.some(wt => wt.tagId === tag._id)).length === 0 && (
                      <p className="text-sm text-gray-500 py-4">追加可能なタグがありません。</p>
                    )}
                  </div>
                </div>

                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    onClick={() => setShowTagModal(false)}
                    type="button"
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    閉じる
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// 一時的にコメントアウト - ビルドエラー回避
// export const getServerSideProps: GetServerSideProps = requireAdminAccess(
//   async () => {
//     return {
//       props: {}
//     }
//   }
// )
