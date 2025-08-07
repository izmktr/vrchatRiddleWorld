import { useState, useEffect } from 'react'
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

interface World {
  id: string
  name: string
  imageUrl?: string
  thumbnailImageUrl?: string
  authorName: string
  tags: string[] // システムタグ名の配列
  systemTags?: SystemTag[] // システムタグの詳細情報
  created_at: string
  updated_at: string
  description: string
  visits: number
  favorites: number
  capacity?: number
  recommendedCapacity?: number
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

  useEffect(() => {
    fetchTags()
  }, [])

  useEffect(() => {
    fetchWorlds()
  }, [selectedTag, page, searchQuery, selectedAuthor])

  const fetchTags = async () => {
    try {
      const response = await fetch('/api/admin/tags')
      if (!response.ok) {
        throw new Error('Failed to fetch tags')
      }
      const data = await response.json()
      // システムタグをそのまま設定
      setTags(data.tags || [])
    } catch (error) {
      console.error('Error fetching tags:', error)
      setTags([])
    }
  }

  const fetchWorlds = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '12',
        ...(selectedTag !== 'all' && { tag: selectedTag }),
        ...(searchQuery.trim() && { search: searchQuery.trim() }),
        ...(selectedAuthor.trim() && { author: selectedAuthor.trim() })
      })
      
      const response = await fetch(`/api/worlds?${params}`)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()
      console.log('Fetched worlds data:', data) // デバッグ用
      setWorlds(data.worlds || [])
      setTotalPages(data.totalPages || 0)
    } catch (error) {
      console.error('Error fetching worlds:', error)
      setWorlds([])
      setTotalPages(0)
    } finally {
      setLoading(false)
    }
  }

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
    setPage(1)
  }

  const handleSearch = () => {
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
          {(selectedAuthor || selectedTag !== 'all' || searchQuery.trim()) && (
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
                  {searchQuery.trim() && (
                    <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm">
                      検索: {searchQuery}
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

          {/* タグ検索 */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-4">タグ検索</h2>
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
              {tags.map((tag) => (
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
              ))}
            </div>
          </div>

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

                      {/* 制作者 */}
                      <p className="text-sm text-gray-600 mb-2">
                        制作者: 
                        <button
                          onClick={(e) => handleAuthorClick(world.authorName, e)}
                          className="text-blue-600 hover:text-blue-800 hover:underline ml-1 cursor-pointer"
                        >
                          {world.authorName}
                        </button>
                      </p>

                      {/* 定員情報 */}
                      <div className="flex gap-4 mb-3 text-sm text-gray-700">
                        <div>
                          <span className="font-medium">定員:</span> {world.capacity || '不明'}
                        </div>
                        <div>
                          <span className="font-medium">推奨:</span> {world.recommendedCapacity || '不明'}
                        </div>
                      </div>

                      {/* 説明 */}
                      <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                        {world.description || '説明がありません'}
                      </p>

                      {/* 日付 */}
                      <div className="text-xs text-gray-500">
                        <div>
                          公開日: {formatSafeDate(world.created_at)}
                        </div>
                        <div>
                          更新日: {formatSafeDate(world.updated_at)}
                        </div>
                      </div>
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
