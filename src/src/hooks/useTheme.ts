'use client'

import { useTheme as useNextTheme } from 'next-themes'
import { useThemeContext } from '@/providers/ThemeProvider'
import { Theme } from '@/lib/theme'
import { useEffect, useState } from 'react'

export function useTheme() {
  const { theme: mode, setTheme: setMode, systemTheme } = useNextTheme()
  const { theme, darkTheme, isLoading, error, refreshTheme, updateTheme, resetTheme } = useThemeContext()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Determine current theme based on mode
  const currentTheme: Theme = mode === 'dark' 
    ? darkTheme 
    : mode === 'system' 
      ? (systemTheme === 'dark' ? darkTheme : theme)
      : theme

  return {
    // Theme data
    theme: currentTheme,
    lightTheme: theme,
    darkTheme,
    
    // Theme mode
    mode: mounted ? mode : undefined,
    setMode,
    systemTheme,
    
    // Loading states
    isLoading,
    error,
    mounted,
    
    // Actions
    refreshTheme,
    updateTheme,
    resetTheme,
    
    // Helpers
    toggleMode: () => {
      setMode(mode === 'dark' ? 'light' : 'dark')
    },
    
    isLight: mounted && (mode === 'light' || (mode === 'system' && systemTheme === 'light')),
    isDark: mounted && (mode === 'dark' || (mode === 'system' && systemTheme === 'dark')),
  }
}