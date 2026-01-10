'use client'

/**
 * React Query Provider für die App
 * 
 * Stellt den QueryClient für alle TanStack Query Hooks bereit.
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useState, ReactNode } from 'react'

interface QueryProviderProps {
  children: ReactNode
}

export function QueryProvider({ children }: QueryProviderProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Daten für 5 Minuten als "frisch" betrachten
            staleTime: 5 * 60 * 1000,
            // Bei Fehler nicht automatisch wiederholen im UI
            retry: 1,
            // Refetch bei Window-Focus
            refetchOnWindowFocus: true,
          },
          mutations: {
            // Bei Fehler nicht wiederholen
            retry: 0,
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  )
}
