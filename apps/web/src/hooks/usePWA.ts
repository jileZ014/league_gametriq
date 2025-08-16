'use client'

import { useEffect, useState, useCallback } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

interface UsePWAReturn {
  isInstalled: boolean
  isInstallable: boolean
  isIOS: boolean
  isAndroid: boolean
  isOffline: boolean
  hasUpdate: boolean
  install: () => Promise<boolean>
  update: () => Promise<void>
  dismiss: () => void
  clearCache: () => Promise<void>
  registration: ServiceWorkerRegistration | null
}

export function usePWA(): UsePWAReturn {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstalled, setIsInstalled] = useState(false)
  const [isInstallable, setIsInstallable] = useState(false)
  const [isOffline, setIsOffline] = useState(typeof window !== 'undefined' ? !navigator.onLine : false)
  const [hasUpdate, setHasUpdate] = useState(false)
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null)

  // Detect platform
  const isIOS = typeof window !== 'undefined' ? /iPhone|iPad|iPod/.test(navigator.userAgent) : false
  const isAndroid = typeof window !== 'undefined' ? /Android/.test(navigator.userAgent) : false

  // Check if app is installed
  useEffect(() => {
    // Check if running in standalone mode
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
    const isInWebApp = (window.navigator as any).standalone === true
    
    setIsInstalled(isStandalone || isInWebApp)

    // Check if installed via getInstalledRelatedApps (if available)
    if ('getInstalledRelatedApps' in navigator) {
      (navigator as any).getInstalledRelatedApps().then((apps: any[]) => {
        if (apps.length > 0) {
          setIsInstalled(true)
        }
      })
    }
  }, [])

  // Handle install prompt
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setIsInstallable(true)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  // Handle app installed
  useEffect(() => {
    const handleAppInstalled = () => {
      setIsInstalled(true)
      setIsInstallable(false)
      setDeferredPrompt(null)
    }

    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  // Handle online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOffline(false)
    const handleOffline = () => setIsOffline(true)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Handle service worker updates
  useEffect(() => {
    const handleSWUpdate = (event: CustomEvent) => {
      setHasUpdate(true)
      setRegistration(event.detail)
    }

    window.addEventListener('swUpdated', handleSWUpdate as EventListener)

    // Get current registration
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((reg) => {
        setRegistration(reg)
      })
    }

    return () => {
      window.removeEventListener('swUpdated', handleSWUpdate as EventListener)
    }
  }, [])

  // Install PWA
  const install = useCallback(async (): Promise<boolean> => {
    if (!deferredPrompt) {
      return false
    }

    try {
      await deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      
      if (outcome === 'accepted') {
        setIsInstalled(true)
        setIsInstallable(false)
        setDeferredPrompt(null)
        return true
      }
    } catch (error) {
      console.error('Error installing PWA:', error)
    }

    return false
  }, [deferredPrompt])

  // Update service worker
  const update = useCallback(async () => {
    if (!registration || !registration.waiting) {
      return
    }

    // Tell waiting service worker to take control
    registration.waiting.postMessage({ type: 'SKIP_WAITING' })
    
    // Reload once the new service worker has taken control
    const handleControllerChange = () => {
      window.location.reload()
    }
    
    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange)
  }, [registration])

  // Dismiss install prompt
  const dismiss = useCallback(() => {
    setDeferredPrompt(null)
    setIsInstallable(false)
    
    // Store dismissal in localStorage to not show again for 7 days
    localStorage.setItem('pwa-prompt-dismissed', Date.now().toString())
  }, [])

  // Clear all caches
  const clearCache = useCallback(async () => {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_CACHE' })
    }

    // Also clear browser caches
    if ('caches' in window) {
      const cacheNames = await caches.keys()
      await Promise.all(cacheNames.map(name => caches.delete(name)))
    }
  }, [])

  return {
    isInstalled,
    isInstallable,
    isIOS,
    isAndroid,
    isOffline,
    hasUpdate,
    install,
    update,
    dismiss,
    clearCache,
    registration
  }
}