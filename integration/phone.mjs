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

  if (req.method === 'GET' && url.pathname === '/api/phone/recordings') {
    const settings = await readSettings()
    const numbers = String(url.searchParams.get('numbers') || '')
      .split(',')
      .map((item) => item.replace(/\D+/g, ''))
      .filter((item) => item.length >= 6)
    const q = String(url.searchParams.get('q') || '').trim()
    const query = new URLSearchParams()
    if (q) query.set('q', q)
    const pathName = `/api/recordings${query.toString() ? `?${query}` : ''}`
    const payload = await telecomGet(settings, pathName)
    let items = (payload.items || []).map((item) => normalizeRecording(item))
    const filterRequested = url.searchParams.has('numbers')
    if (filterRequested && !numbers.length) {
      items = []
    } else if (numbers.length) {
      items = items.filter((item) => matchesAnyNumber(item, numbers))
    }
    sendJson(res, 200, {
      connected: true,
      items: items.slice(0, 100),
    })
    return
  }

  if (req.method === 'GET' && url.pathname.startsWith('/api/phone/recordings/') && url.pathname.endsWith('/audio')) {
    const settings = await readSettings()
    const id = decodeURIComponent(url.pathname.slice('/api/phone/recordings/'.length, -'/audio'.length))
    if (!id || id.includes('..') || id.includes('/') || id.includes('\\')) {
      sendJson(res, 400, { error: 'شناسه فایل مکالمه معتبر نیست.' })
      return
    }
    await telecomProxyAudio(settings, `/api/recordings/${encodeURIComponent(id)}/audio`, res)
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

function normalizeRecording(item) {
  const name = String(item?.name || item?.id || 'مکالمه')
  const numbers = Array.isArray(item?.numbers)
    ? item.numbers.map((value) => String(value))
    : (name.match(/\d{8,15}/g) || [])
  const number = String(item?.number || numbers[0] || '')
  const directionRaw = String(item?.direction || item?.folder || 'out')
  return {
    id: String(item?.id || name),
    name,
    number,
    numbers,
    direction: directionRaw.includes('in') ? 'in' : directionRaw.includes('out') ? 'out' : 'unknown',
    folder: String(item?.folder || ''),
    size: Number(item?.size) || 0,
    at: Date.parse(item?.modifiedAt || item?.startedAt || '') || Date.now(),
    mime: String(item?.mime || 'audio/wav'),
    playUrl: `/api/phone/recordings/${encodeURIComponent(String(item?.id || name))}/audio`,
  }
}

function matchesAnyNumber(item, numbers) {
  const candidates = [
    item.number,
    ...(item.numbers || []),
    item.name,
  ].map((value) => String(value || '').replace(/\D+/g, '')).filter(Boolean)
  return numbers.some((needle) => candidates.some((hay) => {
    if (!needle || !hay) return false
    if (hay.includes(needle) || needle.includes(hay)) return true
    const a = hay.slice(-10)
    const b = needle.slice(-10)
    return a.length >= 8 && b.length >= 8 && (a.includes(b) || b.includes(a))
  }))
}

async function telecomProxyAudio(settings, pathName, res) {
  const base = settings.apiUrl || DEFAULTS.apiUrl
  let response
  try {
    response = await fetch(`${base}${pathName}`)
  } catch (error) {
    const cause = error && typeof error === 'object' && 'cause' in error ? error.cause : null
    const detail = cause instanceof Error ? cause.message : error instanceof Error ? error.message : ''
    const failed = new Error(detail.includes('ECONNREFUSED')
      ? 'CIWA Telecom روشن نیست. سرویس API مرکز تلفن را اجرا کنید.'
      : (error instanceof Error ? error.message : 'اتصال به CIWA Telecom برقرار نشد.'))
    failed.status = 502
    throw failed
  }
  if (!response.ok) {
    const text = await response.text().catch(() => '')
    let message = `CIWA Telecom پاسخ ${response.status} داد.`
    try {
      const json = text ? JSON.parse(text) : {}
      message = json.error || json.message || message
    } catch { /* keep */ }
    const failed = new Error(message)
    failed.status = response.status === 404 ? 404 : 502
    throw failed
  }
  const type = response.headers.get('content-type') || 'audio/wav'
  const length = response.headers.get('content-length')
  res.statusCode = 200
  res.setHeader('Content-Type', type)
  if (length) res.setHeader('Content-Length', length)
  res.setHeader('Accept-Ranges', 'bytes')
  res.setHeader('Cache-Control', 'private, max-age=60')
  const buffer = Buffer.from(await response.arrayBuffer())
  res.end(buffer)
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
