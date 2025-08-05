import NextAuth from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import { MongoDBAdapter } from '@next-auth/mongodb-adapter'
import clientPromise from '@/lib/mongodb'
import { isAdmin } from '@/lib/auth'

export default NextAuth({
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
        session.user.isAdmin = isAdmin(session.user.email)
      }
      return session
    },
    async jwt({ token, user }) {
      // JWTトークンに管理者フラグを追加
      if (token.email) {
        token.isAdmin = isAdmin(token.email)
      }
      return token
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
})
