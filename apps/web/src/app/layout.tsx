import type { Metadata, Viewport } from 'next'
import { Inter, Roboto, Roboto_Mono, Roboto_Flex } from 'next/font/google'
import { SimpleThemeProvider } from '@/components/providers/theme-provider'
import { ModernUIProvider } from '@/components/providers/modern-ui-provider'
import { AuthProvider } from '@/components/providers/auth-provider'
import { QueryProvider } from '@/components/providers/query-provider'
import { Toaster } from '@/components/ui/toaster'
import { cn } from '@/lib/utils'
import '@/styles/globals.css'
import { InstallPrompt } from '@/components/InstallPrompt'
import { UpdatePrompt } from '@/components/UpdatePrompt'
import { OfflineIndicator } from '@/components/OfflineIndicator'

// Font configurations
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const roboto = Roboto({
  weight: ['300', '400', '500', '700'],
  subsets: ['latin'],
  variable: '--font-roboto',
  display: 'swap',
})

const robotoMono = Roboto_Mono({
  subsets: ['latin'],
  variable: '--font-roboto-mono',
  display: 'swap',
})

const robotoFlex = Roboto_Flex({
  subsets: ['latin'],
  variable: '--font-roboto-flex',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'GameTriq League Management',
    template: '%s | GameTriq League Management'
  },
  description: 'Trophy League Management Platform - Manage teams, players, games, and statistics with real-time updates and mobile-first design.',
  keywords: [
    'basketball',
    'league management',
    'sports management',
    'team management',
    'game scoring',
    'tournament brackets',
    'player statistics',
    'youth sports',
    'Phoenix basketball'
  ],
  authors: [{ name: 'GameTriq Team' }],
  creator: 'GameTriq',
  publisher: 'GameTriq',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://gametriq.com'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://gametriq.com',
    title: 'GameTriq League Management',
    description: 'Trophy League Management Platform - Manage teams, players, games, and statistics with real-time updates.',
    siteName: 'GameTriq',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'GameTriq League Management Platform',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'GameTriq League Management',
    description: 'Trophy League Management Platform for teams, players, and leagues.',
    images: ['/og-image.png'],
    creator: '@gametriq',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    other: [
      { rel: 'mask-icon', url: '/safari-pinned-tab.svg', color: '#ff9800' },
    ],
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ff9800' },
    { media: '(prefers-color-scheme: dark)', color: '#ff9800' },
  ],
  colorScheme: 'light dark',
  viewportFit: 'cover', // Support for iPhone X+ notch
}

interface RootLayoutProps {
  children: React.ReactNode
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html 
      lang="en" 
      className={cn(
        inter.variable,
        roboto.variable,
        robotoMono.variable,
        robotoFlex.variable
      )}
      suppressHydrationWarning
    >
      <head>
        {/* Preconnect to external domains for performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        
        {/* PWA meta tags */}
        <meta name="application-name" content="GameTriq" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="GameTriq" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-TileColor" content="#ff9800" />
        <meta name="msapplication-tap-highlight" content="no" />
        
        {/* Trophy-specific theme colors */}
        <meta name="theme-color" media="(prefers-color-scheme: light)" content="#ff9800" />
        <meta name="theme-color" media="(prefers-color-scheme: dark)" content="#ff9800" />
        
        {/* Additional PWA configuration */}
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="shortcut icon" href="/favicon.ico" />
        
        {/* Heat safety and Phoenix-specific meta */}
        <meta name="geo.region" content="US-AZ" />
        <meta name="geo.placename" content="Phoenix" />
      </head>
      <body className={cn(
        'min-h-screen bg-background font-sans antialiased',
        'supports-[height:100dvh]:min-h-[100dvh]', // Dynamic viewport height
        'safe-area-inset' // iOS safe area support
      )}>
        {/* Skip to main content link for accessibility */}
        <a 
          href="#main-content" 
          className="skip-link focus-ring"
          tabIndex={0}
        >
          Skip to main content
        </a>
        
        {/* Screen reader announcements for live content */}
        <div 
          id="live-region" 
          aria-live="polite" 
          aria-atomic="true" 
          className="sr-only"
        />
        
        {/* Emergency alerts region */}
        <div 
          id="alert-region" 
          role="alert" 
          aria-live="assertive" 
          className="sr-only"
        />

        {/* Providers */}
        <ModernUIProvider 
          theme="auto" 
          enableModernUI={process.env.NEXT_PUBLIC_UI_MODERN_V1 === '1'}
        >
          <SimpleThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange={false}
          >
            <AuthProvider>
              <QueryProvider>
                {/* Main application content */}
                <div className="relative flex min-h-screen flex-col">
                  {children}
                </div>

                {/* Global toast notifications */}
                <Toaster />
                
                {/* PWA Install Prompt */}
                <InstallPrompt />
                
                {/* PWA Update Prompt */}
                <UpdatePrompt />
                
                {/* Offline Indicator */}
                <OfflineIndicator />
              </QueryProvider>
            </AuthProvider>
          </SimpleThemeProvider>
        </ModernUIProvider>

        {/* Enhanced Service Worker Registration */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', async function() {
                  try {
                    const registration = await navigator.serviceWorker.register('/sw.js', {
                      scope: '/',
                      updateViaCache: 'none'
                    });
                    
                    console.log('ServiceWorker registration successful with scope:', registration.scope);
                    
                    // Check for updates
                    registration.addEventListener('updatefound', () => {
                      const newWorker = registration.installing;
                      if (newWorker) {
                        newWorker.addEventListener('statechange', () => {
                          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            // New content is available
                            window.dispatchEvent(new CustomEvent('swUpdated', { detail: registration }));
                          }
                        });
                      }
                    });
                    
                    // Periodic update check
                    setInterval(() => {
                      registration.update();
                    }, 60 * 60 * 1000); // Check every hour
                    
                  } catch (error) {
                    console.error('ServiceWorker registration failed:', error);
                  }
                });
                
                // Handle controller change
                navigator.serviceWorker.addEventListener('controllerchange', () => {
                  window.location.reload();
                });
                
                // Enable navigation preload if supported (only in service worker context)
              }
            `,
          }}
        />

        {/* Performance and analytics scripts would go here */}
        {process.env.NODE_ENV === 'production' && (
          <>
            {/* Google Analytics or similar would be added here */}
            {/* Heat safety monitoring scripts for Phoenix */}
          </>
        )}
      </body>
    </html>
  )
}

// Force dynamic rendering for authentication and real-time features
export const dynamic = 'force-dynamic'