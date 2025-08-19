'use client';

import React, { useState } from 'react';
import { Button } from '@/components/simple-ui';
import { Badge } from '@/components/simple-ui';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface CoachLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}

interface NavigationItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  href: string;
  badge?: string;
}

export function CoachLayout({ children, title = 'Coach Portal', subtitle }: CoachLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const pathname = usePathname();

  // Navigation items for coach dashboard
  const navigationItems: NavigationItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
        </svg>
      ),
      href: '/coach/dashboard',
    },
    {
      id: 'roster',
      label: 'Roster',
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
        </svg>
      ),
      href: '/coach/roster',
      badge: '15',
    },
    {
      id: 'schedule',
      label: 'Schedule',
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
        </svg>
      ),
      href: '/coach/schedule',
    },
    {
      id: 'stats',
      label: 'Statistics',
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
        </svg>
      ),
      href: '/coach/stats',
    },
    {
      id: 'messages',
      label: 'Messages',
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
          <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
        </svg>
      ),
      href: '/coach/messages',
      badge: '3',
    },
    {
      id: 'playbook',
      label: 'Playbook',
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
        </svg>
      ),
      href: '/coach/playbook',
    },
  ];

  const isActive = (href: string) => pathname === href;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      {/* Sidebar */}
      <aside className={`fixed left-0 top-0 z-40 h-screen bg-gradient-to-b from-gray-800 to-gray-900 border-r border-gray-700 transition-transform ${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } w-64 lg:translate-x-0`}>
        {/* Logo Header */}
        <div className="p-6 border-b border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-400 to-blue-600 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 2a8 8 0 100 16 8 8 0 000-16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Legacy Youth Sports</h1>
              <p className="text-xs text-gray-400">Coach Portal</p>
            </div>
          </div>
        </div>

        {/* Team Info */}
        <div className="p-4 border-b border-gray-700">
          <div className="bg-gradient-to-r from-blue-500/20 to-blue-600/20 rounded-lg p-3 border border-blue-500/30">
            <div className="text-sm font-semibold text-blue-400">Phoenix Suns Youth</div>
            <div className="text-xs text-gray-400 mt-1">U14 Boys Division A</div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-gray-500">Record: 12-3</span>
              <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">
                2nd Place
              </Badge>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-2">
          {navigationItems.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 group ${
                isActive(item.href)
                  ? 'bg-gradient-to-r from-blue-500/20 to-blue-600/20 text-blue-400 border border-blue-500/30'
                  : 'text-gray-300 hover:text-white hover:bg-gray-700/50'
              }`}
            >
              <span className={`${isActive(item.href) ? 'text-blue-400' : 'text-gray-400 group-hover:text-white'}`}>
                {item.icon}
              </span>
              <span className="font-medium">{item.label}</span>
              {item.badge && (
                <Badge 
                  variant={isActive(item.href) ? 'default' : 'secondary'}
                  className={`ml-auto text-xs ${
                    isActive(item.href) 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gray-600 text-gray-300'
                  }`}
                >
                  {item.badge}
                </Badge>
              )}
            </Link>
          ))}
        </nav>

        {/* Quick Actions */}
        <div className="p-4 border-t border-gray-700 mt-auto">
          <Button
            variant="default"
            size="sm"
            className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
          >
            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            Quick Entry
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className={`transition-all duration-300 ${isSidebarOpen ? 'lg:ml-64' : 'ml-0'}`}>
        {/* Top Header */}
        <header className="bg-gray-800/50 backdrop-blur-sm border-b border-gray-700 sticky top-0 z-30">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="lg:hidden"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                </svg>
              </Button>
              <div>
                <h2 className="text-xl font-bold text-white">{title}</h2>
                {subtitle && <p className="text-sm text-gray-400">{subtitle}</p>}
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {/* Next Game Alert */}
              <div className="hidden md:flex items-center space-x-2 px-3 py-1 bg-yellow-500/20 border border-yellow-500/30 rounded-full">
                <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                </svg>
                <span className="text-yellow-400 text-xs font-medium">Next Game: Tomorrow 3PM</span>
              </div>

              {/* User Menu */}
              <div className="flex items-center space-x-3">
                <div className="text-right">
                  <p className="text-sm font-medium text-white">Coach Martinez</p>
                  <p className="text-xs text-gray-400">Phoenix Suns Youth</p>
                </div>
                <div className="w-10 h-10 bg-gradient-to-r from-blue-400 to-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-sm">CM</span>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="p-6">
          {children}
        </div>
      </main>

      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  );
}