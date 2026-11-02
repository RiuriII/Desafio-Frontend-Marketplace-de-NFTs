import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { cartUpdatedEventSchema, nftUpdatedEventSchema, orderUpdatedEventSchema, sessionBoundEventSchema, sessionExpiredEventSchema } from '@/contracts/health'
import { readSessionToken, sessionChangedEvent, writeSessionToken } from '@/features/auth/session'
import { createRealtimeClient } from '@/lib/realtime'

export function CommerceRealtime() {
  const client = useQueryClient()
  useEffect(() => {
    let stopSocket = () => {}
    const startSocket = () => {
      stopSocket()
      const token = readSessionToken()
      const socket = createRealtimeClient()
      let boundUserId: string | null = null
      const versions = new Map<string, number>()
      const seen = new Set<string>()
      const accept = (eventId: string, resource: string, version: number) => {
        if (seen.has(eventId) || version <= (versions.get(resource) ?? 0)) return false
        seen.add(eventId)
        if (seen.size > 256) seen.delete(seen.values().next().value!)
        versions.set(resource, version)
        return true
      }
      const reconcile = () => {
        void client.invalidateQueries({ queryKey: ['nfts'] })
        void client.invalidateQueries({ queryKey: ['nft'] })
        if (token) {
          void client.invalidateQueries({ queryKey: ['cart', token] })
          void client.invalidateQueries({ queryKey: ['order', token] })
          void client.invalidateQueries({ queryKey: ['wallets', token] })
        } else void client.invalidateQueries({ queryKey: ['cart', 'guest'] })
      }
      const onConnect = () => {
        boundUserId = null
        reconcile()
        if (token) socket.emit('session.subscribe', token)
      }
      const onBound = (raw: unknown) => {
        const parsed = sessionBoundEventSchema.safeParse(raw)
        if (!parsed.success || token !== readSessionToken()) return
        boundUserId = parsed.data.userId
        reconcile()
      }
      const onExpired = (raw: unknown) => {
        const parsed = sessionExpiredEventSchema.safeParse(raw)
        if (parsed.success && parsed.data.userId === boundUserId && token === readSessionToken()) writeSessionToken(null)
      }
      const onNftUpdated = (raw: unknown) => {
        const parsed = nftUpdatedEventSchema.safeParse(raw)
        if (!parsed.success) return
        const event = parsed.data
        if (!accept(event.eventId, `nft:${event.resourceId}`, event.version)) return
        void client.invalidateQueries({ queryKey: ['nft', event.resourceId] })
        void client.invalidateQueries({ queryKey: ['nfts'] })
        void client.invalidateQueries({ queryKey: ['cart'] })
      }
      const onCartUpdated = (raw: unknown) => {
        const parsed = cartUpdatedEventSchema.safeParse(raw)
        if (!parsed.success || !token || token !== readSessionToken() || parsed.data.userId !== boundUserId) return
        const event = parsed.data
        if (accept(event.eventId, `cart:${event.resourceId}`, event.version)) void client.invalidateQueries({ queryKey: ['cart', token] })
      }
      const onOrderUpdated = (raw: unknown) => {
        const parsed = orderUpdatedEventSchema.safeParse(raw)
        if (!parsed.success || !token || token !== readSessionToken() || parsed.data.userId !== boundUserId) return
        const event = parsed.data
        if (accept(event.eventId, `order:${event.resourceId}`, event.version)) void client.invalidateQueries({ queryKey: ['order', token, event.resourceId] })
      }
      socket.on('connect', onConnect)
      socket.on('session.bound', onBound)
      socket.on('session.expired', onExpired)
      socket.on('nft.updated', onNftUpdated)
      socket.on('cart.updated', onCartUpdated)
      socket.on('order.updated', onOrderUpdated)
      socket.connect()
      stopSocket = () => { socket.removeAllListeners(); socket.disconnect() }
    }
    startSocket()
    window.addEventListener(sessionChangedEvent, startSocket)
    return () => { window.removeEventListener(sessionChangedEvent, startSocket); stopSocket() }
  }, [client])
  return null
}
