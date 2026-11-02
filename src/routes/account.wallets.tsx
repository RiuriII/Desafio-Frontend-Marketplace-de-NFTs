import { createFileRoute, redirect } from '@tanstack/react-router'
import { WalletsPage } from '@/app/pages/wallets-page'
import { sessionQueryOptions } from '@/features/auth/queries'

export const Route = createFileRoute('/account/wallets')({
  beforeLoad: async ({ context, location }) => { const session = await context.queryClient.fetchQuery(sessionQueryOptions()); if (!session.user) throw redirect({ to: '/login', search: { redirect: location.href } }); return { userId: session.user.id } },
  component: WalletsPage,
})
