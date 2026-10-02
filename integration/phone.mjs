import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const dataDir = path.join(root, 'data')
const settingsFile = path.join(dataDir, 'phone.json')

const DEFAULTS = {
  apiUrl: 'http://127.0.0.1:8788',
  extension: '',
  secret: '',
  displayName: '',
  sipHost: '',
  wssUrl: '',
  mode: 'originate',
}

export async function handlePhoneRequest({ req, res, url, authenticated, sendJson, readRaw }) {
  if (!authenticated) {
    sendJson(res, 401, { error: 'برای تنظیمات تلفن باید وارد شده باشید.' })
    return
  }

  if (req.method === 'GET' && url.pathname === '/api/phone/settings') {
    const settings = await readSettings()
    sendJson(res, 200, { settings: publicSettings(settings) })
    return
  }

  if (req.method === 'PUT' && url.pathname === '/api/phone/settings') {
    const body = await readJson(req, readRaw)
    const next = await saveSettings(body || {})
    sendJson(res, 200, { settings: publicSettings(next) })
    return
  }

  if (req.method === 'GET' && url.pathname === '/api/phone/status') {
    const settings = await readSettings()
    const status = await telecomGet(settings, '/api/softphone/bootstrap')
    sendJson(res, 200, {
      configured: Boolean(settings.apiUrl && settings.extension),
      settings: publicSettings(settings),
      telecom: status,
    })
    return
  }

  if (req.method === 'GET' && url.pathname === '/api/phone/extensions') {
    const settings = await readSettings()
    const payload = await telecomGet(settings, '/api/extensions')
    const items = (payload.items || []).map((item) => ({
      id: item.id || item.number,
      number: String(item.number || ''),
      name: String(item.name || item.number || ''),
      voicemail: Boolean(item.voicemail),
    }))
    sendJson(res, 200, { connected: Boolean(payload.connected), amiError: payload.amiError || null, items })
    return
  }

  if (req.method === 'GET' && url.pathname === '/api/phone/cdr') {
    const settings = await readSettings()
    const payload = await telecomGet(settings, '/api/cdr')
    sendJson(res, 200, {
      connected: Boolean(payload.connected),
      items: (payload.items || []).slice(0, 40).map((item, index) => ({
        id: item.id || `cdr-${index}`,
        name: item.from || item.to || 'تماس',
        number: item.to || item.from || '',
        direction: String(item.direction || 'out').includes('in') ? 'in' : 'out',
        seconds: Number(item.duration) || 0,
        at: Date.parse(item.startedAt) || Date.now(),
        disposition: item.disposition || '',
      })),
    })
    return
  }

  if (req.method === 'POST' && url.pathname === '/api/phone/originate') {
    const settings = await readSettings()
    if (!settings.extension) {
      sendJson(res, 400, { error: 'اول داخلی CIWA Telecom را در تنظیمات تلفن بنویسید.' })
      return
    }
    const body = await readJson(req, readRaw)
    const destination = String(body.destination || '').trim()
    if (!destination) {
      sendJson(res, 400, { error: 'شماره مقصد لازم است.' })
      return
    }
    const payload = await telecomPost(settings, '/api/calls/originate', {
      extension: settings.extension,
      destination,
      callerId: settings.displayName
        ? `${settings.displayName} <${settings.extension}>`
        : `${settings.extension} <${settings.extension}>`,
    })
    sendJson(res, 200, payload)
    return
  }

  if (req.method === 'POST' && url.pathname === '/api/phone/hangup') {
    const settings = await readSettings()
    const body = await readJson(req, readRaw)
    const payload = await telecomPost(settings, '/api/calls/hangup', { channel: body.channel })
    sendJson(res, 200, payload)
    return
  }

  if (req.method === 'GET' && url.pathname === '/api/phone/credentials') {
    const settings = await readSettings()
    if (!settings.extension || !settings.secret) {
      sendJson(res, 400, { error: 'برای تماس مرورگری، داخلی و رمز لازم است.' })
      return
    }
    const bootstrap = await telecomGet(settings, '/api/softphone/bootstrap').catch(() => null)
    const host = settings.sipHost || bootstrap?.sip?.host || '127.0.0.1'
    const wssPort = bootstrap?.sip?.wssPort || 8089
    sendJson(res, 200, {
      extension: settings.extension,
      secret: settings.secret,
      displayName: settings.displayName || settings.extension,
      sipHost: host,
      sipUri: `sip:${settings.extension}@${host}`,
      wssUrl: settings.wssUrl || `wss://${host}:${wssPort}/ws`,
      mode: settings.mode === 'webrtc' ? 'webrtc' : 'originate',
    })
    return
  }

  sendJson(res, 404, { error: 'مسیر پیدا نشد.' })
}

async function readSettings() {
  try {
    const raw = JSON.parse(await readFile(settingsFile, 'utf8'))
    return normalize(raw)
  } catch {
    return { ...DEFAULTS }
  }
}

async function saveSettings(input) {
  const current = await readSettings()
  const next = normalize({
    ...current,
    ...input,
    secret: input.secret === '********' || input.secret === '' ? current.secret : input.secret,
  })
  await mkdir(dataDir, { recursive: true })
  await writeFile(settingsFile, JSON.stringify(next, null, 2))
  return next
}

function normalize(raw) {
  const source = raw && typeof raw === 'object' ? raw : {}
  return {
    apiUrl: clipUrl(source.apiUrl) || DEFAULTS.apiUrl,
    extension: String(source.extension || '').replace(/[^\d*#A-Za-z0-9_-]/g, '').slice(0, 32),
    secret: String(source.secret || '').slice(0, 120),
    displayName: String(source.displayName || '').slice(0, 80),
    sipHost: String(source.sipHost || '').replace(/[^a-zA-Z0-9.:_-]/g, '').slice(0, 120),
    wssUrl: clipWs(source.wssUrl),
    mode: source.mode === 'webrtc' ? 'webrtc' : 'originate',
  }
}

function publicSettings(settings) {
  return {
    ...settings,
    secret: settings.secret ? '********' : '',
    hasSecret: Boolean(settings.secret),
  }
}

function clipUrl(value) {
  const text = String(value || '').trim().replace(/\/$/, '')
  if (!/^https?:\/\/[^\s]+$/i.test(text)) return ''
  return text.slice(0, 200)
}

function clipWs(value) {
  const text = String(value || '').trim()
  if (!text) return ''
  if (!/^wss?:\/\/[^\s]+$/i.test(text)) return ''
  return text.slice(0, 200)
}

async function telecomGet(settings, pathName) {
  const base = settings.apiUrl || DEFAULTS.apiUrl
  let response
  try {
    response = await fetch(`${base}${pathName}`, { headers: { Accept: 'application/json' } })
  } catch (error) {
    const cause = error && typeof error === 'object' && 'cause' in error ? error.cause : null
    const detail = cause instanceof Error ? cause.message : error instanceof Error ? error.message : ''
    const failed = new Error(detail.includes('ECONNREFUSED')
      ? 'CIWA Telecom روشن نیست. سرویس API مرکز تلفن را اجرا کنید.'
      : (error instanceof Error ? error.message : 'اتصال به CIWA Telecom برقرار نشد.'))
    failed.status = 502
    throw failed
  }
  const text = await response.text()
  let json = {}
  try { json = text ? JSON.parse(text) : {} } catch { json = { raw: text.slice(0, 200) } }
  if (!response.ok) {
    const failed = new Error(json.message || json.error || `CIWA Telecom پاسخ ${response.status} داد.`)
    failed.status = response.status === 503 ? 503 : 502
    throw failed
  }
  return json
}

async function telecomPost(settings, pathName, body) {
  const base = settings.apiUrl || DEFAULTS.apiUrl
  let response
  try {
    response = await fetch(`${base}${pathName}`, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  } catch (error) {
    const cause = error && typeof error === 'object' && 'cause' in error ? error.cause : null
    const detail = cause instanceof Error ? cause.message : error instanceof Error ? error.message : ''
    const failed = new Error(detail.includes('ECONNREFUSED')
      ? 'CIWA Telecom روشن نیست. سرویس API مرکز تلفن را اجرا کنید.'
      : (error instanceof Error ? error.message : 'اتصال به CIWA Telecom برقرار نشد.'))
    failed.status = 502
    throw failed
  }
  const text = await response.text()
  let json = {}
  try { json = text ? JSON.parse(text) : {} } catch { json = { raw: text.slice(0, 200) } }
  if (!response.ok) {
    const failed = new Error(json.message || json.error || `CIWA Telecom پاسخ ${response.status} داد.`)
    failed.status = response.status >= 400 && response.status < 600 ? response.status : 502
    throw failed
  }
  return json
}

async function readJson(req, readRaw) {
  const raw = await readRaw(req)
  if (!raw.length) return {}
  return JSON.parse(raw.toString('utf8'))
}
