import { createFileRoute, redirect } from '@tanstack/react-router'
import { CheckoutPage } from '@/app/pages/checkout-page'
import { sessionQueryOptions } from '@/features/auth/queries'
export const Route = createFileRoute('/checkout')({
  beforeLoad: async ({ context, location }) => { const session = await context.queryClient.fetchQuery(sessionQueryOptions()); if (!session.user) throw redirect({ to: '/login', search: { redirect: location.href } }); return { userId: session.user.id } },
  component: function CheckoutRoutePage() { const { userId } = Route.useRouteContext(); return <CheckoutPage userId={userId} /> },
})
