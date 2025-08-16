interface QueuedAction {
  id: string
  type: 'score_update' | 'player_stat' | 'game_event'
  payload: any
  timestamp: number
  retries: number
}

class OfflineQueue {
  private DB_NAME = 'basketball-offline'
  private STORE_NAME = 'actions'
  private db: IDBDatabase | null = null
  private syncInProgress = false

  async init() {
    if (typeof window === 'undefined') return

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, 1)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        this.db = request.result
        resolve(this.db)
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        if (!db.objectStoreNames.contains(this.STORE_NAME)) {
          const store = db.createObjectStore(this.STORE_NAME, { keyPath: 'id' })
          store.createIndex('timestamp', 'timestamp', { unique: false })
        }
      }
    })
  }

  async addAction(type: QueuedAction['type'], payload: any) {
    if (!this.db) await this.init()
    if (!this.db) return

    const action: QueuedAction = {
      id: `${Date.now()}-${Math.random()}`,
      type,
      payload,
      timestamp: Date.now(),
      retries: 0
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readwrite')
      const store = transaction.objectStore(this.STORE_NAME)
      const request = store.add(action)

      request.onsuccess = () => resolve(action)
      request.onerror = () => reject(request.error)
    })
  }

  async getActions(): Promise<QueuedAction[]> {
    if (!this.db) await this.init()
    if (!this.db) return []

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readonly')
      const store = transaction.objectStore(this.STORE_NAME)
      const request = store.getAll()

      request.onsuccess = () => resolve(request.result || [])
      request.onerror = () => reject(request.error)
    })
  }

  async removeAction(id: string) {
    if (!this.db) return

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readwrite')
      const store = transaction.objectStore(this.STORE_NAME)
      const request = store.delete(id)

      request.onsuccess = () => resolve(true)
      request.onerror = () => reject(request.error)
    })
  }

  async syncQueue(onSync: (action: QueuedAction) => Promise<boolean>) {
    if (this.syncInProgress) return
    this.syncInProgress = true

    try {
      const actions = await this.getActions()
      
      for (const action of actions.sort((a, b) => a.timestamp - b.timestamp)) {
        try {
          const success = await onSync(action)
          if (success) {
            await this.removeAction(action.id)
          } else {
            // Increment retry count
            action.retries++
            if (action.retries > 5) {
              // Too many retries, remove from queue
              await this.removeAction(action.id)
            }
          }
        } catch (error) {
          console.error('Error syncing action:', error)
        }
      }
    } finally {
      this.syncInProgress = false
    }
  }

  getQueueSize(): Promise<number> {
    return this.getActions().then(actions => actions.length)
  }
}

export const offlineQueue = new OfflineQueue()

// Helper function to check online status
export function isOnline(): boolean {
  if (typeof window === 'undefined') return true
  return navigator.onLine
}

// Wrapper for backward compatibility
offlineQueue.addToQueue = async function(operation: string, table: string, data: any) {
  return this.addAction('score_update', { operation, table, data })
}

// Initialize on client side
if (typeof window !== 'undefined') {
  offlineQueue.init()

  // Auto-sync when coming back online
  window.addEventListener('online', () => {
    console.log('Back online, syncing queue...')
    offlineQueue.syncQueue(async (action) => {
      // Implement sync logic based on action type
      console.log('Syncing action:', action)
      // Return true if successful, false to retry
      return true
    })
  })
}