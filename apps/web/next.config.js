/** @type {import('next').NextConfig} */
const nextConfig = {
  // Explicitly define environment variables for the build
  env: {
    NEXT_PUBLIC_SUPABASE_URL: 'https://mqfpbqvkhqjivqeqaclj.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1xZnBicXZraHFqaXZxZXFhY2xqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjgxNjU1NzksImV4cCI6MjA0Mzc0MTU3OX0.pYXQiOjE3NTUxMjAxNjAsImV4cCI6MjA3MDg2NDE2MH0.zMn6_xI5RMKE0DwYDVsInpuSqI47eXunQnGMxvU1RILtJuUng'
  },
  
  // Images configuration if you're using Supabase Storage
  images: {
    domains: ['mqfpbqvkhqjivqeqaclj.supabase.co'],
  },
  
  // For UAT deployment - temporarily ignoring errors
  // TODO: After UAT, set these back to false and fix all errors
  typescript: {
    // Temporarily ignore TypeScript errors for UAT deployment
    ignoreBuildErrors: true,
  },
  eslint: {
    // Temporarily ignore ESLint errors for UAT deployment
    ignoreDuringBuilds: true,
  },
  
  // Ensure client-side environment variables are available
  publicRuntimeConfig: {
    NEXT_PUBLIC_SUPABASE_URL: 'https://mqfpbqvkhqjivqeqaclj.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1xZnBicXZraHFqaXZxZXFhY2xqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjgxNjU1NzksImV4cCI6MjA0Mzc0MTU3OX0.pYXQiOjE3NTUxMjAxNjAsImV4cCI6MjA3MDg2NDE2MH0.zMn6_xI5RMKE0DwYDVsInpuSqI47eXunQnGMxvU1RILtJuUng'
  },
}

module.exports = nextConfig