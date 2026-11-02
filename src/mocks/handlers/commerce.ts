import { delay, http, HttpResponse } from 'msw'
import { z } from 'zod'
import { cartInputSchema, cartPatchSchema, couponInputSchema, moneySchema, quoteInputSchema, walletInputSchema } from '@/contracts/commerce'
import { cartUpdatedEventSchema, nftUpdatedEventSchema, orderUpdatedEventSchema } from '@/contracts/health'
import { resolveSession } from '@/mocks/store/auth-store'
import { changeCart, changeNft, connectWallet, createOrder, createQuote, createWallet, deleteWallet, disconnectWallet, failNextFavorite, favoritesFor, getCart, getWalletConnection, orderByAttempt, orderForUser, quoteForUser, setCoupon, setFavorite, setNextOutcome, updateWallet, walletsFor } from '@/mocks/store/commerce-store'
import { env } from '@/lib/env'
import { mockSocketStatus, pauseMockSocket, resumeMockSocket } from '@/mocks/socket/control'

const base = env.apiBaseUrl.replace(/\/$/, '')
const fail = (status: number, code: string, message: string) => HttpResponse.json({ error: { code, message } }, { status })
const bearer = (request: Request) => request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '') ?? ''
async function userId(request: Request) { return (await resolveSession(bearer(request)))?.user.id ?? null }
async function owner(request: Request) { const token = bearer(request); return token ? await userId(request) : 'guest' }
const unauthorized = () => fail(401, 'SESSION_INVALID', 'Entre novamente para continuar.')
const invalidFields = (issues: z.ZodIssue[]) => HttpResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'Revise os campos.', fieldErrors: Object.fromEntries(issues.map((issue) => [String(issue.path[0]), issue.message])) } }, { status: 422 })
const replaySchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('cart'), payload: cartUpdatedEventSchema }),
  z.object({ kind: z.literal('order'), payload: orderUpdatedEventSchema }),
  z.object({ kind: z.literal('nft'), payload: nftUpdatedEventSchema }),
])

export const commerceHandlers = [
  http.get(`${base}/cart`, async ({ request }) => { await delay(100); const id = await owner(request); return id ? HttpResponse.json(getCart(id)) : unauthorized() }),
  http.post(`${base}/cart/items`, async ({ request }) => {
    const id = await owner(request); if (!id) return unauthorized()
    const parsed = cartInputSchema.safeParse(await request.json())
    if (!parsed.success) return fail(422, 'VALIDATION_ERROR', 'Quantidade inválida.')
    const result = changeCart(id, parsed.data.nftId, parsed.data.editionId, parsed.data.quantity, true)
    return result === 'NOT_FOUND' ? fail(404, 'NOT_FOUND', 'NFT não encontrado.') : result === 'EDITION_NOT_FOUND' ? fail(404, 'EDITION_NOT_FOUND', 'Edição não encontrada.') : result === 'OUT_OF_STOCK' ? fail(409, 'OUT_OF_STOCK', 'Quantidade indisponível nesta edição.') : HttpResponse.json(result)
  }),
  http.patch(`${base}/cart/items/:nftId`, async ({ request, params }) => {
    const id = await owner(request); if (!id) return unauthorized()
    const parsed = cartPatchSchema.safeParse(await request.json())
    if (!parsed.success) return fail(422, 'VALIDATION_ERROR', 'Quantidade inválida.')
    const editionId = new URL(request.url).searchParams.get('editionId') ?? ''
    const result = changeCart(id, String(params.nftId), editionId, parsed.data.quantity, false)
    return result === 'NOT_FOUND' ? fail(404, 'NOT_FOUND', 'NFT não encontrado.') : result === 'EDITION_NOT_FOUND' ? fail(404, 'EDITION_NOT_FOUND', 'Edição não encontrada.') : result === 'OUT_OF_STOCK' ? fail(409, 'OUT_OF_STOCK', 'Quantidade indisponível nesta edição.') : HttpResponse.json(result)
  }),
  http.delete(`${base}/cart/items/:nftId`, async ({ request, params }) => { const id = await owner(request); if (!id) return unauthorized(); const editionId = new URL(request.url).searchParams.get('editionId') ?? ''; const result = changeCart(id, String(params.nftId), editionId, 0, false); return result === 'NOT_FOUND' ? fail(404, 'NOT_FOUND', 'NFT não encontrado.') : result === 'EDITION_NOT_FOUND' ? fail(404, 'EDITION_NOT_FOUND', 'Edição não encontrada.') : HttpResponse.json(result) }),
  http.put(`${base}/cart/coupon`, async ({ request }) => {
    const id = await owner(request); if (!id) return unauthorized()
    const parsed = couponInputSchema.safeParse(await request.json())
    if (!parsed.success) return fail(422, 'VALIDATION_ERROR', 'Código inválido.')
    const result = setCoupon(id, parsed.data.code)
    return result === 'INVALID' ? fail(422, 'COUPON_INVALID', 'Cupom inválido.') : result === 'EXPIRED' ? fail(422, 'COUPON_EXPIRED', 'Cupom expirado.') : HttpResponse.json(result)
  }),
  http.delete(`${base}/cart/coupon`, async ({ request }) => { const id = await owner(request); return id ? HttpResponse.json(setCoupon(id, null)) : unauthorized() }),
  http.get(`${base}/wallets`, async ({ request }) => { const id = await userId(request); return id ? HttpResponse.json({ items: walletsFor(id), connectedId: getWalletConnection(id) }) : unauthorized() }),
  http.post(`${base}/wallets`, async ({ request }) => {
    const id = await userId(request); if (!id) return unauthorized()
    const parsed = walletInputSchema.safeParse(await request.json())
    if (!parsed.success) return invalidFields(parsed.error.issues)
    const result = createWallet(id, parsed.data)
    return result === 'ADDRESS_TAKEN' ? fail(409, 'ADDRESS_TAKEN', 'Esta carteira já está cadastrada.') : HttpResponse.json(result, { status: 201 })
  }),
  http.patch(`${base}/wallets/:walletId`, async ({ request, params }) => {
    const id = await userId(request); if (!id) return unauthorized()
    const parsed = walletInputSchema.safeParse(await request.json())
    if (!parsed.success) return invalidFields(parsed.error.issues)
    const result = updateWallet(id, String(params.walletId), parsed.data)
    return result === 'NOT_FOUND' ? fail(404, 'NOT_FOUND', 'Carteira não encontrada.') : result === 'ADDRESS_TAKEN' ? fail(409, 'ADDRESS_TAKEN', 'Esta carteira já está cadastrada.') : HttpResponse.json(result)
  }),
  http.delete(`${base}/wallets/:walletId`, async ({ request, params }) => { const id = await userId(request); if (!id) return unauthorized(); return deleteWallet(id, String(params.walletId)) === 'NOT_FOUND' ? fail(404, 'NOT_FOUND', 'Carteira não encontrada.') : new HttpResponse(null, { status: 204 }) }),
  http.post(`${base}/wallets/:walletId/connect`, async ({ request, params }) => {
    const id = await userId(request); if (!id) return unauthorized()
    const result = connectWallet(id, String(params.walletId))
    return result === 'NOT_FOUND' ? fail(404, 'NOT_FOUND', 'Carteira não encontrada.') : result === 'REFUSED' ? fail(409, 'WALLET_REFUSED', 'Conexão recusada na simulação.') : HttpResponse.json({ connectedId: String(params.walletId) })
  }),
  http.post(`${base}/wallets/disconnect`, async ({ request }) => { const id = await userId(request); if (!id) return unauthorized(); disconnectWallet(id); return HttpResponse.json({ connectedId: null }) }),
  http.get(`${base}/favorites`, async ({ request }) => { const id = await userId(request); return id ? HttpResponse.json({ items: favoritesFor(id) }) : unauthorized() }),
  http.put(`${base}/favorites/:nftId`, async ({ request, params }) => { const id = await userId(request); if (!id) return unauthorized(); const result = setFavorite(id, String(params.nftId), true); return result === 'NOT_FOUND' ? fail(404, 'NOT_FOUND', 'NFT não encontrado.') : result === 'TRANSIENT_FAILURE' ? fail(503, 'UNAVAILABLE', 'Falha temporária ao salvar favorito.') : HttpResponse.json({ items: result }) }),
  http.delete(`${base}/favorites/:nftId`, async ({ request, params }) => { const id = await userId(request); if (!id) return unauthorized(); const result = setFavorite(id, String(params.nftId), false); return result === 'NOT_FOUND' ? fail(404, 'NOT_FOUND', 'NFT não encontrado.') : result === 'TRANSIENT_FAILURE' ? fail(503, 'UNAVAILABLE', 'Falha temporária ao remover favorito.') : HttpResponse.json({ items: result }) }),
  http.post(`${base}/__mock/favorites/fail-next`, () => { failNextFavorite(); return HttpResponse.json({ status: 'armed' }) }),
  http.post(`${base}/quotes`, async ({ request }) => {
    const id = await userId(request); if (!id) return unauthorized()
    const parsed = quoteInputSchema.safeParse(await request.json())
    if (!parsed.success) return invalidFields(parsed.error.issues)
    const result = createQuote(id, parsed.data.walletId, parsed.data.network, parsed.data.collector)
    return result === 'WALLET' ? fail(409, 'WALLET_DISCONNECTED', 'Conecte a carteira da rede selecionada.') : result === 'EMPTY' ? fail(409, 'EMPTY_CART', 'Seu carrinho está vazio.') : result === 'STOCK' ? fail(409, 'OUT_OF_STOCK', 'Um item não está mais disponível.') : result === 'NETWORK' ? fail(409, 'NETWORK_MISMATCH', 'Os NFTs precisam pertencer à rede selecionada. Separe itens de outras redes.') : HttpResponse.json(result)
  }),
  http.get(`${base}/quotes/:quoteId`, async ({ request, params }) => { const id = await userId(request); if (!id) return unauthorized(); const quote = quoteForUser(String(params.quoteId), id); return !quote ? fail(404, 'NOT_FOUND', 'Cotação não encontrada.') : quote === 'FORBIDDEN' ? fail(403, 'FORBIDDEN', 'Cotação de outra conta.') : HttpResponse.json(quote) }),
  http.get(`${base}/orders/by-idempotency-key/:key`, async ({ request, params }) => { const id = await userId(request); if (!id) return unauthorized(); const order = orderByAttempt(String(params.key), id); return !order ? fail(404, 'NOT_FOUND', 'Pedido não encontrado.') : order === 'FORBIDDEN' ? fail(403, 'FORBIDDEN', 'Pedido de outra conta.') : HttpResponse.json(order) }),
  http.get(`${base}/orders/:orderId`, async ({ request, params }) => { const id = await userId(request); if (!id) return unauthorized(); const order = orderForUser(String(params.orderId), id); return !order ? fail(404, 'NOT_FOUND', 'Pedido não encontrado.') : order === 'FORBIDDEN' ? fail(403, 'FORBIDDEN', 'Pedido de outra conta.') : HttpResponse.json(order) }),
  http.post(`${base}/orders`, async ({ request }) => {
    const id = await userId(request); if (!id) return unauthorized()
    const key = request.headers.get('Idempotency-Key')
    if (!key || key.length < 8) return fail(422, 'VALIDATION_ERROR', 'Chave de idempotência obrigatória.')
    const parsed = z.object({ quoteId: z.string() }).safeParse(await request.json())
    if (!parsed.success) return fail(422, 'VALIDATION_ERROR', 'Cotação inválida.')
    const result = createOrder(id, parsed.data.quoteId, key)
    if (result === 'KEY_CONFLICT') return fail(409, 'IDEMPOTENCY_CONFLICT', 'A chave já foi usada em outra tentativa.')
    if (result === 'QUOTE_STALE') return fail(409, 'QUOTE_STALE', 'A cotação mudou. Revise os valores e confirme novamente.')
    if (result === 'NOT_FOUND') return fail(404, 'NOT_FOUND', 'Cotação não encontrada.')
    await delay(result.slowResponse ? 5_000 : 150)
    return result.timedOut ? HttpResponse.error() : HttpResponse.json(result.order, { status: 201 })
  }),
  http.post(`${base}/__mock/payment-outcome`, async ({ request }) => {
    const parsed = z.object({ outcome: z.enum(['confirmed', 'refused', 'timeout-after-create', 'slow-response-after-create', 'wallet-refused']) }).safeParse(await request.json())
    if (!parsed.success) return fail(422, 'VALIDATION_ERROR', 'Cenário inválido.')
    setNextOutcome(parsed.data.outcome)
    return HttpResponse.json({ outcome: parsed.data.outcome })
  }),
  http.post(`${base}/__mock/nfts/:nftId`, async ({ request, params }) => {
    const parsed = z.object({ priceEth: moneySchema.optional(), available: z.number().int().nonnegative().optional(), editionId: z.string().optional() }).safeParse(await request.json())
    if (!parsed.success) return fail(422, 'VALIDATION_ERROR', 'Alteração inválida.')
    const nft = changeNft(String(params.nftId), parsed.data)
    return nft ? HttpResponse.json(nft) : fail(404, 'NOT_FOUND', 'NFT não encontrado.')
  }),
  http.post(`${base}/__mock/socket/pause`, () => { pauseMockSocket(); return HttpResponse.json({ status: 'paused' }) }),
  http.post(`${base}/__mock/socket/resume`, () => { resumeMockSocket(); return HttpResponse.json({ status: 'resumed' }) }),
  http.get(`${base}/__mock/socket/status`, () => HttpResponse.json(mockSocketStatus())),
  http.post(`${base}/__mock/socket/replay`, async ({ request }) => {
    const parsed = replaySchema.safeParse(await request.json())
    if (!parsed.success) return fail(422, 'VALIDATION_ERROR', 'Evento inválido.')
    window.dispatchEvent(new CustomEvent(`kurio:mock-${parsed.data.kind}-updated`, { detail: parsed.data.payload }))
    return HttpResponse.json({ status: 'emitted' })
  }),
]
