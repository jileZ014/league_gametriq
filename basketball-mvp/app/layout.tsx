import './globals.css'
import { Inter } from 'next/font/google'
import Navbar from '@/components/Navbar'
import OfflineIndicator from '@/components/OfflineIndicator'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Basketball League MVP',
  description: 'Phoenix Basketball League Management Platform',
  manifest: '/manifest.json',
  themeColor: '#0f1419',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-bg-primary text-text-primary min-h-screen`}>
        <Navbar />
        <main className="pt-16">
          {children}
        </main>
        <OfflineIndicator />
      </body>
    </html>
  )
}