# Theming System Documentation

## Overview

The Gametriq League App includes a comprehensive theming system that allows organizations to customize their portal's appearance with their brand colors, fonts, and logos.

## Architecture

### Core Components

1. **Theme Configuration (`src/lib/theme.ts`)**
   - Theme schema validation using Zod
   - Default theme configurations for light and dark modes
   - Theme caching and API integration
   - CSS variable generation

2. **Theme Provider (`src/providers/ThemeProvider.tsx`)**
   - React context for theme state management
   - Dynamic theme loading from API
   - Light/dark mode support via next-themes
   - Real-time theme updates

3. **useTheme Hook (`src/hooks/useTheme.ts`)**
   - Access to current theme data
   - Theme mode management (light/dark/system)
   - Theme update and refresh functions

4. **Theme Customizer (`src/components/ThemeCustomizer.tsx`)**
   - Admin UI for customizing themes
   - Real-time preview
   - Color picker with HSL support
   - Logo upload functionality

5. **CSS Variables (`src/styles/themes.css`)**
   - CSS custom properties for all theme values
   - Light and dark mode variants
   - Utility classes

## Theme Schema

```typescript
interface Theme {
  id: string
  name: string
  colors: {
    primary: string           // HSL format: "222.2 47.4% 11.2%"
    primaryForeground: string
    secondary: string
    secondaryForeground: string
    accent: string
    accentForeground: string
    background: string
    foreground: string
    card: string
    cardForeground: string
    popover: string
    popoverForeground: string
    muted: string
    mutedForeground: string
    border: string
    input: string
    ring: string
    destructive: string
    destructiveForeground: string
  }
  fonts: {
    heading: string          // e.g., "Inter, system-ui, sans-serif"
    body: string
  }
  spacing: {
    xs: string              // e.g., "0.5rem"
    sm: string
    md: string
    lg: string
    xl: string
  }
  borderRadius: {
    sm: string              // e.g., "0.375rem"
    md: string
    lg: string
  }
  logo?: {
    light?: string         // URL to light mode logo
    dark?: string          // URL to dark mode logo
  }
}
```

## Usage

### Basic Setup

1. **Wrap your app with ThemeProvider:**

```tsx
import { ThemeProvider } from '@/providers/ThemeProvider'

export default function Layout({ children }) {
  return (
    <ThemeProvider organizationId="org-id" defaultMode="system">
      {children}
    </ThemeProvider>
  )
}
```

2. **Access theme in components:**

```tsx
import { useTheme } from '@/hooks/useTheme'

function Component() {
  const { theme, mode, toggleMode } = useTheme()
  
  return (
    <div style={{ color: `hsl(${theme.colors.primary})` }}>
      Current mode: {mode}
      <button onClick={toggleMode}>Toggle Theme</button>
    </div>
  )
}
```

### CSS Variables

All theme values are available as CSS variables:

```css
/* Color variables */
.element {
  color: hsl(var(--primary));
  background-color: hsl(var(--background));
  border-color: hsl(var(--border));
}

/* Font variables */
body {
  font-family: var(--font-body);
}

h1 {
  font-family: var(--font-heading);
}

/* Spacing variables */
.container {
  padding: var(--spacing-md);
  margin: var(--spacing-lg);
}

/* Border radius variables */
.card {
  border-radius: var(--radius-md);
}
```

### Tailwind Integration

The theme system integrates with Tailwind CSS:

```tsx
<div className="bg-primary text-primary-foreground rounded-md p-md">
  Themed content
</div>
```

## API Integration

### Fetching Theme

```typescript
GET /api/organizations/{organizationId}/branding

Response:
{
  "theme": { ...Theme object }
}
```

### Updating Theme

```typescript
PUT /api/organizations/{organizationId}/branding

Body:
{
  "theme": { ...Theme object }
}
```

### Uploading Logo

```typescript
POST /api/organizations/{organizationId}/branding/logo

FormData:
- logo: File
- type: "light" | "dark"

Response:
{
  "url": "https://..."
}
```

## Features

1. **Dynamic Theme Loading**
   - Themes are fetched from the API based on organization ID
   - Cached locally for 24 hours
   - Falls back to default theme on error

2. **Real-time Preview**
   - Changes are applied immediately
   - Preview in both light and dark modes
   - Sample components showcase

3. **Logo Support**
   - Separate logos for light and dark modes
   - Automatic display based on current mode
   - Fallback to text if no logo

4. **Dark Mode**
   - Automatic dark variant generation
   - System preference detection
   - Manual toggle option

5. **Performance**
   - CSS variables for instant updates
   - No JavaScript required for theme application
   - Minimal bundle size impact

## Best Practices

1. **Color Format**
   - Use HSL format without `hsl()` wrapper
   - Example: `"222.2 47.4% 11.2%"` not `"hsl(222.2, 47.4%, 11.2%)"`

2. **Contrast Ratios**
   - Ensure sufficient contrast between foreground/background pairs
   - Test in both light and dark modes

3. **Font Stacks**
   - Always include fallback fonts
   - Example: `"Inter, system-ui, sans-serif"`

4. **Caching**
   - Theme is cached for 24 hours
   - Use `refreshTheme()` to force update

5. **Organization Context**
   - Extract organization ID from subdomain, auth, or URL
   - Provide fallback for development

## Troubleshooting

### Theme not loading
- Check organization ID is correct
- Verify API endpoint is accessible
- Check browser console for errors
- Clear local storage cache

### Colors not applying
- Ensure HSL format is correct
- Check CSS variable names match
- Verify ThemeProvider is wrapping component

### Dark mode issues
- Check system preferences
- Ensure dark theme colors are defined
- Test with manual mode toggle

### Logo not displaying
- Verify image URLs are accessible
- Check CORS headers for external images
- Ensure proper logo object structure