import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/[...nextauth]'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const session = await getServerSession(req, res, authOptions)
    
    const adminEmails = process.env.ADMIN_EMAILS?.split(',').map(e => e.trim()) || []
    const isAdmin = session?.user?.email ? adminEmails.includes(session.user.email) : false

    // より詳細なデバッグ情報
    const debugInfo = {
      hasSession: !!session,
      userEmail: session?.user?.email || null,
      isAdmin: isAdmin,
      adminEmailsCount: adminEmails.length,
      sessionUser: session?.user || null,
      environment: process.env.NODE_ENV,
      nextauthUrl: process.env.NEXTAUTH_URL,
      hasNextauthSecret: !!process.env.NEXTAUTH_SECRET,
      hasAdminEmails: !!process.env.ADMIN_EMAILS,
      userAgent: req.headers['user-agent'],
      host: req.headers.host,
      // セキュリティ上、実際の管理者メールは返さない
      adminEmailsFormatted: process.env.ADMIN_EMAILS ? '[REDACTED]' : 'NOT_SET',
      sessionStrategy: 'jwt', // NextAuth設定と一致させる
    }

    console.log('Debug auth info:', debugInfo)

    res.status(200).json(debugInfo)
  } catch (error) {
    console.error('Auth debug API error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}
