import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { queryClient } from '@/app/query-client'
import { router } from '@/app/router'
import { useEffect } from 'react'
import { sessionChangedEvent } from '@/features/auth/session'
import { CommerceRealtime } from '@/features/commerce/realtime'

export function AppProviders() {
  useEffect(() => {
    const onSessionChanged = () => {
      void queryClient.cancelQueries()
      queryClient.clear()
      void router.invalidate()
    }
    window.addEventListener(sessionChangedEvent, onSessionChanged)
    return () => window.removeEventListener(sessionChangedEvent, onSessionChanged)
  }, [])
  return (
    <QueryClientProvider client={queryClient}>
      <CommerceRealtime />
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
}
