import { api, ApiError } from '../api/client'
import type { AddonManifest, AddonRecord } from './types'

export function listAddons() {
  return api<{ addons: AddonManifest[] }>('/api/addons')
}

export function installAddon(id: string) {
  return api<{ addon: AddonManifest }>('/api/addons/install', {
    method: 'POST',
    body: JSON.stringify({ id }),
  })
}

export function removeAddon(id: string) {
  return api<{ ok: boolean }>('/api/addons/remove', {
    method: 'POST',
    body: JSON.stringify({ id }),
  })
}

export function listAddonRecords(id: string) {
  return api<{ records: AddonRecord[] }>(`/api/addons/${id}/records`)
}

export function createAddonRecord(id: string, attributes: Record<string, string>) {
  return api<{ record: AddonRecord }>(`/api/addons/${id}/records`, {
    method: 'POST',
    body: JSON.stringify({ attributes }),
  })
}

export function deleteAddonRecord(id: string, recordId: string) {
  return api<{ ok: boolean }>(`/api/addons/${id}/records?record=${encodeURIComponent(recordId)}`, {
    method: 'DELETE',
  })
}

export async function uploadAddon(file: File) {
  const zip = file.name.toLowerCase().endsWith('.zip')
  let response: Response
  try {
    response = await fetch('/api/addons/upload', {
      method: 'POST',
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        'Content-Type': zip ? 'application/zip' : 'application/json',
      },
      body: await file.arrayBuffer(),
    })
  } catch {
    throw new ApiError(0, 'ارتباط با لایه اتصال CIWA برقرار نشد.')
  }
  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    const message = payload && typeof payload === 'object' && 'error' in payload ? String(payload.error) : 'نصب بسته ناموفق بود.'
    throw new ApiError(response.status, message)
  }
  return payload as { addon: AddonManifest }
}
