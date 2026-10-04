export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

type ApiOptions = RequestInit & { quiet?: boolean }

let pending = 0
const listeners = new Set<() => void>()

function emitActivity() {
  listeners.forEach((listener) => listener())
}

export function subscribeActivity(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function activitySnapshot() {
  return pending
}

export async function api<T>(path: string, init: ApiOptions = {}): Promise<T> {
  const { quiet, ...request } = init
  if (!quiet) {
    pending += 1
    emitActivity()
  }
  try {
    let response: Response
    try {
      response = await fetch(path, {
        ...request,
        credentials: 'include',
        headers: {
          Accept: 'application/vnd.api+json, application/json',
          ...(request.body ? { 'Content-Type': 'application/json' } : {}),
          ...request.headers,
        },
      })
    } catch {
      throw new ApiError(0, 'ارتباط با لایه اتصال CIWA برقرار نشد.')
    }

    if (response.status === 204) return undefined as T

    const payload = await response.json().catch(() => null)
    if (!response.ok) {
      throw new ApiError(response.status, messageFromPayload(payload) || 'درخواست ناموفق بود.')
    }
    if (payload == null) {
      throw new ApiError(0, 'پاسخ سرویس اتصال قابل خواندن نیست.')
    }
    return payload as T
  } finally {
    if (!quiet) {
      pending = Math.max(0, pending - 1)
      emitActivity()
    }
  }
}

function messageFromPayload(payload: unknown) {
  if (!payload || typeof payload !== 'object') return ''
  const record = payload as { error?: string; errors?: { detail?: string; title?: string }[] }
  if (record.error) return record.error
  const first = record.errors?.[0]
  return first?.detail || first?.title || ''
}
