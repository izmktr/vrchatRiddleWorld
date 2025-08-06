import { GetServerSideProps, GetServerSidePropsContext } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../pages/api/auth/[...nextauth]'

// 管理者メールアドレス（環境変数から取得）
const ADMIN_EMAILS = process.env.NEXT_PUBLIC_ADMIN_EMAILS?.split(',') || []

/**
 * ユーザーが管理者かどうかを判定する
 */
export function isAdmin(email: string | null | undefined): boolean {
  if (!email) return false
  return ADMIN_EMAILS.includes(email)
}

/**
 * 管理者アクセスが必要なページで使用するgetServerSideProps
 */
export function requireAdminAccess(
  getServerSidePropsFunc?: GetServerSideProps
): GetServerSideProps {
  return async (context: GetServerSidePropsContext) => {
    // セッションを取得
    const session = await getServerSession(context.req, context.res, authOptions)

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
