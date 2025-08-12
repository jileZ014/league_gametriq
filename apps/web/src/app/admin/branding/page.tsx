'use client'

import { ThemeCustomizer } from '@/components/ThemeCustomizer'
import { useTheme } from '@/hooks/useTheme'

export default function BrandingPage() {
  const { isLoading } = useTheme()

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Branding & Theme Settings</h1>
          <p className="text-muted-foreground mt-2">
            Customize your organization's branding, colors, and theme settings.
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : (
          <ThemeCustomizer organizationId="default" />
        )}
      </div>
    </div>
  )
}