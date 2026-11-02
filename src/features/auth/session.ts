export const sessionTokenKey = 'kurio:session-token:v1'
export const sessionChangedEvent = 'kurio:session-changed'

export function readSessionToken() { return localStorage.getItem(sessionTokenKey) }
export function writeSessionToken(token: string | null) {
  if (token) localStorage.setItem(sessionTokenKey, token)
  else localStorage.removeItem(sessionTokenKey)
  window.dispatchEvent(new Event(sessionChangedEvent))
}
