import { GetServerSideProps } from 'next'
import Head from 'next/head'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { requireAdminAccess } from '@/lib/auth'

interface ScraperStatus {
  isRunning: boolean
  lastRun: string | null
  nextRun: string | null
  totalWorlds: number
  successCount: number
  errorCount: number
  skipCount: number
}

interface AdminScraperProps {
  session: any
}

export default function AdminScraper({ session: serverSession }: AdminScraperProps) {
  // クライアントサイドのセッション情報も取得
  const { data: clientSession } = useSession()
  
  // クライアントサイドのセッション情報を優先的に使用
  const session = clientSession || serverSession
  
  const [scraperStatus, setScraperStatus] = useState<ScraperStatus>({
    isRunning: false,
    lastRun: null,
    nextRun: null,
    totalWorlds: 0,
    successCount: 0,
    errorCount: 0,
    skipCount: 0
  })
  const [logs, setLogs] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchScraperStatus()
    fetchLogs()
  }, [])

  const fetchScraperStatus = async () => {
    try {
      // TODO: API実装後に実際のエンドポイントを呼び出し
      setScraperStatus({
        isRunning: false,
        lastRun: '2025-08-06 10:30:00',
        nextRun: '2025-08-06 22:00:00',
        totalWorlds: 444,
        successCount: 400,
        errorCount: 20,
        skipCount: 24
      })
    } catch (error) {
      console.error('Failed to fetch scraper status:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchLogs = async () => {
    try {
      // TODO: API実装後に実際のログを取得
      setLogs([
        '[2025-08-06 10:35:22] スクレイピング開始: 444件のワールドを処理',
        '[2025-08-06 10:35:25] ✅ World ID: wrld_123 - データ取得完了',
        '[2025-08-06 10:35:27] ⏭️ World ID: wrld_456 - 既存データ使用',
        '[2025-08-06 10:35:30] ❌ エラー: https://vrchat.com/home/world/wrld_789 - データ取得失敗',
        '[2025-08-06 10:40:15] 📊 処理完了: 成功400件、スキップ24件、エラー20件',
      ])
    } catch (error) {
      console.error('Failed to fetch logs:', error)
    }
  }

  const startScraping = async () => {
    if (scraperStatus.isRunning) return
    
    setScraperStatus(prev => ({ ...prev, isRunning: true }))
    
    try {
      // TODO: スクレイピング開始API呼び出し
      const response = await fetch('/api/admin/scraper/start', {
        method: 'POST',
      })
      
      if (response.ok) {
        // リアルタイムで状態を更新
        fetchScraperStatus()
        fetchLogs()
      }
    } catch (error) {
      console.error('Failed to start scraping:', error)
      setScraperStatus(prev => ({ ...prev, isRunning: false }))
    }
  }

  const stopScraping = async () => {
    try {
      // TODO: スクレイピング停止API呼び出し
      const response = await fetch('/api/admin/scraper/stop', {
        method: 'POST',
      })
      
      if (response.ok) {
        setScraperStatus(prev => ({ ...prev, isRunning: false }))
      }
    } catch (error) {
      console.error('Failed to stop scraping:', error)
    }
  }

  return (
    <>
      <Head>
        <title>スクレイパー管理 - NazoWeb Admin</title>
        <meta name="description" content="データ収集システムの管理" />
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          {/* ヘッダー */}
          <div className="bg-white shadow rounded-lg mb-6">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">スクレイパー管理</h1>
                  <p className="mt-1 text-sm text-gray-500">
                    VRChatワールドデータの自動収集システム
                  </p>
                </div>
                <Link href="/admin">
                  <button className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                    ← ダッシュボードへ戻る
                  </button>
                </Link>
              </div>
            </div>
          </div>

          {/* ステータス */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-6">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className={`w-8 h-8 rounded-md flex items-center justify-center ${
                      scraperStatus.isRunning ? 'bg-green-500' : 'bg-gray-500'
                    }`}>
                      <span className="text-white text-sm font-medium">
                        {scraperStatus.isRunning ? '🔄' : '⏸️'}
                      </span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        ステータス
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {scraperStatus.isRunning ? '実行中' : '停止中'}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                      <span className="text-white text-sm font-medium">📊</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        対象ワールド数
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {scraperStatus.totalWorlds.toLocaleString()}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                      <span className="text-white text-sm font-medium">✅</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        成功率
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {((scraperStatus.successCount / scraperStatus.totalWorlds) * 100).toFixed(1)}%
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-red-500 rounded-md flex items-center justify-center">
                      <span className="text-white text-sm font-medium">❌</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        エラー数
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {scraperStatus.errorCount.toLocaleString()}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* コントロールパネル */}
          <div className="bg-white shadow rounded-lg mb-6">
            <div className="px-4 py-5 sm:p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">スクレイピング制御</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">実行スケジュール</h3>
                  <div className="space-y-2">
                    <div className="text-sm text-gray-600">
                      最終実行: {scraperStatus.lastRun || '未実行'}
                    </div>
                    <div className="text-sm text-gray-600">
                      次回実行: {scraperStatus.nextRun || '未設定'}
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">手動制御</h3>
                  <div className="flex space-x-3">
                    {scraperStatus.isRunning ? (
                      <button
                        onClick={stopScraping}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700"
                      >
                        ⏹️ 停止
                      </button>
                    ) : (
                      <button
                        onClick={startScraping}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700"
                      >
                        ▶️ 開始
                      </button>
                    )}
                    <button className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                      📋 ログダウンロード
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 処理結果サマリー */}
          <div className="bg-white shadow rounded-lg mb-6">
            <div className="px-4 py-5 sm:p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">処理結果サマリー</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{scraperStatus.successCount}</div>
                  <div className="text-sm text-gray-500">成功</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">{scraperStatus.skipCount}</div>
                  <div className="text-sm text-gray-500">スキップ</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{scraperStatus.errorCount}</div>
                  <div className="text-sm text-gray-500">エラー</div>
                </div>
              </div>
            </div>
          </div>

          {/* リアルタイムログ */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-medium text-gray-900">リアルタイムログ</h2>
                <button
                  onClick={fetchLogs}
                  className="text-sm text-indigo-600 hover:text-indigo-900"
                >
                  🔄 更新
                </button>
              </div>
              <div className="bg-gray-900 rounded-lg p-4 h-64 overflow-y-auto">
                <div className="font-mono text-sm text-green-400 space-y-1">
                  {logs.length === 0 ? (
                    <div className="text-gray-500">ログがありません</div>
                  ) : (
                    logs.map((log, index) => (
                      <div key={index} className="whitespace-pre-wrap">
                        {log}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export const getServerSideProps = requireAdminAccess()
