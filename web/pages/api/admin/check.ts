import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/[...nextauth]'

// 管理者メール判定関数
function isAdminEmail(email?: string | null): boolean {
  if (!email) return false
  
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

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    // セッション情報を取得
    const session = await getServerSession(req, res, authOptions)

    if (!session?.user?.email) {
      return res.status(401).json({ 
        isAdmin: false, 
        message: 'Not authenticated' 
      })
    }

    const isAdmin = isAdminEmail(session.user.email)

    res.status(200).json({
      isAdmin,
      email: session.user.email
    })

  } catch (error) {
    console.error('Admin check error:', error)
    res.status(500).json({ 
      isAdmin: false, 
      message: 'Internal server error' 
    })
  }
}
