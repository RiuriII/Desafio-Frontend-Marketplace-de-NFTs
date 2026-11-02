import { z } from 'zod'

const schema = z.object({
  VITE_ENABLE_MOCKS: z.enum(['true', 'false']).default('false'),
  VITE_API_BASE_URL: z.string().min(1).default('/api'),
  VITE_SOCKET_URL: z.url().optional(),
  VITE_MOCK_SCENARIO: z.enum(['default', 'slow', 'variable-latency', 'out-of-order', 'http-error', 'network-error']).default('default'),
})

const parsed = schema.parse(import.meta.env)

export const env = {
  mocksEnabled: parsed.VITE_ENABLE_MOCKS === 'true',
  apiBaseUrl: parsed.VITE_API_BASE_URL,
  socketUrl: parsed.VITE_SOCKET_URL ?? window.location.origin,
  mockScenario: parsed.VITE_MOCK_SCENARIO,
}
