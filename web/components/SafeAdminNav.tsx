import { useSession } from 'next-auth/react'
import { useAdminMode } from '@/hooks/useAdminMode'

/**
 * ハイドレーション安全な管理者ナビゲーション
 */
export default function SafeAdminNav() {
  const { status } = useSession()
  const { 
    isActualAdmin, 
    isAdminModeActive, 
    isAdminModeDisabled, 
    toggleAdminMode, 
    isClient 
  } = useAdminMode()

  // クライアントサイドでのみレンダリング
  if (!isClient) {
    return null
  }

  // ローディング中は何も表示しない
  if (status === 'loading') {
    return null
  }

  // 管理者でない場合は何も表示しない
  if (!isActualAdmin) {
    return null
  }

  // 管理者だが一時的にオフにしている場合は、復帰ボタンのみ表示
  if (isAdminModeDisabled) {
    return (
      <div className="bg-gray-600 text-white px-4 py-2 text-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <span className="font-medium text-gray-300">管理者モード（一時的にオフ）</span>
            <a href="/" className="text-gray-300 hover:text-white hover:underline">
              トップページ
            </a>
          </div>
          <button
            onClick={toggleAdminMode}
            className="bg-green-600 hover:bg-green-700 px-3 py-1 rounded text-xs font-medium transition-colors"
          >
            管理者モードに戻る
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-red-600 text-white px-4 py-2 text-sm">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <span className="font-medium">管理者モード</span>
        <div className="flex items-center space-x-4">
          <nav className="flex space-x-4">
            <a href="/" className="hover:underline">
              トップページ
            </a>
            <a href="/admin" className="hover:underline">
              管理ダッシュボード
            </a>
            <a href="/admin/worlds" className="hover:underline">
              ワールド管理
            </a>
            <a href="/admin/users" className="hover:underline">
              ユーザー管理
            </a>
            <a href="/admin/scraper" className="hover:underline">
              スクレイパー
            </a>
            <a href="/admin/tags" className="hover:underline">
              タグ管理
            </a>
          </nav>
          <button
            onClick={toggleAdminMode}
            className="bg-red-800 hover:bg-red-900 px-3 py-1 rounded text-xs font-medium transition-colors border border-red-500"
          >
            一時的にオフ
          </button>
        </div>
      </div>
    </div>
  )
}
