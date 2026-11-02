export const scenarios = {
  default: { latency: 100, failure: null },
  slow: { latency: 2_000, failure: null },
  'variable-latency': { latency: 100, failure: null },
  'out-of-order': { latency: 100, failure: null },
  'http-error': { latency: 100, failure: 'http' },
  'network-error': { latency: 100, failure: 'network' },
} as const

export type MockScenario = keyof typeof scenarios
const scenarioKey = 'kurio:mock-scenario:v1'

export function catalogLatencyMs(scenario: MockScenario, requestUrl: string): number {
  if (scenario === 'slow') return 2_000
  const url = new URL(requestUrl)
  if (scenario === 'out-of-order' && url.pathname.endsWith('/nfts')) {
    const query = url.searchParams.get('q')?.toLocaleLowerCase('pt-BR') ?? ''
    if (query === 'emerald') return 1_600
    if (query === 'sage') return 80
  }
  if (scenario === 'variable-latency') {
    const key = `${url.pathname}${url.search}`
    const checksum = Array.from(key).reduce((sum, character) => sum + character.charCodeAt(0), 0)
    return 120 + (checksum % 5) * 180
  }
  return 120
}

export function currentMockScenario(fallback: MockScenario): MockScenario {
  try {
    const value = localStorage.getItem(scenarioKey)
    return value && Object.hasOwn(scenarios, value) ? value as MockScenario : fallback
  } catch { return fallback }
}

export function setMockScenario(scenario: MockScenario) { localStorage.setItem(scenarioKey, scenario) }
export function resetMockScenario() { localStorage.removeItem(scenarioKey) }
