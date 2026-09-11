import { apiRequest, ApiRequestError } from './api'
import { getAuthSession, updateAuthUser, type AuthSession, type AuthUser } from './auth'

let checkedToken = ''
let pending: Promise<AuthSession | null> | undefined

export async function verifySession(force = false): Promise<AuthSession | null> {
  const session = getAuthSession()
  if (!session) { checkedToken = ''; return null }
  if (!force && checkedToken === session.accessToken) return session
  if (pending) return pending
  pending = (async () => {
    try {
      const { user } = await apiRequest<{ user: AuthUser }>('/auth/me')
      if (getAuthSession()?.accessToken !== session.accessToken) return getAuthSession()
      updateAuthUser(user)
      checkedToken = session.accessToken
      return getAuthSession()
    } catch (error) {
      if (error instanceof ApiRequestError && error.status === 401) return null
      throw error
    } finally { pending = undefined }
  })()
  return pending
}
