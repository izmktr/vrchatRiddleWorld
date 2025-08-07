import NextAuth, { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import { MongoDBAdapter } from '@next-auth/mongodb-adapter'
import clientPromise from '@/lib/mongodb'

// 管理者メール判定関数（ここで定義して循環依存を回避）
function isAdminEmail(email?: string | null): boolean {
  if (!email) return false
  const adminEmails = process.env.ADMIN_EMAILS?.split(',').map(e => e.trim()) || []
  return adminEmails.includes(email)
}

export const authOptions: NextAuthOptions = {
  adapter: MongoDBAdapter(clientPromise),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    })
  ],
  pages: {
    signIn: '/auth/signin',
  },
  callbacks: {
    async session({ session, token, user }) {
      // 管理者フラグを追加
      if (session.user?.email) {
        session.user.isAdmin = isAdminEmail(session.user.email)
      }
      return session
    },
    async jwt({ token, user }) {
      // JWTトークンに管理者フラグを追加
      if (token.email) {
        token.isAdmin = isAdminEmail(token.email)
      }
      return token
    },
  },
  session: {
    strategy: 'jwt', // Vercelでの安定性向上
    maxAge: 30 * 24 * 60 * 60, // 30日
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === 'development',
}

export default NextAuth(authOptions)
