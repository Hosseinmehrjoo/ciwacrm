export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response
  try {
    response = await fetch(path, {
      ...init,
      credentials: 'include',
      headers: {
        Accept: 'application/vnd.api+json, application/json',
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        ...init.headers,
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
}

function messageFromPayload(payload: unknown) {
  if (!payload || typeof payload !== 'object') return ''
  const record = payload as { error?: string; errors?: { detail?: string; title?: string }[] }
  if (record.error) return record.error
  const first = record.errors?.[0]
  return first?.detail || first?.title || ''
}
