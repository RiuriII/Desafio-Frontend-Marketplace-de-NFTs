import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { LoginPage } from '@/app/pages/auth-page'

export const Route = createFileRoute('/login')({ validateSearch: z.object({ redirect: z.string().optional() }), component: LoginRoute })
function LoginRoute() { return <LoginPage redirectPath={Route.useSearch().redirect} /> }
