import { api } from './client'

export type HostUsage = {
  cpu: number
  memory: { used: number; total: number; percent: number }
  disk: { used: number; total: number; percent: number }
}

export function hostUsage() {
  return api<HostUsage>('/api/host')
}
