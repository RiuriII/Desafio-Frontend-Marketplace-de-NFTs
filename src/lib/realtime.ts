import { io, type Socket } from 'socket.io-client'
import type { ClientEvents, ServerEvents } from '@/contracts/health'
import { env } from '@/lib/env'

// One owned connection per consumer/session; callers must remove listeners and disconnect.
export function createRealtimeClient(): Socket<ServerEvents, ClientEvents> {
  return io(env.socketUrl, {
    transports: ['websocket'],
    autoConnect: false,
    forceNew: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 400,
    reconnectionDelayMax: 2_000,
    timeout: env.mocksEnabled ? 1_500 : 10_000,
  })
}
