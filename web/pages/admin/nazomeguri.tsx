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

type NazomeguriItem = {
  id: string
  count: number | null
  date: string | null
  worldName: string
  worldId: string
  comment: string
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
  const [searchTarget, setSearchTarget] = useState<'create' | 'edit'>('create')

  const [listItems, setListItems] = useState<NazomeguriItem[]>([])
  const [listPage, setListPage] = useState(1)
  const [listTotalPages, setListTotalPages] = useState(1)
  const [listLoading, setListLoading] = useState(false)
  const [listPageInput, setListPageInput] = useState('1')
  const [listPageDirty, setListPageDirty] = useState(false)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)

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
      if (data.defaults && !isEditing) {
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
  }, [isEditing])

  useEffect(() => {
    if (isAdminUser && !adminCheckLoading) {
      fetchDefaults()
    }
  }, [isAdminUser, adminCheckLoading, fetchDefaults])

  const fetchList = useCallback(async (page: number) => {
    try {
      setListLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '50'
      })
      const response = await fetch(`/api/admin/nazomeguri/list?${params.toString()}`)
      if (!response.ok) {
        throw new Error('Failed to fetch list')
      }
      const data = await response.json()
      setListItems(data.items || [])
      setListTotalPages(data.totalPages || 1)
    } catch (error) {
      console.error('Failed to fetch list:', error)
      setListItems([])
      setListTotalPages(1)
    } finally {
      setListLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isAdminUser && !adminCheckLoading) {
      fetchList(listPage)
    }
  }, [isAdminUser, adminCheckLoading, fetchList, listPage])

  useEffect(() => {
    if (!listPageDirty) {
      setListPageInput(String(listPage))
    }
  }, [listPage, listPageDirty])

  const handleSearch = async () => {
    const term = worldName.trim()
    if (!term) return
    setSearchTarget('create')

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
      if (worlds.length === 1) {
        handleSelectWorld(worlds[0])
      } else {
        setSearchResults(worlds)
        setShowSearchModal(true)
      }
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
      const endpoint = isEditing && editingId
        ? `/api/admin/nazomeguri/${editingId}`
        : '/api/admin/nazomeguri'
      const method = isEditing && editingId ? 'PUT' : 'POST'

      const response = await fetch(endpoint, {
        method,
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

      setSubmitMessage(isEditing ? '更新しました' : '保存しました')
      await fetchDefaults()
      await fetchList(listPage)
      resetToCreate()
    } catch (error) {
      console.error('Submit failed:', error)
      setSubmitMessage(isEditing ? '更新に失敗しました' : '保存に失敗しました')
    } finally {
      setSubmitLoading(false)
    }
  }

  const handleEditOpen = (item: NazomeguriItem) => {
    setEditingId(item.id)
    setIsEditing(true)
    setCount(item.count !== null ? String(item.count) : '')
    setDate(item.date ? formatDateInput(item.date) : '')
    setWorldName(item.worldName)
    setWorldId(item.worldId)
    setComment(item.comment)
    setSubmitMessage('')
  }

  const resetToCreate = () => {
    setIsEditing(false)
    setEditingId(null)
    setWorldName('')
    setWorldId('')
    setComment('')
    setSubmitMessage('')
    if (defaults) {
      setCount(String(defaults.count))
      const nextDate = previous?.date
        ? getNextWednesdayInput(previous.date)
        : formatDateInput(defaults.date)
      setDate(nextDate)
    } else {
      setCount('')
      setDate('')
    }
  }

  const handleListPrev = () => {
    setListPage((prev) => Math.max(1, prev - 1))
    setListPageDirty(false)
  }

  const handleListNext = () => {
    setListPage((prev) => Math.min(listTotalPages, prev + 1))
    setListPageDirty(false)
  }

  const handleListPageInputChange = (value: string) => {
    setListPageInput(value)
    setListPageDirty(true)
  }

  const applyListPageInput = () => {
    const parsed = Number(listPageInput)
    if (Number.isNaN(parsed)) return
    const nextPage = Math.min(Math.max(1, Math.floor(parsed)), listTotalPages)
    setListPage(nextPage)
    setListPageInput(String(nextPage))
    setListPageDirty(false)
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
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={resetToCreate}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                リセット
              </button>
              <button
                type="submit"
                disabled={submitLoading}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
              >
                {submitLoading
                  ? (isEditing ? '更新中...' : '登録中...')
                  : (isEditing ? '更新' : '新規登録')}
              </button>
            </div>
          </div>
        </form>

        <div className="mt-8 bg-white shadow rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">既存データ</h2>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span>ページ</span>
              <input
                type="number"
                min={1}
                max={listTotalPages}
                value={listPageInput}
                onChange={(event) => handleListPageInputChange(event.target.value)}
                className="w-16 rounded border border-gray-300 px-2 py-1 text-sm"
              />
              <span>/ {listTotalPages}</span>
              <button
                type="button"
                onClick={applyListPageInput}
                disabled={!listPageDirty}
                className="px-2 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                変更
              </button>
              <button
                type="button"
                onClick={handleListPrev}
                disabled={listPage <= 1}
                className="px-2 py-1 border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed"
              >
                前へ
              </button>
              <button
                type="button"
                onClick={handleListNext}
                disabled={listPage >= listTotalPages}
                className="px-2 py-1 border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed"
              >
                次へ
              </button>
            </div>
          </div>

          {listLoading ? (
            <div className="p-6 text-sm text-gray-500">読み込み中...</div>
          ) : listItems.length === 0 ? (
            <div className="p-6 text-sm text-gray-500">データがありません。</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">回数</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">日付</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ワールド名</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ワールドID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">コメント</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {listItems.map((item) => (
                    <tr key={item.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.count ?? '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {item.date ? new Date(item.date).toLocaleDateString('ja-JP') : '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">{item.worldName}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{item.worldId}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{item.comment || '-'}</td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => handleEditOpen(item)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            編集
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(item)}
                            className="text-red-600 hover:text-red-800"
                          >
                            削除
                          </button>
                        </div>
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
                max={listTotalPages}
                value={listPageInput}
                onChange={(event) => handleListPageInputChange(event.target.value)}
                className="w-16 rounded border border-gray-300 px-2 py-1 text-sm"
              />
              <span>/ {listTotalPages}</span>
              <button
                type="button"
                onClick={applyListPageInput}
                disabled={!listPageDirty}
                className="px-2 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                変更
              </button>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleListPrev}
                disabled={listPage <= 1}
                className="px-2 py-1 border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed"
              >
                前へ
              </button>
              <button
                type="button"
                onClick={handleListNext}
                disabled={listPage >= listTotalPages}
                className="px-2 py-1 border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed"
              >
                次へ
              </button>
            </div>
          </div>
        </div>
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
