import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { RegisterPage } from '@/app/pages/auth-page'

export const Route = createFileRoute('/register')({ validateSearch: z.object({ redirect: z.string().optional() }), component: RegisterRoute })
function RegisterRoute() { return <RegisterPage redirectPath={Route.useSearch().redirect} /> }
