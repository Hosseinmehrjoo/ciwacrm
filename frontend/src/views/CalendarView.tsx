import { useEffect, useMemo, useState } from 'react'
import { ApiError } from '../api/client'
import { listModule, type CrmRecord } from '../api/records'
import { useSession } from '../auth/SessionProvider'
import { SectionHelp } from '../help/SectionHelp'

const weekdays = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج']

type CalendarItem = { id: string; title: string; kind: string; day: string }

function tehranDay(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tehran', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date)
}

function persianParts(date: Date) {
  const parts = new Intl.DateTimeFormat('en-US-u-ca-persian', {
    timeZone: 'Asia/Tehran',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).formatToParts(date)
  const read = (type: string) => Number(parts.find((part) => part.type === type)?.value || '0')
  return { year: read('year'), month: read('month'), day: read('day') }
}

function monthTitle(date: Date) {
  return new Intl.DateTimeFormat('fa-IR-u-ca-persian', { timeZone: 'Asia/Tehran', month: 'long', year: 'numeric' }).format(date)
}

function monthGrid(anchor: Date) {
  const target = persianParts(anchor)
  const cursor = new Date(anchor)
  cursor.setHours(12, 0, 0, 0)
  while (true) {
    const parts = persianParts(cursor)
    if (parts.year !== target.year || parts.month !== target.month) break
    cursor.setDate(cursor.getDate() - 1)
  }
  cursor.setDate(cursor.getDate() + 1)
  const weekday = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: 'Asia/Tehran' }).format(cursor)
  const offset = ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'].indexOf(weekday)
  const start = new Date(cursor)
  start.setDate(cursor.getDate() - (offset < 0 ? 0 : offset))
  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(start)
    day.setDate(start.getDate() + index)
    return day
  })
}

async function loadKind(module: string, fields: string, title: string, dateField: string, kind: string) {
  const params = new URLSearchParams()
  params.set('page[size]', '100')
  params.set(`fields[${module}]`, fields)
  const result = await listModule(module, params, true)
  return result.records.flatMap((record) => {
    const day = tehranDay(record.attributes[dateField] || '')
    if (!day) return []
    return [{ id: `${kind}-${record.id}`, title: record.attributes[title] || kind, kind, day }]
  })
}

export function CalendarView({ onOpen }: { onOpen: (id: string) => void }) {
  const session = useSession()
  const [anchor, setAnchor] = useState(() => new Date())
  const [items, setItems] = useState<CalendarItem[]>([])
  const [error, setError] = useState('')
  const cells = useMemo(() => monthGrid(anchor), [anchor])
  const current = persianParts(anchor)

  useEffect(() => {
    if (session.demo) return
    let active = true
    Promise.all([
      loadKind('Meetings', 'name,date_start', 'name', 'date_start', 'قرار'),
      loadKind('Calls', 'name,date_start', 'name', 'date_start', 'تماس'),
      loadKind('Tasks', 'name,date_due', 'name', 'date_due', 'وظیفه'),
    ])
      .then((groups) => {
        if (active) setItems(groups.flat())
      })
      .catch((caught: unknown) => {
        if (!active) return
        if (caught instanceof ApiError && caught.status === 401) {
          void session.logout()
          return
        }
        setError(caught instanceof ApiError ? caught.message : 'خواندن تقویم ناموفق بود.')
      })
    return () => {
      active = false
    }
  }, [session.demo, session.logout])

  function shift(months: number) {
    const next = new Date(anchor)
    next.setHours(12, 0, 0, 0)
    const step = months > 0 ? 1 : -1
    let left = Math.abs(months)
    let guard = 0
    let mark = persianParts(next)
    while (left > 0 && guard < 400) {
      next.setDate(next.getDate() + step)
      const parts = persianParts(next)
      if (parts.year !== mark.year || parts.month !== mark.month) {
        mark = parts
        left -= 1
      }
      guard += 1
    }
    setAnchor(next)
  }

  return (
    <section className="glass-card rounded-2xl p-4 sm:p-5 flex flex-col gap-4 min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-slate-800">تقویم</h2>
          <SectionHelp topic="calendar" />
        </div>
        <div className="flex items-center gap-2">
          <button type="button" className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm text-slate-700" onClick={() => shift(-1)}>ماه قبل</button>
          <p className="min-w-28 text-center text-sm font-semibold text-slate-800">{monthTitle(anchor)}</p>
          <button type="button" className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm text-slate-700" onClick={() => shift(1)}>ماه بعد</button>
        </div>
      </div>
      {session.demo && <p className="text-sm text-slate-600">تقویم وقتی هسته در دسترس باشد قرارها، تماس‌ها و وظایف را نشان می‌دهد.</p>}
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      {!session.demo && (
        <>
          <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-slate-500">
            {weekdays.map((day) => <span key={day}>{day}</span>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((day) => {
              const parts = persianParts(day)
              const inMonth = parts.year === current.year && parts.month === current.month
              const key = tehranDay(day.toISOString())
              const events = items.filter((item) => item.day === key)
              return (
                <div key={day.toISOString()} className={`min-h-16 rounded-xl border p-1 ${inMonth ? 'border-slate-200 bg-white' : 'border-transparent bg-slate-50/40'}`}>
                  <p className={`text-[11px] ${inMonth ? 'text-slate-700' : 'text-slate-400'}`}>{parts.day.toLocaleString('fa-IR')}</p>
                  {events.slice(0, 2).map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className="mt-1 block w-full truncate rounded-md border border-slate-200 bg-slate-50 px-1 text-right text-[10px] text-slate-800"
                      onClick={() => onOpen(item.kind === 'وظیفه' ? 'tasks' : item.kind === 'تماس' ? 'calls' : 'meetings')}
                    >
                      {item.kind}: {item.title}
                    </button>
                  ))}
                  {events.length > 2 && <p className="text-[10px] text-slate-500">+{(events.length - 2).toLocaleString('fa-IR')}</p>}
                </div>
              )
            })}
          </div>
        </>
      )}
    </section>
  )
}
