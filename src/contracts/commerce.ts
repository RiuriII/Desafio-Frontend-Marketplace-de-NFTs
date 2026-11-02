import { z } from 'zod'
import { nftSchema, networkSchema } from '@/contracts/nft'

export const moneySchema = z.string().regex(/^\d+(?:\.\d{1,18})?$/)
export const cartItemSchema = z.object({ nft: nftSchema, editionId: z.string(), quantity: z.number().int().positive(), addedPriceEth: moneySchema, priceChanged: z.boolean() })
export const cartSchema = z.object({ items: z.array(cartItemSchema), coupon: z.string().nullable(), subtotalEth: moneySchema, discountEth: moneySchema, networkFeeEth: moneySchema, totalEth: moneySchema, version: z.number().int().nonnegative() })
export const cartInputSchema = z.object({ nftId: z.string(), editionId: z.string(), quantity: z.number().int().positive().max(100) })
export const cartPatchSchema = z.object({ quantity: z.number().int().nonnegative().max(100) })
export const couponInputSchema = z.object({ code: z.string().trim().toUpperCase() })
export const walletTypeSchema = z.enum(['MetaMask', 'WalletConnect', 'Coinbase Wallet', 'Outra'])
export const walletSchema = z.object({ id: z.string(), label: z.string(), address: z.string(), network: networkSchema, displayName: z.string().optional(), profileName: z.string().optional(), secondaryAddress: z.string().optional(), walletType: walletTypeSchema.optional(), referralCode: z.string().optional(), email: z.email().optional(), ensName: z.string().optional() })
export const walletInputSchema = z.object({
  label: z.string().trim().min(3, 'Use pelo menos 3 caracteres.').max(40),
  address: z.string().trim(), network: networkSchema,
  displayName: z.string().trim().min(3, 'Use pelo menos 3 caracteres.').max(60),
  profileName: z.string().trim().min(3, 'Use pelo menos 3 caracteres.').max(30),
  secondaryAddress: z.string().trim().max(80),
  walletType: walletTypeSchema,
  referralCode: z.string().trim().min(3, 'Use pelo menos 3 caracteres.').max(30),
  email: z.email('Informe um e-mail válido.'),
  ensName: z.string().trim().regex(/^[a-z0-9-]{3,30}$/, 'Use 3 a 30 letras minúsculas, números ou -.'),
}).superRefine((value, context) => {
  const valid = value.network === 'Solana' ? /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(value.address) : /^0x[a-fA-F0-9]{40}$/.test(value.address)
  if (!valid) context.addIssue({ code: 'custom', path: ['address'], message: `Endereço inválido para ${value.network}.` })
  if (value.secondaryAddress && !(/^[a-z0-9-]+\.eth$/.test(value.secondaryAddress) || /^0x[a-fA-F0-9]{40}$/.test(value.secondaryAddress))) context.addIssue({ code: 'custom', path: ['secondaryAddress'], message: 'Use um nome .eth ou endereço 0x válido.' })
})
export const walletsResponseSchema = z.object({ items: walletSchema.array(), connectedId: z.string().nullable() })
export const collectorInputSchema = z.object({
  displayName: z.string().trim().min(3, 'Use pelo menos 3 caracteres.').max(60),
  username: z.string().trim().regex(/^[A-Za-z0-9_-]{3,30}$/, 'Use 3 a 30 letras, números, _ ou -.'),
  profileName: z.string().trim().min(3, 'Use pelo menos 3 caracteres.').max(30),
  secondaryAddress: z.string().trim().max(80),
  referralCode: z.string().trim().min(3, 'Use pelo menos 3 caracteres.').max(30),
  email: z.email('Informe um e-mail válido.'),
  ensName: z.string().trim().regex(/^[a-z0-9-]{3,30}$/, 'Use 3 a 30 letras minúsculas, números ou -.'),
  note: z.string().trim().max(500, 'Use até 500 caracteres.'),
})
export const quoteSchema = z.object({ id: z.string(), fingerprint: z.string(), items: z.array(cartItemSchema), wallet: walletSchema, collector: collectorInputSchema.optional(), coupon: z.string().nullable(), subtotalEth: moneySchema, discountEth: moneySchema, networkFeeEth: moneySchema, totalEth: moneySchema, expiresAt: z.string() })
export const quoteInputSchema = z.object({ walletId: z.string(), network: networkSchema, collector: collectorInputSchema })
export const orderStatusSchema = z.enum(['pending', 'confirmed', 'refused'])
export const orderSchema = z.object({ id: z.string(), userId: z.string(), version: z.number().int().positive(), status: orderStatusSchema, quote: quoteSchema, createdAt: z.string(), transactionRef: z.string().nullable(), refusalReason: z.string().nullable() })
export type Cart = z.infer<typeof cartSchema>
export type CartItem = z.infer<typeof cartItemSchema>
export type Quote = z.infer<typeof quoteSchema>
export type Order = z.infer<typeof orderSchema>
export type Wallet = z.infer<typeof walletSchema>
export type WalletInput = z.infer<typeof walletInputSchema>
export type CollectorInput = z.infer<typeof collectorInputSchema>
