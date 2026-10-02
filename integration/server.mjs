import http from 'node:http'
import { handleAddonRequest } from './addons.mjs'
import { handleAiRequest } from './ai.mjs'
import { handlePhoneRequest } from './phone.mjs'
import { hostUsage } from './host.mjs'

const port = Number(process.env.PORT || 8787)
const coreBaseUrl = required('CIWA_CORE_URL').replace(/\/$/, '')
const clientId = required('CIWA_CLIENT_ID')
const clientSecret = required('CIWA_CLIENT_SECRET')
const cookieSecure = process.env.CIWA_COOKIE_SECURE === '1'

const ACCESS_COOKIE = 'ciwa_access'
const REFRESH_COOKIE = 'ciwa_refresh'

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', 'http://integration.local')
    if (req.method === 'POST' && url.pathname === '/api/session') {
      await login(req, res)
      return
    }
    if (req.method === 'DELETE' && url.pathname === '/api/session') {
      await logout(req, res)
      return
    }
    if (req.method === 'GET' && url.pathname === '/api/session') {
      await currentUser(req, res)
      return
    }
    if (req.method === 'GET' && url.pathname === '/api/host') {
      if (!readCookie(req, ACCESS_COOKIE)) {
        sendJson(res, 401, { error: 'وارد نشده‌اید.' })
        return
      }
      sendJson(res, 200, await hostUsage())
      return
    }
    if (url.pathname.startsWith('/api/crm/')) {
      await proxyCrm(req, res, url)
      return
    }
    if (url.pathname.startsWith('/api/ai')) {
      await handleAiRequest({
        req,
        res,
        url,
        access: readCookie(req, ACCESS_COOKIE),
        sendJson,
        crmFetch,
      })
      return
    }
    if (url.pathname.startsWith('/api/phone')) {
      await handlePhoneRequest({
        req,
        res,
        url,
        authenticated: Boolean(readCookie(req, ACCESS_COOKIE)),
        sendJson,
        readRaw,
      })
      return
    }
    if (url.pathname.startsWith('/api/addons')) {
      await handleAddonRequest({
        req,
        res,
        url,
        authenticated: Boolean(readCookie(req, ACCESS_COOKIE)),
        sendJson,
        readRaw,
      })
      return
    }
    sendJson(res, 404, { error: 'مسیر پیدا نشد.' })
  } catch (error) {
    const status = Number(error?.status) || 500
    const message = error instanceof Error ? error.message : 'خطای داخلی'
    sendJson(res, status, { error: message })
  }
})

server.listen(port, '0.0.0.0')

async function login(req, res) {
  const body = await readJson(req)
  const username = String(body.username || '').trim()
  const password = String(body.password || '')
  if (!username || !password) {
    sendJson(res, 400, { error: 'نام کاربری و رمز عبور لازم است.' })
    return
  }

  const token = await requestToken({
    grant_type: 'password',
    username,
    password,
  })
  setSessionCookies(res, token)
  sendJson(res, 200, { ok: true })
}

async function logout(req, res) {
  const access = readCookie(req, ACCESS_COOKIE)
  if (access) {
    await fetch(`${coreBaseUrl}/Api/V8/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${access}`, Accept: 'application/vnd.api+json' },
    }).catch(() => undefined)
  }
  clearSessionCookies(res)
  sendJson(res, 200, { ok: true })
}

async function currentUser(req, res) {
  const access = readCookie(req, ACCESS_COOKIE)
  if (!access) {
    sendJson(res, 401, { error: 'وارد نشده‌اید.' })
    return
  }
  const upstream = await crmFetch('/V8/current-user', { method: 'GET', access })
  await relay(res, upstream)
}

async function proxyCrm(req, res, url) {
  const access = readCookie(req, ACCESS_COOKIE)
  if (!access) {
    sendJson(res, 401, { error: 'وارد نشده‌اید.' })
    return
  }
  const suffix = url.pathname.slice('/api/crm'.length)
  if (!suffix.startsWith('/V8/') || suffix.includes('..')) {
    sendJson(res, 400, { error: 'مسیر API مجاز نیست.' })
    return
  }
  const body = req.method === 'GET' || req.method === 'HEAD' ? undefined : await readRaw(req)
  const upstream = await crmFetch(`${suffix}${url.search}`, {
    method: req.method || 'GET',
    access,
    body,
    contentType: req.headers['content-type'],
  })
  await relay(res, upstream)
}

async function crmFetch(path, { method, access, body, contentType }) {
  const headers = {
    Accept: 'application/vnd.api+json, application/json',
    Authorization: `Bearer ${access}`,
  }
  if (contentType) headers['Content-Type'] = contentType
  const first = await fetch(`${coreBaseUrl}/Api${path}`, { method, headers, body })
  if (first.status !== 401) return first
  return first
}

async function requestToken(fields) {
  const payload = new URLSearchParams({
    ...fields,
    client_id: clientId,
    client_secret: clientSecret,
  })
  let response
  try {
    response = await fetch(`${coreBaseUrl}/Api/access_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body: payload,
    })
  } catch {
    const error = new Error('هسته در دسترس نیست.')
    error.status = 503
    throw error
  }
  const data = await response.json().catch(() => ({}))
  if (!response.ok || !data.access_token) {
    const error = new Error(response.ok ? 'پاسخ ورود قابل استفاده نیست.' : 'نام کاربری یا رمز عبور درست نیست.')
    error.status = response.ok ? 502 : (response.status || 401)
    throw error
  }
  return data
}

function setSessionCookies(res, token) {
  const accessAge = Number(token.expires_in) > 0 ? Number(token.expires_in) : 3600
  const cookies = [
    cookie(ACCESS_COOKIE, token.access_token, accessAge),
  ]
  if (token.refresh_token) cookies.push(cookie(REFRESH_COOKIE, token.refresh_token, 60 * 60 * 24 * 14))
  res.setHeader('Set-Cookie', cookies)
}

function clearSessionCookies(res) {
  res.setHeader('Set-Cookie', [cookie(ACCESS_COOKIE, '', 0), cookie(REFRESH_COOKIE, '', 0)])
}

function cookie(name, value, maxAge) {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${maxAge}`,
  ]
  if (cookieSecure) parts.push('Secure')
  return parts.join('; ')
}

function readCookie(req, name) {
  const header = req.headers.cookie || ''
  for (const part of header.split(';')) {
    const [key, ...rest] = part.trim().split('=')
    if (key === name) return decodeURIComponent(rest.join('='))
  }
  return ''
}

async function relay(res, upstream) {
  const text = await upstream.text()
  res.statusCode = upstream.status
  res.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/json; charset=utf-8')
  res.end(text)
}

function sendJson(res, status, body) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(body))
}

function readJson(req) {
  return readRaw(req).then((raw) => {
    if (!raw) return {}
    return JSON.parse(raw.toString('utf8'))
  })
}

function readRaw(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let size = 0
    req.on('data', (chunk) => {
      size += chunk.length
      if (size > 1_000_000) {
        reject(new Error('حجم درخواست زیاد است.'))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

function required(name) {
  const value = process.env[name]
  if (!value) {
    console.error(`${name} is required`)
    process.exit(1)
  }
  return value
}
