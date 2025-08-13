/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  experimental: {
    // App Router is stable in Next.js 14
    appDir: true,
    serverComponentsExternalPackages: ['@prisma/client'],
    // Performance optimizations
    optimizeCss: true,
    optimizeServerReact: true,
    turbo: {
      rules: {
        '*.svg': ['@svgr/webpack'],
      },
    },
    // Enable partial prerendering for faster page loads
    ppr: true,
    // Runtime optimizations
    runtime: 'nodejs',
    // Memory optimizations for tournament day traffic
    memoryBasedWorkers: true,
  },
  images: {
    domains: [
      'localhost',
      '*.amazonaws.com',
      'gametriq.s3.amazonaws.com',
      'd1234567890.cloudfront.net', // CloudFront domain
      'legacy-youth-sports-assets.s3.us-west-2.amazonaws.com'
    ],
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 31536000, // 1 year cache for images
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    // Responsive images optimization
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    // Enable image optimization for tournament photos
    loader: 'default',
    quality: 75,
  },
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
    CLOUDFRONT_DOMAIN: process.env.CLOUDFRONT_DOMAIN,
  },
  // Performance optimizations
  compress: true,
  poweredByHeader: false,
  // Bundle optimization
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Production optimizations
    if (!dev) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            default: false,
            vendors: false,
            // Vendor chunk for stable caching
            vendor: {
              name: 'vendor',
              chunks: 'all',
              test: /[\\/]node_modules[\\/]/,
              priority: 20,
            },
            // Common chunk for shared code
            common: {
              name: 'common',
              minChunks: 2,
              chunks: 'all',
              priority: 10,
              reuseExistingChunk: true,
              enforce: true,
            },
            // Basketball-specific chunks
            basketball: {
              name: 'basketball',
              chunks: 'all',
              test: /[\\/]src[\\/](components|lib)[\\/](tournament|game|scoring)/,
              priority: 15,
            },
          },
        },
        usedExports: true,
        sideEffects: false,
        // Enable production optimizations
        minimize: true,
      };
    }

    // Tree shaking optimizations
    config.resolve.alias = {
      ...config.resolve.alias,
      // Use ES modules for better tree shaking
      'lodash': 'lodash-es',
    };

    // Bundle analyzer in development
    if (dev && process.env.ANALYZE === 'true') {
      const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
      config.plugins.push(
        new BundleAnalyzerPlugin({
          analyzerMode: 'server',
          analyzerPort: 8888,
          openAnalyzer: true,
        })
      );
    }

    return config;
  },
  // Internationalization support for future expansion
  i18n: {
    locales: ['en', 'es'],
    defaultLocale: 'en',
  },
  // PWA configuration for offline support with performance headers
  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate'
          },
          {
            key: 'Service-Worker-Allowed',
            value: '/'
          }
        ]
      },
      {
        source: '/manifest.webmanifest',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=3600'
          },
          {
            key: 'Content-Type',
            value: 'application/manifest+json'
          }
        ]
      },
      // Static asset performance headers
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable'
          },
          {
            key: 'Accept-Encoding',
            value: 'gzip, deflate, br'
          }
        ]
      },
      // Image optimization headers
      {
        source: '/_next/image',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable'
          },
          {
            key: 'Accept',
            value: 'image/webp,image/avif,image/*,*/*;q=0.8'
          }
        ]
      },
      // API performance headers
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate'
          },
          {
            key: 'Pragma',
            value: 'no-cache'
          },
          {
            key: 'Expires',
            value: '0'
          },
          {
            key: 'Access-Control-Allow-Origin',
            value: '*'
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS'
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization, X-Tenant-ID'
          }
        ]
      },
      // Font loading optimization
      {
        source: '/fonts/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable'
          },
          {
            key: 'Access-Control-Allow-Origin',
            value: '*'
          }
        ]
      },
      // General security and performance headers
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
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()'
          },
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload'
          }
        ]
      }
    ];
  },
  // Rewrites for PWA routes
  async rewrites() {
    return [
      {
        source: '/manifest.json',
        destination: '/manifest.webmanifest'
      }
    ];
  }
}

module.exports = nextConfig