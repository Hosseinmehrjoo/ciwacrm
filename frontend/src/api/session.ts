import { api } from './client'

export type CiwaUser = {
  id: string
  fullName: string
  userName: string
  isAdmin: boolean
}

type UserDocument = {
  data?: {
    id?: string
    attributes?: Record<string, unknown>
  }
}

export function login(username: string, password: string) {
  return api<{ ok: boolean }>('/api/session', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  })
}

export function logout() {
  return api<{ ok: boolean }>('/api/session', { method: 'DELETE' })
}

export async function currentUser(): Promise<CiwaUser> {
  const document = await api<UserDocument>('/api/session')
  const attributes = document.data?.attributes ?? {}
  const first = text(attributes.first_name)
  const last = text(attributes.last_name)
  const fullName = text(attributes.full_name) || [first, last].filter(Boolean).join(' ') || text(attributes.user_name)
  return {
    id: document.data?.id || '',
    fullName,
    userName: text(attributes.user_name),
    isAdmin: attributes.is_admin === true || attributes.is_admin === 1 || attributes.is_admin === '1',
  }
}

function text(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}
