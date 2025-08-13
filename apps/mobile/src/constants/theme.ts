import { MD3LightTheme as DefaultTheme } from 'react-native-paper';

// Legacy Youth Sports brand colors
export const colors = {
  primary: '#fbbf24', // Gold
  secondary: '#000000', // Black
  accent: '#f59e0b', // Darker gold
  background: '#ffffff',
  surface: '#f5f5f5',
  error: '#ef4444',
  success: '#10b981',
  warning: '#f59e0b',
  info: '#3b82f6',
  text: '#1f2937',
  textSecondary: '#6b7280',
  border: '#e5e7eb',
  disabled: '#d1d5db',
  
  // Game status colors
  live: '#ef4444',
  upcoming: '#3b82f6',
  final: '#10b981',
  
  // Team colors
  home: '#1f2937',
  away: '#6b7280',
};

export const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.primary,
    secondary: colors.secondary,
    tertiary: colors.accent,
    surface: colors.surface,
    background: colors.background,
    error: colors.error,
    onPrimary: colors.secondary,
    onSecondary: colors.primary,
    onSurface: colors.text,
    onBackground: colors.text,
  },
  roundness: 8,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const typography = {
  h1: {
    fontSize: 32,
    fontWeight: 'bold' as const,
    lineHeight: 40,
  },
  h2: {
    fontSize: 24,
    fontWeight: 'bold' as const,
    lineHeight: 32,
  },
  h3: {
    fontSize: 20,
    fontWeight: '600' as const,
    lineHeight: 28,
  },
  h4: {
    fontSize: 18,
    fontWeight: '600' as const,
    lineHeight: 24,
  },
  body: {
    fontSize: 16,
    fontWeight: 'normal' as const,
    lineHeight: 24,
  },
  bodySmall: {
    fontSize: 14,
    fontWeight: 'normal' as const,
    lineHeight: 20,
  },
  caption: {
    fontSize: 12,
    fontWeight: 'normal' as const,
    lineHeight: 16,
  },
};