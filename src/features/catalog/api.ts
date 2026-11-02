import { catalogResponseSchema, nftSchema, type CatalogSearch } from '@/contracts/nft'
import { apiClient } from '@/lib/api-client'

export async function getCatalog(search: CatalogSearch, signal?: AbortSignal) {
  const response = await apiClient.get<unknown>('/nfts', { params: search, signal })
  return catalogResponseSchema.parse(response.data)
}

export async function getNft(id: string, signal?: AbortSignal) {
  const response = await apiClient.get<unknown>(`/nfts/${encodeURIComponent(id)}`, { signal })
  return nftSchema.parse(response.data)
}
