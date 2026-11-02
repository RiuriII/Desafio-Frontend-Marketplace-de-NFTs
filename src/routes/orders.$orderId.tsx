import { createFileRoute, redirect } from '@tanstack/react-router'
import { OrderPage } from '@/app/pages/order-page'
import { sessionQueryOptions } from '@/features/auth/queries'
export const Route = createFileRoute('/orders/$orderId')({
  beforeLoad: async ({ context, location }) => { const session = await context.queryClient.fetchQuery(sessionQueryOptions()); if (!session.user) throw redirect({ to: '/login', search: { redirect: location.href } }); return { userId: session.user.id } },
  component: OrderRoute,
})
function OrderRoute() { return <OrderPage orderId={Route.useParams().orderId} /> }
