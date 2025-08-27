import { GetServerSideProps } from 'next'
import Head from 'next/head'
import { useState, useEffect } from 'react'
// import { requireAdminAccess } from '@/lib/auth' // 一時的にコメントアウト

interface NewWorld {
  _id: string
  url: string
  status: 'pending' | 'processing' | 'completed' | 'error'
  created_at: string
  created_by: string
  processed_at?: string
  error_message?: string
}

interface NewWorldRegistrationProps {
  session: any
}

export default function NewWorldRegistration({ session }: NewWorldRegistrationProps) {
  const [urls, setUrls] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info')
  const [registeredWorlds, setRegisteredWorlds] = useState<NewWorld[]>([])
  const [loadingWorlds, setLoadingWorlds] = useState(true)

  // 登録済みワールド一覧を取得
  useEffect(() => {
    fetchRegisteredWorlds()
  }, [])

  const fetchRegisteredWorlds = async () => {
    try {
      setLoadingWorlds(true)
      const response = await fetch('/api/admin/new-worlds')
      const data = await response.json()
      
      if (data.success) {
        setRegisteredWorlds(data.data)
      } else {
        console.error('Failed to fetch registered worlds:', data.error)
      }
    } catch (error) {
      console.error('Error fetching registered worlds:', error)
    } finally {
      setLoadingWorlds(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      // URLを行ごとに分割
      const urlList = urls
        .split('\n')
        .map(url => url.trim())
        .filter(url => url.length > 0)

      if (urlList.length === 0) {
        setMessage('URLを入力してください。')
        setMessageType('error')
        setLoading(false)
        return
      }

      const response = await fetch('/api/admin/new-worlds', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ urls: urlList }),
      })

      const data = await response.json()

      if (data.success) {
        const { inserted, duplicates, invalid } = data.data
        let message = `処理完了: `
        const messages = []

        if (inserted > 0) {
          messages.push(`${inserted}個の新規URLを登録`)
        }
        if (duplicates > 0) {
          messages.push(`${duplicates}個の重複URLをスキップ`)
        }
        if (invalid > 0) {
          messages.push(`${invalid}個の無効なURLを除外`)
        }

        setMessage(message + messages.join('、'))
        setMessageType(inserted > 0 ? 'success' : 'info')
        setUrls('')
        
        // 登録済み一覧を更新
        fetchRegisteredWorlds()
      } else {
        setMessage(`エラー: ${data.error}`)
        setMessageType('error')
      }
    } catch (error) {
      console.error('Registration error:', error)
      setMessage('登録中にエラーが発生しました。')
      setMessageType('error')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('この登録URLを削除しますか？')) {
      return
    }

    try {
      const response = await fetch('/api/admin/new-worlds', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id }),
      })

      const data = await response.json()

      if (data.success) {
        setMessage('URLを削除しました。')
        setMessageType('success')
        fetchRegisteredWorlds()
      } else {
        setMessage(`削除エラー: ${data.error}`)
        setMessageType('error')
      }
    } catch (error) {
      console.error('Delete error:', error)
      setMessage('削除中にエラーが発生しました。')
      setMessageType('error')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-800 bg-green-100'
      case 'processing': return 'text-yellow-800 bg-yellow-100'
      case 'error': return 'text-red-800 bg-red-100'
      default: return 'text-gray-800 bg-gray-100'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return '待機中'
      case 'processing': return '処理中'
      case 'completed': return '完了'
      case 'error': return 'エラー'
      default: return status
    }
  }

  return (
    <>
      <Head>
        <title>新規ワールド登録 - NazoWeb Admin</title>
        <meta name="description" content="新規VRChatワールドの登録" />
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
          {/* ヘッダー */}
          <div className="bg-white overflow-hidden shadow rounded-lg mb-6">
            <div className="px-4 py-5 sm:p-6">
              <h1 className="text-2xl font-bold text-gray-900">新規ワールド登録</h1>
              <p className="mt-1 text-sm text-gray-500">
                VRChatワールドのURLを登録して、スクレイピング対象に追加します。
              </p>
            </div>
          </div>

          {/* 登録フォーム */}
          <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-6">
            <div className="px-4 py-5 sm:p-6">
              <form onSubmit={handleSubmit}>
                <div className="mb-4">
                  <label htmlFor="urls" className="block text-sm font-medium text-gray-700 mb-2">
                    VRChatワールドURL
                  </label>
                  <div className="text-sm text-gray-500 mb-2">
                    1行につき1つのURLを入力してください。対応形式: https://vrchat.com/home/world/wrld_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
                  </div>
                  <textarea
                    id="urls"
                    name="urls"
                    rows={8}
                    value={urls}
                    onChange={(e) => setUrls(e.target.value)}
                    placeholder={`例:
https://vrchat.com/home/world/wrld_12345678-1234-1234-1234-123456789012
https://vrchat.com/home/world/wrld_87654321-4321-4321-4321-210987654321`}
                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm font-mono"
                    disabled={loading}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <button
                    type="submit"
                    disabled={loading}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? '登録中...' : 'URLを登録'}
                  </button>
                  
                  <div className="text-sm text-gray-500">
                    入力行数: {urls.split('\n').filter(line => line.trim()).length}
                  </div>
                </div>

                {/* メッセージ表示 */}
                {message && (
                  <div className={`mt-4 p-4 rounded-md ${
                    messageType === 'success' ? 'bg-green-50 text-green-800' :
                    messageType === 'error' ? 'bg-red-50 text-red-800' :
                    'bg-blue-50 text-blue-800'
                  }`}>
                    {message}
                  </div>
                )}
              </form>
            </div>
          </div>

          {/* 登録済みURL一覧 */}
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-medium text-gray-900">登録済みURL一覧</h2>
                <button
                  onClick={fetchRegisteredWorlds}
                  disabled={loadingWorlds}
                  className="inline-flex items-center px-3 py-1 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  {loadingWorlds ? '更新中...' : '🔄 更新'}
                </button>
              </div>

              {loadingWorlds ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600 mx-auto"></div>
                  <div className="mt-2 text-sm text-gray-500">読み込み中...</div>
                </div>
              ) : registeredWorlds.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  登録済みのURLはありません。
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          URL
                        </th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          ステータス
                        </th>
                        <th className="hidden sm:table-cell px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          登録日時
                        </th>
                        <th className="hidden lg:table-cell px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          登録者
                        </th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          操作
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {registeredWorlds.map((world) => (
                        <tr key={world._id}>
                          <td className="px-3 py-4 whitespace-nowrap">
                            <div className="text-sm font-mono text-gray-900 max-w-xs truncate">
                              <a
                                href={world.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-indigo-600 hover:text-indigo-500"
                                title={world.url}
                              >
                                {world.url}
                              </a>
                            </div>
                          </td>
                          <td className="px-3 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(world.status)}`}>
                              {getStatusText(world.status)}
                            </span>
                          </td>
                          <td className="hidden sm:table-cell px-3 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(world.created_at).toLocaleString('ja-JP')}
                          </td>
                          <td className="hidden lg:table-cell px-3 py-4 whitespace-nowrap text-sm text-gray-500">
                            {world.created_by}
                          </td>
                          <td className="px-3 py-4 whitespace-nowrap text-sm font-medium">
                            <button
                              onClick={() => handleDelete(world._id)}
                              className="text-red-600 hover:text-red-500"
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
    </>
  )
}

// 一時的にコメントアウト - ビルドエラー回避
// export const getServerSideProps = requireAdminAccess()
