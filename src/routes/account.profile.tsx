import { createFileRoute, redirect } from '@tanstack/react-router'
import { ProfilePage } from '@/app/pages/profile-page'
import { sessionQueryOptions } from '@/features/auth/queries'

export const Route = createFileRoute('/account/profile')({
  beforeLoad: async ({ context, location }) => {
    const session = await context.queryClient.fetchQuery(sessionQueryOptions())
    if (!session.user) throw redirect({ to: '/login', search: { redirect: location.href } })
    return { userId: session.user.id }
  },
  component: ProfilePage,
})
