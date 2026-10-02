import { api } from '../api/client'

export type PhoneSettings = {
  apiUrl: string
  extension: string
  secret: string
  displayName: string
  sipHost: string
  wssUrl: string
  mode: 'originate' | 'webrtc'
  hasSecret?: boolean
}

export type PhonePerson = {
  id: string
  number: string
  name: string
  voicemail?: boolean
  kind?: 'contact' | 'extension'
  subtitle?: string
}
export type PhoneCdr = {
  id: string
  name: string
  number: string
  direction: 'in' | 'out'
  seconds: number
  at: number
  disposition?: string
}

export async function getPhoneSettings() {
  const document = await api<{ settings: PhoneSettings }>('/api/phone/settings')
  return document.settings
}

export async function savePhoneSettings(settings: Partial<PhoneSettings>) {
  const document = await api<{ settings: PhoneSettings }>('/api/phone/settings', {
    method: 'PUT',
    body: JSON.stringify(settings),
  })
  return document.settings
}

export async function getPhoneStatus() {
  return api<{
    configured: boolean
    settings: PhoneSettings
    telecom: {
      connected: boolean
      amiError: string | null
      product?: string
      sip?: { host: string, sipPort: number, wssPort: number, wssEnabled?: boolean }
      extensions?: PhonePerson[]
    }
  }>('/api/phone/status')
}

export async function listPhoneExtensions() {
  return api<{ connected: boolean, amiError: string | null, items: PhonePerson[] }>('/api/phone/extensions')
}

export async function listPhoneCdr() {
  return api<{ connected: boolean, items: PhoneCdr[] }>('/api/phone/cdr')
}

export async function originatePhoneCall(destination: string) {
  return api<{ ok: boolean, destination: string, extension: string }>('/api/phone/originate', {
    method: 'POST',
    body: JSON.stringify({ destination }),
  })
}

export async function getPhoneCredentials() {
  return api<{
    extension: string
    secret: string
    displayName: string
    sipHost: string
    sipUri: string
    wssUrl: string
    mode: 'originate' | 'webrtc'
  }>('/api/phone/credentials')
}
