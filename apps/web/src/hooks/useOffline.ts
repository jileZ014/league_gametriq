'use client'

import { useEffect, useState, useCallback } from 'react'
import { usePWA } from './usePWA'

interface UseOfflineReturn {
  isOffline: boolean
  isOnline: boolean
  lastSync: Date | null
  syncData: () => Promise<void>
  queueRequest: (request: Request) => Promise<void>
  pendingRequests: number
}

export function useOffline(): UseOfflineReturn {
  const { isOffline } = usePWA()
  const [lastSync, setLastSync] = useState<Date | null>(null)
  const [pendingRequests, setPendingRequests] = useState(0)

  // Check for pending sync requests
  useEffect(() => {
    if ('sync' in self.registration) {
      // Count pending sync requests
      const checkPending = async () => {
        const tags = await (self.registration as any).sync.getTags()
        setPendingRequests(tags.length)
      }
      
      checkPending()
      
      // Check periodically
      const interval = setInterval(checkPending, 5000)
      return () => clearInterval(interval)
    }
  }, [])

  // Sync data when coming back online
  useEffect(() => {
    const handleOnline = async () => {
      if ('sync' in self.registration) {
        try {
          await (self.registration as any).sync.register('sync-data')
          setLastSync(new Date())
        } catch (error) {
          console.error('Failed to register sync:', error)
        }
      }
    }

    if (!isOffline) {
      handleOnline()
    }

    window.addEventListener('online', handleOnline)
    return () => window.removeEventListener('online', handleOnline)
  }, [isOffline])

  const syncData = useCallback(async () => {
    if ('sync' in self.registration) {
      try {
        await (self.registration as any).sync.register('sync-data')
        setLastSync(new Date())
      } catch (error) {
        console.error('Failed to sync data:', error)
      }
    }
  }, [])

  const queueRequest = useCallback(async (request: Request) => {
    // Store request in IndexedDB for later sync
    if ('indexedDB' in window) {
      const db = await openSyncDB()
      const tx = db.transaction(['sync-requests'], 'readwrite')
      const store = tx.objectStore('sync-requests')
      
      await store.add({
        url: request.url,
        method: request.method,
        headers: Object.fromEntries(request.headers.entries()),
        body: await request.text(),
        timestamp: Date.now()
      })
      
      setPendingRequests(prev => prev + 1)
      
      // Register for background sync
      if ('sync' in self.registration) {
        await (self.registration as any).sync.register('sync-requests')
      }
    }
  }, [])

  return {
    isOffline,
    isOnline: !isOffline,
    lastSync,
    syncData,
    queueRequest,
    pendingRequests
  }
}

// Helper to open IndexedDB for sync storage
async function openSyncDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('gametriq-sync', 1)
    
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      
      if (!db.objectStoreNames.contains('sync-requests')) {
        db.createObjectStore('sync-requests', { 
          keyPath: 'id', 
          autoIncrement: true 
        })
      }
    }
  })
}