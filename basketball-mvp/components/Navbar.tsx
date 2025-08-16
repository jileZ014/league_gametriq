'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Users, Calendar, BarChart3, LogOut, Trophy, Menu, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: Home },
    { href: '/teams', label: 'Teams', icon: Users },
    { href: '/games', label: 'Games', icon: Calendar },
    { href: '/tournaments', label: 'Tournaments', icon: Trophy },
    { href: '/stats', label: 'Stats', icon: BarChart3 },
  ]

  return (
    <>
      <nav className="bg-bg-secondary border-b border-border-card fixed w-full top-0 z-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/dashboard" className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">L</span>
              </div>
              <div className="hidden sm:block">
                <h1 className="text-white font-bold text-lg">LEGACY YOUTH SPORTS</h1>
                <p className="text-text-secondary text-xs">Phoenix Basketball League</p>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-6">
              {navItems.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-primary text-white'
                        : 'text-text-secondary hover:text-white hover:bg-bg-primary'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-sm font-medium">{item.label}</span>
                  </Link>
                )
              })}
            </div>

            {/* Desktop Actions */}
            <div className="hidden md:flex items-center space-x-4">
              <Link
                href="/games/live"
                className="live-indicator bg-live bg-opacity-20 px-3 py-1 rounded-full"
              >
                <span className="w-2 h-2 bg-live rounded-full animate-pulse mr-2"></span>
                <span className="text-xs font-bold">LIVE GAMES</span>
              </Link>
              
              <button
                onClick={handleLogout}
                className="text-text-secondary hover:text-white transition-colors"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden text-text-secondary hover:text-white transition-colors"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-bg-primary bg-opacity-50 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)}>
          <div className="fixed top-16 left-0 right-0 bg-bg-secondary border-b border-border-card shadow-lg">
            <div className="px-4 py-4 space-y-2">
              {navItems.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-primary text-white'
                        : 'text-text-secondary hover:text-white hover:bg-bg-primary'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{item.label}</span>
                  </Link>
                )
              })}
              
              <hr className="border-border-card my-4" />
              
              <Link
                href="/games/live"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center space-x-3 px-4 py-3 rounded-lg text-live hover:bg-bg-primary transition-colors"
              >
                <span className="w-2 h-2 bg-live rounded-full animate-pulse"></span>
                <span className="font-medium">Live Games</span>
              </Link>
              
              <button
                onClick={() => {
                  handleLogout()
                  setMobileMenuOpen(false)
                }}
                className="flex items-center space-x-3 px-4 py-3 rounded-lg text-text-secondary hover:text-white hover:bg-bg-primary transition-colors w-full text-left"
              >
                <LogOut className="w-5 h-5" />
                <span className="font-medium">Logout</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}