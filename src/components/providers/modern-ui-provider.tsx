'use client'

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { themeTokens, generateCSSVariables, type ModernThemeProviderProps } from '@/lib/theme.tokens'

interface ModernUIContextValue {
  isModernUIEnabled: boolean
  toggleModernUI: () => void
  themeTokens: typeof themeTokens
  featureFlags: Record<string, boolean>
  updateFeatureFlag: (flag: string, value: boolean) => void
}

const ModernUIContext = createContext<ModernUIContextValue | undefined>(undefined)

export function ModernUIProvider({ 
  children, 
  theme = 'auto',
  enableModernUI = false 
}: ModernThemeProviderProps) {
  const [isModernUIEnabled, setIsModernUIEnabled] = useState<boolean>(enableModernUI)
  const [featureFlags, setFeatureFlags] = useState<Record<string, boolean>>({})

  // Load feature flags from localStorage or environment on mount
  useEffect(() => {
    const loadFeatureFlags = () => {
      try {
        // Check environment variable first
        const envModernUI = process.env.NEXT_PUBLIC_UI_MODERN_V1 === '1' || 
                           (typeof window !== 'undefined' && window.location.search.includes('ui_modern=1'))

        // Check localStorage
        const savedFlags = typeof window !== 'undefined' 
          ? localStorage.getItem('feature_flags') 
          : null

        const parsedFlags = savedFlags ? JSON.parse(savedFlags) : {}
        
        // Determine if Modern UI should be enabled
        const modernUIFlag = envModernUI || 
                            parsedFlags.ui_modern_v1 === true ||
                            enableModernUI

        setIsModernUIEnabled(modernUIFlag)
        setFeatureFlags({
          ui_modern_v1: modernUIFlag,
          registration_v1: parsedFlags.registration_v1 ?? true,
          payments_live_v1: parsedFlags.payments_live_v1 ?? true,
          branding_v1: parsedFlags.branding_v1 ?? true,
          pwa_v1: parsedFlags.pwa_v1 ?? true,
          ...parsedFlags
        })

        console.log('🎨 Modern UI:', modernUIFlag ? 'ENABLED' : 'DISABLED')
        
      } catch (error) {
        console.error('Failed to load feature flags:', error)
        setFeatureFlags({ ui_modern_v1: enableModernUI })
      }
    }

    loadFeatureFlags()
  }, [enableModernUI])

  // Apply Modern UI styles to document
  useEffect(() => {
    if (typeof window === 'undefined') return

    const body = document.body
    const html = document.documentElement

    if (isModernUIEnabled) {
      // Add modern UI classes
      body.classList.add('modern-ui')
      html.setAttribute('data-ui-modern', 'true')
      
      // Inject CSS variables
      const cssVars = generateCSSVariables(themeTokens)
      const styleElement = document.getElementById('modern-ui-styles') || document.createElement('style')
      styleElement.id = 'modern-ui-styles'
      
      const cssText = `
        :root[data-ui-modern="true"] {
          ${Object.entries(cssVars).map(([key, value]) => `${key}: ${value}`).join(';\n  ')};
        }
        
        /* Modern UI base styles */
        .modern-ui {
          --font-inter: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          font-feature-settings: 'cv11', 'ss03', 'ss04';
        }
        
        .modern-ui * {
          box-sizing: border-box;
        }
      `
      
      styleElement.textContent = cssText
      
      if (!document.head.contains(styleElement)) {
        document.head.appendChild(styleElement)
      }
      
      // Load Modern UI theme CSS
      const linkElement = document.getElementById('modern-ui-theme') || document.createElement('link')
      linkElement.id = 'modern-ui-theme'
      linkElement.rel = 'stylesheet'
      linkElement.href = '/styles/theme.modern.css'
      
      if (!document.head.contains(linkElement)) {
        document.head.appendChild(linkElement)
      }
      
    } else {
      // Remove modern UI classes and styles
      body.classList.remove('modern-ui')
      html.removeAttribute('data-ui-modern')
      
      // Remove injected styles
      const styleElement = document.getElementById('modern-ui-styles')
      const linkElement = document.getElementById('modern-ui-theme')
      
      if (styleElement) {
        document.head.removeChild(styleElement)
      }
      
      if (linkElement) {
        document.head.removeChild(linkElement)
      }
    }

    // Update CSS custom property for JavaScript access
    html.style.setProperty('--modern-ui-enabled', isModernUIEnabled ? '1' : '0')

  }, [isModernUIEnabled])

  // Toggle Modern UI
  const toggleModernUI = useCallback(() => {
    const newValue = !isModernUIEnabled
    setIsModernUIEnabled(newValue)
    
    // Update feature flags
    const updatedFlags = {
      ...featureFlags,
      ui_modern_v1: newValue
    }
    
    setFeatureFlags(updatedFlags)
    
    // Save to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('feature_flags', JSON.stringify(updatedFlags))
    }
    
    console.log('🎨 Modern UI toggled:', newValue ? 'ENABLED' : 'DISABLED')
  }, [isModernUIEnabled, featureFlags])

  // Update individual feature flags
  const updateFeatureFlag = useCallback((flag: string, value: boolean) => {
    const updatedFlags = {
      ...featureFlags,
      [flag]: value
    }
    
    setFeatureFlags(updatedFlags)
    
    // Special handling for ui_modern_v1
    if (flag === 'ui_modern_v1') {
      setIsModernUIEnabled(value)
    }
    
    // Save to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('feature_flags', JSON.stringify(updatedFlags))
    }
    
    console.log(`🚩 Feature flag ${flag}:`, value ? 'ENABLED' : 'DISABLED')
  }, [featureFlags])

  const contextValue = {
    isModernUIEnabled,
    toggleModernUI,
    themeTokens,
    featureFlags,
    updateFeatureFlag
  }

  return (
    <ModernUIContext.Provider value={contextValue}>
      {children}
    </ModernUIContext.Provider>
  )
}

// Hook to use Modern UI context
export function useModernUI() {
  const context = useContext(ModernUIContext)
  if (!context) {
    throw new Error('useModernUI must be used within a ModernUIProvider')
  }
  return context
}

// Hook to check if Modern UI is enabled (can be used outside provider)
export function useIsModernUI(): boolean {
  try {
    const context = useContext(ModernUIContext)
    return context?.isModernUIEnabled ?? false
  } catch {
    // Fallback check if not in provider context
    if (typeof window !== 'undefined') {
      const featureFlags = localStorage.getItem('feature_flags')
      const flags = featureFlags ? JSON.parse(featureFlags) : {}
      return flags.ui_modern_v1 === true || process.env.NEXT_PUBLIC_UI_MODERN_V1 === '1'
    }
    return false
  }
}

// Utility component for conditional Modern UI rendering
interface ModernUIConditionalProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  when?: 'enabled' | 'disabled'
}

export function ModernUIConditional({ 
  children, 
  fallback = null, 
  when = 'enabled' 
}: ModernUIConditionalProps) {
  const isModernUI = useIsModernUI()
  const shouldRender = when === 'enabled' ? isModernUI : !isModernUI
  
  return <>{shouldRender ? children : fallback}</>
}

// Higher-order component for Modern UI feature gating
export function withModernUI<P extends object>(
  Component: React.ComponentType<P>,
  fallbackComponent?: React.ComponentType<P>
) {
  return function ModernUIWrapped(props: P) {
    const isModernUI = useIsModernUI()
    
    if (isModernUI) {
      return <Component {...props} />
    }
    
    if (fallbackComponent) {
      const FallbackComponent = fallbackComponent
      return <FallbackComponent {...props} />
    }
    
    return null
  }
}

// CSS-in-JS helper for Modern UI styles
export function modernUIStyles(enabled: any, disabled: any = {}) {
  const isModernUI = useIsModernUI()
  return isModernUI ? enabled : disabled
}

// Utility to get design tokens
export function useDesignTokens() {
  const { themeTokens: tokens } = useModernUI()
  return tokens
}