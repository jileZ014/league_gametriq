/// <reference types="node" />

// Webpack environment variables
declare module 'webpack-env' {
  interface ImportMeta {
    webpackHot?: {
      accept: (dependencies?: string | string[], callback?: () => void) => void
      decline: (dependencies?: string | string[]) => void
      dispose: (callback: (data: any) => void) => void
      addDisposeHandler: (callback: (data: any) => void) => void
      removeDisposeHandler: (callback: (data: any) => void) => void
      invalidate: () => void
      addStatusHandler: (callback: (status: string) => void) => void
      removeStatusHandler: (callback: (status: string) => void) => void
      status: () => string
      check: (autoApply: boolean) => Promise<string[] | null>
      apply: () => Promise<string[]>
      data?: any
    }
  }
}

// Canvas fallback types for environments where canvas is not available
declare module 'canvas' {
  export class Canvas {
    constructor(width: number, height: number)
    getContext(contextType: '2d'): CanvasRenderingContext2D
    toBuffer(callback: (err: Error | null, buffer: Buffer) => void): void
    toBuffer(type: string, callback: (err: Error | null, buffer: Buffer) => void): void
    toDataURL(): string
    toDataURL(type: string): string
    width: number
    height: number
  }

  export function createCanvas(width: number, height: number): Canvas
  export function loadImage(src: string | Buffer): Promise<HTMLImageElement>
}

// Process environment variable declarations
declare namespace NodeJS {
  interface ProcessEnv {
    // Next.js built-in
    NODE_ENV: 'development' | 'production' | 'test'
    NEXT_PUBLIC_VERCEL_URL?: string
    VERCEL_URL?: string

    // Supabase
    NEXT_PUBLIC_SUPABASE_URL: string
    NEXT_PUBLIC_SUPABASE_ANON_KEY: string
    SUPABASE_SERVICE_KEY?: string

    // Stripe
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?: string
    STRIPE_SECRET_KEY?: string
    STRIPE_WEBHOOK_SECRET?: string

    // Application
    NEXT_PUBLIC_APP_URL?: string
    NEXT_PUBLIC_API_URL?: string
    NEXT_PUBLIC_WEBSOCKET_URL?: string

    // Feature flags
    NEXT_PUBLIC_ENABLE_PWA?: string
    NEXT_PUBLIC_ENABLE_AI?: string
    NEXT_PUBLIC_ENABLE_PAYMENTS?: string

    // Analytics
    NEXT_PUBLIC_GA_MEASUREMENT_ID?: string
    NEXT_PUBLIC_MIXPANEL_TOKEN?: string

    // Email
    EMAIL_FROM?: string
    EMAIL_SMTP_HOST?: string
    EMAIL_SMTP_PORT?: string
    EMAIL_SMTP_USER?: string
    EMAIL_SMTP_PASS?: string

    // Database
    DATABASE_URL?: string
    DATABASE_POOL_URL?: string

    // Redis/Cache
    REDIS_URL?: string
    CACHE_TTL?: string

    // External APIs
    WEATHER_API_KEY?: string
    MAPS_API_KEY?: string

    // Security
    JWT_SECRET?: string
    ENCRYPTION_KEY?: string
    SESSION_SECRET?: string

    // Rate limiting
    RATE_LIMIT_MAX?: string
    RATE_LIMIT_WINDOW?: string

    // File uploads
    MAX_FILE_SIZE?: string
    ALLOWED_FILE_TYPES?: string

    // Monitoring
    SENTRY_DSN?: string
    SENTRY_AUTH_TOKEN?: string
    LOG_LEVEL?: 'debug' | 'info' | 'warn' | 'error'
  }
}

// Global type augmentations
declare global {
  // Window object extensions for PWA
  interface Window {
    workbox?: any
    __WB_MANIFEST?: any[]
    deferredPrompt?: BeforeInstallPromptEvent
  }

  // BeforeInstallPromptEvent for PWA install prompts
  interface BeforeInstallPromptEvent extends Event {
    readonly platforms: string[]
    readonly userChoice: Promise<{
      outcome: 'accepted' | 'dismissed'
      platform: string
    }>
    prompt(): Promise<void>
  }

  // Navigator extensions for PWA
  interface Navigator {
    standalone?: boolean
    mozConnection?: any
    webkitConnection?: any
    connection?: any
  }

  // Service Worker registration
  interface ServiceWorkerRegistration {
    showNotification(title: string, options?: NotificationOptions): Promise<void>
    update(): Promise<void>
  }

  // Extend console for custom logging
  interface Console {
    success?(message?: any, ...optionalParams: any[]): void
  }
}

// Module declarations for files without types
declare module '*.svg' {
  const content: React.FunctionComponent<React.SVGAttributes<SVGElement>>
  export default content
}

declare module '*.png' {
  const content: string
  export default content
}

declare module '*.jpg' {
  const content: string
  export default content
}

declare module '*.jpeg' {
  const content: string
  export default content
}

declare module '*.gif' {
  const content: string
  export default content
}

declare module '*.webp' {
  const content: string
  export default content
}

declare module '*.ico' {
  const content: string
  export default content
}

declare module '*.webm' {
  const content: string
  export default content
}

declare module '*.mp4' {
  const content: string
  export default content
}

declare module '*.css' {
  const content: { [className: string]: string }
  export default content
}

declare module '*.scss' {
  const content: { [className: string]: string }
  export default content
}

declare module '*.sass' {
  const content: { [className: string]: string }
  export default content
}

declare module '*.module.css' {
  const classes: { [key: string]: string }
  export default classes
}

declare module '*.module.scss' {
  const classes: { [key: string]: string }
  export default classes
}

declare module '*.module.sass' {
  const classes: { [key: string]: string }
  export default classes
}

// Ensure this file is treated as a module
export {}