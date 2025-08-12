'use client'

import React, { useState, useCallback } from 'react'
import { useTheme } from '@/hooks/useTheme'
import { Theme } from '@/lib/theme'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ColorPicker } from '@/components/ui/color-picker'
import { Upload, RefreshCw, Save, RotateCcw, Sun, Moon, Monitor } from 'lucide-react'
import { toast } from '@/components/ui/toaster'

interface ThemeCustomizerProps {
  organizationId: string
  onSave?: (theme: Theme) => Promise<void>
}

export function ThemeCustomizer({ organizationId, onSave }: ThemeCustomizerProps) {
  const { theme, lightTheme, darkTheme, mode, setMode, updateTheme, resetTheme, isLoading } = useTheme()
  const [isSaving, setIsSaving] = useState(false)
  const [previewMode, setPreviewMode] = useState<'light' | 'dark'>('light')
  const [localTheme, setLocalTheme] = useState<Theme>(lightTheme)

  // Handle color change
  const handleColorChange = (colorKey: keyof Theme['colors'], value: string) => {
    const updatedTheme = {
      ...localTheme,
      colors: {
        ...localTheme.colors,
        [colorKey]: value,
      },
    }
    setLocalTheme(updatedTheme)
    updateTheme(updatedTheme)
  }

  // Handle font change
  const handleFontChange = (fontKey: keyof Theme['fonts'], value: string) => {
    const updatedTheme = {
      ...localTheme,
      fonts: {
        ...localTheme.fonts,
        [fontKey]: value,
      },
    }
    setLocalTheme(updatedTheme)
    updateTheme(updatedTheme)
  }

  // Handle spacing change
  const handleSpacingChange = (spacingKey: keyof Theme['spacing'], value: string) => {
    const updatedTheme = {
      ...localTheme,
      spacing: {
        ...localTheme.spacing,
        [spacingKey]: value,
      },
    }
    setLocalTheme(updatedTheme)
    updateTheme(updatedTheme)
  }

  // Handle border radius change
  const handleRadiusChange = (radiusKey: keyof Theme['borderRadius'], value: string) => {
    const updatedTheme = {
      ...localTheme,
      borderRadius: {
        ...localTheme.borderRadius,
        [radiusKey]: value,
      },
    }
    setLocalTheme(updatedTheme)
    updateTheme(updatedTheme)
  }

  // Handle logo upload
  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>, logoType: 'light' | 'dark') => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      // Create FormData and upload to API
      const formData = new FormData()
      formData.append('logo', file)
      formData.append('type', logoType)

      const response = await fetch(`/api/organizations/${organizationId}/branding/logo`, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Failed to upload logo')
      }

      const { url } = await response.json()

      // Update theme with new logo URL
      const updatedTheme = {
        ...localTheme,
        logo: {
          ...localTheme.logo,
          [logoType]: url,
        },
      }
      setLocalTheme(updatedTheme)
      updateTheme(updatedTheme)

      toast({
        title: 'Logo uploaded',
        description: `${logoType === 'light' ? 'Light' : 'Dark'} mode logo has been uploaded successfully.`,
      })
    } catch (error) {
      console.error('Error uploading logo:', error)
      toast({
        title: 'Upload failed',
        description: 'Failed to upload logo. Please try again.',
        variant: 'destructive',
      })
    }
  }

  // Save theme
  const handleSave = async () => {
    setIsSaving(true)
    try {
      if (onSave) {
        await onSave(localTheme)
      } else {
        // Default save to API
        const response = await fetch(`/api/organizations/${organizationId}/branding`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ theme: localTheme }),
        })

        if (!response.ok) {
          throw new Error('Failed to save theme')
        }
      }

      toast({
        title: 'Theme saved',
        description: 'Your theme customizations have been saved successfully.',
      })
    } catch (error) {
      console.error('Error saving theme:', error)
      toast({
        title: 'Save failed',
        description: 'Failed to save theme. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  // Reset to defaults
  const handleReset = () => {
    resetTheme()
    setLocalTheme(lightTheme)
    toast({
      title: 'Theme reset',
      description: 'Theme has been reset to defaults.',
    })
  }

  return (
    <div className="space-y-6">
      {/* Preview Mode Selector */}
      <Card>
        <CardHeader>
          <CardTitle>Preview Mode</CardTitle>
          <CardDescription>
            Switch between light and dark mode to preview your theme changes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-2">
            <Button
              variant={mode === 'light' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMode('light')}
            >
              <Sun className="mr-2 h-4 w-4" />
              Light
            </Button>
            <Button
              variant={mode === 'dark' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMode('dark')}
            >
              <Moon className="mr-2 h-4 w-4" />
              Dark
            </Button>
            <Button
              variant={mode === 'system' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMode('system')}
            >
              <Monitor className="mr-2 h-4 w-4" />
              System
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="colors" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="colors">Colors</TabsTrigger>
          <TabsTrigger value="typography">Typography</TabsTrigger>
          <TabsTrigger value="spacing">Spacing</TabsTrigger>
          <TabsTrigger value="logos">Logos</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
        </TabsList>

        {/* Colors Tab */}
        <TabsContent value="colors" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Color Palette</CardTitle>
              <CardDescription>
                Customize your brand colors. Changes are applied in real-time.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-2">
              {Object.entries(localTheme.colors).map(([key, value]) => (
                <div key={key} className="space-y-2">
                  <Label htmlFor={key} className="text-sm font-medium capitalize">
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </Label>
                  <div className="flex items-center space-x-2">
                    <ColorPicker
                      id={key}
                      value={value}
                      onChange={(newValue) => handleColorChange(key as keyof Theme['colors'], newValue)}
                    />
                    <Input
                      type="text"
                      value={value}
                      onChange={(e) => handleColorChange(key as keyof Theme['colors'], e.target.value)}
                      className="flex-1"
                      placeholder="e.g., 222.2 47.4% 11.2%"
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Typography Tab */}
        <TabsContent value="typography" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Typography</CardTitle>
              <CardDescription>
                Customize fonts for headings and body text
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="heading-font">Heading Font</Label>
                <Input
                  id="heading-font"
                  type="text"
                  value={localTheme.fonts.heading}
                  onChange={(e) => handleFontChange('heading', e.target.value)}
                  placeholder="e.g., Inter, system-ui, sans-serif"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="body-font">Body Font</Label>
                <Input
                  id="body-font"
                  type="text"
                  value={localTheme.fonts.body}
                  onChange={(e) => handleFontChange('body', e.target.value)}
                  placeholder="e.g., Inter, system-ui, sans-serif"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Spacing Tab */}
        <TabsContent value="spacing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Spacing & Radius</CardTitle>
              <CardDescription>
                Adjust spacing values and border radius
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h4 className="text-sm font-medium mb-4">Spacing</h4>
                <div className="grid gap-4 md:grid-cols-2">
                  {Object.entries(localTheme.spacing).map(([key, value]) => (
                    <div key={key} className="space-y-2">
                      <Label htmlFor={`spacing-${key}`} className="text-sm capitalize">
                        {key}
                      </Label>
                      <Input
                        id={`spacing-${key}`}
                        type="text"
                        value={value}
                        onChange={(e) => handleSpacingChange(key as keyof Theme['spacing'], e.target.value)}
                        placeholder="e.g., 1rem"
                      />
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium mb-4">Border Radius</h4>
                <div className="grid gap-4 md:grid-cols-2">
                  {Object.entries(localTheme.borderRadius).map(([key, value]) => (
                    <div key={key} className="space-y-2">
                      <Label htmlFor={`radius-${key}`} className="text-sm capitalize">
                        {key}
                      </Label>
                      <Input
                        id={`radius-${key}`}
                        type="text"
                        value={value}
                        onChange={(e) => handleRadiusChange(key as keyof Theme['borderRadius'], e.target.value)}
                        placeholder="e.g., 0.5rem"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Logos Tab */}
        <TabsContent value="logos" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Logo Management</CardTitle>
              <CardDescription>
                Upload logos for light and dark modes
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="logo-light">Light Mode Logo</Label>
                  <div className="mt-2 flex items-center space-x-4">
                    {localTheme.logo?.light && (
                      <img
                        src={localTheme.logo.light}
                        alt="Light mode logo"
                        className="h-12 object-contain"
                      />
                    )}
                    <Label htmlFor="logo-light-input" className="cursor-pointer">
                      <div className="flex items-center space-x-2 rounded-md border px-4 py-2 hover:bg-accent">
                        <Upload className="h-4 w-4" />
                        <span>Upload Logo</span>
                      </div>
                      <Input
                        id="logo-light-input"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleLogoUpload(e, 'light')}
                      />
                    </Label>
                  </div>
                </div>
                <div>
                  <Label htmlFor="logo-dark">Dark Mode Logo</Label>
                  <div className="mt-2 flex items-center space-x-4">
                    {localTheme.logo?.dark && (
                      <img
                        src={localTheme.logo.dark}
                        alt="Dark mode logo"
                        className="h-12 object-contain"
                      />
                    )}
                    <Label htmlFor="logo-dark-input" className="cursor-pointer">
                      <div className="flex items-center space-x-2 rounded-md border px-4 py-2 hover:bg-accent">
                        <Upload className="h-4 w-4" />
                        <span>Upload Logo</span>
                      </div>
                      <Input
                        id="logo-dark-input"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleLogoUpload(e, 'dark')}
                      />
                    </Label>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Preview Tab */}
        <TabsContent value="preview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Live Preview</CardTitle>
              <CardDescription>
                See how your theme looks with sample components
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <h1 className="text-4xl font-bold">Heading Example</h1>
                  <h2 className="text-2xl font-semibold">Subheading Example</h2>
                  <p className="text-muted-foreground">
                    This is a paragraph showing how body text appears with your custom theme.
                  </p>
                </div>
                <div className="flex space-x-2">
                  <Button>Primary Button</Button>
                  <Button variant="secondary">Secondary Button</Button>
                  <Button variant="outline">Outline Button</Button>
                  <Button variant="destructive">Destructive</Button>
                </div>
                <Card>
                  <CardHeader>
                    <CardTitle>Sample Card</CardTitle>
                    <CardDescription>This is how cards look with your theme</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p>Card content goes here</p>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Action Buttons */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={handleReset} disabled={isLoading || isSaving}>
          <RotateCcw className="mr-2 h-4 w-4" />
          Reset to Defaults
        </Button>
        <Button onClick={handleSave} disabled={isLoading || isSaving}>
          {isSaving ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Theme
            </>
          )}
        </Button>
      </div>
    </div>
  )
}

// Color Picker Component (simplified version)
function ColorPicker({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  // This is a placeholder - you would implement a proper color picker here
  return (
    <div
      className="h-10 w-10 rounded-md border cursor-pointer"
      style={{ backgroundColor: `hsl(${value})` }}
      onClick={() => {
        // In a real implementation, this would open a color picker
        const newValue = prompt('Enter HSL value (e.g., "222.2 47.4% 11.2%")', value)
        if (newValue) onChange(newValue)
      }}
    />
  )
}