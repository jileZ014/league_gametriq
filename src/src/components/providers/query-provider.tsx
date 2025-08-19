'use client'

import * as React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

interface QueryProviderProps {
  children: React.ReactNode
}

export function QueryProvider({ children }: QueryProviderProps) {
  const [queryClient] = React.useState(
    () => new QueryClient({
      defaultOptions: {
        queries: {
          // Stale time for basketball data
          staleTime: 1000 * 60 * 5, // 5 minutes for most data
          // Retry configuration for live game data
          retry: (failureCount, error) => {
            // Don't retry on 4xx errors
            if (error && typeof error === 'object' && 'status' in error) {
              const status = error.status as number
              if (status >= 400 && status < 500) {
                return false
              }
            }
            return failureCount < 3
          },
          // Refetch on window focus for live data
          refetchOnWindowFocus: true,
          // Background updates for live games
          refetchInterval: (data, query) => {
            // Refetch live game data every 10 seconds
            if (query.queryKey.includes('live-game')) {
              return 10000
            }
            // Refetch heat safety data every 5 minutes
            if (query.queryKey.includes('heat-safety')) {
              return 300000
            }
            // No automatic refetch for other queries
            return false
          },
        },
        mutations: {
          // Retry mutations for better reliability
          retry: 1,
        },
      },
    })
  )

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}