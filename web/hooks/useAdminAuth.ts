import { useSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'

interface UseAdminAuthResult {
  isAdmin: boolean
  isLoading: boolean
  session: any
}

export function useAdminAuth(): UseAdminAuthResult {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (status === 'loading') return

    if (!session) {
      router.push('/auth/signin')
      return
    }

    if (!session.user?.isAdmin) {
      router.push('/')
      return
    }

    setIsLoading(false)
  }, [session, status, router])

  return {
    isAdmin: session?.user?.isAdmin || false,
    isLoading: status === 'loading' || isLoading,
    session
  }
}
