import { apiClient } from '@/lib/api-client'
import { cartSchema, orderSchema, quoteSchema, walletInputSchema, walletSchema, walletsResponseSchema, type CollectorInput, type Order, type WalletInput } from '@/contracts/commerce'
import { isAxiosError } from 'axios'

export async function getCart(signal?: AbortSignal) { return cartSchema.parse((await apiClient.get('/cart', { signal })).data) }
export async function addCartItem(nftId: string, editionId: string, quantity = 1) { return cartSchema.parse((await apiClient.post('/cart/items', { nftId, editionId, quantity })).data) }
export async function updateCartItem(nftId: string, editionId: string, quantity: number) { return cartSchema.parse((await apiClient.patch(`/cart/items/${nftId}`, { quantity }, { params: { editionId } })).data) }
export async function removeCartItem(nftId: string, editionId: string) { return cartSchema.parse((await apiClient.delete(`/cart/items/${nftId}`, { params: { editionId } })).data) }
export async function applyCoupon(code: string) { return cartSchema.parse((await apiClient.put('/cart/coupon', { code })).data) }
export async function removeCoupon() { return cartSchema.parse((await apiClient.delete('/cart/coupon')).data) }
export async function getWallets(signal?: AbortSignal) { return walletsResponseSchema.parse((await apiClient.get('/wallets', { signal })).data) }
export async function addWallet(input: WalletInput) { return walletSchema.parse((await apiClient.post('/wallets', walletInputSchema.parse(input))).data) }
export async function editWallet(walletId: string, input: WalletInput) { return walletSchema.parse((await apiClient.patch(`/wallets/${walletId}`, walletInputSchema.parse(input))).data) }
export async function removeWallet(walletId: string) { await apiClient.delete(`/wallets/${walletId}`) }
export async function connectWallet(walletId: string) { await apiClient.post(`/wallets/${walletId}/connect`) }
export async function disconnectWallet() { await apiClient.post('/wallets/disconnect') }
export async function createQuote(walletId: string, network: 'Ethereum' | 'Polygon' | 'Solana', collector: CollectorInput) { return quoteSchema.parse((await apiClient.post('/quotes', { walletId, network, collector })).data) }
export async function getQuote(quoteId: string) { return quoteSchema.parse((await apiClient.get(`/quotes/${quoteId}`)).data) }
export async function getOrder(orderId: string, signal?: AbortSignal) { return orderSchema.parse((await apiClient.get(`/orders/${orderId}`, { signal })).data) }
export async function getOrderByKey(key: string) { return orderSchema.parse((await apiClient.get(`/orders/by-idempotency-key/${key}`)).data) }
export async function submitOrder(quoteId: string, key: string): Promise<Order> {
  try { return orderSchema.parse((await apiClient.post('/orders', { quoteId }, { headers: { 'Idempotency-Key': key } })).data) }
  catch (error) {
    // Only an ambiguous transport failure needs recovery. HTTP errors retain their meaning.
    if (!isAxiosError(error) || error.response) throw error
    try { return await getOrderByKey(key) } catch { throw error }
  }
}
