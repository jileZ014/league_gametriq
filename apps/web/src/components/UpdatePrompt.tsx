'use client'

import { useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { Button } from '@/components/simple-ui'
import { Card } from '@/components/simple-ui'
import { usePWA } from '@/hooks/usePWA'
import { cn } from '@/lib/utils'

export function UpdatePrompt() {
  const { hasUpdate, update } = usePWA()
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (hasUpdate) {
      setShow(true)
    }
  }, [hasUpdate])

  const handleUpdate = async () => {
    await update()
    setShow(false)
  }

  if (!show) return null

  return (
    <Card className={cn(
      "fixed top-4 left-1/2 -translate-x-1/2 z-50 p-4 shadow-lg",
      "animate-in slide-in-from-top-5",
      "max-w-md w-[calc(100%-2rem)]",
      "bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80"
    )}>
      <div className="flex items-center space-x-3">
        <div className="flex-shrink-0">
          <RefreshCw className="h-6 w-6 text-primary animate-spin" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium">
            A new version of GameTriq is available!
          </p>
        </div>
        <Button
          onClick={handleUpdate}
          size="sm"
          variant="default"
        >
          Update
        </Button>
      </div>
    </Card>
  )
}