import { isAxiosError } from 'axios'
import { apiClient } from '@/lib/api-client'
import { authResultSchema, sessionSchema, userSchema, type LoginInput, type PasswordChangeInput, type ProfileInput, type RegisterInput } from '@/contracts/auth'
import { readSessionToken } from '@/features/auth/session'

export async function getSession(signal?: AbortSignal) {
  try {
    const result = await apiClient.get<unknown>('/auth/session', { signal })
    return sessionSchema.parse(result.data)
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 401) return { user: null, expiresAt: null }
    throw error
  }
}

export async function login(input: LoginInput) {
  const result = await apiClient.post<unknown>('/auth/login', input)
  return authResultSchema.parse(result.data)
}

export async function register(input: RegisterInput) {
  const result = await apiClient.post<unknown>('/auth/register', input)
  return authResultSchema.parse(result.data)
}

export async function logout() {
  if (!readSessionToken()) return
  await apiClient.post('/auth/logout')
}
export async function getProfile(signal?: AbortSignal) { return userSchema.parse((await apiClient.get('/profile', { signal })).data) }
export async function saveProfile(input: ProfileInput) { return userSchema.parse((await apiClient.patch('/profile', input)).data) }
export async function changePassword(input: PasswordChangeInput) { await apiClient.put('/profile/password', input) }
