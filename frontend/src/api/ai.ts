import { ApiError, api } from './client'

export type AiStat = { label: string; value: string }

export type AiResult = {
  title: string
  stats: AiStat[]
  analysis: string
  transcript?: string
}

export type AiSettings = {
  configured: boolean
  hint: string
  baseUrl: string
}

export function aiSettings() {
  return api<AiSettings>('/api/ai/settings')
}

export function saveAiKey(apiKey: string, baseUrl: string) {
  return api<AiSettings>('/api/ai/settings', {
    method: 'PUT',
    body: JSON.stringify({ apiKey, baseUrl }),
  })
}

export function clearAiKey() {
  return api<AiSettings>('/api/ai/settings', { method: 'DELETE' })
}

export function analyzeAi(kind: 'month' | 'calls' | 'customer', contactId?: string) {
  return api<AiResult>('/api/ai/analyze', {
    method: 'POST',
    body: JSON.stringify({ kind, contactId }),
  })
}

export async function analyzeVoice(file: File) {
  const body = new FormData()
  body.append('file', file)
  let response: Response
  try {
    response = await fetch('/api/ai/voice', {
      method: 'POST',
      body,
      credentials: 'include',
      headers: { Accept: 'application/json' },
    })
  } catch {
    throw new ApiError(0, 'ارتباط با لایه اتصال CIWA برقرار نشد.')
  }
  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    const message = payload && typeof payload === 'object' && 'error' in payload ? String(payload.error) : ''
    throw new ApiError(response.status, message || 'تحلیل صدا ناموفق بود.')
  }
  return payload as AiResult
}
