/** @type {import('next').NextConfig} */
const nextConfig = {
  // CORRECTED: Use standalone for Vercel, remove export for API routes compatibility
  output: 'standalone',
  
  // Performance optimizations
  reactStrictMode: true,
  swcMinify: true,
  poweredByHeader: false,
  
  // Build optimizations
  experimental: {
    optimizeCss: true,
    optimizeServerReact: true,
    turbotrace: {
      logLevel: 'error' // Reduce noise
    }
  },
  
  // CORRECTED: Remove hardcoded environment variables - use Vercel environment variables instead
  env: {
    // These should come from Vercel environment variables, not hardcoded
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL
  },
  
  // Image optimization
  images: {
    domains: ['mgfpbqvkhqjlvgeqaclj.supabase.co', 'gametriq.s3.amazonaws.com'],
    formats: ['image/webp', 'image/avif'],
    unoptimized: false // CORRECTED: Enable optimization
  },
  
  // CORRECTED: Don't ignore build errors in production
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
  
  // Webpack optimizations
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Production optimizations
    if (!dev) {
      config.optimization = {
        ...config.optimization,
        usedExports: true,
        sideEffects: false,
      };
    }
    
    // Client-side fallbacks
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        canvas: false,
        pdfkit: false,
        crypto: false,
        stream: false,
        util: false,
      };
    }
    
    return config;
  },
  
  // Headers for security and performance
  async headers() {
    return [
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
  },
}

module.exports = nextConfig