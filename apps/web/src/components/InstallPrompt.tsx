'use client'

import { useEffect, useState } from 'react'
import { X, Download, Smartphone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { usePWA } from '@/hooks/usePWA'
import { cn } from '@/lib/utils'

export function InstallPrompt() {
  const {
    isInstallable,
    isInstalled,
    isIOS,
    isAndroid,
    install,
    dismiss
  } = usePWA()
  
  const [showIOSPrompt, setShowIOSPrompt] = useState(false)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Show prompt after 30 seconds if installable and not installed
    const timer = setTimeout(() => {
      if (isInstallable && !isInstalled) {
        setIsVisible(true)
      }
      if (isIOS && !isInstalled) {
        setShowIOSPrompt(true)
      }
    }, 30000)

    return () => clearTimeout(timer)
  }, [isInstallable, isInstalled, isIOS])

  const handleInstall = async () => {
    const installed = await install()
    if (installed) {
      setIsVisible(false)
    }
  }

  const handleDismiss = () => {
    dismiss()
    setIsVisible(false)
    setShowIOSPrompt(false)
  }

  // Don't show if already installed
  if (isInstalled) return null

  // iOS-specific install instructions
  if (isIOS && showIOSPrompt) {
    return (
      <Card className={cn(
        "fixed bottom-4 left-4 right-4 z-50 p-4 shadow-lg",
        "animate-in slide-in-from-bottom-5",
        "max-w-md mx-auto",
        "bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80"
      )}>
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2"
          onClick={handleDismiss}
        >
          <X className="h-4 w-4" />
        </Button>
        
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0 mt-1">
            <Smartphone className="h-8 w-8 text-primary" />
          </div>
          <div className="flex-1 space-y-2">
            <h3 className="font-semibold text-lg">Install GameTriq</h3>
            <p className="text-sm text-muted-foreground">
              To install this app on your iPhone:
            </p>
            <ol className="text-sm space-y-1 list-decimal list-inside text-muted-foreground">
              <li>Tap the Share button <span className="inline-block w-4 h-4 align-middle">⬆️</span></li>
              <li>Scroll down and tap "Add to Home Screen"</li>
              <li>Tap "Add" to install</li>
            </ol>
          </div>
        </div>
      </Card>
    )
  }

  // Standard install prompt for Chrome/Edge/Firefox
  if (isInstallable && isVisible) {
    return (
      <Card className={cn(
        "fixed bottom-4 left-4 right-4 z-50 p-4 shadow-lg",
        "animate-in slide-in-from-bottom-5",
        "max-w-md mx-auto",
        "bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80"
      )}>
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2"
          onClick={handleDismiss}
        >
          <X className="h-4 w-4" />
        </Button>
        
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0 mt-1">
            <Download className="h-8 w-8 text-primary" />
          </div>
          <div className="flex-1 space-y-3">
            <div>
              <h3 className="font-semibold text-lg">Install GameTriq</h3>
              <p className="text-sm text-muted-foreground">
                Install our app for a better experience with offline access and push notifications.
              </p>
            </div>
            
            <div className="flex space-x-2">
              <Button
                onClick={handleInstall}
                className="flex-1"
                variant="default"
              >
                Install Now
              </Button>
              <Button
                onClick={handleDismiss}
                variant="outline"
              >
                Not Now
              </Button>
            </div>
          </div>
        </div>
      </Card>
    )
  }

  return null
}