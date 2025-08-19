'use client'

import * as React from 'react'
import { ThemeProvider as NextThemesProvider } from 'next-themes'
import { type ThemeProviderProps } from 'next-themes/dist/types'

// Re-export the enhanced theme provider from the new location
export { ThemeProvider, useThemeContext } from '@/providers/ThemeProvider'

// Keep the simple NextThemes provider for backward compatibility
export function SimpleThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}