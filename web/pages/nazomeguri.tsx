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

type NextNazomeguriItem = NazomeguriItem & {
  thumbnailImageUrl: string
  vrchatUrl: string
}

const formatDate = (value: string | null): string => {
  if (!value) return '-'
  const date = new Date(value)
  if (isNaN(date.getTime())) return '-'
  return date.toLocaleDateString('ja-JP')
}

export default function NazomeguriPage() {
  const [items, setItems] = useState<NazomeguriItem[]>([])
  const [nextItem, setNextItem] = useState<NextNazomeguriItem | null>(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [pageInput, setPageInput] = useState('1')
  const [pageDirty, setPageDirty] = useState(false)

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
      setNextItem(data.nextItem || null)
    } catch (error) {
      console.error('Failed to fetch nazomeguri:', error)
      setItems([])
      setTotalPages(1)
      setNextItem(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchItems(page)
  }, [fetchItems, page])

  useEffect(() => {
    if (!pageDirty) {
      setPageInput(String(page))
    }
  }, [page, pageDirty])

  const handlePrev = () => {
    setPage((prev) => Math.max(1, prev - 1))
    setPageDirty(false)
  }

  const handleNext = () => {
    setPage((prev) => Math.min(totalPages, prev + 1))
    setPageDirty(false)
  }

  const handlePageInputChange = (value: string) => {
    setPageInput(value)
    setPageDirty(true)
  }

  const applyPageInput = () => {
    const parsed = Number(pageInput)
    if (Number.isNaN(parsed)) return
    const nextPage = Math.min(Math.max(1, Math.floor(parsed)), totalPages)
    setPage(nextPage)
    setPageInput(String(nextPage))
    setPageDirty(false)
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
          <Link href="/" className="text-sm text-vrchat-secondary hover:text-orange-600">
            ← トップへ戻る
          </Link>
        </div>

        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-200 bg-gray-50">
            <h2 className="text-lg font-bold text-vrchat-primary mb-3">次回 謎めぐり</h2>
            {nextItem ? (
              <div className="flex flex-col items-center gap-4">
                <p className="text-xl sm:text-2xl font-semibold text-gray-900 text-center">
                  {formatDate(nextItem.date)} {nextItem.worldName || '-'}
                </p>
                <div className="w-full max-w-2xl mx-auto">
                  {nextItem.thumbnailImageUrl ? (
                    <img
                      src={nextItem.thumbnailImageUrl}
                      alt={nextItem.worldName || 'ワールドサムネイル'}
                      className="w-full aspect-video rounded border border-gray-200 object-cover bg-white"
                    />
                  ) : (
                    <div className="w-full aspect-video rounded border border-gray-200 bg-white grid place-items-center text-sm text-gray-500">
                      サムネイルなし
                    </div>
                  )}
                </div>
                <div className="w-full max-w-2xl mx-auto flex flex-wrap items-center justify-center gap-3">
                  {nextItem.vrchatUrl ? (
                    <a
                      href={nextItem.vrchatUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center rounded-lg border-2 border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      VRChat
                    </a>
                  ) : (
                    <span className="inline-flex items-center justify-center rounded-md bg-gray-300 px-4 py-2 text-sm font-medium text-white">
                      VRChatリンクなし
                    </span>
                  )}
                  {nextItem.worldId ? (
                    <Link
                      href={`/world/${nextItem.worldId}`}
                      className="inline-flex items-center justify-center rounded-lg border-2 border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      個別ページ
                    </Link>
                  ) : (
                    <span className="inline-flex items-center justify-center rounded-md bg-gray-300 px-4 py-2 text-sm font-medium text-white">
                      個別ページなし
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-600">当日以降の予定はありません。</p>
            )}
          </div>

          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span>ページ</span>
              <input
                type="number"
                min={1}
                max={totalPages}
                value={pageInput}
                onChange={(event) => handlePageInputChange(event.target.value)}
                className="w-16 rounded border border-gray-300 px-2 py-1 text-sm"
              />
              <span>/ {totalPages}</span>
              <button
                type="button"
                onClick={applyPageInput}
                disabled={!pageDirty}
                className="px-3 py-1 rounded border border-gray-300 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                変更
              </button>
            </div>
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
                              className="text-vrchat-secondary hover:text-orange-600"
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

          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span>ページ</span>
              <input
                type="number"
                min={1}
                max={totalPages}
                value={pageInput}
                onChange={(event) => handlePageInputChange(event.target.value)}
                className="w-16 rounded border border-gray-300 px-2 py-1 text-sm"
              />
              <span>/ {totalPages}</span>
              <button
                type="button"
                onClick={applyPageInput}
                disabled={!pageDirty}
                className="px-3 py-1 rounded border border-gray-300 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                変更
              </button>
            </div>
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
        </div>
      </main>
    </div>
  )
}
