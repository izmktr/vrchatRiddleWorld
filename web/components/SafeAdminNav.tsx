import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'

/**
 * ハイドレーション安全な管理者ナビゲーション
 */
export default function SafeAdminNav() {
  const { data: session, status } = useSession()
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  // クライアントサイドでのみレンダリング
  if (!isClient) {
    return null
  }

  // ローディング中は何も表示しない
  if (status === 'loading') {
    return null
  }

  // 管理者でない場合は何も表示しない
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
