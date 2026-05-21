import { useSession } from 'next-auth/react'
import { useAdminMode } from '@/hooks/useAdminMode'
import Link from 'next/link'

// 管理ナビゲーションリンク
const ADMIN_NAV_LINKS = [
  { href: '/', label: 'トップページ' },
  { href: '/admin', label: '管理ダッシュボード' },
  { href: '/admin/new-worlds', label: '新規ワールド登録' },
  { href: '/admin/nazomeguri', label: '謎めぐり' },
  { href: '/admin/worlds', label: 'ワールド管理' },
  { href: '/admin/world-tags', label: 'ワールドタグ管理' },
]

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
            {ADMIN_NAV_LINKS.map((link) => (
              <Link 
                key={link.href}
                href={link.href} 
                className="hover:underline"
              >
                {link.label}
              </Link>
            ))}
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
