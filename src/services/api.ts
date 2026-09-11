import { clearAuthSession, getAuthSession } from './auth'

const apiBaseUrl = (
  import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api/v1'
).replace(/\/$/, '')

export class ApiRequestError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiRequestError'
    this.status = status
  }
}

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const session = getAuthSession()

  const headers = new Headers(options.headers)
  headers.set('Content-Type', 'application/json')
  if (session && (path.startsWith('/account/') || path === '/auth/me')) {
    headers.set('Authorization', `Bearer ${session.accessToken}`)
  }
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...options,
    headers,
  })

  const contentType = response.headers.get('content-type') ?? ''
  const payload = contentType.includes('application/json')
    ? await response.json()
    : await response.text()

  if (!response.ok) {
    if (response.status === 401 && headers.has('Authorization') && getAuthSession()?.accessToken === session?.accessToken) clearAuthSession()
    const serverMessage =
      typeof payload === 'object' && payload !== null && 'message' in payload
        ? payload.message
        : undefined
    const message = Array.isArray(serverMessage)
      ? serverMessage.join(' ')
      : typeof serverMessage === 'string'
        ? serverMessage
        : 'The request could not be completed.'

    throw new ApiRequestError(message, response.status)
  }

  return payload as T
}
