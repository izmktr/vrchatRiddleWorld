import { SessionProvider } from 'next-auth/react'
import type { AppProps } from 'next/app'
import dynamic from 'next/dynamic'
import '@/styles/globals.css'

// クライアントサイドでのみレンダリング（ハイドレーションエラーを回避）
const SafeAdminNav = dynamic(
  () => import('@/components/SafeAdminNav'),
  { ssr: false }
)

export default function App({
  Component,
  pageProps: { session, ...pageProps },
}: AppProps) {
  return (
    <SessionProvider session={session}>
      <SafeAdminNav />
      <Component {...pageProps} />
    </SessionProvider>
  )
}
