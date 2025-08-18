/** @type {import('next').NextConfig} */
const nextConfig = {
  // Use standalone for Vercel deployment
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
      logLevel: 'bug'
    }
  },
  
  // Environment variables
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mgfpbqvkhqjlvgeqaclj.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1nZnBicXZraHFqbHZnZXFhY2xqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQzMDIzNDUsImV4cCI6MjA0OTg3ODM0NX0.G2v1cYDdpgXCJ9cJ_rtHJJfbKLEr0z6FCd3gRCqzSrc'
  },
  
  // Image optimization
  images: {
    domains: ['mgfpbqvkhqjlvgeqaclj.supabase.co'],
    unoptimized: true,
    formats: ['image/webp', 'image/avif']
  },
  
  // Build settings for production deployment
  typescript: {
    ignoreBuildErrors: process.env.VERCEL_ENV === 'production',
  },
  eslint: {
    ignoreDuringBuilds: process.env.VERCEL_ENV === 'production',
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
    
    // Bundle analyzer for development
    if (process.env.ANALYZE === 'true') {
      const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
      config.plugins.push(new BundleAnalyzerPlugin({
        analyzerMode: 'server',
        openAnalyzer: true,
      }));
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
            value: 'origin-when-cross-origin'
          }
        ]
      }
    ];
  },
}
module.exports = nextConfig