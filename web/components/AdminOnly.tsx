import { useSession } from 'next-auth/react'
import { ReactNode, useEffect, useState } from 'react'
import { useAdminMode } from '@/hooks/useAdminMode'

interface AdminOnlyProps {
  children: ReactNode
  fallback?: ReactNode
}

/**
 * 管理者のみ表示するコンポーネント
 */
export function AdminOnly({ children, fallback = null }: AdminOnlyProps) {
  const { status } = useSession()
  const { isAdminModeActive, isClient } = useAdminMode()
  
  if (status === 'loading' || !isClient) {
    return <div className="animate-pulse">読み込み中...</div>
  }
  
  if (!isAdminModeActive) {
    return <>{fallback}</>
  }
  
  return <>{children}</>
}

/**
 * 管理者ナビゲーションリンク
 */
export function AdminNav() {
  const { status } = useSession()
  const { isAdminModeActive, isClient } = useAdminMode()
  
  // サーバーサイドレンダリング時とクライアントマウント前は何も表示しない
  if (!isClient || status === 'loading') {
    return null
  }
  
  if (!isAdminModeActive) {
    return null
  }
  
  return (
    <div className="bg-red-600 text-white px-4 py-2 text-sm">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <span className="font-medium">管理者モード</span>
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
        </nav>
      </div>
    </div>
  )
}
