import { delay, http, HttpResponse } from 'msw'
import { loginSchema, passwordChangeSchema, profileInputSchema, registerSchema } from '@/contracts/auth'
import { createSession, expireSession, registerUser, resetAuthStore, resolveSession, revokeSession, updatePassword, updateProfile, verifyLogin } from '@/mocks/store/auth-store'
import { env } from '@/lib/env'
import { resetCommerceStore } from '@/mocks/store/commerce-store'
import { resetMockScenario } from '@/mocks/scenarios'
import { resetMockSocket } from '@/mocks/socket/control'

const base = env.apiBaseUrl.replace(/\/$/, '')
const error = (status: number, code: string, message: string, fieldErrors?: Record<string, string>) => HttpResponse.json({ error: { code, message, ...(fieldErrors && { fieldErrors }) } }, { status })
const tokenFrom = (request: Request) => request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '') ?? ''

export const authHandlers = [
  http.get(`${base}/auth/session`, async ({ request }) => {
    await delay(80)
    const token = tokenFrom(request)
    if (!token) return HttpResponse.json({ user: null, expiresAt: null })
    const session = await resolveSession(token)
    return session ? HttpResponse.json(session) : error(401, 'SESSION_INVALID', 'Sua sessão expirou. Entre novamente.')
  }),
  http.post(`${base}/auth/login`, async ({ request }) => {
    await delay(120)
    const parsed = loginSchema.safeParse(await request.json())
    if (!parsed.success) return error(422, 'VALIDATION_ERROR', 'Revise os campos.', { email: 'Confira o e-mail e a senha.' })
    const user = await verifyLogin(parsed.data.email, parsed.data.password)
    return user ? HttpResponse.json(await createSession(user)) : error(401, 'INVALID_CREDENTIALS', 'E-mail ou senha incorretos.')
  }),
  http.post(`${base}/auth/register`, async ({ request }) => {
    await delay(120)
    const parsed = registerSchema.safeParse(await request.json())
    if (!parsed.success) return error(422, 'VALIDATION_ERROR', 'Revise os campos.', Object.fromEntries(parsed.error.issues.map((issue) => [String(issue.path[0]), issue.message])))
    const user = await registerUser(parsed.data.name, parsed.data.email, parsed.data.password)
    return user ? HttpResponse.json(await createSession(user), { status: 201 }) : error(409, 'EMAIL_TAKEN', 'Este e-mail já está cadastrado.', { email: 'Este e-mail já está cadastrado.' })
  }),
  http.post(`${base}/auth/logout`, async ({ request }) => {
    const token = tokenFrom(request)
    if (token) await revokeSession(token)
    return new HttpResponse(null, { status: 204 })
  }),
  http.get(`${base}/profile`, async ({ request }) => { const session = await resolveSession(tokenFrom(request)); return session ? HttpResponse.json(session.user) : error(401, 'SESSION_INVALID', 'Entre novamente para continuar.') }),
  http.patch(`${base}/profile`, async ({ request }) => {
    const session = await resolveSession(tokenFrom(request))
    if (!session) return error(401, 'SESSION_INVALID', 'Entre novamente para continuar.')
    const parsed = profileInputSchema.safeParse(await request.json())
    if (!parsed.success) return error(422, 'VALIDATION_ERROR', 'Revise os campos.', Object.fromEntries(parsed.error.issues.map((issue) => [String(issue.path[0]), issue.message])))
    const result = await updateProfile(session.user.id, parsed.data)
    return result === 'EMAIL_TAKEN' ? error(409, 'EMAIL_TAKEN', 'Este e-mail já está cadastrado.', { email: 'Este e-mail já está cadastrado.' }) : result === 'USERNAME_TAKEN' ? error(409, 'USERNAME_TAKEN', 'Este nome de usuário já está em uso.', { username: 'Este nome de usuário já está em uso.' }) : result === 'NOT_FOUND' ? error(404, 'NOT_FOUND', 'Perfil não encontrado.') : HttpResponse.json(result)
  }),
  http.put(`${base}/profile/password`, async ({ request }) => {
    const session = await resolveSession(tokenFrom(request))
    if (!session) return error(401, 'SESSION_INVALID', 'Entre novamente para continuar.')
    const parsed = passwordChangeSchema.safeParse(await request.json())
    if (!parsed.success) return error(422, 'VALIDATION_ERROR', 'Revise os campos.', Object.fromEntries(parsed.error.issues.map((issue) => [String(issue.path[0]), issue.message])))
    const result = await updatePassword(session.user.id, parsed.data)
    return result === 'INVALID_PASSWORD' ? error(403, 'INVALID_PASSWORD', 'Senha atual incorreta.', { currentPassword: 'Senha atual incorreta.' }) : result === 'NOT_FOUND' ? error(404, 'NOT_FOUND', 'Perfil não encontrado.') : new HttpResponse(null, { status: 204 })
  }),
  http.post(`${base}/__mock/reset`, async () => {
    await resetAuthStore()
    resetCommerceStore()
    resetMockScenario()
    resetMockSocket()
    return HttpResponse.json({ status: 'reset' })
  }),
  http.post(`${base}/__mock/expire-session`, async ({ request }) => {
    const token = tokenFrom(request)
    if (!token) return error(401, 'SESSION_INVALID', 'Sessão necessária.')
    return await expireSession(token) ? HttpResponse.json({ status: 'expired' }) : error(401, 'SESSION_INVALID', 'Sessão inválida.')
  }),
]
