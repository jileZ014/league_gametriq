'use client'

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { ThemeProvider as NextThemesProvider } from 'next-themes'
import {
  Theme,
  defaultTheme,
  defaultDarkTheme,
  applyThemeToDocument,
  cacheTheme,
  getCachedTheme,
  fetchTheme,
  mergeTheme,
} from '@/lib/theme'

interface ThemeContextValue {
  theme: Theme
  darkTheme: Theme
  isLoading: boolean
  error: Error | null
  refreshTheme: () => Promise<void>
  updateTheme: (updates: Partial<Theme>) => void
  resetTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

interface ThemeProviderProps {
  children: React.ReactNode
  organizationId?: string
  defaultMode?: 'light' | 'dark' | 'system'
}

export function ThemeProvider({
  children,
  organizationId,
  defaultMode = 'system',
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(defaultTheme)
  const [darkTheme, setDarkTheme] = useState<Theme>(defaultDarkTheme)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  // Load theme on mount and when organizationId changes
  useEffect(() => {
    loadTheme()
  }, [organizationId])

  const loadTheme = async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Check for cached theme first
      const cached = getCachedTheme()
      if (cached) {
        setTheme(cached)
        applyThemeToDocument(cached)
      }

      // If we have an organizationId, fetch the latest theme
      if (organizationId) {
        const fetchedTheme = await fetchTheme(organizationId)
        setTheme(fetchedTheme)
        
        // Create dark variant
        const darkVariant = createDarkVariant(fetchedTheme)
        setDarkTheme(darkVariant)

        // Cache the theme
        cacheTheme(fetchedTheme)
        
        // Apply theme to document
        applyThemeToDocument(fetchedTheme)
      }
    } catch (err) {
      setError(err as Error)
      console.error('Failed to load theme:', err)
      
      // Fall back to default theme
      setTheme(defaultTheme)
      setDarkTheme(defaultDarkTheme)
      applyThemeToDocument(defaultTheme)
    } finally {
      setIsLoading(false)
    }
  }

  const refreshTheme = useCallback(async () => {
    await loadTheme()
  }, [organizationId])

  const updateTheme = useCallback((updates: Partial<Theme>) => {
    const newTheme = mergeTheme(theme, updates)
    setTheme(newTheme)
    
    // Update dark variant
    const darkVariant = createDarkVariant(newTheme)
    setDarkTheme(darkVariant)
    
    // Cache and apply
    cacheTheme(newTheme)
    applyThemeToDocument(newTheme)
  }, [theme])

  const resetTheme = useCallback(() => {
    setTheme(defaultTheme)
    setDarkTheme(defaultDarkTheme)
    localStorage.removeItem('gametriq-theme')
    applyThemeToDocument(defaultTheme)
  }, [])

  return (
    <ThemeContext.Provider
      value={{
        theme,
        darkTheme,
        isLoading,
        error,
        refreshTheme,
        updateTheme,
        resetTheme,
      }}
    >
      <NextThemesProvider
        attribute="class"
        defaultTheme={defaultMode}
        enableSystem
        disableTransitionOnChange
      >
        <ThemeStyleInjector theme={theme} darkTheme={darkTheme} />
        {children}
      </NextThemesProvider>
    </ThemeContext.Provider>
  )
}

// Component to inject theme styles
function ThemeStyleInjector({ theme, darkTheme }: { theme: Theme; darkTheme: Theme }) {
  useEffect(() => {
    // Create or update style element
    let styleEl = document.getElementById('dynamic-theme-styles') as HTMLStyleElement
    
    if (!styleEl) {
      styleEl = document.createElement('style')
      styleEl.id = 'dynamic-theme-styles'
      document.head.appendChild(styleEl)
    }

    // Generate CSS with theme variables
    const css = generateThemeCSS(theme, darkTheme)
    styleEl.textContent = css
  }, [theme, darkTheme])

  return null
}

// Generate CSS from theme
function generateThemeCSS(lightTheme: Theme, darkTheme: Theme): string {
  const lightVars = Object.entries(lightTheme.colors)
    .map(([key, value]) => `  --${kebabCase(key)}: ${value};`)
    .join('\n')

  const darkVars = Object.entries(darkTheme.colors)
    .map(([key, value]) => `  --${kebabCase(key)}: ${value};`)
    .join('\n')

  return `
:root {
${lightVars}
  --font-heading: ${lightTheme.fonts.heading};
  --font-body: ${lightTheme.fonts.body};
  --spacing-xs: ${lightTheme.spacing.xs};
  --spacing-sm: ${lightTheme.spacing.sm};
  --spacing-md: ${lightTheme.spacing.md};
  --spacing-lg: ${lightTheme.spacing.lg};
  --spacing-xl: ${lightTheme.spacing.xl};
  --radius-sm: ${lightTheme.borderRadius.sm};
  --radius-md: ${lightTheme.borderRadius.md};
  --radius-lg: ${lightTheme.borderRadius.lg};
}

.dark {
${darkVars}
}

body {
  font-family: var(--font-body);
}

h1, h2, h3, h4, h5, h6 {
  font-family: var(--font-heading);
}
`
}

// Create dark variant from light theme
function createDarkVariant(lightTheme: Theme): Theme {
  // This is a simplified dark theme generator
  // In production, you might want more sophisticated color transformations
  return {
    ...lightTheme,
    id: `${lightTheme.id}-dark`,
    name: `${lightTheme.name} (Dark)`,
    colors: {
      primary: lightTheme.colors.primaryForeground,
      primaryForeground: lightTheme.colors.primary,
      secondary: darkenColor(lightTheme.colors.secondary),
      secondaryForeground: lightTheme.colors.secondaryForeground,
      accent: darkenColor(lightTheme.colors.accent),
      accentForeground: lightTheme.colors.accentForeground,
      background: '222.2 84% 4.9%',
      foreground: '210 40% 98%',
      card: '222.2 84% 4.9%',
      cardForeground: '210 40% 98%',
      popover: '222.2 84% 4.9%',
      popoverForeground: '210 40% 98%',
      muted: darkenColor(lightTheme.colors.muted),
      mutedForeground: '215 20.2% 65.1%',
      border: darkenColor(lightTheme.colors.border),
      input: darkenColor(lightTheme.colors.input),
      ring: lightTheme.colors.primary,
      destructive: darkenColor(lightTheme.colors.destructive),
      destructiveForeground: lightTheme.colors.destructiveForeground,
    },
  }
}

// Helper to darken HSL color
function darkenColor(hslColor: string): string {
  const parts = hslColor.split(' ')
  if (parts.length !== 3) return hslColor
  
  const [h, s, l] = parts
  const lightness = parseFloat(l)
  const darkLightness = Math.max(lightness - 70, 10)
  
  return `${h} ${s} ${darkLightness}%`
}

// Helper to convert camelCase to kebab-case
function kebabCase(str: string): string {
  return str.replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1-$2').toLowerCase()
}

// Hook to use theme context
export function useThemeContext() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useThemeContext must be used within a ThemeProvider')
  }
  return context
}