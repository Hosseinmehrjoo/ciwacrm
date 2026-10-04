import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import zlib from 'node:zlib'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const catalogDir = path.join(root, 'addons')
const dataDir = path.join(root, 'data')
const stateFile = path.join(dataDir, 'addons.json')
const uploadDir = path.join(dataDir, 'uploaded-addons')

const ICONS = new Set(['sparkles', 'award', 'clipboard', 'puzzle', 'package', 'star', 'phone', 'receipt'])
const WIDGETS = new Set(['softphone', 'invoice-builder'])
const FIELD_NAME = /^[a-z][a-z0-9_]{0,30}$/
const ADDON_ID = /^[a-z][a-z0-9-]{1,40}$/

let queue = Promise.resolve()

export async function handleAddonRequest({ req, res, url, authenticated, sendJson, readRaw }) {
  if (!authenticated) {
    sendJson(res, 401, { error: 'برای مدیریت ماژول‌ها باید وارد شده باشید.' })
    return
  }

  if (req.method === 'GET' && url.pathname === '/api/addons') {
    const catalog = await listAddons()
    sendJson(res, 200, { addons: catalog })
    return
  }

  if (req.method === 'POST' && url.pathname === '/api/addons/install') {
    const body = await readJson(req, readRaw)
    const addon = await findAddon(String(body.id || ''))
    if (!addon) {
      sendJson(res, 404, { error: 'این ماژول در فهرست پیدا نشد.' })
      return
    }
    await updateState((state) => {
      if (!state.installed.includes(addon.id)) state.installed.push(addon.id)
      return state
    })
    sendJson(res, 200, { ok: true, addon: { ...addon, installed: true } })
    return
  }

  if (req.method === 'POST' && url.pathname === '/api/addons/remove') {
    const body = await readJson(req, readRaw)
    const id = String(body.id || '')
    if (!ADDON_ID.test(id)) {
      sendJson(res, 400, { error: 'شناسهٔ ماژول مجاز نیست.' })
      return
    }
    await updateState((state) => {
      state.installed = state.installed.filter((item) => item !== id)
      return state
    })
    sendJson(res, 200, { ok: true })
    return
  }

  if (req.method === 'POST' && url.pathname === '/api/addons/upload') {
    const raw = await readRaw(req)
    const contentType = String(req.headers['content-type'] || '')
    let manifestRaw
    try {
      manifestRaw = contentType.includes('application/zip') || contentType.includes('octet-stream')
        ? readModuleJsonFromZip(raw)
        : JSON.parse(raw.toString('utf8'))
    } catch (error) {
      if (error?.status) throw error
      const invalid = new Error('بستهٔ ماژول قابل خواندن نیست.')
      invalid.status = 400
      throw invalid
    }
    const addon = normalizeManifest(manifestRaw, 'upload')
    const bundled = await readCatalog()
    if (bundled.some((item) => item.id === addon.id)) {
      sendJson(res, 409, { error: 'این ماژول از قبل در فهرست نرم‌افزار هست. از دکمهٔ نصب استفاده کنید.' })
      return
    }
    await mkdir(path.join(uploadDir, addon.id), { recursive: true })
    await writeFile(path.join(uploadDir, addon.id, 'module.json'), JSON.stringify(addon, null, 2))
    await updateState((state) => {
      if (!state.installed.includes(addon.id)) state.installed.push(addon.id)
      return state
    })
    sendJson(res, 201, { ok: true, addon: { ...addon, installed: true } })
    return
  }

  const recordsMatch = url.pathname.match(/^\/api\/addons\/([a-z][a-z0-9-]{1,40})\/records\/?$/)
  if (recordsMatch) {
    await handleRecords(req, res, recordsMatch[1], url, sendJson, readRaw)
    return
  }

  sendJson(res, 404, { error: 'مسیر پیدا نشد.' })
}

async function handleRecords(req, res, id, url, sendJson, readRaw) {
  const state = await readState()
  if (!state.installed.includes(id)) {
    sendJson(res, 404, { error: 'این ماژول نصب نشده است.' })
    return
  }
  const addon = await findAddon(id)
  if (!addon) {
    sendJson(res, 404, { error: 'تعریف ماژول پیدا نشد.' })
    return
  }

  if (req.method === 'GET') {
    const current = await readState()
    sendJson(res, 200, { records: current.records[id] || [] })
    return
  }

  if (req.method === 'POST') {
    const body = await readJson(req, readRaw)
    const attributes = sanitizeAttributes(addon, body.attributes || {})
    const record = { id: crypto.randomUUID(), attributes, createdAt: new Date().toISOString() }
    await updateState((next) => {
      const list = next.records[id] || []
      if (list.length >= 200) {
        const error = new Error('سقف ۲۰۰ رکورد برای این ماژول پر شده است.')
        error.status = 400
        throw error
      }
      next.records[id] = [record, ...list]
      return next
    })
    sendJson(res, 201, { record })
    return
  }

  if (req.method === 'DELETE') {
    const recordId = url.searchParams.get('record') || ''
    await updateState((next) => {
      next.records[id] = (next.records[id] || []).filter((item) => item.id !== recordId)
      return next
    })
    sendJson(res, 200, { ok: true })
    return
  }

  sendJson(res, 405, { error: 'روش مجاز نیست.' })
}

async function listAddons() {
  const state = await readState()
  const addons = [...await readCatalog(), ...await readUploaded()]
  const seen = new Set()
  return addons.filter((addon) => {
    if (seen.has(addon.id)) return false
    seen.add(addon.id)
    return true
  }).map((addon) => ({ ...addon, installed: state.installed.includes(addon.id) }))
}

async function findAddon(id) {
  if (!ADDON_ID.test(id)) return null
  const addons = await listAddons()
  return addons.find((addon) => addon.id === id) || null
}

async function readCatalog() {
  let entries = []
  try {
    entries = await readdir(catalogDir, { withFileTypes: true })
  } catch {
    return []
  }
  const addons = []
  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    try {
      const raw = JSON.parse(await readFile(path.join(catalogDir, entry.name, 'module.json'), 'utf8'))
      addons.push(normalizeManifest(raw, 'catalog'))
    } catch {
      continue
    }
  }
  return addons
}

async function readUploaded() {
  let entries = []
  try {
    entries = await readdir(uploadDir, { withFileTypes: true })
  } catch {
    return []
  }
  const addons = []
  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    try {
      const raw = JSON.parse(await readFile(path.join(uploadDir, entry.name, 'module.json'), 'utf8'))
      addons.push(normalizeManifest(raw, 'upload'))
    } catch {
      continue
    }
  }
  return addons
}

function normalizeManifest(raw, source) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    const error = new Error('بستهٔ ماژول قابل خواندن نیست.')
    error.status = 400
    throw error
  }
  const id = String(raw.id || '')
  if (!ADDON_ID.test(id)) {
    const error = new Error('شناسهٔ ماژول باید با حرف انگلیسی شروع شود و فقط شامل حرف، عدد و خط تیره باشد.')
    error.status = 400
    throw error
  }
  const fields = Array.isArray(raw.fields) ? raw.fields.slice(0, 12) : []
  const normalizedFields = []
  for (const field of fields) {
    if (!field || typeof field !== 'object') continue
    const name = String(field.name || '')
    if (!FIELD_NAME.test(name)) continue
    const kind = field.kind === 'textarea' || field.kind === 'number' ? field.kind : 'text'
    normalizedFields.push({
      name,
      label: clip(field.label, 60) || name,
      kind,
      required: Boolean(field.required),
    })
  }
  const widget = WIDGETS.has(raw.widget) ? raw.widget : ''
  if (!widget && !normalizedFields.some((field) => field.required)) {
    const error = new Error('ماژول حداقل یک فیلد اجباری لازم دارد.')
    error.status = 400
    throw error
  }
  return {
    id,
    name: clip(raw.name, 80) || id,
    version: clip(raw.version, 20) || '1.0.0',
    description: clip(raw.description, 400),
    navLabel: clip(raw.navLabel, 40) || clip(raw.name, 40) || id,
    icon: ICONS.has(raw.icon) ? raw.icon : 'puzzle',
    recordLabel: clip(raw.recordLabel, 40) || 'مورد',
    fields: normalizedFields,
    ...(widget ? { widget } : {}),
    source,
  }
}

function sanitizeAttributes(addon, input) {
  const source = input && typeof input === 'object' ? input : {}
  const attributes = {}
  for (const field of addon.fields) {
    const value = source[field.name]
    if (value == null || value === '') {
      if (field.required) {
        const error = new Error(`${field.label} لازم است.`)
        error.status = 400
        throw error
      }
      continue
    }
    if (field.kind === 'number') {
      const number = Number(String(value).replace(/,/g, ''))
      if (!Number.isFinite(number)) {
        const error = new Error(`${field.label} باید عدد باشد.`)
        error.status = 400
        throw error
      }
      attributes[field.name] = number
      continue
    }
    attributes[field.name] = clip(value, field.kind === 'textarea' ? 2000 : 200)
  }
  return attributes
}

async function readState() {
  try {
    const parsed = JSON.parse(await readFile(stateFile, 'utf8'))
    return {
      installed: Array.isArray(parsed.installed) ? parsed.installed.filter((id) => ADDON_ID.test(id)) : [],
      records: parsed.records && typeof parsed.records === 'object' ? parsed.records : {},
    }
  } catch {
    return { installed: [], records: {} }
  }
}

function updateState(change) {
  const run = queue.then(async () => {
    const state = await readState()
    const next = await change(state)
    await mkdir(dataDir, { recursive: true })
    await writeFile(stateFile, JSON.stringify(next, null, 2))
  })
  queue = run.catch(() => undefined)
  return run
}

async function readJson(req, readRaw) {
  const raw = await readRaw(req)
  if (!raw.length) return {}
  try {
    return JSON.parse(raw.toString('utf8'))
  } catch {
    const error = new Error('بدنهٔ درخواست JSON نیست.')
    error.status = 400
    throw error
  }
}

function readModuleJsonFromZip(buffer) {
  const zip = Buffer.from(buffer)
  const eocd = findEocd(zip)
  const count = zip.readUInt16LE(eocd + 10)
  let cursor = zip.readUInt32LE(eocd + 16)
  for (let index = 0; index < count; index += 1) {
    if (zip.readUInt32LE(cursor) !== 0x02014b50) break
    const method = zip.readUInt16LE(cursor + 10)
    const compressedSize = zip.readUInt32LE(cursor + 20)
    const nameLength = zip.readUInt16LE(cursor + 28)
    const extraLength = zip.readUInt16LE(cursor + 30)
    const commentLength = zip.readUInt16LE(cursor + 32)
    const localOffset = zip.readUInt32LE(cursor + 42)
    const name = zip.subarray(cursor + 46, cursor + 46 + nameLength).toString('utf8')
    cursor += 46 + nameLength + extraLength + commentLength
    if (name !== 'module.json' && !name.endsWith('/module.json')) continue
    if (name.includes('..')) continue
    const localNameLength = zip.readUInt16LE(localOffset + 26)
    const localExtraLength = zip.readUInt16LE(localOffset + 28)
    const dataStart = localOffset + 30 + localNameLength + localExtraLength
    const compressed = zip.subarray(dataStart, dataStart + compressedSize)
    const text = method === 0 ? compressed.toString('utf8') : zlib.inflateRawSync(compressed).toString('utf8')
    return JSON.parse(text)
  }
  const error = new Error('بسته باید فایل module.json داشته باشد.')
  error.status = 400
  throw error
}

function findEocd(zip) {
  const start = Math.max(0, zip.length - (22 + 65535))
  for (let offset = zip.length - 22; offset >= start; offset -= 1) {
    if (zip.readUInt32LE(offset) === 0x06054b50) return offset
  }
  const error = new Error('فایل فشرده معتبر نیست.')
  error.status = 400
  throw error
}

function clip(value, max) {
  return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max)
}
