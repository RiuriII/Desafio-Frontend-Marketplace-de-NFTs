import Decimal from 'decimal.js'
import type { Nft } from '@/contracts/nft'
import type { Cart, CartItem, CollectorInput, Order, Quote, Wallet, WalletInput } from '@/contracts/commerce'
import { initialNfts } from '@/mocks/fixtures/nfts'

const key = 'kurio:mock-commerce:v2'
type StoredItem = { nftId: string; editionId: string; quantity: number; addedPriceEth: string }
type StoredCart = { items: StoredItem[]; coupon: string | null; version: number }
type StoredOrder = Order & { settleAt: number; outcome: 'confirmed' | 'refused' }
type StoredQuote = { userId: string; quote: Quote }
type State = { carts: Record<string, StoredCart>; quotes: Record<string, StoredQuote>; orders: Record<string, StoredOrder>; attempts: Record<string, { content: string; orderId: string }>; nftOverrides: Record<string, Partial<Pick<Nft, 'priceEth' | 'available' | 'editions' | 'version'>>>; connected: Record<string, string | null>; wallets: Record<string, Wallet[]>; favorites: Record<string, string[]>; failNextFavorite: boolean; nextOutcome: 'confirmed' | 'refused' | 'timeout-after-create' | 'slow-response-after-create' | 'wallet-refused' }
const emptyCart = (): StoredCart => ({ items: [], coupon: null, version: 0 })
const fresh = (): State => ({ carts: {}, quotes: {}, orders: {}, attempts: {}, nftOverrides: {}, connected: {}, wallets: {}, favorites: {}, failNextFavorite: false, nextOutcome: 'confirmed' })
function read(): State { try { const raw = localStorage.getItem(key); return raw ? { ...fresh(), ...JSON.parse(raw) as State } : fresh() } catch { return fresh() } }
function save(state: State) { localStorage.setItem(key, JSON.stringify(state)) }
const money = (value: Decimal.Value) => new Decimal(value).toDecimalPlaces(18).toFixed(18).replace(/\.?0+$/, '')
const cartOf = (state: State, owner: string) => state.carts[owner] ?? (state.carts[owner] = emptyCart())
function emitCartUpdated(userId: string, version: number) {
  if (userId !== 'guest') window.dispatchEvent(new CustomEvent('kurio:mock-cart-updated', { detail: { eventId: crypto.randomUUID(), resourceId: userId, userId, version } }))
}
function emitOrderUpdated(order: Order) {
  window.dispatchEvent(new CustomEvent('kurio:mock-order-updated', { detail: { eventId: crypto.randomUUID(), resourceId: order.id, userId: order.userId, version: order.version, status: order.status } }))
}

export function resetCommerceStore() { localStorage.setItem(key, JSON.stringify(fresh())) }
export function currentNft(nftId: string): Nft | undefined {
  const nft = initialNfts.find((item) => item.id === nftId)
  if (!nft) return undefined
  const current = { ...nft, ...read().nftOverrides[nftId] }
  return { ...current, available: current.editions.reduce((sum, edition) => sum + edition.available, 0) }
}
export function currentNfts(): Nft[] { return initialNfts.map((item) => currentNft(item.id) ?? item) }

function cartItems(cart: StoredCart): CartItem[] {
  return cart.items.flatMap((entry) => {
    const nft = currentNft(entry.nftId)
    return nft ? [{ nft, editionId: entry.editionId, quantity: entry.quantity, addedPriceEth: entry.addedPriceEth, priceChanged: entry.addedPriceEth !== nft.priceEth }] : []
  })
}
function totals(items: CartItem[], coupon: string | null) {
  const subtotal = items.reduce((sum, item) => sum.plus(new Decimal(item.nft.priceEth).times(item.quantity)), new Decimal(0))
  const discount = coupon === 'KURIO10' ? subtotal.times('0.1') : new Decimal(0)
  const fee = items.length ? new Decimal('0.01').plus(new Decimal(items.reduce((sum, item) => sum + item.quantity, 0)).times('0.002')) : new Decimal(0)
  return { subtotalEth: money(subtotal), discountEth: money(discount), networkFeeEth: money(fee), totalEth: money(subtotal.minus(discount).plus(fee)) }
}
export function getCart(owner: string): Cart {
  const state = read(), cart = cartOf(state, owner), items = cartItems(cart)
  return { items, coupon: cart.coupon, ...totals(items, cart.coupon), version: cart.version }
}
export function changeCart(owner: string, nftId: string, editionId: string, quantity: number, add: boolean): Cart | 'NOT_FOUND' | 'EDITION_NOT_FOUND' | 'OUT_OF_STOCK' {
  const nft = currentNft(nftId)
  if (!nft) return 'NOT_FOUND'
  const edition = nft.editions.find((item) => item.id === editionId)
  if (!edition) return 'EDITION_NOT_FOUND'
  const state = read(), cart = cartOf(state, owner), old = cart.items.find((item) => item.nftId === nftId && item.editionId === editionId)
  const next = add ? (old?.quantity ?? 0) + quantity : quantity
  if (next > edition.available) return 'OUT_OF_STOCK'
  if (next === 0) cart.items = cart.items.filter((item) => item.nftId !== nftId || item.editionId !== editionId)
  else if (old) old.quantity = next
  else cart.items.push({ nftId, editionId, quantity: next, addedPriceEth: nft.priceEth })
  cart.version++
  save(state)
  emitCartUpdated(owner, cart.version)
  return getCart(owner)
}
export function setCoupon(owner: string, coupon: string | null): Cart | 'INVALID' | 'EXPIRED' {
  if (coupon && coupon !== 'KURIO10' && coupon !== 'EXPIRED') return 'INVALID'
  if (coupon === 'EXPIRED') return 'EXPIRED'
  const state = read(), cart = cartOf(state, owner)
  cart.coupon = coupon
  cart.version++
  save(state)
  emitCartUpdated(owner, cart.version)
  return getCart(owner)
}
export function mergeGuestCart(userId: string) {
  const state = read(), guest = state.carts.guest
  if (!guest?.items.length && !guest?.coupon) return
  const user = cartOf(state, userId)
  for (const item of guest.items) {
    const existing = user.items.find((entry) => entry.nftId === item.nftId && entry.editionId === item.editionId)
    const available = currentNft(item.nftId)?.editions.find((edition) => edition.id === item.editionId)?.available ?? 0
    if (existing) existing.quantity = Math.min(available, existing.quantity + item.quantity)
    else if (available) user.items.push({ ...item, quantity: Math.min(available, item.quantity) })
  }
  user.items = user.items.filter((item) => item.quantity > 0)
  if (!user.coupon) user.coupon = guest.coupon
  user.version++
  state.carts.guest = emptyCart()
  save(state)
  emitCartUpdated(userId, user.version)
}

export function walletsFor(userId: string): Wallet[] {
  const saved = read().wallets?.[userId]
  if (saved) return saved
  if (userId !== 'user-collector' && userId !== 'user-artist') return []
  return [
    { id: `${userId}-eth`, label: 'Carteira Ethereum', address: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F', network: 'Ethereum' },
    { id: `${userId}-polygon`, label: 'Carteira Polygon', address: '0x8A791620dd6260079BF849Dc5567aDC3F2FdC318', network: 'Polygon' },
    { id: `${userId}-solana`, label: 'Carteira Solana', address: '7jWz6qXm9Rb8gN4P2kYu5A3dVtC1eFhL6sQw8B9nM2x', network: 'Solana' },
  ]
}
export function createWallet(userId: string, input: WalletInput): Wallet | 'ADDRESS_TAKEN' {
  const state = read(), items = walletsFor(userId)
  if (items.some((item) => item.network === input.network && item.address.toLowerCase() === input.address.toLowerCase())) return 'ADDRESS_TAKEN'
  const wallet: Wallet = { id: crypto.randomUUID(), ...input }
  state.wallets[userId] = [...items, wallet]
  save(state)
  return wallet
}
export function updateWallet(userId: string, walletId: string, input: WalletInput): Wallet | 'NOT_FOUND' | 'ADDRESS_TAKEN' {
  const state = read(), items = walletsFor(userId), current = items.find((item) => item.id === walletId)
  if (!current) return 'NOT_FOUND'
  if (items.some((item) => item.id !== walletId && item.network === input.network && item.address.toLowerCase() === input.address.toLowerCase())) return 'ADDRESS_TAKEN'
  const wallet = { ...current, ...input }
  state.wallets[userId] = items.map((item) => item.id === walletId ? wallet : item)
  if (state.connected[userId] === walletId && (current.address !== wallet.address || current.network !== wallet.network)) state.connected[userId] = null
  save(state)
  return wallet
}
export function deleteWallet(userId: string, walletId: string): 'OK' | 'NOT_FOUND' {
  const state = read(), items = walletsFor(userId)
  if (!items.some((item) => item.id === walletId)) return 'NOT_FOUND'
  state.wallets[userId] = items.filter((item) => item.id !== walletId)
  if (state.connected[userId] === walletId) state.connected[userId] = null
  save(state)
  return 'OK'
}
export function favoritesFor(userId: string): Nft[] { return (read().favorites?.[userId] ?? []).flatMap((id) => { const nft = currentNft(id); return nft ? [nft] : [] }) }
export function setFavorite(userId: string, nftId: string, enabled: boolean): Nft[] | 'NOT_FOUND' | 'TRANSIENT_FAILURE' {
  if (!currentNft(nftId)) return 'NOT_FOUND'
  const state = read()
  if (state.failNextFavorite) { state.failNextFavorite = false; save(state); return 'TRANSIENT_FAILURE' }
  const ids = state.favorites?.[userId] ?? []
  state.favorites ??= {}
  state.favorites[userId] = enabled ? [...new Set([...ids, nftId])] : ids.filter((id) => id !== nftId)
  save(state)
  return favoritesFor(userId)
}
export function failNextFavorite() { const state = read(); state.failNextFavorite = true; save(state) }
export function getWalletConnection(userId: string) { return read().connected[userId] ?? null }
export function connectWallet(userId: string, walletId: string): 'OK' | 'NOT_FOUND' | 'REFUSED' {
  if (!walletsFor(userId).some((wallet) => wallet.id === walletId)) return 'NOT_FOUND'
  const state = read()
  if (state.nextOutcome === 'wallet-refused') { state.nextOutcome = 'confirmed'; save(state); return 'REFUSED' }
  state.connected[userId] = walletId
  save(state)
  return 'OK'
}
export function disconnectWallet(userId: string) { const state = read(); state.connected[userId] = null; save(state) }

function editionAvailable(item: StoredItem) { return currentNft(item.nftId)?.editions.find((edition) => edition.id === item.editionId)?.available ?? 0 }
function fingerprint(cart: StoredCart, wallet: Wallet) {
  return JSON.stringify({ items: cart.items.map((item) => { const nft = currentNft(item.nftId); return { id: item.nftId, editionId: item.editionId, quantity: item.quantity, price: nft?.priceEth, version: nft?.version, available: editionAvailable(item) } }), coupon: cart.coupon, walletId: wallet.id, network: wallet.network, address: wallet.address })
}
export function createQuote(userId: string, walletId: string, network: Wallet['network'], collector: CollectorInput): Quote | 'EMPTY' | 'WALLET' | 'STOCK' | 'NETWORK' {
  const state = read(), cart = cartOf(state, userId), wallet = walletsFor(userId).find((item) => item.id === walletId && item.network === network)
  if (!wallet || state.connected[userId] !== walletId) return 'WALLET'
  if (!cart.items.length) return 'EMPTY'
  if (cart.items.some((item) => currentNft(item.nftId)?.network !== network)) return 'NETWORK'
  if (cart.items.some((item) => item.quantity > editionAvailable(item))) return 'STOCK'
  const items = cartItems(cart)
  const quote: Quote = { id: crypto.randomUUID(), fingerprint: fingerprint(cart, wallet), items, wallet, collector, coupon: cart.coupon, ...totals(items, cart.coupon), expiresAt: new Date(Date.now() + 5 * 60_000).toISOString() }
  state.quotes[quote.id] = { userId, quote }
  save(state)
  return quote
}
export function quoteForUser(quoteId: string, userId: string): Quote | 'FORBIDDEN' | undefined {
  const stored = read().quotes[quoteId]
  if (!stored) return undefined
  return stored.userId === userId ? stored.quote : 'FORBIDDEN'
}

export function createOrder(userId: string, quoteId: string, idempotencyKey: string): { order: Order; timedOut: boolean; slowResponse: boolean } | 'KEY_CONFLICT' | 'QUOTE_STALE' | 'NOT_FOUND' {
  const state = read(), content = JSON.stringify({ userId, quoteId }), previous = state.attempts[idempotencyKey]
  if (previous) return previous.content !== content ? 'KEY_CONFLICT' : { order: settleOrder(previous.orderId)!, timedOut: false, slowResponse: false }
  const storedQuote = state.quotes[quoteId]
  if (!storedQuote) return 'NOT_FOUND'
  if (storedQuote.userId !== userId) return 'QUOTE_STALE'
  const quote = storedQuote.quote
  const wallet = walletsFor(userId).find((item) => item.id === quote.wallet.id)
  const cart = cartOf(state, userId)
  if (!wallet || state.connected[userId] !== wallet.id || Date.parse(quote.expiresAt) <= Date.now() || quote.fingerprint !== fingerprint(cart, wallet) || cart.items.some((item) => item.quantity > editionAvailable(item))) return 'QUOTE_STALE'
  const outcome = state.nextOutcome
  const id = crypto.randomUUID()
  const order: StoredOrder = { id, userId, version: 1, quote, status: 'pending', createdAt: new Date().toISOString(), transactionRef: null, refusalReason: null, settleAt: Date.now() + 900, outcome: outcome === 'refused' ? 'refused' : 'confirmed' }
  state.orders[id] = order
  state.attempts[idempotencyKey] = { content, orderId: id }
  state.nextOutcome = 'confirmed'
  save(state)
  emitOrderUpdated(order)
  window.setTimeout(() => { settleOrder(id) }, 900)
  return { order, timedOut: outcome === 'timeout-after-create', slowResponse: outcome === 'slow-response-after-create' }
}
export function settleOrder(orderId: string): Order | undefined {
  const state = read(), order = state.orders[orderId]
  if (!order) return undefined
  if (order.status === 'pending' && Date.now() >= order.settleAt) {
    order.version++
    const updatedNftIds: string[] = []
    if (order.outcome === 'refused') { order.status = 'refused'; order.refusalReason = 'Pagamento recusado na simulação.' }
    else {
      order.status = 'confirmed'
      order.transactionRef = `SIM-${order.id.slice(0, 8).toUpperCase()}`
      const cart = cartOf(state, order.userId)
      for (const bought of order.quote.items) {
        const item = cart.items.find((entry) => entry.nftId === bought.nft.id && entry.editionId === bought.editionId)
        if (item) item.quantity = Math.max(0, item.quantity - bought.quantity)
        const baseNft = initialNfts.find((entry) => entry.id === bought.nft.id)
        const nft = baseNft ? { ...baseNft, ...state.nftOverrides[bought.nft.id] } : undefined
        if (nft) { const editions = nft.editions.map((edition) => edition.id === bought.editionId ? { ...edition, available: Math.max(0, edition.available - bought.quantity) } : edition); state.nftOverrides[nft.id] = { ...state.nftOverrides[nft.id], editions, available: editions.reduce((sum, edition) => sum + edition.available, 0), version: nft.version + 1 }; updatedNftIds.push(nft.id) }
      }
      cart.items = cart.items.filter((item) => item.quantity > 0)
      cart.version++
    }
    save(state)
    emitOrderUpdated(order)
    if (order.status === 'confirmed') {
      emitCartUpdated(order.userId, cartOf(state, order.userId).version)
      for (const nftId of updatedNftIds) {
        const nft = currentNft(nftId)
        if (nft) window.dispatchEvent(new CustomEvent('kurio:mock-nft-updated', { detail: { eventId: crypto.randomUUID(), resourceId: nftId, version: nft.version, nft } }))
      }
    }
  }
  return order
}
export function orderForUser(orderId: string, userId: string): Order | 'FORBIDDEN' | undefined {
  const order = read().orders[orderId]
  if (!order) return undefined
  return order.userId === userId ? settleOrder(orderId) : 'FORBIDDEN'
}
export function orderByAttempt(idempotencyKey: string, userId: string): Order | 'FORBIDDEN' | undefined {
  const attempt = read().attempts[idempotencyKey]
  return attempt ? orderForUser(attempt.orderId, userId) : undefined
}
export function setNextOutcome(outcome: State['nextOutcome']) { const state = read(); state.nextOutcome = outcome; save(state) }
export function changeNft(nftId: string, patch: { priceEth?: string; available?: number; editionId?: string }): Nft | undefined {
  const nft = currentNft(nftId)
  if (!nft) return undefined
  const state = read()
  let editions = nft.editions
  if (patch.available !== undefined) {
    if (patch.editionId) {
      if (!editions.some((edition) => edition.id === patch.editionId)) return undefined
      editions = editions.map((edition) => edition.id === patch.editionId ? { ...edition, available: patch.available! } : edition)
    } else {
      let remaining = patch.available
      editions = editions.map((edition, index) => { const available = index === editions.length - 1 ? remaining : Math.min(edition.available, remaining); remaining -= available; return { ...edition, available } })
    }
  }
  state.nftOverrides[nftId] = { ...state.nftOverrides[nftId], priceEth: patch.priceEth ?? nft.priceEth, editions, available: editions.reduce((sum, edition) => sum + edition.available, 0), version: nft.version + 1 }
  save(state)
  const updated = currentNft(nftId)
  if (updated) window.dispatchEvent(new CustomEvent('kurio:mock-nft-updated', { detail: { eventId: crypto.randomUUID(), resourceId: nftId, version: updated.version, nft: updated } }))
  return updated
}
