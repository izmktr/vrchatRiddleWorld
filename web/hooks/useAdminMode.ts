import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'

/**
 * 管理者モードの一時的な無効化を管理するフック
 */
export function useAdminMode() {
  const { data: session } = useSession()
  const [isAdminModeDisabled, setIsAdminModeDisabled] = useState(false)
  const [isClient, setIsClient] = useState(false)

  // クライアントサイドでのみ実行
  useEffect(() => {
    setIsClient(true)
    
    // セッションストレージから状態を復元
    const disabled = sessionStorage.getItem('adminModeDisabled')
    if (disabled === 'true') {
      setIsAdminModeDisabled(true)
    }
  }, [])

  // 管理者モードの一時的な無効化状態を切り替え
  const toggleAdminMode = () => {
    const newState = !isAdminModeDisabled
    setIsAdminModeDisabled(newState)
    
    if (newState) {
      sessionStorage.setItem('adminModeDisabled', 'true')
    } else {
      sessionStorage.removeItem('adminModeDisabled')
    }
  }

  // 実際の管理者権限があるかどうか
  const isActualAdmin = session?.user?.isAdmin || false

  // 管理者モードが有効かどうか（実際の管理者権限があり、かつ一時的に無効化されていない）
  const isAdminModeActive = isClient && isActualAdmin && !isAdminModeDisabled

  return {
    isActualAdmin,
    isAdminModeActive,
    isAdminModeDisabled,
    toggleAdminMode,
    isClient
  }
}
