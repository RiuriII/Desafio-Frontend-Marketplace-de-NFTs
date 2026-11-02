import { z } from 'zod'
import { nftSchema } from '@/contracts/nft'
import { orderStatusSchema } from '@/contracts/commerce'

export const healthSchema = z.object({ status: z.literal('ok') })

export const readyEventSchema = z.object({
  eventId: z.string().min(1),
  resourceId: z.literal('system'),
  version: z.number().int().positive(),
})

export type ReadyEvent = z.infer<typeof readyEventSchema>
export const nftUpdatedEventSchema = z.object({ eventId: z.string(), resourceId: z.string(), version: z.number().int().positive(), nft: nftSchema })
export type NftUpdatedEvent = z.infer<typeof nftUpdatedEventSchema>
const privateEventSchema = z.object({ eventId: z.string().uuid(), resourceId: z.string().min(1), version: z.number().int().positive(), userId: z.string().min(1) })
export const cartUpdatedEventSchema = privateEventSchema
export const orderUpdatedEventSchema = privateEventSchema.extend({ status: orderStatusSchema })
export const sessionBoundEventSchema = privateEventSchema
export const sessionExpiredEventSchema = privateEventSchema
export type CartUpdatedEvent = z.infer<typeof cartUpdatedEventSchema>
export type OrderUpdatedEvent = z.infer<typeof orderUpdatedEventSchema>

export interface ServerEvents {
  'system.ready': (event: ReadyEvent) => void
  'nft.updated': (event: NftUpdatedEvent) => void
  'cart.updated': (event: CartUpdatedEvent) => void
  'order.updated': (event: OrderUpdatedEvent) => void
  'session.bound': (event: z.infer<typeof sessionBoundEventSchema>) => void
  'session.expired': (event: z.infer<typeof sessionExpiredEventSchema>) => void
}

export interface ClientEvents {
  'system.ping': () => void
  'session.subscribe': (token: string) => void
}
