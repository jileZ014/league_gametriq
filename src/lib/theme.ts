import { z } from 'zod'

// Theme schema for validation
export const themeSchema = z.object({
  id: z.string(),
  name: z.string(),
  colors: z.object({
    primary: z.string(),
    primaryForeground: z.string(),
    secondary: z.string(),
    secondaryForeground: z.string(),
    accent: z.string(),
    accentForeground: z.string(),
    background: z.string(),
    foreground: z.string(),
    card: z.string(),
    cardForeground: z.string(),
    popover: z.string(),
    popoverForeground: z.string(),
    muted: z.string(),
    mutedForeground: z.string(),
    border: z.string(),
    input: z.string(),
    ring: z.string(),
    destructive: z.string(),
    destructiveForeground: z.string(),
  }),
  fonts: z.object({
    heading: z.string(),
    body: z.string(),
  }),
  spacing: z.object({
    xs: z.string(),
    sm: z.string(),
    md: z.string(),
    lg: z.string(),
    xl: z.string(),
  }),
  borderRadius: z.object({
    sm: z.string(),
    md: z.string(),
    lg: z.string(),
  }),
  logo: z.object({
    light: z.string().optional(),
    dark: z.string().optional(),
  }).optional(),
})

export type Theme = z.infer<typeof themeSchema>

// Default theme configuration
export const defaultTheme: Theme = {
  id: 'default',
  name: 'Default Theme',
  colors: {
    primary: '222.2 47.4% 11.2%',
    primaryForeground: '210 40% 98%',
    secondary: '210 40% 96.1%',
    secondaryForeground: '222.2 47.4% 11.2%',
    accent: '210 40% 96.1%',
    accentForeground: '222.2 47.4% 11.2%',
    background: '0 0% 100%',
    foreground: '222.2 47.4% 11.2%',
    card: '0 0% 100%',
    cardForeground: '222.2 47.4% 11.2%',
    popover: '0 0% 100%',
    popoverForeground: '222.2 47.4% 11.2%',
    muted: '210 40% 96.1%',
    mutedForeground: '215.4 16.3% 46.9%',
    border: '214.3 31.8% 91.4%',
    input: '214.3 31.8% 91.4%',
    ring: '222.2 84% 4.9%',
    destructive: '0 84.2% 60.2%',
    destructiveForeground: '210 40% 98%',
  },
  fonts: {
    heading: 'Inter, system-ui, sans-serif',
    body: 'Inter, system-ui, sans-serif',
  },
  spacing: {
    xs: '0.5rem',
    sm: '1rem',
    md: '1.5rem',
    lg: '2rem',
    xl: '3rem',
  },
  borderRadius: {
    sm: '0.375rem',
    md: '0.5rem',
    lg: '0.75rem',
  },
}

// Dark mode variant of default theme
export const defaultDarkTheme: Theme = {
  ...defaultTheme,
  id: 'default-dark',
  name: 'Default Dark Theme',
  colors: {
    primary: '210 40% 98%',
    primaryForeground: '222.2 47.4% 11.2%',
    secondary: '217.2 32.6% 17.5%',
    secondaryForeground: '210 40% 98%',
    accent: '217.2 32.6% 17.5%',
    accentForeground: '210 40% 98%',
    background: '222.2 84% 4.9%',
    foreground: '210 40% 98%',
    card: '222.2 84% 4.9%',
    cardForeground: '210 40% 98%',
    popover: '222.2 84% 4.9%',
    popoverForeground: '210 40% 98%',
    muted: '217.2 32.6% 17.5%',
    mutedForeground: '215 20.2% 65.1%',
    border: '217.2 32.6% 17.5%',
    input: '217.2 32.6% 17.5%',
    ring: '212.7 26.8% 83.9%',
    destructive: '0 62.8% 30.6%',
    destructiveForeground: '210 40% 98%',
  },
}

// Theme cache key
export const THEME_CACHE_KEY = 'gametriq-theme'
export const THEME_CACHE_DURATION = 1000 * 60 * 60 * 24 // 24 hours

// Helper to convert theme to CSS variables
export function themeToCSSVariables(theme: Theme): Record<string, string> {
  const vars: Record<string, string> = {}

  // Colors
  Object.entries(theme.colors).forEach(([key, value]) => {
    vars[`--${kebabCase(key)}`] = value
  })

  // Fonts
  vars['--font-heading'] = theme.fonts.heading
  vars['--font-body'] = theme.fonts.body

  // Spacing
  Object.entries(theme.spacing).forEach(([key, value]) => {
    vars[`--spacing-${key}`] = value
  })

  // Border radius
  Object.entries(theme.borderRadius).forEach(([key, value]) => {
    vars[`--radius-${key}`] = value
  })

  return vars
}

// Helper to apply theme to document
export function applyThemeToDocument(theme: Theme) {
  const cssVars = themeToCSSVariables(theme)
  const root = document.documentElement

  Object.entries(cssVars).forEach(([key, value]) => {
    root.style.setProperty(key, value)
  })
}

// Helper to cache theme
export function cacheTheme(theme: Theme) {
  if (typeof window === 'undefined') return

  const cacheData = {
    theme,
    timestamp: Date.now(),
  }

  localStorage.setItem(THEME_CACHE_KEY, JSON.stringify(cacheData))
}

// Helper to get cached theme
export function getCachedTheme(): Theme | null {
  if (typeof window === 'undefined') return null

  try {
    const cached = localStorage.getItem(THEME_CACHE_KEY)
    if (!cached) return null

    const { theme, timestamp } = JSON.parse(cached)
    const now = Date.now()

    // Check if cache is expired
    if (now - timestamp > THEME_CACHE_DURATION) {
      localStorage.removeItem(THEME_CACHE_KEY)
      return null
    }

    return themeSchema.parse(theme)
  } catch (error) {
    console.error('Error parsing cached theme:', error)
    localStorage.removeItem(THEME_CACHE_KEY)
    return null
  }
}

// Helper to convert camelCase to kebab-case
function kebabCase(str: string): string {
  return str.replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1-$2').toLowerCase()
}

// API functions
export async function fetchTheme(organizationId: string): Promise<Theme> {
  try {
    const response = await fetch(`/api/organizations/${organizationId}/branding`)
    
    if (!response.ok) {
      throw new Error('Failed to fetch theme')
    }

    const data = await response.json()
    
    // Validate and return theme
    return themeSchema.parse(data.theme)
  } catch (error) {
    console.error('Error fetching theme:', error)
    // Return default theme as fallback
    return defaultTheme
  }
}

// Helper to merge partial theme updates with existing theme
export function mergeTheme(base: Theme, updates: Partial<Theme>): Theme {
  return {
    ...base,
    ...updates,
    colors: {
      ...base.colors,
      ...(updates.colors || {}),
    },
    fonts: {
      ...base.fonts,
      ...(updates.fonts || {}),
    },
    spacing: {
      ...base.spacing,
      ...(updates.spacing || {}),
    },
    borderRadius: {
      ...base.borderRadius,
      ...(updates.borderRadius || {}),
    },
    logo: {
      ...base.logo,
      ...(updates.logo || {}),
    },
  }
}