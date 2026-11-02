import axios from 'axios'
import { env } from '@/lib/env'
import { readSessionToken, writeSessionToken } from '@/features/auth/session'

export const apiClient = axios.create({
  baseURL: env.apiBaseUrl,
  timeout: 10_000,
  headers: { Accept: 'application/json' },
})

apiClient.interceptors.request.use((config) => {
  const token = readSessionToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

apiClient.interceptors.response.use(undefined, (error: unknown) => {
  if (axios.isAxiosError(error) && error.response?.status === 401) {
    const sentToken = String(error.config?.headers?.Authorization ?? '').replace(/^Bearer\s+/i, '')
    if (sentToken && sentToken === readSessionToken()) writeSessionToken(null)
  }
  return Promise.reject(error)
})
