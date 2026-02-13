import Head from 'next/head'
import Link from 'next/link'
import { useEffect, useState, useCallback } from 'react'
import { useSession, signIn } from 'next-auth/react'
import { useRouter } from 'next/router'
import Header from '@/components/Header'

type NazomeguriDefaults = {
  count: number
  date: string
}

type NazomeguriPrevious = {
  count: number | null
  date: string | null
  worldName: string
  worldId: string
  comment: string
}

type NazomeguriWorld = {
  id: string
  name: string
  authorName: string
}

const formatDateInput = (value: string): string => {
  const date = new Date(value)
  if (isNaN(date.getTime())) return ''
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const getNextWednesdayInput = (value: string): string => {
  const base = new Date(value)
  if (isNaN(base.getTime())) return ''
  const date = new Date(base.getFullYear(), base.getMonth(), base.getDate())
  const day = date.getDay()
  const daysUntilWednesday = (3 - day + 7) % 7 || 7
  date.setDate(date.getDate() + daysUntilWednesday)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const dayOfMonth = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${dayOfMonth}`
}

export default function AdminNazomeguri() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [isAdminUser, setIsAdminUser] = useState(false)
  const [adminCheckLoading, setAdminCheckLoading] = useState(true)

  const [previous, setPrevious] = useState<NazomeguriPrevious | null>(null)
  const [defaults, setDefaults] = useState<NazomeguriDefaults | null>(null)

  const [count, setCount] = useState('')
  const [date, setDate] = useState('')
  const [worldName, setWorldName] = useState('')
  const [worldId, setWorldId] = useState('')
  const [comment, setComment] = useState('')

  const [searchLoading, setSearchLoading] = useState(false)
  const [searchResults, setSearchResults] = useState<NazomeguriWorld[]>([])
  const [showSearchModal, setShowSearchModal] = useState(false)

  const [submitLoading, setSubmitLoading] = useState(false)
  const [submitMessage, setSubmitMessage] = useState('')

  const checkAdminStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/check')
      if (response.ok) {
        const data = await response.json()
        setIsAdminUser(data.isAdmin)
        if (!data.isAdmin) {
          router.push('/')
        }
      } else {
        setIsAdminUser(false)
        router.push('/')
      }
    } catch (error) {
      console.error('Admin check failed:', error)
      setIsAdminUser(false)
      router.push('/')
    } finally {
      setAdminCheckLoading(false)
    }
  }, [router])

  useEffect(() => {
    if (status === 'loading') return

    if (status === 'unauthenticated') {
      signIn()
      return
    }

    if (session?.user?.email) {
      checkAdminStatus()
    }
  }, [session, status, checkAdminStatus])

  const fetchDefaults = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/nazomeguri')
      if (!response.ok) {
        throw new Error('Failed to fetch defaults')
      }
      const data = await response.json()
      setPrevious(data.previous || null)
      setDefaults(data.defaults || null)
      if (data.defaults) {
        setCount(String(data.defaults.count))
        const nextDate = data.previous?.date
          ? getNextWednesdayInput(data.previous.date)
          : formatDateInput(data.defaults.date)
        setDate(nextDate)
      }
    } catch (error) {
      console.error('Failed to fetch defaults:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isAdminUser && !adminCheckLoading) {
      fetchDefaults()
    }
  }, [isAdminUser, adminCheckLoading, fetchDefaults])

  const handleSearch = async () => {
    const term = worldName.trim()
    if (!term) return

    try {
      setSearchLoading(true)
      const params = new URLSearchParams({
        page: '1',
        limit: '20',
        search: term
      })
      const response = await fetch(`/api/admin/worlds?${params.toString()}`)
      if (!response.ok) {
        throw new Error('Failed to search worlds')
      }
      const data = await response.json()
      const worlds = (data.worlds || []).map((world: any) => ({
        id: world.world_id || world.id,
        name: world.name || '',
        authorName: world.authorName || ''
      }))
      setSearchResults(worlds)
      setShowSearchModal(true)
    } catch (error) {
      console.error('Search failed:', error)
      setSearchResults([])
      setShowSearchModal(true)
    } finally {
      setSearchLoading(false)
    }
  }

  const handleSelectWorld = (world: NazomeguriWorld) => {
    setWorldName(world.name)
    setWorldId(world.id)
    setShowSearchModal(false)
  }

  const handleResetWorldId = () => {
    setWorldId('')
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setSubmitMessage('')

    if (!worldName.trim() || !worldId.trim()) {
      setSubmitMessage('ワールド名とワールドIDは必須です')
      return
    }

    const countValue = Number(count)
    if (Number.isNaN(countValue)) {
      setSubmitMessage('回数は数値で入力してください')
      return
    }

    try {
      setSubmitLoading(true)
      const response = await fetch('/api/admin/nazomeguri', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          count: countValue,
          date: new Date(date).toISOString(),
          worldName: worldName.trim(),
          worldId: worldId.trim(),
          comment: comment.trim()
        })
      })

      if (!response.ok) {
        throw new Error('保存に失敗しました')
      }

      setSubmitMessage('保存しました')
      await fetchDefaults()
      setWorldName('')
      setWorldId('')
      setComment('')
    } catch (error) {
      console.error('Submit failed:', error)
      setSubmitMessage('保存に失敗しました')
    } finally {
      setSubmitLoading(false)
    }
  }

  if (status === 'loading' || adminCheckLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  if (!isAdminUser) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>謎めぐり - NazoWeb Admin</title>
        <meta name="description" content="謎めぐり管理画面" />
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <Header />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">謎めぐり</h1>
            <p className="text-sm text-gray-600">謎めぐりの記録を登録します。</p>
          </div>
          <Link href="/admin" className="text-sm text-blue-600 hover:text-blue-800">
            ← ダッシュボードへ戻る
          </Link>
        </div>

        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">前回データ</h2>
          {loading ? (
            <div className="text-sm text-gray-500">読み込み中...</div>
          ) : previous ? (
            <div className="text-sm text-gray-700 space-y-1">
              <div>回数: {previous.count ?? '-'} </div>
              <div>日付: {previous.date ? new Date(previous.date).toLocaleDateString('ja-JP') : '-'}</div>
              <div>ワールド名: {previous.worldName || '-'}</div>
              <div>ワールドID: {previous.worldId || '-'}</div>
            </div>
          ) : (
            <div className="text-sm text-gray-500">前回データはありません</div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-6 space-y-6">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">回数</label>
              <input
                type="number"
                step="0.1"
                value={count}
                onChange={(event) => setCount(event.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">日付</label>
              <input
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">ワールド名</label>
            <div className="mt-1 flex gap-2">
              <input
                type="text"
                value={worldName}
                onChange={(event) => setWorldName(event.target.value)}
                className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
              <button
                type="button"
                onClick={handleSearch}
                disabled={searchLoading}
                className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                {searchLoading ? '検索中...' : '検索して入力'}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">ワールドID</label>
            <div className="mt-1 flex gap-2">
              <input
                type="text"
                value={worldId}
                readOnly
                className="flex-1 rounded-md border-gray-300 shadow-sm bg-gray-100"
              />
              <button
                type="button"
                onClick={handleResetWorldId}
                className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 bg-white hover:bg-gray-50"
              >
                リセット
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">コメント</label>
            <textarea
              rows={4}
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>

          {submitMessage && (
            <div className="text-sm text-blue-600">{submitMessage}</div>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitLoading}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
            >
              {submitLoading ? '保存中...' : '保存'}
            </button>
          </div>
        </form>
      </div>

      {showSearchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">検索結果</h3>
              <button
                type="button"
                onClick={() => setShowSearchModal(false)}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                閉じる
              </button>
            </div>

            {searchResults.length === 0 ? (
              <div className="text-sm text-gray-500">結果がありません</div>
            ) : (
              <div className="max-h-96 overflow-y-auto divide-y divide-gray-200">
                {searchResults.map((world) => (
                  <button
                    key={world.id}
                    type="button"
                    onClick={() => handleSelectWorld(world)}
                    className="w-full text-left py-3 hover:bg-gray-50 px-2"
                  >
                    <div className="text-sm font-medium text-gray-900">{world.name}</div>
                    <div className="text-xs text-gray-500">{world.authorName}</div>
                    <div className="text-xs text-gray-400">{world.id}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
