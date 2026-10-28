import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { MapPin, Square, Circle, Pentagon, Eye, Trash2, Save } from 'lucide-react'
import { createModuleRecord } from '../api/records'
import { ApiError } from '../api/client'
import { SectionHelp } from '../help/SectionHelp'

const KEY_STORAGE = 'ciwa-neshan-web-key'
const NESHAN_CSS = 'https://static.neshan.org/sdk/leaflet/v1.9.4/neshan-sdk/v1.0.8/index.css'
const NESHAN_JS = 'https://static.neshan.org/sdk/leaflet/v1.9.4/neshan-sdk/v1.0.8/index.js'
const OVERPASS = 'https://overpass-api.de/api/interpreter'
const TEHRAN: [number, number] = [35.6892, 51.389]

type DrawMode = 'rect' | 'circle' | 'polygon' | 'view' | null

type Place = {
  id: string
  name: string
  phone: string
  lat: number
  lon: number
  address: string
  category: string
}

type LeafletMap = {
  remove: () => void
  setView: (center: [number, number], zoom: number) => void
  getBounds: () => { getSouth: () => number; getWest: () => number; getNorth: () => number; getEast: () => number }
  on: (event: string, handler: (e: { latlng: { lat: number; lng: number } }) => void) => void
  off: (event: string) => void
  removeLayer: (layer: unknown) => void
  fitBounds: (bounds: unknown) => void
}

type LeafletNs = {
  Map: new (el: HTMLElement, opts: Record<string, unknown>) => LeafletMap
  rectangle: (bounds: [[number, number], [number, number]], opts?: Record<string, unknown>) => { addTo: (m: LeafletMap) => unknown; getBounds: () => unknown }
  circle: (center: [number, number], opts: Record<string, unknown>) => { addTo: (m: LeafletMap) => unknown; getBounds: () => unknown; getLatLng: () => { lat: number; lng: number }; getRadius: () => number }
  polygon: (latlngs: [number, number][], opts?: Record<string, unknown>) => { addTo: (m: LeafletMap) => unknown; getBounds: () => unknown; getLatLngs: () => { lat: number; lng: number }[][] }
  marker: (latlng: [number, number]) => { addTo: (m: LeafletMap) => unknown; bindPopup: (html: string) => unknown }
  latLngBounds: (a: [number, number], b: [number, number]) => unknown
}

declare global {
  interface Window {
    L?: LeafletNs
  }
}

function loadScript(src: string) {
  return new Promise<void>((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve()
      return
    }
    const el = document.createElement('script')
    el.src = src
    el.async = true
    el.onload = () => resolve()
    el.onerror = () => reject(new Error('بارگذاری نقشه نشان ناموفق بود.'))
    document.head.appendChild(el)
  })
}

function loadCss(href: string) {
  if (document.querySelector(`link[href="${href}"]`)) return
  const el = document.createElement('link')
  el.rel = 'stylesheet'
  el.href = href
  document.head.appendChild(el)
}

function haversineMeters(a: [number, number], b: [number, number]) {
  const R = 6371000
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(b[0] - a[0])
  const dLon = toRad(b[1] - a[1])
  const lat1 = toRad(a[0])
  const lat2 = toRad(b[0])
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

function tagsName(tags: Record<string, string> | undefined) {
  if (!tags) return ''
  return tags.name || tags['name:fa'] || tags['name:en'] || tags.brand || tags.operator || ''
}

function tagsPhone(tags: Record<string, string> | undefined) {
  if (!tags) return ''
  return tags.phone || tags['contact:phone'] || tags['phone:mobile'] || tags.mobile || ''
}

function tagsAddress(tags: Record<string, string> | undefined) {
  if (!tags) return ''
  return [tags['addr:street'], tags['addr:housenumber'], tags['addr:city']].filter(Boolean).join('، ')
}

function parseOverpass(data: { elements?: Array<Record<string, unknown>> }): Place[] {
  const out: Place[] = []
  const seen = new Set<string>()
  for (const el of data.elements || []) {
    const tags = el.tags as Record<string, string> | undefined
    const name = tagsName(tags)
    if (!name) continue
    let lat = Number(el.lat)
    let lon = Number(el.lon)
    const center = el.center as { lat?: number; lon?: number } | undefined
    if (!Number.isFinite(lat) && center) {
      lat = Number(center.lat)
      lon = Number(center.lon)
    }
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue
    const phone = tagsPhone(tags)
    const key = `${name}|${phone}|${lat.toFixed(5)}|${lon.toFixed(5)}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push({
      id: String(el.id ?? key),
      name,
      phone,
      lat,
      lon,
      address: tagsAddress(tags),
      category: tags?.amenity || tags?.shop || tags?.office || tags?.tourism || 'place',
    })
  }
  return out.sort((a, b) => a.name.localeCompare(b.name, 'fa'))
}

function overpassQuery(south: number, west: number, north: number, east: number) {
  const bbox = `${south},${west},${north},${east}`
  return `
[out:json][timeout:45];
(
  node["name"]["amenity"](${bbox});
  node["name"]["shop"](${bbox});
  node["name"]["office"](${bbox});
  node["name"]["craft"](${bbox});
  node["name"]["tourism"](${bbox});
  way["name"]["amenity"](${bbox});
  way["name"]["shop"](${bbox});
  way["name"]["office"](${bbox});
);
out center tags;
`.trim()
}

function splitPersonName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length <= 1) return { first_name: '', last_name: name.trim() || 'بدون‌نام' }
  return { first_name: parts[0]!, last_name: parts.slice(1).join(' ') }
}

export function MapLeads() {
  const mapEl = useRef<HTMLDivElement>(null)
  const mapRef = useRef<LeafletMap | null>(null)
  const shapeRef = useRef<unknown>(null)
  const markersRef = useRef<unknown[]>([])
  const clicksRef = useRef<[number, number][]>([])

  const [apiKey, setApiKey] = useState(() => localStorage.getItem(KEY_STORAGE) || '')
  const [draftKey, setDraftKey] = useState(apiKey)
  const [mode, setMode] = useState<DrawMode>(null)
  const [places, setPlaces] = useState<Place[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [mapReady, setMapReady] = useState(false)

  const selectedCount = selected.size
  const hint = useMemo(() => {
    if (mode === 'rect') return 'دو گوشهٔ مستطیل را روی نقشه کلیک کنید.'
    if (mode === 'circle') return 'مرکز دایره، سپس یک نقطه روی محیط را کلیک کنید.'
    if (mode === 'polygon') return 'رأس‌های چندضلعی را کلیک کنید؛ برای بستن دوباره روی نقطهٔ اول بزنید یا استخراج را بزنید.'
    if (mode === 'view') return 'محدودهٔ فعلی نقشه انتخاب شده. استخراج را بزنید.'
    return 'یک ابزار محدوده انتخاب کنید.'
  }, [mode])

  const clearShape = useCallback(() => {
    const map = mapRef.current
    const L = window.L
    if (map && shapeRef.current && L) {
      try {
        map.removeLayer(shapeRef.current)
      } catch {
        /* ignore */
      }
    }
    shapeRef.current = null
    clicksRef.current = []
  }, [])

  const clearMarkers = useCallback(() => {
    const map = mapRef.current
    if (!map) return
    for (const m of markersRef.current) {
      try {
        map.removeLayer(m)
      } catch {
        /* ignore */
      }
    }
    markersRef.current = []
  }, [])

  const destroyMap = useCallback(() => {
    clearMarkers()
    clearShape()
    if (mapRef.current) {
      try {
        mapRef.current.remove()
      } catch {
        /* ignore */
      }
      mapRef.current = null
    }
    setMapReady(false)
  }, [clearMarkers, clearShape])

  const initMap = useCallback(async (key: string) => {
    if (!mapEl.current || !key.trim()) return
    setError('')
    setBusy('در حال بارگذاری نقشه…')
    destroyMap()
    try {
      loadCss(NESHAN_CSS)
      await loadScript(NESHAN_JS)
      const L = window.L
      if (!L) throw new Error('کتابخانهٔ نقشه در دسترس نیست.')
      const map = new L.Map(mapEl.current, {
        key: key.trim(),
        maptype: 'neshan',
        poi: true,
        traffic: false,
        center: TEHRAN,
        zoom: 13,
      })
      mapRef.current = map
      setMapReady(true)
      setInfo('نقشه آماده است.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'خطا در بارگذاری نقشه')
    } finally {
      setBusy('')
    }
  }, [destroyMap])

  useEffect(() => {
    if (apiKey) void initMap(apiKey)
    return () => destroyMap()
  }, [apiKey, initMap, destroyMap])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !mode || mode === 'view') return
    const L = window.L
    if (!L) return

    const onClick = (e: { latlng: { lat: number; lng: number } }) => {
      const point: [number, number] = [e.latlng.lat, e.latlng.lng]
      const clicks = clicksRef.current

      if (mode === 'rect') {
        clicks.push(point)
        if (clicks.length === 1) {
          setInfo('گوشهٔ دوم را کلیک کنید.')
          return
        }
        clearShape()
        const bounds: [[number, number], [number, number]] = [clicks[0]!, clicks[1]!]
        shapeRef.current = L.rectangle(bounds, { color: '#0f766e', weight: 2, fillOpacity: 0.15 }).addTo(map)
        clicksRef.current = []
        setInfo('مستطیل آماده است. استخراج را بزنید.')
        return
      }

      if (mode === 'circle') {
        clicks.push(point)
        if (clicks.length === 1) {
          setInfo('یک نقطه روی محیط دایره کلیک کنید.')
          return
        }
        clearShape()
        const radius = Math.max(30, haversineMeters(clicks[0]!, clicks[1]!))
        shapeRef.current = L.circle(clicks[0]!, { radius, color: '#0f766e', weight: 2, fillOpacity: 0.15 }).addTo(map)
        clicksRef.current = []
        setInfo('دایره آماده است. استخراج را بزنید.')
        return
      }

      if (mode === 'polygon') {
        if (clicks.length >= 3) {
          const first = clicks[0]!
          if (haversineMeters(first, point) < 25) {
            clearShape()
            shapeRef.current = L.polygon([...clicks], { color: '#0f766e', weight: 2, fillOpacity: 0.15 }).addTo(map)
            clicksRef.current = []
            setInfo('چندضلعی آماده است. استخراج را بزنید.')
            return
          }
        }
        clicks.push(point)
        clearShape()
        if (clicks.length >= 2) {
          shapeRef.current = L.polygon([...clicks], { color: '#0f766e', weight: 2, fillOpacity: 0.1 }).addTo(map)
        }
        setInfo(`${clicks.length} رأس — برای بستن روی نقطهٔ اول بزنید.`)
      }
    }

    map.on('click', onClick)
    return () => {
      map.off('click')
    }
  }, [mode, clearShape, mapReady])

  function saveKey() {
    const next = draftKey.trim()
    if (!next) {
      setError('کلید web نشان لازم است.')
      return
    }
    localStorage.setItem(KEY_STORAGE, next)
    setApiKey(next)
  }

  function pickMode(next: DrawMode) {
    clearShape()
    setMode(next)
    if (next === 'view') setInfo('نمای فعلی نقشه به‌عنوان محدوده استفاده می‌شود.')
  }

  function boundsFromShape(): { south: number; west: number; north: number; east: number } | null {
    const map = mapRef.current
    if (!map) return null
    if (mode === 'view' || !shapeRef.current) {
      const b = map.getBounds()
      return { south: b.getSouth(), west: b.getWest(), north: b.getNorth(), east: b.getEast() }
    }
    const shape = shapeRef.current as { getBounds: () => { getSouth: () => number; getWest: () => number; getNorth: () => number; getEast: () => number } }
    const b = shape.getBounds()
    return { south: b.getSouth(), west: b.getWest(), north: b.getNorth(), east: b.getEast() }
  }

  async function extractPlaces() {
    const box = boundsFromShape()
    if (!box) {
      setError('ابتدا نقشه را بارگذاری و محدوده را مشخص کنید.')
      return
    }
    const span = Math.abs(box.north - box.south) * Math.abs(box.east - box.west)
    if (span > 0.08) {
      setError('محدوده خیلی بزرگ است. زوم کنید یا محدودهٔ کوچک‌تری بکشید.')
      return
    }
    setBusy('در حال استخراج از OpenStreetMap…')
    setError('')
    setInfo('')
    try {
      const body = overpassQuery(box.south, box.west, box.north, box.east)
      const res = await fetch(OVERPASS, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
        body: `data=${encodeURIComponent(body)}`,
      })
      if (!res.ok) throw new Error('سرور Overpass پاسخ نداد.')
      const data = await res.json()
      const list = parseOverpass(data)
      setPlaces(list)
      setSelected(new Set(list.map((p) => p.id)))
      clearMarkers()
      const L = window.L
      const map = mapRef.current
      if (L && map) {
        for (const place of list.slice(0, 80)) {
          const marker = L.marker([place.lat, place.lon])
          marker.bindPopup(`<strong>${place.name}</strong><br/>${place.phone || 'بدون تلفن'}`)
          marker.addTo(map)
          markersRef.current.push(marker)
        }
      }
      setInfo(list.length ? `${list.length} مکان پیدا شد.` : 'در این محدوده مکانی با نام پیدا نشد.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'استخراج ناموفق بود.')
    } finally {
      setBusy('')
    }
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAll(on: boolean) {
    setSelected(on ? new Set(places.map((p) => p.id)) : new Set())
  }

  async function saveLeads() {
    const chosen = places.filter((p) => selected.has(p.id))
    if (!chosen.length) {
      setError('حداقل یک مورد را انتخاب کنید.')
      return
    }
    setBusy(`در حال ذخیرهٔ ${chosen.length} سرنخ…`)
    setError('')
    let ok = 0
    try {
      for (const place of chosen) {
        const { first_name, last_name } = splitPersonName(place.name)
        await createModuleRecord('Leads', {
          first_name,
          last_name,
          account_name: place.name,
          phone_work: place.phone,
          phone_mobile: place.phone,
          status: 'New',
          lead_source: 'Other',
          lead_source_description: 'استخراج از نقشه / OpenStreetMap',
          primary_address_street: place.address,
          primary_address_country: 'Iran',
          description: `مختصات: ${place.lat.toFixed(6)}, ${place.lon.toFixed(6)}\nدسته: ${place.category}`,
        })
        ok += 1
      }
      setInfo(`${ok} سرنخ ذخیره شد.`)
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : e instanceof Error ? e.message : 'ذخیره ناموفق بود.'
      setError(`${ok} مورد ذخیره شد؛ خطا: ${msg}`)
    } finally {
      setBusy('')
    }
  }

  return (
    <section className="space-y-4">
      <header className="flex flex-wrap items-center gap-2">
        <MapPin size={20} className="text-teal-700" aria-hidden />
        <h2 className="text-xl font-bold text-slate-900">استخراج لید از نقشه</h2>
        <SectionHelp topic="map-leads" />
      </header>

      <div className="rounded-2xl border border-slate-200 bg-white/70 p-4 space-y-3">
        <label className="block text-sm text-slate-700">
          کلید web نشان
          <div className="mt-1 flex flex-wrap gap-2">
            <input
              className="min-w-[16rem] flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm"
              value={draftKey}
              onChange={(e) => setDraftKey(e.target.value)}
              placeholder="Neshan Web API Key"
              dir="ltr"
            />
            <button type="button" className="rounded-xl bg-teal-700 px-4 py-2 text-sm font-semibold text-white" onClick={saveKey}>
              ذخیره و بارگذاری نقشه
            </button>
          </div>
        </label>
        <p className="text-xs text-slate-500">کلید فقط در مرورگر همین دستگاه نگه داشته می‌شود.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <ToolButton active={mode === 'rect'} onClick={() => pickMode('rect')} icon={<Square size={16} />} label="مستطیل" />
        <ToolButton active={mode === 'circle'} onClick={() => pickMode('circle')} icon={<Circle size={16} />} label="دایره" />
        <ToolButton active={mode === 'polygon'} onClick={() => pickMode('polygon')} icon={<Pentagon size={16} />} label="چندضلعی" />
        <ToolButton active={mode === 'view'} onClick={() => pickMode('view')} icon={<Eye size={16} />} label="نمای فعلی" />
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
          onClick={() => {
            clearShape()
            clearMarkers()
            setPlaces([])
            setSelected(new Set())
            setMode(null)
          }}
        >
          <Trash2 size={16} /> پاک کردن
        </button>
        <button
          type="button"
          disabled={!mapReady || Boolean(busy)}
          className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white disabled:opacity-40"
          onClick={() => void extractPlaces()}
        >
          استخراج
        </button>
        <button
          type="button"
          disabled={!selectedCount || Boolean(busy)}
          className="inline-flex items-center gap-1.5 rounded-xl bg-teal-700 px-3 py-2 text-xs font-semibold text-white disabled:opacity-40"
          onClick={() => void saveLeads()}
        >
          <Save size={16} /> ذخیره در سرنخ‌ها ({selectedCount})
        </button>
      </div>

      <p className="text-sm text-slate-600">{hint}</p>
      {busy && <p className="text-sm text-teal-800">{busy}</p>}
      {info && <p className="text-sm text-slate-700">{info}</p>}
      {error && <p className="text-sm text-rose-700">{error}</p>}

      <div ref={mapEl} className="h-[420px] w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-100" />

      {places.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white/80 p-3 space-y-2">
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="font-semibold text-slate-800">{places.length} نتیجه</span>
            <button type="button" className="text-teal-700" onClick={() => toggleAll(true)}>انتخاب همه</button>
            <button type="button" className="text-slate-600" onClick={() => toggleAll(false)}>لغو انتخاب</button>
          </div>
          <ul className="max-h-72 overflow-auto divide-y divide-slate-100">
            {places.map((place) => (
              <li key={place.id} className="flex items-start gap-3 py-2 text-sm">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={selected.has(place.id)}
                  onChange={() => toggle(place.id)}
                />
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-slate-900">{place.name}</div>
                  <div className="text-slate-600" dir="ltr">{place.phone || '—'}</div>
                  {place.address && <div className="text-xs text-slate-500">{place.address}</div>}
                </div>
                <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">{place.category}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}

function ToolButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean
  onClick: () => void
  icon: ReactNode
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold ${
        active ? 'border-teal-700 bg-teal-50 text-teal-900' : 'border-slate-200 bg-white text-slate-700'
      }`}
    >
      {icon}
      {label}
    </button>
  )
}
