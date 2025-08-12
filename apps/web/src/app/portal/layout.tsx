'use client'

import { ThemeProvider } from '@/providers/ThemeProvider'
import { ModernUIProvider, useModernUI, ModernUIConditional } from '@/components/providers/modern-ui-provider'
import { SearchBar } from '@/components/portal/SearchBar'
import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { useTheme } from '@/hooks/useTheme'

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [showMobileSearch, setShowMobileSearch] = useState(false)
  
  // Get organization ID from headers or subdomain
  // This is a placeholder - you'll need to implement your actual logic
  const getOrganizationId = () => {
    // Example: Extract from subdomain (e.g., org123.gametriq.com)
    if (typeof window !== 'undefined') {
      const host = window.location.host
      const subdomain = host.split('.')[0]
      
      // You might also get this from a cookie, auth context, or URL parameter
      return subdomain || 'default'
    }
    return 'default'
  }

  const organizationId = getOrganizationId()
  
  // Check for PUBLIC_PORTAL_MODERN feature flag
  const isPublicPortalModern = () => {
    if (typeof window !== 'undefined') {
      // Check URL parameter first
      const urlParams = new URLSearchParams(window.location.search)
      if (urlParams.has('PUBLIC_PORTAL_MODERN')) {
        return urlParams.get('PUBLIC_PORTAL_MODERN') === '1'
      }
      
      // Check localStorage feature flags
      const featureFlags = localStorage.getItem('feature_flags')
      if (featureFlags) {
        const flags = JSON.parse(featureFlags)
        return flags.public_portal_modern === true
      }
      
      // Check environment variable
      return process.env.NEXT_PUBLIC_PUBLIC_PORTAL_MODERN === '1'
    }
    return false
  }
  
  const isActivePath = (path: string) => {
    return pathname === path || pathname.startsWith(path + '/')
  }

  return (
    <ModernUIProvider 
      enableModernUI={isPublicPortalModern()}
      theme="auto"
    >
      <ThemeProvider organizationId={organizationId} defaultMode="system">
        <PortalContent 
          organizationId={organizationId}
          pathname={pathname}
          showMobileMenu={showMobileMenu}
          setShowMobileMenu={setShowMobileMenu}
          showMobileSearch={showMobileSearch}
          setShowMobileSearch={setShowMobileSearch}
          isActivePath={isActivePath}
        >
          {children}
        </PortalContent>
      </ThemeProvider>
    </ModernUIProvider>
  )
}

// Separated portal content component to use Modern UI context
function PortalContent({
  organizationId,
  pathname, 
  showMobileMenu,
  setShowMobileMenu,
  showMobileSearch,
  setShowMobileSearch,
  isActivePath,
  children
}: {
  organizationId: string
  pathname: string
  showMobileMenu: boolean
  setShowMobileMenu: (show: boolean) => void
  showMobileSearch: boolean
  setShowMobileSearch: (show: boolean) => void
  isActivePath: (path: string) => boolean
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background">
      <ModernUIConditional
        fallback={<LegacyPortalHeader 
          pathname={pathname}
          showMobileMenu={showMobileMenu}
          setShowMobileMenu={setShowMobileMenu}
          showMobileSearch={showMobileSearch}
          setShowMobileSearch={setShowMobileSearch}
          isActivePath={isActivePath}
        />}
      >
        <ModernPortalHeader 
          pathname={pathname}
          showMobileMenu={showMobileMenu}
          setShowMobileMenu={setShowMobileMenu}
          showMobileSearch={showMobileSearch}
          setShowMobileSearch={setShowMobileSearch}
          isActivePath={isActivePath}
        />
      </ModernUIConditional>

      {/* Portal Content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Portal Footer */}
      <ModernUIConditional
        fallback={<LegacyPortalFooter />}
      >
        <ModernPortalFooter />
      </ModernUIConditional>
    </div>
  )
}

// Logo display component
function LogoDisplay() {
  const { theme, isDark } = useTheme()
  const logoSrc = isDark ? theme.logo?.dark : theme.logo?.light

  if (!logoSrc) {
    return (
      <div className="text-xl font-bold text-foreground">
        {theme.name || 'League Portal'}
      </div>
    )
  }

  return (
    <img
      src={logoSrc}
      alt={theme.name || 'League Portal'}
      className="h-10 object-contain"
    />
  )
}

// Theme toggle component
function ThemeToggle() {
  const { mode, toggleMode, mounted } = useTheme()

  if (!mounted) {
    return <div className="w-9 h-5" /> // Placeholder to prevent layout shift
  }

  return (
    <button
      onClick={toggleMode}
      className="p-2 rounded-md hover:bg-accent transition-colors"
      aria-label="Toggle theme"
    >
      {mode === 'dark' ? (
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
          />
        </svg>
      ) : (
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M20.354 15.354A9 9 0 718.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
          />
        </svg>
      )}
    </button>
  )
}

// Modern Portal Header Component
function ModernPortalHeader({
  pathname,
  showMobileMenu,
  setShowMobileMenu,
  showMobileSearch,
  setShowMobileSearch,
  isActivePath
}: {
  pathname: string
  showMobileMenu: boolean
  setShowMobileMenu: (show: boolean) => void
  showMobileSearch: boolean
  setShowMobileSearch: (show: boolean) => void
  isActivePath: (path: string) => boolean
}) {
  return (
    <header className="nav-modern border-b sticky top-0 bg-background z-40 backdrop-blur-lg">
      <div className="container-modern">
        {/* Desktop Header */}
        <div className="hidden lg:flex items-center justify-between py-4">
          <div className="flex items-center space-x-8">
            <LogoDisplay />
            <nav className="flex space-x-2">
              <a 
                href="/portal" 
                className={`nav-link focus-visible ${
                  pathname === '/portal' ? 'active' : ''
                }`}
              >
                🏠 Home
              </a>
              <a 
                href="/portal/teams" 
                className={`nav-link focus-visible ${
                  isActivePath('/portal/teams') ? 'active' : ''
                }`}
              >
                🏀 Teams
              </a>
              <a 
                href="/portal/schedule" 
                className={`nav-link focus-visible ${
                  isActivePath('/portal/schedule') ? 'active' : ''
                }`}
              >
                📅 Schedule
              </a>
              <a 
                href="/portal/standings" 
                className={`nav-link focus-visible ${
                  isActivePath('/portal/standings') ? 'active' : ''
                }`}
              >
                🏆 Standings
              </a>
            </nav>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="w-64">
              <SearchBar className="w-full form-input-modern" />
            </div>
            <ThemeToggle />
            <a
              href="/register"
              className="btn-primary focus-visible"
            >
              ⚡ Register
            </a>
          </div>
        </div>
        
        {/* Mobile Header */}
        <div className="lg:hidden py-4">
          <div className="flex items-center justify-between">
            <LogoDisplay />
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowMobileSearch(!showMobileSearch)}
                className="p-2 rounded-md hover:bg-accent transition-colors focus-visible"
                aria-label="Toggle search"
                data-testid="mobile-search-toggle"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
              
              <ThemeToggle />
              
              <button
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className="p-2 rounded-md hover:bg-accent transition-colors focus-visible"
                aria-label="Toggle menu"
                data-testid="mobile-menu-toggle"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {showMobileMenu ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
            </div>
          </div>
          
          {showMobileSearch && (
            <div className="mt-4 pb-2">
              <SearchBar className="w-full form-input-modern" />
            </div>
          )}
          
          {showMobileMenu && (
            <nav className="mt-4 pb-2 space-y-2">
              <a 
                href="/portal" 
                className={`block px-4 py-3 rounded-lg transition-all focus-visible ${
                  pathname === '/portal' 
                    ? 'bg-gradient-primary text-white font-semibold' 
                    : 'text-foreground hover:bg-nba2k-primary-light hover:text-nba2k-primary-dark'
                }`}
              >
                🏠 Home
              </a>
              <a 
                href="/portal/teams" 
                className={`block px-4 py-3 rounded-lg transition-all focus-visible ${
                  isActivePath('/portal/teams')
                    ? 'bg-gradient-primary text-white font-semibold' 
                    : 'text-foreground hover:bg-nba2k-primary-light hover:text-nba2k-primary-dark'
                }`}
              >
                🏀 Teams
              </a>
              <a 
                href="/portal/schedule" 
                className={`block px-4 py-3 rounded-lg transition-all focus-visible ${
                  isActivePath('/portal/schedule')
                    ? 'bg-gradient-primary text-white font-semibold' 
                    : 'text-foreground hover:bg-nba2k-primary-light hover:text-nba2k-primary-dark'
                }`}
              >
                📅 Schedule
              </a>
              <a 
                href="/portal/standings" 
                className={`block px-4 py-3 rounded-lg transition-all focus-visible ${
                  isActivePath('/portal/standings')
                    ? 'bg-gradient-primary text-white font-semibold' 
                    : 'text-foreground hover:bg-nba2k-primary-light hover:text-nba2k-primary-dark'
                }`}
              >
                🏆 Standings
              </a>
              <a
                href="/register"
                className="block btn-primary text-center mt-4"
              >
                ⚡ Register Now
              </a>
            </nav>
          )}
        </div>
      </div>
    </header>
  )
}

// Legacy Portal Header Component
function LegacyPortalHeader({
  pathname,
  showMobileMenu,
  setShowMobileMenu,
  showMobileSearch,
  setShowMobileSearch,
  isActivePath
}: {
  pathname: string
  showMobileMenu: boolean
  setShowMobileMenu: (show: boolean) => void
  showMobileSearch: boolean
  setShowMobileSearch: (show: boolean) => void
  isActivePath: (path: string) => boolean
}) {
  return (
    <header className="border-b sticky top-0 bg-background z-40">
      <div className="container mx-auto px-4 py-4">
        <div className="hidden lg:flex items-center justify-between">
          <div className="flex items-center space-x-8">
            <LogoDisplay />
            <nav className="flex space-x-6">
              <a 
                href="/portal" 
                className={`transition-colors ${
                  pathname === '/portal' 
                    ? 'text-primary font-medium' 
                    : 'text-foreground hover:text-primary'
                }`}
              >
                Home
              </a>
              <a 
                href="/portal/teams" 
                className={`transition-colors ${
                  isActivePath('/portal/teams')
                    ? 'text-primary font-medium' 
                    : 'text-foreground hover:text-primary'
                }`}
              >
                Teams
              </a>
              <a 
                href="/portal/schedule" 
                className={`transition-colors ${
                  isActivePath('/portal/schedule')
                    ? 'text-primary font-medium' 
                    : 'text-foreground hover:text-primary'
                }`}
              >
                Schedule
              </a>
              <a 
                href="/portal/standings" 
                className={`transition-colors ${
                  isActivePath('/portal/standings')
                    ? 'text-primary font-medium' 
                    : 'text-foreground hover:text-primary'
                }`}
              >
                Standings
              </a>
            </nav>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="w-64">
              <SearchBar className="w-full" />
            </div>
            <ThemeToggle />
            <a
              href="/register"
              className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:opacity-90 transition-opacity"
            >
              Register
            </a>
          </div>
        </div>
        
        <div className="lg:hidden">
          <div className="flex items-center justify-between">
            <LogoDisplay />
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowMobileSearch(!showMobileSearch)}
                className="p-2 rounded-md hover:bg-accent transition-colors"
                aria-label="Toggle search"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
              
              <ThemeToggle />
              
              <button
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className="p-2 rounded-md hover:bg-accent transition-colors"
                aria-label="Toggle menu"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {showMobileMenu ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              )}
            </div>
          </div>
          
          {showMobileSearch && (
            <div className="mt-4 pb-2">
              <SearchBar className="w-full" />
            </div>
          )}
          
          {showMobileMenu && (
            <nav className="mt-4 pb-2 space-y-2">
              <a 
                href="/portal" 
                className={`block px-4 py-2 rounded-md transition-colors ${
                  pathname === '/portal' 
                    ? 'bg-accent text-primary font-medium' 
                    : 'text-foreground hover:bg-accent'
                }`}
              >
                Home
              </a>
              <a 
                href="/portal/teams" 
                className={`block px-4 py-2 rounded-md transition-colors ${
                  isActivePath('/portal/teams')
                    ? 'bg-accent text-primary font-medium' 
                    : 'text-foreground hover:bg-accent'
                }`}
              >
                Teams
              </a>
              <a 
                href="/portal/schedule" 
                className={`block px-4 py-2 rounded-md transition-colors ${
                  isActivePath('/portal/schedule')
                    ? 'bg-accent text-primary font-medium' 
                    : 'text-foreground hover:bg-accent'
                }`}
              >
                Schedule
              </a>
              <a 
                href="/portal/standings" 
                className={`block px-4 py-2 rounded-md transition-colors ${
                  isActivePath('/portal/standings')
                    ? 'bg-accent text-primary font-medium' 
                    : 'text-foreground hover:bg-accent'
                }`}
              >
                Standings
              </a>
              <a
                href="/register"
                className="block bg-primary text-primary-foreground px-4 py-2 rounded-md hover:opacity-90 transition-opacity text-center"
              >
                Register
              </a>
            </nav>
          )}
        </div>
      </div>
    </header>
  )
}

// Modern Portal Footer
function ModernPortalFooter() {
  return (
    <footer className="border-t mt-auto bg-gradient-arena">
      <div className="container-modern py-8">
        <div className="text-center">
          <div className="text-white font-bold text-lg mb-2">
            🏀 Phoenix Youth Basketball
          </div>
          <div className="text-arena-light text-sm">
            Powered by Gametriq | Modern UI Enabled
          </div>
          <div className="text-phoenix-desert text-xs mt-2">
            Supporting 80+ leagues, 3,500+ teams across the Phoenix metro area
          </div>
        </div>
      </div>
    </footer>
  )
}

// Legacy Portal Footer
function LegacyPortalFooter() {
  return (
    <footer className="border-t mt-auto">
      <div className="container mx-auto px-4 py-6">
        <div className="text-center text-muted-foreground text-sm">
          Powered by Gametriq
        </div>
      </div>
    </footer>
  )
}

