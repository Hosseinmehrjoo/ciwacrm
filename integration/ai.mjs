import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const keyFile = path.join(root, 'data', 'ai-keys.json')
const AUDIO_LIMIT = 25 * 1024 * 1024
const AUDIO_EXT = new Set(['mp3', 'wav', 'm4a', 'ogg', 'webm', 'mp4', 'mpeg', 'mpga'])

const SYSTEM = [
  'تو تحلیل‌گر CRM برای CIWA هستی.',
  'فقط از داده‌ای که در پیام آمده استفاده کن و عدد، نام یا رویدادی نساز.',
  'اگر داده کم است، همان را بگو و بگو چه چیزی باید ثبت شود.',
  'پاسخ را به فارسی، کوتاه و قابل اقدام بنویس.',
  'بخش‌ها را با همین عنوان‌ها بنویس: خلاصه، یافته‌ها، ریسک‌ها، کار بعدی.',
].join(' ')

let queue = Promise.resolve()

export async function handleAiRequest({ req, res, url, access, sendJson, crmFetch }) {
  if (!access) {
    sendJson(res, 401, { error: 'برای هوش مصنوعی باید وارد شده باشید.' })
    return
  }

  if (req.method === 'GET' && url.pathname === '/api/ai/settings') {
    const stored = await readKey(access, crmFetch)
    sendJson(res, 200, publicSettings(stored))
    return
  }

  if (req.method === 'PUT' && url.pathname === '/api/ai/settings') {
    const body = await readJson(req, 32_000)
    const apiKey = String(body.apiKey || '').trim()
    if (apiKey.length < 20 || apiKey.length > 300 || /\s/.test(apiKey)) {
      sendJson(res, 400, { error: 'کلید OpenAI را کامل وارد کنید.' })
      return
    }
    const baseUrl = normalizeBase(body.baseUrl)
    await assertOpenAiKey(apiKey, baseUrl)
    const userId = await currentUserId(access, crmFetch)
    await updateKeys((state) => {
      state.users[userId] = { key: apiKey, baseUrl, updatedAt: new Date().toISOString() }
      return state
    })
    sendJson(res, 200, publicSettings({ key: apiKey, baseUrl }))
    return
  }

  if (req.method === 'DELETE' && url.pathname === '/api/ai/settings') {
    const userId = await currentUserId(access, crmFetch)
    await updateKeys((state) => {
      delete state.users[userId]
      return state
    })
    sendJson(res, 200, { configured: false, hint: '' })
    return
  }

  if (req.method === 'POST' && url.pathname === '/api/ai/analyze') {
    const body = await readJson(req, 32_000)
    const stored = await readKey(access, crmFetch)
    if (!stored?.key) {
      sendJson(res, 409, { error: 'اول کلید OpenAI را ذخیره کنید.' })
      return
    }
    const kind = String(body.kind || '')
    const report = kind === 'month'
      ? await monthReport(access, crmFetch)
      : kind === 'calls'
        ? await callReport(access, crmFetch)
        : kind === 'customer'
          ? await customerReport(access, crmFetch, String(body.contactId || ''))
          : null
    if (!report) {
      sendJson(res, 400, { error: 'نوع تحلیل مشخص نیست.' })
      return
    }
    const analysis = await complete(stored.key, stored.baseUrl, report.prompt)
    sendJson(res, 200, { title: report.title, stats: report.stats, analysis })
    return
  }

  if (req.method === 'POST' && url.pathname === '/api/ai/voice') {
    const stored = await readKey(access, crmFetch)
    if (!stored?.key) {
      sendJson(res, 409, { error: 'اول کلید OpenAI را ذخیره کنید.' })
      return
    }
    const file = await readAudio(req)
    const transcript = await transcribe(stored.key, stored.baseUrl, file)
    const text = String(transcript.text || '').trim()
    if (!text) {
      sendJson(res, 422, { error: 'از این فایل متنی شنیده نشد.' })
      return
    }
    const seconds = Number(transcript.duration) || 0
    const stats = []
    if (seconds > 0 && seconds < 60) stats.push({ label: 'مدت مکالمه', value: `${fa(Math.round(seconds))} ثانیه` })
    else if (seconds >= 60) stats.push({ label: 'مدت مکالمه', value: formatMinutes(Math.round(seconds / 60)) })
    stats.push({ label: 'حجم متن', value: `${fa(text.length)} نویسه` })
    const analysis = await complete(stored.key, [
      'این متن پیاده‌شده یک مکالمه با مشتری است.',
      seconds ? `مدت فایل: ${Math.round(seconds)} ثانیه.` : 'مدت فایل در پاسخ پیاده‌سازی نیامده است.',
      'لحن مشتری، خواسته، اعتراض، قول‌های داده‌شده و اقدام بعدی را مشخص کن.',
      'متن:',
      text.slice(0, 15000),
    ].join('\n'))
    sendJson(res, 200, {
      title: 'تحلیل مکالمه صوتی',
      stats,
      transcript: text.slice(0, 4000),
      analysis,
    })
    return
  }

  sendJson(res, 404, { error: 'مسیر پیدا نشد.' })
}

async function monthReport(access, crmFetch) {
  const window = monthWindow()
  const [contacts, opportunities, cases, invoices, calls, meetings] = await Promise.all([
    listRecords(access, crmFetch, 'Contacts', 'first_name,last_name,date_entered', 80),
    listRecords(access, crmFetch, 'Opportunities', 'name,sales_stage,amount,date_entered', 80),
    listRecords(access, crmFetch, 'Cases', 'name,status,date_entered', 80),
    listRecords(access, crmFetch, 'AOS_Invoices', 'name,status,total_amount,date_entered', 80),
    listRecords(access, crmFetch, 'Calls', 'name,direction,status,date_start,duration_hours,duration_minutes,description', 80),
    listRecords(access, crmFetch, 'Meetings', 'name,status,date_start', 80),
  ])
  const inMonth = (records, fields) => records.filter((record) => inRange(record, fields, window.start, window.end))
  const monthContacts = inMonth(contacts, ['date_entered'])
  const monthOpps = inMonth(opportunities, ['date_entered'])
  const monthCases = inMonth(cases, ['date_entered'])
  const monthInvoices = inMonth(invoices, ['date_entered'])
  const monthCalls = inMonth(calls, ['date_start'])
  const monthMeetings = inMonth(meetings, ['date_start'])
  const won = monthOpps.filter((record) => record.sales_stage === 'Closed Won')
  const wonAmount = sum(won, 'amount')
  const invoiceAmount = sum(monthInvoices, 'total_amount')
  const callMinutes = monthCalls.reduce((total, record) => total + minutesOf(record), 0)
  const openCases = monthCases.filter((record) => String(record.status || '').startsWith('Open')).length
  const stats = [
    { label: 'مخاطب جدید', value: fa(monthContacts.length) },
    { label: 'فرصت فروش', value: fa(monthOpps.length) },
    { label: 'فرصت موفق', value: `${fa(won.length)} · ${fa(wonAmount)}` },
    { label: 'تیکت', value: `${fa(monthCases.length)} · باز ${fa(openCases)}` },
    { label: 'فاکتور', value: `${fa(monthInvoices.length)} · ${fa(invoiceAmount)}` },
    { label: 'تماس', value: `${fa(monthCalls.length)} · ${formatMinutes(callMinutes)}` },
    { label: 'قرار', value: fa(monthMeetings.length) },
  ]
  return {
    title: `تحلیل ${window.label}`,
    stats,
    prompt: [
      `گزارش پایان ماه برای ${window.label}. بازه: ${window.start.toISOString()} تا ${window.end.toISOString()}.`,
      'مبالغ همان عددی است که در CRM ذخیره شده و واحد جداگانه‌ای مشخص نیست.',
      JSON.stringify({
        contacts: brief(monthContacts, ['first_name', 'last_name']),
        opportunities: brief(monthOpps, ['name', 'sales_stage', 'amount']),
        cases: brief(monthCases, ['name', 'status']),
        invoices: brief(monthInvoices, ['name', 'status', 'total_amount']),
        calls: brief(monthCalls, ['name', 'direction', 'status', 'minutes']),
        meetings: brief(monthMeetings, ['name', 'status']),
        totals: stats,
      }),
    ].join('\n'),
  }
}

async function callReport(access, crmFetch) {
  const calls = await listRecords(access, crmFetch, 'Calls', 'name,direction,status,date_start,duration_hours,duration_minutes,description', 100)
  const withDuration = calls.filter((record) => minutesOf(record) > 0)
  const total = withDuration.reduce((sumMinutes, record) => sumMinutes + minutesOf(record), 0)
  const inbound = calls.filter((record) => record.direction === 'Inbound').length
  const outbound = calls.filter((record) => record.direction === 'Outbound').length
  const average = withDuration.length ? Math.round(total / withDuration.length) : 0
  const stats = [
    { label: 'تعداد تماس', value: fa(calls.length) },
    { label: 'ورودی', value: fa(inbound) },
    { label: 'خروجی', value: fa(outbound) },
    { label: 'دارای مدت', value: fa(withDuration.length) },
    { label: 'مجموع مدت', value: formatMinutes(total) },
    { label: 'میانگین مدت', value: formatMinutes(average) },
  ]
  return {
    title: 'تحلیل مدت تماس‌ها',
    stats,
    prompt: [
      'تماس‌های ثبت‌شده در CRM را از نظر تعداد، جهت، وضعیت و مدت تحلیل کن.',
      'اگر مدت خالی است، بگو برای تحلیل مدت باید ساعت یا دقیقه تماس ثبت شود، یا فایل صوتی تحلیل شود.',
      JSON.stringify({
        totals: stats,
        calls: brief(calls, ['name', 'direction', 'status', 'date_start', 'minutes', 'description']),
      }),
    ].join('\n'),
  }
}

async function customerReport(access, crmFetch, contactId) {
  if (!/^[A-Za-z0-9-]{1,36}$/.test(contactId)) {
    const error = new Error('یک مخاطب را انتخاب کنید.')
    error.status = 400
    throw error
  }
  const contactResponse = await crmFetch(`/V8/module/Contacts/${encodeURIComponent(contactId)}`, { method: 'GET', access })
  if (contactResponse.status === 404) {
    const error = new Error('این مخاطب پیدا نشد.')
    error.status = 404
    throw error
  }
  if (!contactResponse.ok) {
    const error = new Error('پرونده مخاطب خوانده نشد.')
    error.status = contactResponse.status
    throw error
  }
  const document = await contactResponse.json()
  const contact = flat(document.data)
  const [calls, meetings, notes, opportunities, cases] = await Promise.all([
    related(access, crmFetch, contactId, 'calls'),
    related(access, crmFetch, contactId, 'meetings'),
    related(access, crmFetch, contactId, 'notes'),
    related(access, crmFetch, contactId, 'opportunities'),
    related(access, crmFetch, contactId, 'cases'),
  ])
  const name = [contact.first_name, contact.last_name].filter(Boolean).join(' ') || 'مخاطب'
  const callMinutes = calls.reduce((total, record) => total + minutesOf(record), 0)
  const stats = [
    { label: 'تماس', value: `${fa(calls.length)} · ${formatMinutes(callMinutes)}` },
    { label: 'قرار', value: fa(meetings.length) },
    { label: 'یادداشت', value: fa(notes.length) },
    { label: 'فرصت', value: fa(opportunities.length) },
    { label: 'تیکت', value: fa(cases.length) },
  ]
  return {
    title: `پرونده ${name}`,
    stats,
    prompt: [
      `تحلیل رابطه با مشتری «${name}».`,
      JSON.stringify({
        contact: pick(contact, ['first_name', 'last_name', 'title', 'department', 'phone_mobile', 'email1']),
        calls: brief(calls, ['name', 'direction', 'status', 'date_start', 'minutes', 'description']),
        meetings: brief(meetings, ['name', 'status', 'date_start', 'description']),
        notes: brief(notes, ['name', 'description']),
        opportunities: brief(opportunities, ['name', 'sales_stage', 'amount']),
        cases: brief(cases, ['name', 'status']),
      }),
    ].join('\n'),
  }
}

async function related(access, crmFetch, contactId, link) {
  const upstream = await crmFetch(`/V8/module/Contacts/${encodeURIComponent(contactId)}/relationships/${link}`, { method: 'GET', access })
  if (!upstream.ok) return []
  const document = await upstream.json().catch(() => ({}))
  return (document.data || []).slice(0, 30).map(flat)
}

async function listRecords(access, crmFetch, module, fields, size) {
  const params = new URLSearchParams()
  params.set('page[size]', String(size))
  params.set('page[number]', '1')
  params.set(`fields[${module}]`, fields)
  const upstream = await crmFetch(`/V8/module/${module}?${params}`, { method: 'GET', access })
  if (!upstream.ok) return []
  const document = await upstream.json().catch(() => ({}))
  return (document.data || []).map(flat)
}

function flat(item) {
  if (!item) return {}
  const attributes = item.attributes || item
  const record = { id: item.id || attributes.id || '' }
  for (const [key, value] of Object.entries(attributes)) {
    if (value == null || typeof value === 'object') continue
    record[key] = String(value)
  }
  record.minutes = String(minutesOf(record))
  return record
}

function brief(records, fields) {
  return records.slice(0, 25).map((record) => pick(record, fields))
}

function pick(record, fields) {
  const next = {}
  for (const field of fields) {
    const value = record[field]
    if (value) next[field] = String(value).slice(0, 180)
  }
  return next
}

function minutesOf(record) {
  return (Number(record.duration_hours) || 0) * 60 + (Number(record.duration_minutes) || 0)
}

function sum(records, field) {
  return records.reduce((total, record) => total + (Number(String(record[field]).replace(/,/g, '')) || 0), 0)
}

function inRange(record, fields, start, end) {
  return fields.some((field) => {
    const date = parseCrmDate(record[field])
    return date && date >= start && date <= end
  })
}

export function parseCrmDate(value) {
  const text = String(value || '').trim()
  if (!text) return null
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) {
    const parsed = Date.parse(text)
    return Number.isNaN(parsed) ? null : new Date(parsed)
  }
  const match = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2}))?/)
  if (!match) return null
  return new Date(Number(match[3]), Number(match[1]) - 1, Number(match[2]), Number(match[4] || 0), Number(match[5] || 0))
}

export function monthWindow(now = new Date()) {
  const month = calendarPart(now, 'month')
  const start = new Date(now)
  start.setHours(12, 0, 0, 0)
  for (let step = 0; step < 40; step += 1) {
    const previous = new Date(start)
    previous.setDate(previous.getDate() - 1)
    if (calendarPart(previous, 'month') !== month) break
    start.setTime(previous.getTime())
  }
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  for (let step = 0; step < 40; step += 1) {
    const next = new Date(end)
    next.setDate(next.getDate() + 1)
    if (calendarPart(next, 'month') !== month) break
    end.setTime(next.getTime())
  }
  end.setHours(23, 59, 59, 999)
  const monthName = new Intl.DateTimeFormat('fa-IR-u-ca-persian', { month: 'long' }).format(now)
  const yearName = new Intl.DateTimeFormat('fa-IR-u-ca-persian', { year: 'numeric' }).format(now)
  const label = `${monthName} ${yearName}`
  return { start, end, label }
}

function calendarPart(date, type) {
  const parts = new Intl.DateTimeFormat('en-US-u-ca-persian', { year: 'numeric', month: 'numeric', day: 'numeric' }).formatToParts(date)
  return Number(parts.find((part) => part.type === type)?.value)
}

function fa(value) {
  return new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 0 }).format(Number(value) || 0)
}

function formatMinutes(total) {
  const minutes = Math.max(0, Math.round(Number(total) || 0))
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (hours && rest) return `${fa(hours)} ساعت و ${fa(rest)} دقیقه`
  if (hours) return `${fa(hours)} ساعت`
  return `${fa(rest)} دقیقه`
}

async function currentUserId(access, crmFetch) {
  const upstream = await crmFetch('/V8/current-user', { method: 'GET', access })
  const document = await upstream.json().catch(() => ({}))
  const id = document?.data?.id
  if (!upstream.ok || !id) {
    const error = new Error('نشست کاربر خوانده نشد.')
    error.status = upstream.status || 401
    throw error
  }
  return String(id)
}

async function readKey(access, crmFetch) {
  const userId = await currentUserId(access, crmFetch)
  const state = await readKeys()
  return state.users[userId] || null
}

function publicSettings(stored) {
  const key = stored?.key || ''
  const baseUrl = stored?.baseUrl && stored.baseUrl !== DEFAULT_BASE ? stored.baseUrl : ''
  return {
    configured: Boolean(key),
    hint: key ? `…${key.slice(-4)}` : '',
    baseUrl,
  }
}

const DEFAULT_BASE = 'https://api.openai.com/v1'

function normalizeBase(value) {
  const text = String(value || '').trim()
  if (!text) return DEFAULT_BASE
  let url
  try {
    url = new URL(text)
  } catch {
    const error = new Error('آدرس سرویس باید یک نشانی کامل باشد.')
    error.status = 400
    throw error
  }
  const local = url.hostname === 'localhost' || url.hostname === '127.0.0.1'
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && local)) {
    const error = new Error('آدرس سرویس باید با https شروع شود.')
    error.status = 400
    throw error
  }
  return url.toString().replace(/\/$/, '')
}

function openAiUrl(baseUrl, path) {
  return `${normalizeBase(baseUrl)}${path}`
}

async function readKeys() {
  try {
    const parsed = JSON.parse(await readFile(keyFile, 'utf8'))
    if (!parsed || typeof parsed !== 'object' || !parsed.users) return { users: {} }
    return parsed
  } catch (error) {
    if (error?.code === 'ENOENT') return { users: {} }
    throw error
  }
}

function updateKeys(mutator) {
  const run = queue.then(async () => {
    const state = await readKeys()
    const next = await mutator(state)
    await mkdir(path.dirname(keyFile), { recursive: true })
    await writeFile(keyFile, JSON.stringify(next), { mode: 0o600 })
    return next
  })
  queue = run.then(() => undefined, () => undefined)
  return run
}

async function assertOpenAiKey(apiKey, baseUrl) {
  let response
  try {
    response = await fetch(openAiUrl(baseUrl, '/models'), {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(20_000),
    })
  } catch {
    const error = new Error('به سرویس هوش مصنوعی وصل نشدیم. اتصال سرور یا آدرس سرویس را بررسی کنید.')
    error.status = 502
    throw error
  }
  if (!response.ok) {
    const error = new Error(await openAiMessage(response))
    error.status = response.status === 401 ? 400 : 502
    throw error
  }
  await response.body?.cancel()
}

async function complete(apiKey, baseUrl, prompt) {
  let response
  try {
    response = await fetch(openAiUrl(baseUrl, '/chat/completions'), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.2,
        max_tokens: 1200,
        messages: [
          { role: 'system', content: SYSTEM },
          { role: 'user', content: prompt },
        ],
      }),
      signal: AbortSignal.timeout(90_000),
    })
  } catch {
    const error = new Error('تحلیل به OpenAI نرسید. دوباره تلاش کنید.')
    error.status = 502
    throw error
  }
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error(messageFromBody(payload) || 'پاسخ تحلیل قابل استفاده نیست.')
    error.status = response.status === 429 ? 429 : 502
    throw error
  }
  const text = payload.choices?.[0]?.message?.content
  if (!text) {
    const error = new Error('پاسخ تحلیل خالی بود.')
    error.status = 502
    throw error
  }
  return String(text).trim()
}

async function transcribe(apiKey, baseUrl, file) {
  const body = new FormData()
  body.append('file', new Blob([file.content], { type: file.mime }), file.filename)
  body.append('model', 'whisper-1')
  body.append('response_format', 'verbose_json')
  let response
  try {
    response = await fetch(openAiUrl(baseUrl, '/audio/transcriptions'), {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body,
      signal: AbortSignal.timeout(120_000),
    })
  } catch {
    const error = new Error('فایل صوتی به OpenAI نرسید.')
    error.status = 502
    throw error
  }
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error(messageFromBody(payload) || 'پیاده‌سازی صدا ناموفق بود.')
    error.status = response.status === 401 ? 400 : 502
    throw error
  }
  return payload
}

async function openAiMessage(response) {
  const payload = await response.json().catch(() => ({}))
  return messageFromBody(payload) || 'کلید OpenAI پذیرفته نشد.'
}

function messageFromBody(payload) {
  const message = payload?.error?.message
  if (!message) {
    if (payload?.error?.code === 'invalid_api_key') return 'کلید OpenAI پذیرفته نشد.'
    return ''
  }
  if (/country, region, or territory not supported/i.test(message)) {
    return 'از محل این سرور به OpenAI دسترسی نیست. آدرس یک سرویس سازگار را وارد کنید.'
  }
  if (/incorrect api key|invalid api key|invalid_api_key/i.test(message)) return 'کلید OpenAI پذیرفته نشد.'
  if (/quota|rate limit|insufficient_quota/i.test(message)) return 'سقف استفاده از OpenAI پر شده است.'
  return String(message).slice(0, 180)
}

function readJson(req, limit) {
  return readBody(req, limit).then((raw) => {
    if (!raw.length) return {}
    try {
      return JSON.parse(raw.toString('utf8'))
    } catch {
      const error = new Error('درخواست قابل خواندن نیست.')
      error.status = 400
      throw error
    }
  })
}

function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let size = 0
    req.on('data', (chunk) => {
      size += chunk.length
      if (size > limit) {
        const error = new Error(limit > 1_000_000 ? 'فایل صوتی بزرگ‌تر از ۲۵ مگابایت است.' : 'حجم درخواست زیاد است.')
        error.status = 413
        reject(error)
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

async function readAudio(req) {
  const contentType = String(req.headers['content-type'] || '')
  const body = await readBody(req, AUDIO_LIMIT)
  const file = parseMultipart(body, contentType).find((part) => part.filename)
  if (!file || !file.content.length) {
    const error = new Error('یک فایل صوتی انتخاب کنید.')
    error.status = 400
    throw error
  }
  const extension = file.filename.split('.').pop()?.toLowerCase() || ''
  if (!AUDIO_EXT.has(extension)) {
    const error = new Error('فرمت فایل باید mp3، wav، m4a، ogg، webm یا mp4 باشد.')
    error.status = 400
    throw error
  }
  return {
    filename: `call.${extension}`,
    mime: file.mime.startsWith('audio/') || file.mime.startsWith('video/') ? file.mime : 'application/octet-stream',
    content: file.content,
  }
}

function parseMultipart(body, contentType) {
  const match = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(contentType)
  if (!match) return []
  const boundary = Buffer.from(`--${(match[1] || match[2]).trim()}`)
  const parts = []
  let cursor = body.indexOf(boundary)
  if (cursor < 0) return parts
  cursor += boundary.length
  while (cursor < body.length) {
    if (body[cursor] === 45 && body[cursor + 1] === 45) break
    if (body[cursor] === 13 && body[cursor + 1] === 10) cursor += 2
    const next = body.indexOf(boundary, cursor)
    if (next < 0) break
    const raw = body.subarray(cursor, next - 2)
    const separator = raw.indexOf('\r\n\r\n')
    if (separator >= 0) {
      const header = raw.subarray(0, separator).toString('utf8')
      parts.push({
        name: /name="([^"]*)"/.exec(header)?.[1] || '',
        filename: /filename="([^"]*)"/.exec(header)?.[1] || '',
        mime: /Content-Type:\s*([^\r\n]+)/i.exec(header)?.[1]?.trim() || 'application/octet-stream',
        content: raw.subarray(separator + 4),
      })
    }
    cursor = next + boundary.length
  }
  return parts
}
