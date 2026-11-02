import type { PasswordChangeInput, ProfileInput, User } from '@/contracts/auth'
import { writeSessionToken } from '@/features/auth/session'
import { mergeGuestCart } from '@/mocks/store/commerce-store'

const storageKey = 'kurio:mock-auth:v1'
const iterations = 100_000
type StoredUser = User & { salt: string; passwordHash: string }
type StoredSession = { userId: string; expiresAt: string }
type State = { users: StoredUser[]; sessions: Record<string, StoredSession> }

const bytesToHex = (bytes: Uint8Array) => [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('')
const randomHex = (size: number) => bytesToHex(crypto.getRandomValues(new Uint8Array(size)))

async function hashPassword(password: string, salt: string) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: Uint8Array.from(salt.match(/../g) ?? [], (hex) => Number.parseInt(hex, 16)), iterations }, key, 256)
  return bytesToHex(new Uint8Array(bits))
}

async function makeUser(id: string, name: string, email: string, password: string): Promise<StoredUser> {
  const salt = randomHex(16)
  const username = email.split('@')[0]
  return { id, name, username, email, ensName: username.replace(/[^a-z0-9-]/g, '-'), walletNickname: 'Principal', avatar: null, version: 1, salt, passwordHash: await hashPassword(password, salt) }
}

export async function resetAuthStore() {
  writeSessionToken(null)
  const users = await Promise.all([
    makeUser('user-collector', 'Colecionador Demo', 'collector@example.test', 'Demo12345!'),
    makeUser('user-artist', 'Artista Demo', 'artist@example.test', 'Demo12345!'),
  ])
  const state: State = { users, sessions: {} }
  localStorage.setItem(storageKey, JSON.stringify(state))
  return state
}

async function readState(): Promise<State> {
  const raw = localStorage.getItem(storageKey)
  if (!raw) return resetAuthStore()
  try {
    const state = JSON.parse(raw) as State
    if (!Array.isArray(state.users) || !state.sessions) return resetAuthStore()
    return state
  } catch { return resetAuthStore() }
}

function save(state: State) { localStorage.setItem(storageKey, JSON.stringify(state)) }
function publicUser(user: StoredUser): User { return { id: user.id, name: user.name, username: user.username ?? user.email.split('@')[0], email: user.email, ensName: user.ensName ?? 'colecionador', walletNickname: user.walletNickname ?? 'Principal', avatar: user.avatar ?? null, version: user.version } }

export async function updateProfile(userId: string, input: ProfileInput): Promise<User | 'NOT_FOUND' | 'EMAIL_TAKEN' | 'USERNAME_TAKEN'> {
  const state = await readState()
  const user = state.users.find((item) => item.id === userId)
  if (!user) return 'NOT_FOUND'
  const email = input.email.trim().toLowerCase()
  if (state.users.some((item) => item.id !== userId && item.email === email)) return 'EMAIL_TAKEN'
  if (state.users.some((item) => item.id !== userId && item.username === input.username.trim())) return 'USERNAME_TAKEN'
  Object.assign(user, { name: input.name.trim(), username: input.username.trim(), email, ensName: input.ensName.trim(), walletNickname: input.walletNickname.trim(), avatar: input.avatar, version: user.version + 1 })
  save(state)
  return publicUser(user)
}

export async function updatePassword(userId: string, input: PasswordChangeInput): Promise<'OK' | 'NOT_FOUND' | 'INVALID_PASSWORD'> {
  const state = await readState()
  const user = state.users.find((item) => item.id === userId)
  if (!user) return 'NOT_FOUND'
  if (await hashPassword(input.currentPassword, user.salt) !== user.passwordHash) return 'INVALID_PASSWORD'
  const salt = randomHex(16)
  user.salt = salt
  user.passwordHash = await hashPassword(input.newPassword, salt)
  user.version++
  save(state)
  return 'OK'
}

export async function findUserByEmail(email: string) {
  const state = await readState()
  return state.users.find((user) => user.email === email.trim().toLowerCase())
}

export async function verifyLogin(email: string, password: string) {
  const user = await findUserByEmail(email)
  if (!user) return null
  return await hashPassword(password, user.salt) === user.passwordHash ? publicUser(user) : null
}

export async function registerUser(name: string, email: string, password: string) {
  const state = await readState()
  const normalized = email.trim().toLowerCase()
  if (state.users.some((user) => user.email === normalized)) return null
  const user = await makeUser(crypto.randomUUID(), name.trim(), normalized, password)
  state.users.push(user)
  save(state)
  return publicUser(user)
}

export async function createSession(user: User) {
  const state = await readState()
  const token = crypto.randomUUID()
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString()
  state.sessions[token] = { userId: user.id, expiresAt }
  save(state)
  mergeGuestCart(user.id)
  return { token, user, expiresAt }
}

export async function resolveSession(token: string) {
  const state = await readState()
  const session = state.sessions[token]
  if (!session) return null
  if (Date.parse(session.expiresAt) <= Date.now()) {
    delete state.sessions[token]
    save(state)
    return null
  }
  const user = state.users.find((item) => item.id === session.userId)
  return user ? { user: publicUser(user), expiresAt: session.expiresAt } : null
}

export async function revokeSession(token: string) {
  const state = await readState()
  delete state.sessions[token]
  save(state)
}

export async function expireSession(token: string) {
  const state = await readState()
  if (!state.sessions[token]) return false
  state.sessions[token].expiresAt = new Date(Date.now() - 1).toISOString()
  save(state)
  return true
}
