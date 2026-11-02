import { z } from 'zod'

export const categorySchema = z.enum(['arte-digital', 'fotografia', 'musica', 'arte-3d', 'colecionaveis', 'generativa', 'jogos'])
export const networkSchema = z.enum(['Ethereum', 'Polygon', 'Solana'])
export const sortSchema = z.enum(['recent', 'price-asc', 'price-desc', 'popular'])
export const editionSchema = z.object({ id: z.string(), label: z.string(), available: z.number().int().nonnegative() })
export const galleryImageSchema = z.object({ id: z.string(), image: z.string(), label: z.string(), position: z.string() })
export const nftSchema = z.object({
  id: z.string(), name: z.string(), creator: z.string(), collection: z.string(),
  category: categorySchema, network: networkSchema, image: z.string(),
  priceEth: z.string(), available: z.number().int().nonnegative(),
  editionSize: z.number().int().positive(), editions: z.array(editionSchema).min(1), gallery: z.array(galleryImageSchema).min(1), version: z.number().int().positive(),
  description: z.string(), tokenId: z.string(), rating: z.number(), reviewCount: z.number().int(),
  createdAt: z.string(), featured: z.boolean(),
})
export const catalogSearchSchema = z.object({
  q: z.string().trim().default(''),
  category: categorySchema.optional().catch(undefined),
  network: networkSchema.optional().catch(undefined),
  minPrice: z.coerce.number().nonnegative().optional().catch(undefined),
  maxPrice: z.coerce.number().nonnegative().optional().catch(undefined),
  sort: sortSchema.default('recent').catch('recent'),
  tab: z.enum(['all', 'new', 'trending']).default('all').catch('all'),
  page: z.coerce.number().int().positive().default(1).catch(1),
})
export const catalogResponseSchema = z.object({ items: z.array(nftSchema), total: z.number().int(), page: z.number().int(), pageSize: z.number().int() })
export type Nft = z.infer<typeof nftSchema>
export type CatalogSearch = z.infer<typeof catalogSearchSchema>
