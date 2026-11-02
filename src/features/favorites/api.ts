import { apiClient } from '@/lib/api-client'
import { favoritesSchema } from '@/contracts/favorites'

export async function getFavorites(signal?: AbortSignal) { return favoritesSchema.parse((await apiClient.get('/favorites', { signal })).data) }
export async function addFavorite(nftId: string) { return favoritesSchema.parse((await apiClient.put(`/favorites/${nftId}`)).data) }
export async function removeFavorite(nftId: string) { return favoritesSchema.parse((await apiClient.delete(`/favorites/${nftId}`)).data) }
