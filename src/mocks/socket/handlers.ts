import { ws } from 'msw'
import { toSocketIo } from '@mswjs/socket.io-binding'
import { cartUpdatedEventSchema, nftUpdatedEventSchema, orderUpdatedEventSchema, readyEventSchema } from '@/contracts/health'
import { env } from '@/lib/env'
import { resolveSession } from '@/mocks/store/auth-store'
import { mockSocketPaused, registerMockSocket } from '@/mocks/socket/control'

// MSW normalizes the Socket.IO transport path /socket.io/ to / when matching.
const socketUrl = new URL('/', env.socketUrl)
socketUrl.protocol = socketUrl.protocol === 'https:' ? 'wss:' : 'ws:'
const connection = ws.link(socketUrl.toString())

export const socketHandlers = [
  connection.addEventListener('connection', (connection) => {
    // Let unrelated root WebSockets (such as Vite HMR reconnects) reach their server.
    if (connection.client.url.searchParams.get('EIO') !== '4') {
      connection.server.connect()
      return
    }
    if (mockSocketPaused()) { connection.client.close(1012, 'Mock socket interrupted'); return }
    const unregister = registerMockSocket(connection.client)
    const { client } = toSocketIo(connection)
    let bound: { token: string; userId: string } | null = null
    let closed = false
    let subscription = 0
    client.on('session.subscribe', (_event, token: unknown) => {
      if (typeof token !== 'string') return
      const currentSubscription = ++subscription
      void resolveSession(token).then((session) => {
        if (closed || currentSubscription !== subscription) return
        if (!session) { bound = null; return }
        bound = { token, userId: session.user.id }
        client.emit('session.bound', { eventId: crypto.randomUUID(), resourceId: session.user.id, version: 1, userId: session.user.id })
      })
    })
    client.on('system.ping', () => {
      client.emit('system.ready', readyEventSchema.parse({
        eventId: 'system-ready-1', resourceId: 'system', version: 1,
      }))
    })
    const onNftUpdated = (event: Event) => {
      const parsed = nftUpdatedEventSchema.safeParse((event as CustomEvent).detail)
      if (parsed.success) client.emit('nft.updated', parsed.data)
    }
    const privateEvent = async (event: Event, kind: 'cart' | 'order') => {
      const current = bound
      if (!current || closed) return
      const session = await resolveSession(current.token)
      if (closed || bound !== current) return
      if (!session || session.user.id !== current.userId) { bound = null; client.emit('session.expired', { eventId: crypto.randomUUID(), resourceId: current.userId, version: 2, userId: current.userId }); return }
      const parsed = kind === 'cart' ? cartUpdatedEventSchema.safeParse((event as CustomEvent).detail) : orderUpdatedEventSchema.safeParse((event as CustomEvent).detail)
      if (parsed.success && parsed.data.userId === current.userId) client.emit(`${kind}.updated`, parsed.data)
    }
    const onCartUpdated = (event: Event) => { void privateEvent(event, 'cart') }
    const onOrderUpdated = (event: Event) => { void privateEvent(event, 'order') }
    window.addEventListener('kurio:mock-nft-updated', onNftUpdated)
    window.addEventListener('kurio:mock-cart-updated', onCartUpdated)
    window.addEventListener('kurio:mock-order-updated', onOrderUpdated)
    // Binding 0.2.0 advertises heartbeats but doesn't schedule them itself.
    const heartbeat = setInterval(() => connection.client.send('2'), 20_000)
    connection.client.addEventListener('close', () => { closed = true; bound = null; unregister(); clearInterval(heartbeat); window.removeEventListener('kurio:mock-nft-updated', onNftUpdated); window.removeEventListener('kurio:mock-cart-updated', onCartUpdated); window.removeEventListener('kurio:mock-order-updated', onOrderUpdated) })
  }),
]
