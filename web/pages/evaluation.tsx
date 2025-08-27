import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import Link from 'next/link'
import Header from '@/components/Header'
import ImageWithFallback from '@/components/ImageWithFallback'

// 型定義
interface World {
  id: string
  world_id: string
  name: string
  description: string
  authorName: string
  imageUrl: string
  visitCount: number
  favoriteCount: number
  tags: string[]
  created_at: string
  updated_at: string
  userStatus?: {
    status: number
    cleartime: number
    vote: number
  }
}

// ステータス・クリア時間・評価のラベル
const statusLabels = ['未選択', '未訪問', '注目', '挑戦中', '断念', 'クリア']
const cleartimeLabels = ['未クリア', '30分以下', '30～90分', '90分～3時間', '3～6時間', '6時間以上']

export default function EvaluationPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  
  const [worlds, setWorlds] = useState<World[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<number | null>(null)
  const [sortBy, setSortBy] = useState<'name' | 'created_at' | 'updated_at' | 'visitCount'>('updated_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [userInfoLoading, setUserInfoLoading] = useState<Record<string, boolean>>({})
  
  // フィルタリング時の初期状態を保持
  const [initialWorldStates, setInitialWorldStates] = useState<Record<string, World>>({})
  
  // 現在のフィルタリング条件でのワールドリストを保持
  const [filteredWorldIds, setFilteredWorldIds] = useState<Set<string>>(new Set())
  
  // ページング関連の状態
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(20)
  const [totalPages, setTotalPages] = useState(1)
  
  // 読み込み状態の詳細
  const [loadingProgress, setLoadingProgress] = useState<{ current: number; total: number } | null>(null)

  // 未認証ユーザーをサインインページにリダイレクト
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    }
  }, [status, router])

  // ワールドデータを取得
  const fetchWorlds = async () => {
    try {
      setLoading(true)
      setLoadingProgress({ current: 0, total: 0 })
      
      // 評価専用APIで全件を一度に取得
      const response = await fetch('/api/evaluation/worlds')
      if (!response.ok) {
        console.error('Failed to fetch worlds:', response.status)
        setWorlds([])
        setInitialWorldStates({})
        return
      }
      
      const data = await response.json()
      const allWorlds = data.worlds || []
      
      setLoadingProgress({ current: allWorlds.length, total: allWorlds.length })
      setWorlds(allWorlds)
      
      // 初期状態を保存
      const initialStates: Record<string, World> = {}
      allWorlds.forEach((world: World) => {
        initialStates[world.id] = { ...world }
      })
      setInitialWorldStates(initialStates)
      
    } catch (error) {
      console.error('Error fetching worlds:', error)
      setWorlds([])
      setInitialWorldStates({})
    } finally {
      setLoading(false)
      setLoadingProgress(null)
    }
  }

  // コンポーネントマウント時にデータを取得
  useEffect(() => {
    if (session) {
      fetchWorlds()
    }
  }, [session])

  // ユーザー情報を更新
  const updateUserInfo = async (worldId: string, updates: { status?: number; cleartime?: number; vote?: number }) => {
    const loadingKey = worldId
    setUserInfoLoading(prev => ({ ...prev, [loadingKey]: true }))

    try {
      const response = await fetch(`/api/user-world-info/${worldId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      })
      
      if (response.ok) {
        // サーバーへの送信が成功した場合のみローカル状態を更新
        setWorlds(prev => prev.map(world => {
          if (world.id === worldId) {
            const currentStatus = world.userStatus || { status: 0, cleartime: 0, vote: 0 }
            return {
              ...world,
              userStatus: {
                ...currentStatus,
                ...updates
              }
            }
          }
          return world
        }))
        console.log(`Updated user info for world ${worldId}:`, updates)
      } else {
        console.error('Failed to update user info:', response.status, response.statusText)
        // エラーの場合は何もしない（ローカル状態を変更しない）
      }
    } catch (error) {
      console.error('Error updating user info:', error)
      // エラーの場合は何もしない（ローカル状態を変更しない）
    } finally {
      setUserInfoLoading(prev => ({ ...prev, [loadingKey]: false }))
    }
  }

  // ステータス変更時のクリア時間リセット
  const handleStatusChange = (worldId: string, newStatus: number) => {
    const updates: { status: number; cleartime?: number } = { status: newStatus }
    if (newStatus !== 5) {
      // クリア以外の場合はクリア時間をリセット
      updates.cleartime = 0
    }
    updateUserInfo(worldId, updates)
  }

  // 評価ボタンのハンドラー
  const handleVote = (worldId: string, newVote: -1 | 1) => {
    const currentWorld = worlds.find(w => w.id === worldId)
    const currentVote = currentWorld?.userStatus?.vote || 0
    const finalVote = currentVote === newVote ? 0 : newVote
    updateUserInfo(worldId, { vote: finalVote })
  }

  // フィルタリングのためのワールドIDを計算
  const applyFiltering = () => {
    const filtered = worlds
      .filter(world => {
        // 検索時の初期状態を使用してフィルタリング
        const initialState = initialWorldStates[world.id]
        const matchesSearch = world.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             world.authorName.toLowerCase().includes(searchTerm.toLowerCase())
        const matchesStatus = statusFilter === null || 
                             (initialState?.userStatus?.status || 0) === statusFilter
        return matchesSearch && matchesStatus
      })
      .map(world => world.id)
    
    setFilteredWorldIds(new Set(filtered))
  }

  // フィルタが変更されたときに実行
  useEffect(() => {
    applyFiltering()
    setCurrentPage(1) // フィルタが変更されたら最初のページに戻る
  }, [searchTerm, statusFilter, initialWorldStates, worlds])

  // フィルタリングとソート
  const filteredAndSortedWorlds = worlds
    .filter(world => filteredWorldIds.has(world.id))
    .sort((a, b) => {
      let aValue: any, bValue: any
      
      switch (sortBy) {
        case 'name':
          aValue = a.name
          bValue = b.name
          break
        case 'created_at':
          aValue = new Date(a.created_at)
          bValue = new Date(b.created_at)
          break
        case 'updated_at':
          aValue = new Date(a.updated_at)
          bValue = new Date(b.updated_at)
          break
        case 'visitCount':
          aValue = a.visitCount || 0
          bValue = b.visitCount || 0
          break
        default:
          return 0
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1
      } else {
        return aValue < bValue ? 1 : -1
      }
    })

  // ページング計算
  const totalFilteredItems = filteredAndSortedWorlds.length
  const totalPagesCalculated = Math.ceil(totalFilteredItems / itemsPerPage)
  
  // ページ数を更新
  useEffect(() => {
    setTotalPages(totalPagesCalculated)
  }, [totalPagesCalculated])
  
  // 現在のページの表示範囲を計算
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentPageWorlds = filteredAndSortedWorlds.slice(startIndex, endIndex)

  // ページ変更ハンドラ
  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  if (!session) {
    return null // リダイレクト中
  }

  return (
    <>
      <Head>
        <title>評価管理 - VRChat謎解きワールド</title>
        <meta name="description" content="VRChatワールドの評価を効率的に管理" />
      </Head>

      <div className="min-h-screen bg-gray-50">
        <Header />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* ページヘッダー */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">評価管理</h1>
            <p className="mt-2 text-gray-600">
              ワールドの状態、クリア時間、評価を効率的に管理できます
            </p>
          </div>

          {/* フィルター・検索・ソート */}
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* 検索 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  検索
                </label>
                <input
                  type="text"
                  placeholder="ワールド名・作者名で検索"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              {/* 状態フィルター */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  状態フィルター
                </label>
                <select
                  value={statusFilter ?? ''}
                  onChange={(e) => setStatusFilter(e.target.value === '' ? null : parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">すべて</option>
                  {statusLabels.map((label, index) => (
                    <option key={index} value={index}>{label}</option>
                  ))}
                </select>
              </div>

              {/* ソート項目 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  並び替え
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="updated_at">更新日</option>
                  <option value="created_at">作成日</option>
                  <option value="name">名前</option>
                  <option value="visitCount">訪問数</option>
                </select>
              </div>

              {/* ソート順 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  順序
                </label>
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="desc">降順</option>
                  <option value="asc">昇順</option>
                </select>
              </div>
            </div>

            {/* 状態フィルターボタン */}
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                クイックフィルター
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setStatusFilter(null)}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                    statusFilter === null
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  すべて
                </button>
                {statusLabels.map((label, index) => (
                  <button
                    key={index}
                    onClick={() => setStatusFilter(index)}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                      statusFilter === index
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 結果表示 */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-medium text-gray-900">ワールド一覧</h2>
                <span className="text-sm text-gray-500">
                  {filteredAndSortedWorlds.length}件のワールド
                  {searchTerm || statusFilter !== null ? ` (${worlds.length}件中)` : ''}
                </span>
              </div>
            </div>

            {/* ワールドリスト */}
            <div className="divide-y divide-gray-200">
              {loading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                  <p className="mt-2 text-sm text-gray-500">
                    {loadingProgress 
                      ? `ワールド読み込み中... ${loadingProgress.current}/${loadingProgress.total}件`
                      : '読み込み中...'
                    }
                  </p>
                  {loadingProgress && (
                    <div className="mt-4 max-w-xs mx-auto">
                      <div className="bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-indigo-600 h-2 rounded-full transition-all duration-300" 
                          style={{ width: `${(loadingProgress.current / loadingProgress.total) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                </div>
              ) : filteredAndSortedWorlds.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-4xl mb-4">🌍</div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">ワールドが見つかりません</h3>
                  <p className="text-sm text-gray-500">
                    {searchTerm || statusFilter !== null
                      ? '検索条件に一致するワールドが見つかりません。'
                      : 'ワールドデータがまだ収集されていません。'
                    }
                  </p>
                </div>
              ) : (
                currentPageWorlds.map((world) => {
                  const userStatus = world.userStatus?.status || 0
                  const userCleartime = world.userStatus?.cleartime || 0
                  const userVote = world.userStatus?.vote || 0
                  const isLoading = userInfoLoading[world.id]

                  return (
                    <div key={world.id} className="p-6 hover:bg-gray-50 transition-colors">
                      {/* メイン情報行 */}
                      <div className="flex items-start space-x-4">
                        <div className="flex-shrink-0 relative h-20 w-20">
                          <ImageWithFallback
                            src={world.imageUrl || '/placeholder-world.jpg'}
                            alt={world.name}
                            fill
                            className="rounded-lg object-cover"
                          />
                        </div>
                        <div className="flex-grow min-w-0">
                          <div className="flex items-start justify-between">
                            <div className="min-w-0 flex-grow">
                              <Link href={`/world/${world.id}`}>
                                <h3 className="text-lg font-medium text-gray-900 hover:text-indigo-600 cursor-pointer truncate">
                                  {world.name}
                                </h3>
                              </Link>
                              <p className="text-sm text-gray-500">
                                作者: {world.authorName}
                              </p>
                              <p className="mt-1 text-sm text-gray-600 line-clamp-2">
                                {world.description}
                              </p>
                            </div>
                            <div className="flex-shrink-0 text-right text-sm text-gray-500 ml-4">
                              <div>訪問: {world.visitCount?.toLocaleString() || 0}</div>
                              <div>お気に入り: {world.favoriteCount?.toLocaleString() || 0}</div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 評価コントロール */}
                      <div className="mt-4 space-y-4">
                        {/* ステータス選択 */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">状態</label>
                          <div className="flex flex-wrap gap-2">
                            {statusLabels.map((label, index) => (
                              <button
                                key={index}
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  handleStatusChange(world.id, index)
                                }}
                                disabled={isLoading}
                                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                                  userStatus === index
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                                } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                              >
                                {label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* クリア時間選択 */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">クリア時間</label>
                          <div className="flex flex-wrap gap-2">
                            {cleartimeLabels.map((label, index) => (
                              <button
                                key={index}
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  updateUserInfo(world.id, { cleartime: index })
                                }}
                                disabled={isLoading || userStatus !== 5}
                                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                                  userCleartime === index
                                    ? 'bg-green-600 text-white'
                                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                                } ${(isLoading || userStatus !== 5) ? 'opacity-50 cursor-not-allowed' : ''}`}
                              >
                                {label}
                              </button>
                            ))}
                          </div>
                          {userStatus !== 5 && (
                            <p className="text-xs text-gray-500 mt-1">※ クリア状態の場合のみ選択できます</p>
                          )}
                        </div>

                        {/* 評価 */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">評価</label>
                          <div className="flex space-x-2">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                handleVote(world.id, 1)
                              }}
                              disabled={isLoading}
                              className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                                userVote === 1
                                  ? 'bg-green-600 text-white'
                                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-green-50'
                              } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                              👍 Good
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                handleVote(world.id, -1)
                              }}
                              disabled={isLoading}
                              className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                                userVote === -1
                                  ? 'bg-red-600 text-white'
                                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-red-50'
                              } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                              👎 Bad
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* タグ表示 */}
                      {world.tags.length > 0 && (
                        <div className="mt-4">
                          <div className="flex flex-wrap gap-1">
                            {world.tags.slice(0, 5).map((tag) => (
                              <span
                                key={tag}
                                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                              >
                                {tag}
                              </span>
                            ))}
                            {world.tags.length > 5 && (
                              <span className="text-xs text-gray-500">
                                +{world.tags.length - 5}個
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>

            {/* ページング */}
            {!loading && filteredAndSortedWorlds.length > 0 && (
              <div className="px-6 py-4 border-t border-gray-200 bg-white">
                <div className="flex items-center justify-between">
                  <div className="flex-1 flex justify-between sm:hidden">
                    {/* モバイル用ページング */}
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      前へ
                    </button>
                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      次へ
                    </button>
                  </div>
                  <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm text-gray-700">
                        <span className="font-medium">{startIndex + 1}</span>
                        {' - '}
                        <span className="font-medium">{Math.min(endIndex, totalFilteredItems)}</span>
                        {' / '}
                        <span className="font-medium">{totalFilteredItems}</span>
                        {' 件を表示'}
                      </p>
                    </div>
                    <div>
                      <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                        {/* 前のページボタン */}
                        <button
                          onClick={() => handlePageChange(currentPage - 1)}
                          disabled={currentPage === 1}
                          className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <span className="sr-only">前のページ</span>
                          <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                            <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </button>

                        {/* ページ番号 */}
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          let pageNum: number
                          if (totalPages <= 5) {
                            pageNum = i + 1
                          } else if (currentPage <= 3) {
                            pageNum = i + 1
                          } else if (currentPage >= totalPages - 2) {
                            pageNum = totalPages - 4 + i
                          } else {
                            pageNum = currentPage - 2 + i
                          }

                          return (
                            <button
                              key={pageNum}
                              onClick={() => handlePageChange(pageNum)}
                              className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                                currentPage === pageNum
                                  ? 'z-10 bg-indigo-50 border-indigo-500 text-indigo-600'
                                  : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                              }`}
                            >
                              {pageNum}
                            </button>
                          )
                        })}

                        {/* 次のページボタン */}
                        <button
                          onClick={() => handlePageChange(currentPage + 1)}
                          disabled={currentPage === totalPages}
                          className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <span className="sr-only">次のページ</span>
                          <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </nav>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
