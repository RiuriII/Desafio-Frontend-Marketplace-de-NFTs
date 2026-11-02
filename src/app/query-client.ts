import { QueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      retry: (count, error) => {
        if (!isAxiosError(error) || error.code === 'ERR_CANCELED') return false
        const status = error.response?.status
        return count < 1 && (status === undefined || status >= 500)
      },
    },
    mutations: { retry: false },
  },
})
