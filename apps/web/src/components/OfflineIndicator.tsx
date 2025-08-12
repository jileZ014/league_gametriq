'use client'

import { useEffect, useState } from 'react'
import { WifiOff, Wifi } from 'lucide-react'
import { useOffline } from '@/hooks/useOffline'
import { cn } from '@/lib/utils'

export function OfflineIndicator() {
  const { isOffline, isOnline, pendingRequests } = useOffline()
  const [show, setShow] = useState(false)
  const [wasOffline, setWasOffline] = useState(false)

  useEffect(() => {
    if (isOffline) {
      setShow(true)
      setWasOffline(true)
    } else if (wasOffline && isOnline) {
      // Show "back online" message briefly
      setTimeout(() => {
        setShow(false)
        setWasOffline(false)
      }, 3000)
    }
  }, [isOffline, isOnline, wasOffline])

  if (!show) return null

  return (
    <div className={cn(
      "fixed bottom-0 left-0 right-0 z-50",
      "animate-in slide-in-from-bottom-5",
      "bg-background border-t shadow-lg"
    )}>
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {isOffline ? (
              <>
                <WifiOff className="h-5 w-5 text-destructive" />
                <div>
                  <p className="text-sm font-medium">You're offline</p>
                  {pendingRequests > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {pendingRequests} pending {pendingRequests === 1 ? 'update' : 'updates'}
                    </p>
                  )}
                </div>
              </>
            ) : (
              <>
                <Wifi className="h-5 w-5 text-green-600" />
                <p className="text-sm font-medium text-green-600">Back online</p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}