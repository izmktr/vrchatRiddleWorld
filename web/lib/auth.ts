import { GetServerSideProps, GetServerSidePropsContext } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../pages/api/auth/[...nextauth]'
import type { NextApiRequest, NextApiResponse } from 'next'

/**
 * ユーザーが管理者かどうかを判定する
 */
export function isAdmin(email: string | null | undefined): boolean {
  if (!email) return false
  const adminEmails = process.env.ADMIN_EMAILS?.split(',').map(e => e.trim()) || []
  return adminEmails.includes(email)
}

/**
 * API用の管理者アクセスチェック
 */
export async function checkApiAdminAccess(req: NextApiRequest, res: NextApiResponse): Promise<any | null> {
  const session = await getServerSession(req, res, authOptions)
  
  if (!session) {
    res.status(401).json({ error: 'Unauthorized' })
    return null
  }
  
  if (!isAdmin(session.user?.email)) {
    res.status(403).json({ error: 'Forbidden' })
    return null
  }
  
  return session
}

/**
 * 管理者アクセスが必要なページで使用するgetServerSideProps
 */
export function requireAdminAccess(
  getServerSidePropsFunc?: GetServerSideProps
): GetServerSideProps {
  return async (context: GetServerSidePropsContext) => {
    try {
      // セッションを取得
      const session = await getServerSession(context.req, context.res, authOptions)

      console.log('=== Server-side auth check ===')
      console.log('- Session exists:', !!session)
      console.log('- User email:', session?.user?.email)
      console.log('- User isAdmin (from session):', session?.user?.isAdmin)
      console.log('- ADMIN_EMAILS env:', process.env.ADMIN_EMAILS)
      console.log('- Environment:', process.env.NODE_ENV)
      console.log('- NEXTAUTH_URL:', process.env.NEXTAUTH_URL)
      
      const adminEmailsArray = process.env.ADMIN_EMAILS?.split(',').map(e => e.trim()) || []
      console.log('- Admin emails array:', adminEmailsArray)
      console.log('- Is admin (calculated):', session?.user?.email ? isAdmin(session.user.email) : false)

      // 未ログインの場合はサインインページにリダイレクト
      if (!session) {
        console.log('❌ Redirecting to signin - no session')
        return {
          redirect: {
            destination: '/auth/signin?callbackUrl=' + encodeURIComponent(context.resolvedUrl),
            permanent: false,
          },
        }
      }

      // 管理者でない場合はホームページにリダイレクト
      if (!isAdmin(session.user?.email)) {
        console.log('❌ Redirecting to home - not admin')
        console.log('- Checking email:', session.user?.email)
        console.log('- Against admin emails:', adminEmailsArray)
        return {
          redirect: {
            destination: '/',
            permanent: false,
          },
        }
      }

      console.log('✅ Admin access granted')

      // 管理者の場合は、追加のgetServerSidePropsがあれば実行
      if (getServerSidePropsFunc) {
        const result = await getServerSidePropsFunc(context)
        
        // セッション情報を追加
        if ('props' in result) {
          return {
            ...result,
            props: {
              ...result.props,
              session,
            },
          }
        }
        return result
      }

      // デフォルトではセッション情報のみを返す
      return {
        props: {
          session,
        },
      }
    } catch (error) {
      console.error('❌ Auth check error:', error)
      return {
        redirect: {
          destination: '/',
          permanent: false,
        },
      }
    }
  }
}

/**
 * クライアントサイドで管理者判定を行うためのフック用関数
 */
export function useIsAdmin() {
  // この関数は実際にはhooksディレクトリに移動することを推奨
  // ここでは型エラー解決のためのプレースホルダー
  return false
}
