import { z } from 'zod'
import { nftSchema } from '@/contracts/nft'

export const favoritesSchema = z.object({ items: nftSchema.array() })
export type Favorites = z.infer<typeof favoritesSchema>
