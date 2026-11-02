import { useQuery } from '@tanstack/react-query'
import { getSession } from '@/features/auth/api'
import { readSessionToken } from '@/features/auth/session'

export function sessionQueryOptions() {
  return { queryKey: ['auth', 'session', readSessionToken()] as const, queryFn: ({ signal }: { signal?: AbortSignal }) => getSession(signal), staleTime: 0 }
}

export function useSession() { return useQuery(sessionQueryOptions()) }
