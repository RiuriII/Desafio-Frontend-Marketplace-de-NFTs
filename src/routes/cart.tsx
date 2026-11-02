import { createFileRoute } from '@tanstack/react-router'
import { CartPage } from '@/app/pages/cart-page'
export const Route = createFileRoute('/cart')({ component: CartPage })
