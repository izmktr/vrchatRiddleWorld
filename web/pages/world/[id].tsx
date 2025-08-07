import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import Image from 'next/image'
import Link from 'next/link'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import ImageWithFallback from '../../components/ImageWithFallback'

interface SystemTag {
  _id: string
  tagName: string
  tagDescription: string
  priority: number
}

interface WorldDetail {
  id: string
  name: string
  imageUrl?: string
  thumbnailImageUrl?: string
  authorName: string
  authorId: string
  tags: string[] // VRC由来のタグ（後方互換性）
  systemTags?: SystemTag[] // システムタグ
  created_at: string
  updated_at: string
  description: string
  visits: number
  favorites: number
  popularity: number
  capacity: number
  recommendedCapacity: number
  releaseStatus: string
  organization: string
  labsPublicationDate: string
  publicationDate: string
  version: number
  heat: number
  featured: boolean
  scraped_at: string
  source_url: string
}

export default function WorldDetail() {
  const router = useRouter()
  const { id } = router.query
  const { data: session } = useSession()
  const [world, setWorld] = useState<WorldDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [showDebugInfo, setShowDebugInfo] = useState(false)

  useEffect(() => {
    if (id) {
      fetchWorld()
    }
  }, [id])

  const fetchWorld = async () => {
    try {
      const response = await fetch(`/api/worlds/${id}`)
      if (response.ok) {
        const data = await response.json()
        setWorld(data)
      }
    } catch (error) {
      console.error('Error fetching world:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-vrchat-secondary"></div>
      </div>
    )
  }

  if (!world) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">ワールドが見つかりません</h1>
          <Link href="/" className="btn-primary">
            ホームに戻る
          </Link>
        </div>
      </div>
    )
  }

  // タグの処理関数
  const processTag = (tag: string): string | null => {
    // system_approvedは非表示
    if (tag === 'system_approved') {
      return null;
    }
    // author_tag_で始まる場合はプレフィックスを削除
    if (tag.startsWith('author_tag_')) {
      return tag.replace('author_tag_', '');
    }
    return tag;
  }

  // 日付の安全な処理関数
  const formatSafeDate = (dateString: string): string => {
    if (!dateString || dateString.trim() === '') return '不明'
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) return '不明'
      return format(date, 'yyyy年MM月dd日 HH:mm', { locale: ja })
    } catch {
      return '不明'
    }
  }

  return (
    <>
      <Head>
        <title>{world.name} - VRChat謎解きワールド</title>
        <meta name="description" content={world.description} />
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* ヘッダー */}
        <header className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-4">
                <Link href="/" className="text-vrchat-secondary hover:text-orange-600">
                  ← 戻る
                </Link>
                <h1 className="text-xl font-bold text-vrchat-primary">
                  ワールド詳細
                </h1>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            {/* メイン画像 */}
            <div className="relative h-96 bg-gray-200">
              {world.thumbnailImageUrl || world.imageUrl ? (
                <ImageWithFallback
                  src={world.thumbnailImageUrl || world.imageUrl || ''}
                  alt={world.name}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  <div className="text-center">
                    <div className="text-6xl mb-4">🖼️</div>
                    <div className="text-lg">画像なし</div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-8">
              {/* タイトル */}
              <h1 className="text-3xl font-bold text-gray-900 mb-4">
                {world.name}
              </h1>

              {/* 制作者と基本情報 */}
              <div className="flex flex-wrap items-center gap-4 mb-6 text-sm text-gray-600">
                <div className="flex items-center">
                  <span className="font-medium">制作者:</span>
                  <span className="ml-2 text-gray-900">{world.authorName}</span>
                </div>
                <div className="flex items-center">
                  <span className="mr-1">👥</span>
                  <span>{world.recommendedCapacity}/{world.capacity}</span>
                </div>
                {world.source_url && (
                  <div className="flex items-center">
                    <a 
                      href={world.source_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center text-blue-600 hover:text-blue-800 transition-colors"
                      title="VRChatで開く"
                    >
                      <span className="mr-1">🔗</span>
                      <span>VRChat</span>
                    </a>
                  </div>
                )}
              </div>

              {/* 説明 */}
              <div className="mb-8">
                <h2 className="text-lg font-semibold mb-4">説明</h2>
                <p className="text-gray-700 whitespace-pre-wrap">{world.description}</p>
              </div>

              {/* システムタグ */}
              {world.systemTags && world.systemTags.length > 0 && (
                <div className="mb-8">
                  <h2 className="text-lg font-semibold mb-4">カテゴリ</h2>
                  <div className="flex flex-wrap gap-2">
                    {world.systemTags.map((tag: SystemTag) => (
                      <span 
                        key={tag._id} 
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-indigo-100 text-indigo-800 hover:bg-indigo-200 transition-colors"
                        title={tag.tagDescription}
                      >
                        {tag.tagName}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* VRC由来のタグ（古いデータとの互換性） */}
              {world.tags && world.tags.length > 0 && (
                <div className="mb-8">
                  <h2 className="text-lg font-semibold mb-4">VRCタグ</h2>
                  <div className="flex flex-wrap gap-2">
                    {world.tags
                      .map((tag: string) => processTag(tag))
                      .filter((tag): tag is string => tag !== null)
                      .map((displayTag: string, index: number) => (
                        <span 
                          key={index} 
                          className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700"
                        >
                          {displayTag}
                        </span>
                      ))}
                  </div>
                </div>
              )}

              {/* 基本情報 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div>
                  <h2 className="text-lg font-semibold mb-4">基本情報</h2>
                  <dl className="space-y-2">
                    <div>
                      <dt className="text-sm font-medium text-gray-500">制作者</dt>
                      <dd className="text-sm text-gray-900">{world.authorName}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">ワールドID</dt>
                      <dd className="text-sm text-gray-900 font-mono">{world.id}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">制作者ID</dt>
                      <dd className="text-sm text-gray-900 font-mono">{world.authorId}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">リリース状態</dt>
                      <dd className="text-sm text-gray-900">{world.releaseStatus}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">バージョン</dt>
                      <dd className="text-sm text-gray-900">{world.version}</dd>
                    </div>
                  </dl>
                </div>

                <div>
                  <h2 className="text-lg font-semibold mb-4">統計情報</h2>
                  <dl className="space-y-2">
                    <div>
                      <dt className="text-sm font-medium text-gray-500">訪問者数</dt>
                      <dd className="text-sm text-gray-900">{world.visits.toLocaleString()}人</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">お気に入り数</dt>
                      <dd className="text-sm text-gray-900">{world.favorites.toLocaleString()}人</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">人気度</dt>
                      <dd className="text-sm text-gray-900">{world.popularity}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">ヒート値</dt>
                      <dd className="text-sm text-gray-900">{world.heat}</dd>
                    </div>
                  </dl>
                </div>
              </div>

              {/* 日付情報 */}
              <div className="mb-8">
                <h2 className="text-lg font-semibold mb-4">日付情報</h2>
                <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">作成日</dt>
                    <dd className="text-sm text-gray-900">
                      {formatSafeDate(world.created_at)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">更新日</dt>
                    <dd className="text-sm text-gray-900">
                      {formatSafeDate(world.updated_at)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Labs公開日</dt>
                    <dd className="text-sm text-gray-900">
                      {formatSafeDate(world.labsPublicationDate)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">一般公開日</dt>
                    <dd className="text-sm text-gray-900">
                      {formatSafeDate(world.publicationDate)}
                    </dd>
                  </div>
                </dl>
              </div>

              {/* デバッグ情報（開発環境のみ） */}
              {process.env.NODE_ENV === 'development' && (
                <div className="mt-8">
                  <button
                    onClick={() => setShowDebugInfo(!showDebugInfo)}
                    className="text-xs text-gray-400 hover:text-gray-600 underline cursor-pointer"
                  >
                    {showDebugInfo ? 'デバッグ情報を隠す' : 'デバッグ情報を表示'}
                  </button>
                  {showDebugInfo && (
                    <div className="mt-2 p-4 bg-gray-100 rounded-lg">
                      <h2 className="text-lg font-semibold mb-4">デバッグ情報</h2>
                      <pre className="text-xs overflow-auto">
                        {JSON.stringify(world, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </>
  )
}
