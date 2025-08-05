import { useEffect } from 'react'
import { useRouter } from 'next/router'
import { useAdminMode } from '@/hooks/useAdminMode'

/**
 * 管理者ページ用のプロテクトコンポーネント
 * 管理者モードが一時的にオフの場合はトップページにリダイレクト
 */
interface AdminProtectedProps {
  children: React.ReactNode
}

export default function AdminProtected({ children }: AdminProtectedProps) {
  const router = useRouter()
  const { isActualAdmin, isAdminModeActive, isClient } = useAdminMode()

  useEffect(() => {
    if (!isClient) return

    // 管理者権限がない、または管理者モードが一時的にオフの場合
    if (!isActualAdmin || !isAdminModeActive) {
      router.push('/')
    }
  }, [isClient, isActualAdmin, isAdminModeActive, router])

  // クライアントサイドレンダリングまで待機
  if (!isClient) {
    return <div>Loading...</div>
  }

  // 管理者権限がない、または管理者モードが一時的にオフの場合は何も表示しない
  if (!isActualAdmin || !isAdminModeActive) {
    return <div>Redirecting...</div>
  }

  return <>{children}</>
}
