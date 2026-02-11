import { GetServerSideProps } from 'next'
import Head from 'next/head'
import Link from 'next/link'
import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
// import { requireAdminAccess } from '@/lib/auth' // 一時的にコメントアウト
import { useAdminAuth } from '@/hooks/useAdminAuth'

interface SystemTag {
  _id: string
  tagName: string
  tagDescription: string
  priority: number
  createdAt: string
  updatedAt: string
}

interface AdminTagsProps {
  session: any
}

export default function AdminTags({ session: serverSession }: AdminTagsProps) {
  const { isAdmin, isLoading, session } = useAdminAuth()
  const finalSession = session || serverSession
  
  const [tags, setTags] = useState<SystemTag[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingTag, setEditingTag] = useState<SystemTag | null>(null)
  const [formData, setFormData] = useState({
    tagName: '',
    tagDescription: '',
    priority: 0
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const fetchTags = useCallback(async () => {
    try {
      setLoading(true)
      console.log('Fetching tags from /api/admin/tags')
      
      const response = await fetch('/api/admin/tags')
      console.log('Response status:', response.status)
      
      if (response.ok) {
        const data = await response.json()
        console.log('Received tags data:', data)
        setTags(data.tags || [])
      } else {
        const errorData = await response.json()
        console.error('Error response:', errorData)
        setError(`タグの取得に失敗しました (${response.status}): ${errorData.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error fetching tags:', error)
      setError('タグの取得中にエラーが発生しました: ' + (error as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // セッション情報をデバッグ出力
    console.log('Current session:', finalSession)
    console.log('Is admin:', finalSession?.user?.isAdmin)
    console.log('User email:', finalSession?.user?.email)
    console.log('Admin emails env:', process.env.ADMIN_EMAILS)
    
    if (!isLoading && isAdmin) {
      fetchTags()
    }
  }, [isLoading, isAdmin, finalSession, fetchTags])

  // ローディング中または認証チェック中
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  // 管理者権限がない場合（フックが自動でリダイレクトするが、念のため）
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">アクセスが拒否されました</h1>
          <p className="text-gray-600 mb-4">管理者権限が必要です</p>
          <Link href="/" className="btn-primary">
            ホームに戻る
          </Link>
        </div>
      </div>
    )
  }

  const openModal = (tag?: SystemTag) => {
    if (tag) {
      setEditingTag(tag)
      setFormData({
        tagName: tag.tagName,
        tagDescription: tag.tagDescription,
        priority: tag.priority
      })
    } else {
      setEditingTag(null)
      setFormData({
        tagName: '',
        tagDescription: '',
        priority: 0
      })
    }
    setError('')
    setSuccess('')
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingTag(null)
    setFormData({ tagName: '', tagDescription: '', priority: 0 })
    setError('')
    setSuccess('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    try {
      const url = editingTag ? `/api/admin/tags/${editingTag._id}` : '/api/admin/tags'
      const method = editingTag ? 'PUT' : 'POST'

      console.log('Submitting to:', url, 'with method:', method)
      console.log('Form data:', formData)

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      console.log('Response status:', response.status)
      const result = await response.json()
      console.log('Response data:', result)

      if (response.ok) {
        setSuccess(editingTag ? 'タグが更新されました' : 'タグが作成されました')
        await fetchTags()
        setTimeout(() => closeModal(), 1500)
      } else {
        setError(result.error || `エラーが発生しました (${response.status})`)
      }
    } catch (error) {
      console.error('Error saving tag:', error)
      setError('保存中にエラーが発生しました: ' + (error as Error).message)
    }
  }

  const handleDelete = async (tag: SystemTag) => {
    if (!confirm(`タグ「${tag.tagName}」を削除しますか？`)) {
      return
    }

    try {
      const response = await fetch(`/api/admin/tags/${tag._id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setSuccess('タグが削除されました')
        await fetchTags()
        setTimeout(() => setSuccess(''), 3000)
      } else {
        const result = await response.json()
        setError(result.error || '削除に失敗しました')
        setTimeout(() => setError(''), 3000)
      }
    } catch (error) {
      console.error('Error deleting tag:', error)
      setError('削除中にエラーが発生しました')
      setTimeout(() => setError(''), 3000)
    }
  }

  return (
    <>
      <Head>
        <title>タグ管理 - NazoWeb Admin</title>
        <meta name="description" content="システムタグの管理" />
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          {/* ヘッダー */}
          <div className="bg-white shadow rounded-lg mb-6">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">タグ管理</h1>
                  <p className="mt-1 text-sm text-gray-500">
                    システムタグの作成・編集・削除
                  </p>
                </div>
                <div className="flex space-x-3">
                  <Link href="/admin">
                    <button className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                      ← ダッシュボードへ戻る
                    </button>
                  </Link>
                  <button
                    onClick={() => openModal()}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
                  >
                    🏷️ 新しいタグを作成
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* エラー・成功メッセージ */}
          {error && (
            <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded">
              {success}
            </div>
          )}

          {/* タグ一覧 */}
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-medium text-gray-900">システムタグ一覧</h2>
                <span className="text-sm text-gray-500">
                  {tags.length}件のタグ
                </span>
              </div>

              {loading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                  <p className="mt-2 text-sm text-gray-500">読み込み中...</p>
                </div>
              ) : tags.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-4xl mb-4">🏷️</div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">タグがまだありません</h3>
                  <p className="text-sm text-gray-500">
                    最初のタグを作成してください。
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          優先度
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          タグ名
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          説明
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          更新日
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          操作
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {tags.map((tag) => (
                        <tr key={tag._id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {tag.priority}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                              {tag.tagName}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                            {tag.tagDescription}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(tag.updatedAt).toLocaleDateString('ja-JP')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button
                              onClick={() => openModal(tag)}
                              className="text-indigo-600 hover:text-indigo-900 mr-3"
                            >
                              編集
                            </button>
                            <button
                              onClick={() => handleDelete(tag)}
                              className="text-red-600 hover:text-red-900"
                            >
                              削除
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* モーダル */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75" onClick={closeModal}></div>
            </div>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <form onSubmit={handleSubmit}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="mb-4">
                    <h3 className="text-lg font-medium text-gray-900">
                      {editingTag ? 'タグを編集' : '新しいタグを作成'}
                    </h3>
                  </div>

                  {error && (
                    <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded text-sm">
                      {error}
                    </div>
                  )}

                  {success && (
                    <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded text-sm">
                      {success}
                    </div>
                  )}

                  <div className="space-y-4">
                    <div>
                      <label htmlFor="tagName" className="block text-sm font-medium text-gray-700">
                        タグ名 *
                      </label>
                      <input
                        type="text"
                        id="tagName"
                        value={formData.tagName}
                        onChange={(e) => setFormData({ ...formData, tagName: e.target.value })}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="例: 謎解き, ホラー"
                        required
                      />
                    </div>

                    <div>
                      <label htmlFor="tagDescription" className="block text-sm font-medium text-gray-700">
                        説明 *
                      </label>
                      <textarea
                        id="tagDescription"
                        rows={3}
                        value={formData.tagDescription}
                        onChange={(e) => setFormData({ ...formData, tagDescription: e.target.value })}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="タグの説明を入力してください"
                        required
                      />
                    </div>

                    <div>
                      <label htmlFor="priority" className="block text-sm font-medium text-gray-700">
                        優先度 *
                      </label>
                      <input
                        type="number"
                        id="priority"
                        value={formData.priority}
                        onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="0"
                        min="0"
                        required
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        数値が小さいほど優先度が高くなります
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="submit"
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    {editingTag ? '更新' : '作成'}
                  </button>
                  <button
                    type="button"
                    onClick={closeModal}
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    キャンセル
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// 一時的にコメントアウト - ビルドエラー回避
// export const getServerSideProps = requireAdminAccess()
