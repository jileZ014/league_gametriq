# Branding Module

This module provides comprehensive branding and theming functionality for organizations within the GameTriq League platform.

## Features

- **Theme Management**: Set and manage organization-specific colors, fonts, and logos
- **Asset Upload**: Upload logo assets (PNG/SVG, max 5MB) with automatic optimization
- **CSS Generation**: Automatic CSS variable generation for easy frontend integration
- **Caching**: Redis-based caching for optimal performance
- **Audit Trail**: Complete history of all branding changes
- **Multi-tenancy**: Tenant-specific branding with organization isolation
- **Public Access**: Public endpoints for portal themes
- **Default Fallback**: System-wide default theme when organization has no custom branding

## API Endpoints

### Private Endpoints (Require Authentication)

- `POST /api/branding` - Create new branding configuration
- `PUT /api/branding/:brandingId` - Update existing branding
- `GET /api/branding` - Get current organization branding
- `POST /api/branding/:brandingId/apply` - Apply a branding configuration
- `POST /api/branding/:brandingId/assets` - Upload branding asset
- `DELETE /api/branding/:brandingId` - Delete branding configuration
- `GET /api/branding/history` - Get branding change history
- `GET /api/branding/default` - Get default system branding

### Public Endpoints

- `GET /api/branding/public/:organizationId` - Get public branding data
- `GET /api/branding/css/:organizationId` - Get branding as CSS file
- `GET /api/branding/assets/:organizationId/:brandingId/:assetId` - Get branding asset

## Configuration Structure

```typescript
{
  organizationName: string;
  tagline?: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    text: {
      primary: string;
      secondary: string;
      disabled: string;
    };
    error: string;
    warning: string;
    info: string;
    success: string;
  };
  fonts: {
    primary: {
      family: string;
      url?: string;
    };
    secondary?: {
      family: string;
      url?: string;
    };
    sizes: {
      xs: string;
      sm: string;
      base: string;
      lg: string;
      xl: string;
      '2xl': string;
    };
  };
  logos: {
    light: {
      url: string;
      width: number;
      height: number;
    };
    dark?: {
      url: string;
      width: number;
      height: number;
    };
    favicon?: string;
  };
  customCss?: string;
  borderRadius?: string;
  spacing?: {
    unit: number;
    scale: number[];
  };
}
```

## CSS Variables

The module automatically generates CSS variables from the branding configuration:

```css
:root {
  --brand-color-primary: #1976D2;
  --brand-color-secondary: #FF4081;
  --brand-font-primary: Roboto;
  --brand-font-size-base: 1rem;
  /* ... and many more */
}
```

## Usage Examples

### Create Branding
```bash
POST /api/branding
Authorization: Bearer <token>
Content-Type: application/json

{
  "organizationName": "Phoenix Flight Basketball",
  "tagline": "Rising to Excellence",
  "colors": {
    "primary": "#FF6B00",
    "secondary": "#1A1A1A",
    "accent": "#FFD700",
    "background": "#FFFFFF",
    "surface": "#F5F5F5",
    "text": {
      "primary": "#1A1A1A",
      "secondary": "#666666",
      "disabled": "#CCCCCC"
    },
    "error": "#DC2626",
    "warning": "#F59E0B",
    "info": "#3B82F6",
    "success": "#10B981"
  },
  "fonts": {
    "primary": {
      "family": "Inter",
      "url": "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700"
    },
    "sizes": {
      "xs": "0.75rem",
      "sm": "0.875rem",
      "base": "1rem",
      "lg": "1.125rem",
      "xl": "1.25rem",
      "2xl": "1.5rem"
    }
  },
  "logos": {
    "light": {
      "url": "/api/branding/assets/org-123/brand-456/logo-light.png",
      "width": 200,
      "height": 60
    }
  }
}
```

### Upload Logo
```bash
POST /api/branding/:brandingId/assets
Authorization: Bearer <token>
Content-Type: multipart/form-data

file: <binary>
assetType: logo_light
metadata: {"alt": "Phoenix Flight Logo"}
```

### Get CSS
```html
<!-- In your HTML head -->
<link rel="stylesheet" href="/api/branding/css/org-123">
```

## Caching Strategy

- Branding configurations are cached for 1 hour
- Cache is automatically invalidated on updates
- Public endpoints include cache headers for CDN compatibility
- Asset files are cached with long expiration (1 year)

## Security

- Role-based access control (admin/owner only for modifications)
- Public endpoints return only safe fields
- Asset upload validation (file type and size)
- Complete audit trail with IP and user agent tracking
- Organization isolation ensures data privacy

## Database Schema

The module creates three tables:
- `branding` - Main configuration storage
- `branding_assets` - Uploaded file references
- `branding_audit` - Change history

See `003_create_branding_tables.sql` for complete schema.