import { GetServerSideProps, GetServerSidePropsContext } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../pages/api/auth/[...nextauth]'
import type { NextApiRequest, NextApiResponse } from 'next'

/**
 * ユーザーが管理者かどうかを判定する
 */
export function isAdmin(email: string | null | undefined): boolean {
  if (!email) return false
  
  // 環境変数が設定されていない場合はfalseを返す
  const adminEmailsEnv = process.env.ADMIN_EMAILS
  if (!adminEmailsEnv) {
    console.warn('ADMIN_EMAILS environment variable is not set')
    return false
  }
  
  try {
    const adminEmails = adminEmailsEnv.split(',').map(e => e.trim()).filter(e => e.length > 0)
    return adminEmails.includes(email)
  } catch (error) {
    console.error('Error parsing ADMIN_EMAILS:', error)
    return false
  }
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

      // 本番環境ではログを出力しない
      if (process.env.NODE_ENV !== 'production') {
        console.log('=== Server-side auth check ===')
        console.log('- Session exists:', !!session)
        console.log('- User email:', session?.user?.email)
        console.log('- ADMIN_EMAILS env exists:', !!process.env.ADMIN_EMAILS)
      }
      
      // 未ログインの場合はサインインページにリダイレクト
      if (!session) {
        return {
          redirect: {
            destination: '/auth/signin?callbackUrl=' + encodeURIComponent(context.resolvedUrl),
            permanent: false,
          },
        }
      }

      // 管理者でない場合はホームページにリダイレクト
      if (!isAdmin(session.user?.email)) {
        return {
          redirect: {
            destination: '/',
            permanent: false,
          },
        }
      }

      // 管理者の場合は、追加のgetServerSidePropsがあれば実行
      if (getServerSidePropsFunc) {
        try {
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
        } catch (innerError) {
          console.error('Inner getServerSideProps error:', innerError)
          // 内部エラーの場合でもセッション情報は返す
          return {
            props: {
              session,
              error: 'Failed to load page data'
            },
          }
        }
      }

      // デフォルトではセッション情報のみを返す
      return {
        props: {
          session,
        },
      }
    } catch (error) {
      console.error('Auth check error:', error)
      
      // 認証エラーの場合は、ログイン画面にリダイレクト
      return {
        redirect: {
          destination: '/auth/signin',
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
