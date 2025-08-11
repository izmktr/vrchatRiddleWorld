/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: '.next',
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'api.vrchat.cloud',
        port: '',
        pathname: '/api/1/image/**',
      },
      {
        protocol: 'https',
        hostname: 'via.placeholder.com',
        port: '',
        pathname: '/**',
      }
    ],
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
      {
        source: '/api/auth/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
        ],
      },
    ]
  },
  env: {
    MONGODB_URI: process.env.MONGODB_URI,
    MONGODB_DB_NAME: process.env.MONGODB_DB_NAME,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    NEXTAUTH_URL_INTERNAL: process.env.NEXTAUTH_URL_INTERNAL,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    ADMIN_EMAILS: process.env.ADMIN_EMAILS,
    NEXT_PUBLIC_ADMIN_EMAILS: process.env.NEXT_PUBLIC_ADMIN_EMAILS,
  },
}

module.exports = nextConfig
