import { z } from 'zod'

const attemptSchema = z.object({ quoteId: z.string().uuid(), key: z.string().uuid() })
export type CheckoutAttempt = z.infer<typeof attemptSchema>
const storageKey = (userId: string) => `kurio:checkout-attempt:v2:${userId}`

export function readCheckoutAttempt(userId: string): CheckoutAttempt | null {
  try {
    const raw = sessionStorage.getItem(storageKey(userId))
    return raw ? attemptSchema.parse(JSON.parse(raw)) : null
  } catch {
    return null
  }
}

export function saveCheckoutAttempt(userId: string, attempt: CheckoutAttempt) {
  sessionStorage.setItem(storageKey(userId), JSON.stringify(attemptSchema.parse(attempt)))
}

export function clearCheckoutAttempt(userId: string, quoteId?: string) {
  if (!quoteId || readCheckoutAttempt(userId)?.quoteId === quoteId) sessionStorage.removeItem(storageKey(userId))
}
