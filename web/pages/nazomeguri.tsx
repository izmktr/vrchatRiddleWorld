import Head from 'next/head'
import Link from 'next/link'
import { useEffect, useState, useCallback } from 'react'
import Header from '@/components/Header'

type NazomeguriItem = {
  id: string
  count: number | null
  date: string | null
  worldName: string
  worldId: string
  comment: string
}

const formatDate = (value: string | null): string => {
  if (!value) return '-'
  const date = new Date(value)
  if (isNaN(date.getTime())) return '-'
  return date.toLocaleDateString('ja-JP')
}

export default function NazomeguriPage() {
  const [items, setItems] = useState<NazomeguriItem[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)

  const fetchItems = useCallback(async (targetPage: number) => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: targetPage.toString(),
        limit: '50'
      })
      const response = await fetch(`/api/nazomeguri?${params.toString()}`)
      if (!response.ok) {
        throw new Error('Failed to fetch nazomeguri')
      }
      const data = await response.json()
      setItems(data.items || [])
      setTotalPages(data.totalPages || 1)
    } catch (error) {
      console.error('Failed to fetch nazomeguri:', error)
      setItems([])
      setTotalPages(1)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchItems(page)
  }, [fetchItems, page])

  const handlePrev = () => {
    setPage((prev) => Math.max(1, prev - 1))
  }

  const handleNext = () => {
    setPage((prev) => Math.min(totalPages, prev + 1))
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>謎めぐり一覧 - NazoWeb</title>
        <meta name="description" content="謎めぐりの記録一覧" />
      </Head>

      <Header />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">謎めぐり一覧</h1>
            <p className="text-sm text-gray-600">回数の降順で表示します。</p>
          </div>
          <Link href="/" className="text-sm text-blue-600 hover:text-blue-800">
            ← トップへ戻る
          </Link>
        </div>

        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <span className="text-sm text-gray-600">ページ {page} / {totalPages}</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handlePrev}
                disabled={page <= 1}
                className="px-3 py-1 rounded border border-gray-300 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                前へ
              </button>
              <button
                type="button"
                onClick={handleNext}
                disabled={page >= totalPages}
                className="px-3 py-1 rounded border border-gray-300 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                次へ
              </button>
            </div>
          </div>

          {loading ? (
            <div className="p-6 text-sm text-gray-500">読み込み中...</div>
          ) : items.length === 0 ? (
            <div className="p-6 text-sm text-gray-500">データがありません。</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">回数</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">日付</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ワールド名</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">コメント</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.count ?? '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {formatDate(item.date)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        <div className="flex items-center gap-2">
                          <span>{item.worldName || '-'}</span>
                          {item.worldId && (
                            <Link
                              href={`/world/${item.worldId}`}
                              className="text-blue-600 hover:text-blue-800"
                              aria-label="個別ページを開く"
                              title="個別ページを開く"
                            >
                              🔗
                            </Link>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {item.comment || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
