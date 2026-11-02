type SocketClient = { close: (code?: number, reason?: string) => void; socket?: { readyState: number } }

const clients = new Set<SocketClient>()
let paused = false

export function mockSocketPaused() { return paused }
function pruneClosed() { for (const client of clients) if (client.socket?.readyState === 3) clients.delete(client) }
export function mockSocketStatus() { pruneClosed(); return { paused, connectedClients: clients.size, states: [...clients].map((client) => client.socket?.readyState ?? -1) } }
export function registerMockSocket(client: SocketClient) {
  clients.add(client)
  return () => clients.delete(client)
}
export function pauseMockSocket() {
  paused = true
  pruneClosed()
  for (const client of clients) client.close(1012, 'Mock socket interrupted')
}
export function resumeMockSocket() { paused = false }
export function resetMockSocket() { paused = false }
