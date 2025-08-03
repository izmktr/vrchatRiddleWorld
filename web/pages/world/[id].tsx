import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import Image from 'next/image'
import Link from 'next/link'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import ImageWithFallback from '../../components/ImageWithFallback'

interface WorldDetail {
  id: string
  timestamp: string
  source: string
  raw_data: {
    id: string
    name: string
    description: string
    authorName: string
    authorId: string
    capacity: number
    recommendedCapacity: number
    visits: number
    popularity: number
    heat: number
    favorites: number
    publicationDate: string
    labsPublicationDate: string
    created_at: string
    updated_at: string
    version: number
    releaseStatus: string
    imageUrl?: string
    thumbnailImageUrl?: string
    tags: string[]
    instances: any[]
    [key: string]: any
  }
}

export default function WorldDetail() {
  const router = useRouter()
  const { id } = router.query
  const { data: session } = useSession()
  const [world, setWorld] = useState<WorldDetail | null>(null)
  const [loading, setLoading] = useState(true)

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

  const { raw_data } = world

  return (
    <>
      <Head>
        <title>{raw_data.name} - VRChat謎解きワールド</title>
        <meta name="description" content={raw_data.description} />
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
              {raw_data.imageUrl ? (
                <ImageWithFallback
                  src={raw_data.imageUrl}
                  alt={raw_data.name}
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
                {raw_data.name}
              </h1>

              {/* 基本情報 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div>
                  <h2 className="text-lg font-semibold mb-4">基本情報</h2>
                  <dl className="space-y-2">
                    <div>
                      <dt className="text-sm font-medium text-gray-500">制作者</dt>
                      <dd className="text-sm text-gray-900">{raw_data.authorName}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">ワールドID</dt>
                      <dd className="text-sm text-gray-900 font-mono">{raw_data.id}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">制作者ID</dt>
                      <dd className="text-sm text-gray-900 font-mono">{raw_data.authorId}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">リリース状態</dt>
                      <dd className="text-sm text-gray-900">{raw_data.releaseStatus}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">バージョン</dt>
                      <dd className="text-sm text-gray-900">{raw_data.version}</dd>
                    </div>
                  </dl>
                </div>

                <div>
                  <h2 className="text-lg font-semibold mb-4">統計情報</h2>
                  <dl className="space-y-2">
                    <div>
                      <dt className="text-sm font-medium text-gray-500">訪問者数</dt>
                      <dd className="text-sm text-gray-900">{raw_data.visits.toLocaleString()}人</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">お気に入り数</dt>
                      <dd className="text-sm text-gray-900">{raw_data.favorites.toLocaleString()}人</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">人気度</dt>
                      <dd className="text-sm text-gray-900">{raw_data.popularity}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">ヒート値</dt>
                      <dd className="text-sm text-gray-900">{raw_data.heat}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">定員</dt>
                      <dd className="text-sm text-gray-900">
                        {raw_data.capacity}人 (推奨: {raw_data.recommendedCapacity}人)
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>

              {/* 説明 */}
              <div className="mb-8">
                <h2 className="text-lg font-semibold mb-4">説明</h2>
                <p className="text-gray-700 whitespace-pre-wrap">{raw_data.description}</p>
              </div>

              {/* タグ */}
              <div className="mb-8">
                <h2 className="text-lg font-semibold mb-4">タグ</h2>
                <div className="flex flex-wrap gap-2">
                  {raw_data.tags.map((tag) => (
                    <span key={tag} className="tag">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* 日付情報 */}
              <div className="mb-8">
                <h2 className="text-lg font-semibold mb-4">日付情報</h2>
                <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">作成日</dt>
                    <dd className="text-sm text-gray-900">
                      {format(new Date(raw_data.created_at), 'yyyy年MM月dd日 HH:mm', { locale: ja })}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">更新日</dt>
                    <dd className="text-sm text-gray-900">
                      {format(new Date(raw_data.updated_at), 'yyyy年MM月dd日 HH:mm', { locale: ja })}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Labs公開日</dt>
                    <dd className="text-sm text-gray-900">
                      {format(new Date(raw_data.labsPublicationDate), 'yyyy年MM月dd日 HH:mm', { locale: ja })}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">一般公開日</dt>
                    <dd className="text-sm text-gray-900">
                      {format(new Date(raw_data.publicationDate), 'yyyy年MM月dd日 HH:mm', { locale: ja })}
                    </dd>
                  </div>
                </dl>
              </div>

              {/* デバッグ情報（開発環境のみ） */}
              {process.env.NODE_ENV === 'development' && (
                <div className="mt-8 p-4 bg-gray-100 rounded-lg">
                  <h2 className="text-lg font-semibold mb-4">デバッグ情報</h2>
                  <pre className="text-xs overflow-auto">
                    {JSON.stringify(world, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </>
  )
}
