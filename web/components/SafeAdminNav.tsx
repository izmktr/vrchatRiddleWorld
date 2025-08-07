import { useSession } from 'next-auth/react'
import { useAdminMode } from '@/hooks/useAdminMode'
import Link from 'next/link'

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

  // 管理者だが一時的にオフにしている場合は、バナーを非表示
  if (isAdminModeDisabled) {
    return null
  }

  return (
    <div className="bg-red-600 text-white px-4 py-2 text-sm">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <span className="font-medium">管理者モード</span>
        <div className="flex items-center space-x-4">
          <nav className="flex space-x-4">
            <Link href="/" className="hover:underline">
              トップページ
            </Link>
            <Link href="/admin" className="hover:underline">
              管理ダッシュボード
            </Link>
            <Link href="/admin/worlds" className="hover:underline">
              ワールド管理
            </Link>
            <Link href="/admin/users" className="hover:underline">
              ユーザー管理
            </Link>
            <Link href="/admin/scraper" className="hover:underline">
              スクレイパー
            </Link>
            <Link href="/admin/tags" className="hover:underline">
              タグ管理
            </Link>
            <Link href="/admin/world-tags" className="hover:underline">
              ワールドタグ管理
            </Link>
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
