import { useSession } from 'next-auth/react'
import { ReactNode, useEffect, useState } from 'react'

interface AdminOnlyProps {
  children: ReactNode
  fallback?: ReactNode
}

/**
 * 管理者のみ表示するコンポーネント
 */
export function AdminOnly({ children, fallback = null }: AdminOnlyProps) {
  const { data: session, status } = useSession()
  
  if (status === 'loading') {
    return <div className="animate-pulse">読み込み中...</div>
  }
  
  if (!session?.user?.isAdmin) {
    return <>{fallback}</>
  }
  
  return <>{children}</>
}

/**
 * 管理者ナビゲーションリンク
 */
export function AdminNav() {
  const { data: session, status } = useSession()
  const [mounted, setMounted] = useState(false)
  
  // クライアントサイドマウント後のみ表示
  useEffect(() => {
    setMounted(true)
  }, [])
  
  // サーバーサイドレンダリング時とクライアントマウント前は何も表示しない
  if (!mounted || status === 'loading') {
    return null
  }
  
  if (!session?.user?.isAdmin) {
    return null
  }
  
  return (
    <div className="bg-red-600 text-white px-4 py-2 text-sm">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <span className="font-medium">管理者モード</span>
        <nav className="flex space-x-4">
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
        </nav>
      </div>
    </div>
  )
}
