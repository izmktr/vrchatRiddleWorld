import type { NextApiRequest, NextApiResponse } from 'next'

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (process.env.NODE_ENV !== 'development') {
    return res.status(404).json({ message: 'Not found' })
  }

  const envCheck = {
    MONGODB_URI: !!process.env.MONGODB_URI,
    MONGODB_DB_NAME: process.env.MONGODB_DB_NAME || 'Not set',
    NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'Not set',
    NEXTAUTH_SECRET: !!process.env.NEXTAUTH_SECRET,
    GOOGLE_CLIENT_ID: !!process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: !!process.env.GOOGLE_CLIENT_SECRET,
    ADMIN_EMAILS: process.env.ADMIN_EMAILS || 'Not set',
    NODE_ENV: process.env.NODE_ENV
  }

  res.status(200).json({
    message: 'Environment variables check (development only)',
    env: envCheck
  })
}
