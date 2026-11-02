import { delay, http, HttpResponse } from 'msw'
import { Decimal } from 'decimal.js'
import { catalogSearchSchema } from '@/contracts/nft'
import { currentNft, currentNfts } from '@/mocks/store/commerce-store'
import { env } from '@/lib/env'
import { catalogLatencyMs, currentMockScenario } from '@/mocks/scenarios'

const base = env.apiBaseUrl.replace(/\/$/, '')
const pageSize = 9

export const nftHandlers = [
  http.get(`${base}/nfts`, async ({ request }) => {
    const scenario = currentMockScenario(env.mockScenario)
    const latency = catalogLatencyMs(scenario, request.url)
    await delay(latency)
    if (scenario === 'network-error') return HttpResponse.error()
    if (scenario === 'http-error') return HttpResponse.json({ error: { code: 'UNAVAILABLE', message: 'Falha simulada' } }, { status: 503 })
    const url = new URL(request.url)
    const search = catalogSearchSchema.parse(Object.fromEntries(url.searchParams))
    let items = currentNfts().filter((nft) => {
      if (search.tab === 'new' && !nft.featured) return false
      if (search.q && !`${nft.name} ${nft.creator} ${nft.collection}`.toLocaleLowerCase('pt-BR').includes(search.q.toLocaleLowerCase('pt-BR'))) return false
      if (search.category && nft.category !== search.category) return false
      if (search.network && nft.network !== search.network) return false
      if (search.minPrice !== undefined && new Decimal(nft.priceEth).lt(search.minPrice)) return false
      if (search.maxPrice !== undefined && new Decimal(nft.priceEth).gt(search.maxPrice)) return false
      return true
    })
    items = [...items].sort((a, b) => {
      if (search.sort === 'price-asc') return new Decimal(a.priceEth).comparedTo(b.priceEth)
      if (search.sort === 'price-desc') return new Decimal(b.priceEth).comparedTo(a.priceEth)
      if (search.tab === 'trending' || search.sort === 'popular') return b.reviewCount - a.reviewCount
      return b.createdAt.localeCompare(a.createdAt)
    })
    return HttpResponse.json({ items: items.slice((search.page - 1) * pageSize, search.page * pageSize), total: items.length, page: search.page, pageSize }, { headers: { 'X-Mock-Delay-Ms': String(latency) } })
  }),
  http.get(`${base}/nfts/:nftId`, async ({ params, request }) => {
    const scenario = currentMockScenario(env.mockScenario)
    const latency = catalogLatencyMs(scenario, request.url)
    await delay(latency)
    if (scenario === 'network-error') return HttpResponse.error()
    if (scenario === 'http-error') return HttpResponse.json({ error: { code: 'UNAVAILABLE', message: 'Falha simulada' } }, { status: 503 })
    const nft = currentNft(String(params.nftId))
    return nft ? HttpResponse.json(nft, { headers: { 'X-Mock-Delay-Ms': String(latency) } }) : HttpResponse.json({ error: { code: 'NOT_FOUND', message: 'NFT não encontrado' } }, { status: 404 })
  }),
]
