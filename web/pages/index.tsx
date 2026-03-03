import { useState, useEffect, useCallback } from 'react'
import { useSession, signIn, signOut } from 'next-auth/react'
import Head from 'next/head'
import Image from 'next/image'
import Link from 'next/link'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import ImageWithFallback from '../components/ImageWithFallback'
import Header from '../components/Header'

interface SystemTag {
  _id: string
  tagName: string
  tagDescription: string
}

interface UserStatus {
  status: number // 0:未選択, 1:未訪問, 2:注目, 3:挑戦中, 4:断念, 5:クリア
  cleartime?: number // 0:未選択, 1:30分未満, 2:30～90分, 3:90分～3時間, 4:3～6時間, 5:6時間以上
  vote?: number // -1:BAD, 0:未選択, 1:GOOD
}

interface World {
  id: string
  name: string
  imageUrl?: string
  thumbnailImageUrl?: string
  authorName: string
  tags: string[] // システムタグ名の配列
  systemTags?: SystemTag[] // システムタグの詳細情報
  created_at: string
  labsPublicationDate?: string
  publicationDate?: string
  updated_at: string
  description: string
  visits: number
  favorites: number
  capacity?: number
  recommendedCapacity?: number
  source_url?: string
  userStatus?: UserStatus | null
}

interface UserStatus {
  status: number // 0:未選択, 1:未訪問, 2:注目, 3:挑戦中, 4:断念, 5:クリア
  cleartime?: number // 0:未選択, 1:30分未満, 2:30～90分, 3:90分～3時間, 4:3～6時間, 5:6時間以上
  vote?: number // -1:BAD, 0:未選択, 1:GOOD
}

interface Tag {
  _id: string
  tagName: string
  tagDescription: string
  priority: number
  count?: number
}

export default function Home() {
  const { data: session } = useSession()
  const [worlds, setWorlds] = useState<World[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [selectedTag, setSelectedTag] = useState<string>('all')
  const [selectedAuthor, setSelectedAuthor] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [actualSearchQuery, setActualSearchQuery] = useState<string>('') // 実際に検索に使用するクエリ

  // ソート状態
  const [sortKey, setSortKey] = useState<'updated_at' | 'created_at' | 'visits' | 'favorites'>('created_at')
  
  // ユーザー状態フィルター（ログインユーザー向け）
  const [selectedStatus, setSelectedStatus] = useState<number | 'all'>('all')
  
  // 各ステータスの件数
  const [statusCounts, setStatusCounts] = useState<{[key: string]: number}>({
    all: 0,
    '0': 0,
    '1': 0,
    '2': 0,
    '3': 0,
    '4': 0,
    '5': 0
  })
  
  // タグの処理関数（不要になったため削除）

  // 選択されたタグの名前を取得する関数
  const getSelectedTagName = (): string => {
    if (selectedTag === 'all') return ''
    const tag = tags.find(tag => tag._id === selectedTag)
    return tag ? tag.tagName : selectedTag
  }

  // 安全な日付フォーマット関数
  const formatSafeDate = (dateString: string): string => {
    if (!dateString) return '不明'
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) return '不明'
      return format(date, 'yyyy/MM/dd', { locale: ja })
    } catch (error) {
      return '不明'
    }
  }

  const fetchTags = useCallback(async () => {
    try {
      if (process.env.NODE_ENV === 'development') {
        console.log('Fetching tags from /api/tags...')
      }
      
      const response = await fetch('/api/tags')
      
      if (process.env.NODE_ENV === 'development') {
        console.log('Tags API response status:', response.status)
      }
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('Tags API error response:', errorText)
        throw new Error(`Failed to fetch tags: ${response.status} ${response.statusText}`)
      }
      
      const data = await response.json()
      
      if (process.env.NODE_ENV === 'development') {
        console.log('Tags API response data:', data)
      }
      
      // システムタグをそのまま設定
      setTags(data.tags || [])
    } catch (error) {
      console.error('Error fetching tags:', error)
      // エラー時もデフォルト値を設定してアプリケーションを継続
      setTags([])
    }
  }, [])

  const fetchWorlds = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '12',
        sort: sortKey,
        ...(selectedTag !== 'all' && { tag: selectedTag }),
        ...(actualSearchQuery.trim() && { search: actualSearchQuery.trim() }),
        ...(selectedAuthor.trim() && { author: selectedAuthor.trim() }),
        ...(session?.user && selectedStatus !== 'all' && { userStatus: selectedStatus.toString() })
      })
      
      const response = await fetch(`/api/worlds?${params}`)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()
      console.log('Fetched worlds data:', data) // デバッグ用
      console.log('Total worlds:', data.worlds?.length || 0)
      console.log('Worlds with userStatus:', data.worlds?.filter((w: any) => w.userStatus).length || 0)
      setWorlds(data.worlds || [])
      setTotalPages(data.totalPages || 0)
    } catch (error) {
      console.error('Error fetching worlds:', error)
      setWorlds([])
      setTotalPages(0)
    } finally {
      setLoading(false)
    }
  }, [page, sortKey, selectedTag, actualSearchQuery, selectedAuthor, session?.user, selectedStatus])

  const fetchStatusCounts = useCallback(async () => {
    if (!session?.user) {
      setStatusCounts({
        all: 0,
        '0': 0,
        '1': 0,
        '2': 0,
        '3': 0,
        '4': 0,
        '5': 0
      })
      return
    }

    try {
      const counts: {[key: string]: number} = {
        all: 0,
        '0': 0,
        '1': 0,
        '2': 0,
        '3': 0,
        '4': 0,
        '5': 0
      }

      // 各ステータスの件数を並行して取得
      const promises = ['all', '0', '1', '2', '3', '4', '5'].map(async (status) => {
          const params = new URLSearchParams({
            page: '1',
            limit: '1',
            sort: sortKey,
            ...(selectedTag !== 'all' && { tag: selectedTag }),
            ...(actualSearchQuery.trim() && { search: actualSearchQuery.trim() }),
            ...(selectedAuthor.trim() && { author: selectedAuthor.trim() }),
            ...(status !== 'all' && { userStatus: status })
          })
          
          const response = await fetch(`/api/worlds?${params}`)
        if (response.ok) {
          const data = await response.json()
          counts[status] = data.total || 0
        }
      })

      await Promise.all(promises)
      setStatusCounts(counts)
    } catch (error) {
      console.error('Error fetching status counts:', error)
    }
  }, [session?.user, selectedTag, actualSearchQuery, selectedAuthor, sortKey])

  useEffect(() => {
    fetchTags()
  }, [fetchTags])

  useEffect(() => {
    fetchWorlds()
  }, [fetchWorlds])

  useEffect(() => {
    fetchStatusCounts()
  }, [fetchStatusCounts])

  const handleTagChange = (tag: string) => {
    setSelectedTag(tag)
    setSelectedAuthor('') // タグ変更時に制作者フィルタをクリア
    setPage(1)
  }

  const handleAuthorClick = (authorName: string, event: React.MouseEvent) => {
    event.preventDefault() // リンクのデフォルト動作を防ぐ
    event.stopPropagation() // 親要素（Link）へのイベント伝播を阻止
    setSelectedAuthor(authorName)
    setSelectedTag('all') // 制作者フィルタ時にタグフィルタをクリア
    setPage(1)
  }

  const clearFilters = () => {
    setSelectedTag('all')
    setSelectedAuthor('')
    setSearchQuery('')
    setActualSearchQuery('')
    setSelectedStatus('all')
    setPage(1)
  }

  const handleSearch = () => {
    setActualSearchQuery(searchQuery)
    setPage(1)
    // fetchWorldsは依存関係のuseEffectで自動的に呼ばれる
  }

  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
  }

  const handleSearchKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  const handleSortChange = (key: 'updated_at' | 'created_at' | 'visits' | 'favorites') => {
    setSortKey(key)
    setPage(1)
  }

  return (
    <>
      <Head>
        <title>VRChat謎解きワールド</title>
        <meta name="description" content="VRChatの謎解きワールドを探索しよう" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* ヘッダー */}
        <Header />

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* 検索フィールド */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-4">検索</h2>
            <div className="flex gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={handleSearchInputChange}
                onKeyPress={handleSearchKeyPress}
                placeholder="ワールド名、説明、制作者名で検索..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-vrchat-secondary focus:border-transparent"
              />
              <button
                onClick={handleSearch}
                className="px-6 py-2 bg-vrchat-secondary text-white rounded-lg hover:bg-orange-600 transition-colors"
              >
                検索
              </button>
            </div>
          </div>

          {/* 現在のフィルタ状態 */}
          {(selectedAuthor || selectedTag !== 'all' || actualSearchQuery.trim() || (session?.user && selectedStatus !== 'all')) && (
            <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between">
                <div className="flex flex-wrap gap-2 items-center">
                  <span className="text-sm font-medium text-blue-800">現在のフィルタ:</span>
                  {selectedAuthor && (
                    <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                      制作者: {selectedAuthor}
                    </span>
                  )}
                  {selectedTag !== 'all' && (
                    <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                      タグ: {getSelectedTagName()}
                    </span>
                  )}
                  {actualSearchQuery.trim() && (
                    <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm">
                      検索: {actualSearchQuery}
                    </span>
                  )}
                  {session?.user && selectedStatus !== 'all' && (
                    <span className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm">
                      状態: {selectedStatus === 0 ? '未選択' :
                             selectedStatus === 1 ? '未訪問' :
                             selectedStatus === 2 ? '注目' :
                             selectedStatus === 3 ? '挑戦中' :
                             selectedStatus === 4 ? '断念' :
                             selectedStatus === 5 ? 'クリア' : '不明'}
                    </span>
                  )}
                </div>
                <button
                  onClick={clearFilters}
                  className="px-3 py-1 text-sm text-blue-600 hover:text-blue-800 hover:underline"
                >
                  フィルタをクリア
                </button>
              </div>
            </div>
          )}

          {/* ユーザー状態フィルター（ログイン時のみ表示） */}
          {session?.user && (
            <div className="mb-8">
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedStatus('all')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    selectedStatus === 'all'
                      ? 'bg-vrchat-secondary text-white'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  すべて ({statusCounts.all})
                </button>
                <button
                  onClick={() => setSelectedStatus(0)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    selectedStatus === 0
                      ? 'bg-gray-600 text-white'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  未選択 ({statusCounts['0']})
                </button>
                <button
                  onClick={() => setSelectedStatus(1)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    selectedStatus === 1
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  未訪問 ({statusCounts['1']})
                </button>
                <button
                  onClick={() => setSelectedStatus(2)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    selectedStatus === 2
                      ? 'bg-purple-600 text-white'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  注目 ({statusCounts['2']})
                </button>
                <button
                  onClick={() => setSelectedStatus(3)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    selectedStatus === 3
                      ? 'bg-yellow-600 text-white'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  挑戦中 ({statusCounts['3']})
                </button>
                <button
                  onClick={() => setSelectedStatus(4)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    selectedStatus === 4
                      ? 'bg-red-600 text-white'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  断念 ({statusCounts['4']})
                </button>
                <button
                  onClick={() => setSelectedStatus(5)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    selectedStatus === 5
                      ? 'bg-green-600 text-white'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  クリア ({statusCounts['5']})
                </button>
              </div>
            </div>
          )}

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

          {/* タグ検索 */}
          <details className="mb-8 rounded-lg border border-gray-200 bg-white">
            <summary className="cursor-pointer select-none px-4 py-3 text-lg font-semibold">
              タグ検索
            </summary>
            <div className="px-4 pb-4">
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleTagChange('all')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    selectedTag === 'all'
                      ? 'bg-vrchat-secondary text-white'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  すべて
                </button>
                {tags.length > 0 ? (
                  tags.map((tag) => (
                    <button
                      key={tag._id}
                      onClick={() => handleTagChange(tag._id)}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                        selectedTag === tag._id
                          ? 'bg-vrchat-secondary text-white'
                          : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {tag.tagName} {tag.count !== undefined ? `(${tag.count})` : ''}
                    </button>
                  ))
                ) : (
                  <div className="text-sm text-gray-500 px-4 py-2 bg-gray-50 rounded-lg">
                    タグの読み込み中...
                  </div>
                )}
              </div>
            </div>
          </details>

          {/* ワールド一覧 */}
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-vrchat-secondary"></div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {worlds.map((world) => (
                  <Link key={world.id} href={`/world/${world.id}`}>
                    <div className="card p-6 cursor-pointer">
                      {/* サムネイル */}
                      <div className="relative h-48 mb-4 rounded-lg overflow-hidden">
                        {world.thumbnailImageUrl ? (
                          <ImageWithFallback
                            src={world.thumbnailImageUrl}
                            alt={world.name}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full text-gray-500 bg-gray-200">
                            <div className="text-center">
                              <div className="text-4xl mb-2">🖼️</div>
                              <div className="text-sm">画像なし</div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* タイトル */}
                      <h3 className="text-lg font-semibold mb-2 line-clamp-2">
                        {world.name}
                      </h3>

                      {/* 制作者と基本情報 */}
                      <div className="flex flex-wrap items-center justify-between gap-3 mb-3 text-sm">
                        <div className="text-gray-600">
                          制作者: 
                          <button
                            onClick={(e) => handleAuthorClick(world.authorName, e)}
                            className="text-blue-600 hover:text-blue-800 hover:underline ml-1 cursor-pointer"
                          >
                            {world.authorName}
                          </button>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center text-gray-600">
                            <span className="mr-1">👥</span>
                            <span>{world.recommendedCapacity || '?'}/{world.capacity || '?'}</span>
                          </div>
                          {world.source_url && (
                            <a 
                              href={world.source_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center justify-center px-2 py-0 border-2 border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                              title="VRChatで開く"
                            >
                              <span className="font-medium">VRChat</span>
                            </a>
                          )}
                        </div>
                      </div>

                      {/* システムタグ */}
                      {world.systemTags && world.systemTags.length > 0 && (
                        <div className="mb-3">
                          <div className="flex flex-wrap gap-1">
                            {world.systemTags.slice(0, 3).map((tag) => (
                              <span 
                                key={tag._id}
                                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800"
                                title={tag.tagDescription}
                              >
                                {tag.tagName}
                              </span>
                            ))}
                            {world.systemTags.length > 3 && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                                +{world.systemTags.length - 3}
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* 説明 */}
                      <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                        {world.description || '説明がありません'}
                      </p>

                      {/* 日付 */}
                        <div className="text-xs text-gray-500">
                        <div className="flex gap-4">
                          <span>公開日: {formatSafeDate(world.publicationDate || world.labsPublicationDate || world.created_at)}</span>
                          <span>更新日: {formatSafeDate(world.updated_at)}</span>
                        </div>
                        </div>

                      {/* 訪問者数・お気に入り数 */}
                      <div className="flex items-center gap-4 text-xs text-gray-600 mb-2">
                        <span title="訪問者数" className="flex items-center">
                          <span className="mr-1">👁</span>{world.visits?.toLocaleString?.() ?? world.visits ?? 0}
                        </span>
                        <span title="お気に入り数" className="flex items-center">
                          <span className="mr-1">❤️</span>{world.favorites?.toLocaleString?.() ?? world.favorites ?? 0}
                        </span>
                      </div>

                      {/* ユーザー状態 */}
                      {world.userStatus && (
                        <div className="flex items-center gap-2 mb-2">
                          {/* 状態バッジ */}
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            world.userStatus.status === 0 ? 'bg-gray-100 text-gray-600' :
                            world.userStatus.status === 1 ? 'bg-blue-100 text-blue-600' :
                            world.userStatus.status === 2 ? 'bg-purple-100 text-purple-600' :
                            world.userStatus.status === 3 ? 'bg-yellow-100 text-yellow-600' :
                            world.userStatus.status === 4 ? 'bg-red-100 text-red-600' :
                            world.userStatus.status === 5 ? 'bg-green-100 text-green-600' :
                            'bg-gray-100 text-gray-600'
                          }`}>
                            {world.userStatus.status === 0 ? '未選択' :
                             world.userStatus.status === 1 ? '未訪問' :
                             world.userStatus.status === 2 ? '注目' :
                             world.userStatus.status === 3 ? '挑戦中' :
                             world.userStatus.status === 4 ? '断念' :
                             world.userStatus.status === 5 ? 'クリア' : '不明'}
                          </span>

                          {/* クリア時間（クリア時のみ表示） */}
                          {world.userStatus.status === 5 && world.userStatus.cleartime && world.userStatus.cleartime > 0 && (
                            <span className="px-2 py-1 rounded-full text-xs bg-green-50 text-green-700">
                              {world.userStatus.cleartime === 1 ? '30分以下' :
                               world.userStatus.cleartime === 2 ? '30～90分' :
                               world.userStatus.cleartime === 3 ? '90分～3時間' :
                               world.userStatus.cleartime === 4 ? '3～6時間' :
                               world.userStatus.cleartime === 5 ? '6時間以上' : ''}
                            </span>
                          )}

                          {/* 投票（Good/Bad） */}
                          {world.userStatus.vote && world.userStatus.vote !== 0 && (
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              world.userStatus.vote === 1 ? 'bg-blue-50 text-blue-700' :
                              world.userStatus.vote === -1 ? 'bg-orange-50 text-orange-700' :
                              'bg-gray-50 text-gray-700'
                            }`}>
                              {world.userStatus.vote === 1 ? '👍 Good' :
                               world.userStatus.vote === -1 ? '👎 Bad' : ''}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </Link>
                ))}
              </div>

              {/* ページネーション */}
              {totalPages > 1 && (
                <div className="flex justify-center space-x-2">
                  <button
                    onClick={() => setPage(page - 1)}
                    disabled={page <= 1}
                    className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    前へ
                  </button>
                  <span className="px-4 py-2">
                    {page} / {totalPages}
                  </span>
                  <button
                    onClick={() => setPage(page + 1)}
                    disabled={page >= totalPages}
                    className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    次へ
                  </button>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </>
  )
}
