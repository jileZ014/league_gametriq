/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  experimental: {
    // App Router is stable in Next.js 14
    appDir: true,
    serverComponentsExternalPackages: ['@prisma/client']
  },
  images: {
    domains: [
      'localhost',
      '*.amazonaws.com',
      'gametriq.s3.amazonaws.com'
    ],
    formats: ['image/webp', 'image/avif']
  },
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
  // Performance optimizations
  compress: true,
  poweredByHeader: false,
  // Internationalization support for future expansion
  i18n: {
    locales: ['en', 'es'],
    defaultLocale: 'en',
  },
  // PWA configuration for offline support
  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate'
          }
        ]
      },
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          }
        ]
      }
    ];
  }
}

module.exports = nextConfig