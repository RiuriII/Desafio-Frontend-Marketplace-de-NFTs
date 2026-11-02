import { delay, http, HttpResponse } from 'msw'
import { healthSchema } from '@/contracts/health'
import { env } from '@/lib/env'
import { z } from 'zod'
import { currentMockScenario, scenarios, setMockScenario } from '@/mocks/scenarios'

const healthUrl = `${env.apiBaseUrl.replace(/\/$/, '')}/health`

export const healthHandlers = [
  http.get(healthUrl, async () => {
    const scenario = scenarios[currentMockScenario(env.mockScenario)]
    await delay(scenario.latency)
    if (scenario.failure === 'network') return HttpResponse.error()
    if (scenario.failure === 'http') {
      return HttpResponse.json({ error: { code: 'UNAVAILABLE', message: 'Falha simulada' } }, { status: 503 })
    }
    return HttpResponse.json(healthSchema.parse({ status: 'ok' }))
  }),
  http.post(`${env.apiBaseUrl.replace(/\/$/, '')}/__mock/scenario`, async ({ request }) => {
    const parsed = z.object({ scenario: z.enum(['default', 'slow', 'variable-latency', 'out-of-order', 'http-error', 'network-error']) }).safeParse(await request.json())
    if (!parsed.success) return HttpResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'Cenário inválido.' } }, { status: 422 })
    setMockScenario(parsed.data.scenario)
    return HttpResponse.json({ scenario: parsed.data.scenario })
  }),
]
