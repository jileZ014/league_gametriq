// Branding Types
export interface TenantBranding {
  tenantId: string;
  logoUrl?: string;
  primaryHex: string;
  secondaryHex: string;
  accentHex: string;
  faviconUrl?: string;
  socialImageUrl?: string;
  updatedAt: Date;
}

export interface BrandingTheme {
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
  };
  typography: {
    fontFamily: string;
    headingFontFamily?: string;
  };
  spacing: {
    unit: number;
  };
}