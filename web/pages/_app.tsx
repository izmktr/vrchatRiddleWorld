import { SessionProvider } from 'next-auth/react'
import type { AppProps } from 'next/app'
import dynamic from 'next/dynamic'
import Head from 'next/head'
import { useEffect } from 'react'
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
  useEffect(() => {
    // iOS Safari対応：viewport-fit=cover の設定
    const viewport = document.querySelector('meta[name=viewport]')
    if (viewport) {
      viewport.setAttribute(
        'content',
        'width=device-width, initial-scale=1.0, viewport-fit=cover'
      )
    }

    // エラーハンドリング
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('Unhandled promise rejection:', event.reason)
      
      // NextAuth関連のエラーの場合、ユーザーに分かりやすいメッセージを表示
      if (event.reason?.message?.includes('NextAuth') || 
          event.reason?.message?.includes('session')) {
        console.log('認証に関するエラーが発生しました。ページを再読み込みしてください。')
      }
    }

    window.addEventListener('unhandledrejection', handleUnhandledRejection)

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
    }
  }, [])

  return (
    <SessionProvider 
      session={session}
      // セッション関連の設定
      refetchInterval={5 * 60} // 5分ごとにセッション更新
      refetchOnWindowFocus={true}
    >
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <title>VRChat謎解きワールドエクスプローラー</title>
      </Head>
      <SafeAdminNav />
      <Component {...pageProps} />
    </SessionProvider>
  )
}
