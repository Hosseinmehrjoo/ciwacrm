import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  Delete, Grip, History, Mic, MicOff, Pause, Phone, PhoneForwarded,
  PhoneIncoming, PhoneOff, Play, Search, Settings, Square, UserRound, Users, Video, VideoOff, Voicemail, Volume2, VolumeX, X,
} from 'lucide-react'
import { SectionHelp } from '../help/SectionHelp'

type Presence = 'available' | 'away' | 'busy' | 'dnd'
type Tab = 'pad' | 'people' | 'history' | 'mail' | 'more'
type Phase = 'dialing' | 'ringing' | 'active' | 'held'

type Person = { ext: string, name: string, presence: Presence, dept: string }
type HistoryItem = { id: string, direction: 'in' | 'out' | 'missed', name: string, number: string, at: number, seconds: number }
type Mail = { id: string, name: string, number: string, seconds: number, at: number, heard: boolean }
type LiveCall = {
  id: string
  direction: 'in' | 'out'
  number: string
  name: string
  phase: Phase
  connectedAt: number | null
  muted: boolean
  recording: boolean
  video: boolean
  speaker: boolean
  conference: string[]
}
type Parked = { slot: string, name: string, number: string } | null

const PRESENCE: { id: Presence, label: string, color: string }[] = [
  { id: 'available', label: 'آماده', color: '#34d399' },
  { id: 'away', label: 'خارج از دسترس', color: '#fbbf24' },
  { id: 'busy', label: 'مشغول', color: '#fb7185' },
  { id: 'dnd', label: 'مزاحم نشوید', color: '#c084fc' },
]

const DIRECTORY: Person[] = [
  { ext: '100', name: 'سارا محمدی', presence: 'available', dept: 'فروش' },
  { ext: '101', name: 'حسین مهرجو', presence: 'away', dept: 'مدیریت' },
  { ext: '102', name: 'مریم کاظمی', presence: 'busy', dept: 'پشتیبانی' },
  { ext: '103', name: 'علی رضایی', presence: 'available', dept: 'مالی' },
  { ext: '104', name: 'فاطمه حسینی', presence: 'dnd', dept: 'بازاریابی' },
  { ext: '105', name: 'رضا نوری', presence: 'available', dept: 'فروش' },
  { ext: '110', name: 'صف فروش', presence: 'available', dept: 'صف' },
  { ext: '800', name: 'صندوق صوتی', presence: 'available', dept: 'سیستم' },
]

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#']
const STORAGE = 'ciwa-phone'

function fa(value: string | number) {
  return String(value).replace(/\d/g, (digit) => '۰۱۲۳۴۵۶۷۸۹'[Number(digit)])
}

function clock(totalSeconds: number) {
  const safe = Math.max(0, totalSeconds)
  const minutes = Math.floor(safe / 60)
  const seconds = safe % 60
  return fa(`${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`)
}

function lookup(number: string) {
  return DIRECTORY.find((person) => person.ext === number)?.name || number
}

function tone(frequency: number, duration = 0.08) {
  const audio = new AudioContext()
  const oscillator = audio.createOscillator()
  const gain = audio.createGain()
  oscillator.frequency.value = frequency
  gain.gain.value = 0.03
  oscillator.connect(gain).connect(audio.destination)
  oscillator.start()
  oscillator.stop(audio.currentTime + duration)
  oscillator.onended = () => void audio.close()
}

function loadHistory(): HistoryItem[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE) || '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function Softphone({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) {
  const [tab, setTab] = useState<Tab>('pad')
  const [digits, setDigits] = useState('')
  const [query, setQuery] = useState('')
  const [presence, setPresence] = useState<Presence>('available')
  const [call, setCall] = useState<LiveCall | null>(null)
  const [now, setNow] = useState(Date.now())
  const [history, setHistory] = useState<HistoryItem[]>(loadHistory)
  const [mail, setMail] = useState<Mail[]>([
    { id: 'v1', name: 'سارا محمدی', number: '100', seconds: 18, at: Date.now() - 3600_000, heard: false },
    { id: 'v2', name: 'مشتری ویترین', number: '09121001010', seconds: 26, at: Date.now() - 86_400_000, heard: true },
  ])
  const [queue, setQueue] = useState([
    { id: 'q1', name: 'مشتری ویترین', number: '09121001010' },
    { id: 'q2', name: 'شرکت آریا', number: '02188776655' },
  ])
  const [parks, setParks] = useState<Parked[]>([null, null, null, null, null])
  const [transferOpen, setTransferOpen] = useState(false)
  const [transferTo, setTransferTo] = useState('')
  const [keypadOpen, setKeypadOpen] = useState(false)
  const [conferenceOpen, setConferenceOpen] = useState(false)
  const [conferenceTo, setConferenceTo] = useState('')
  const [ringtone, setRingtone] = useState(true)
  const [notice, setNotice] = useState('')

  useEffect(() => {
    if (!call || (call.phase !== 'active' && call.phase !== 'held')) return
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [call])

  useEffect(() => {
    if (!ringtone || call?.phase !== 'ringing') return
    tone(880, 0.18)
    const timer = window.setInterval(() => tone(880, 0.18), 1400)
    return () => window.clearInterval(timer)
  }, [call?.phase, ringtone])

  useEffect(() => {
    localStorage.setItem(STORAGE, JSON.stringify(history.slice(0, 40)))
  }, [history])

  const elapsed = call?.connectedAt ? Math.floor((now - call.connectedAt) / 1000) : 0
  const people = useMemo(() => {
    const text = query.trim()
    return DIRECTORY.filter((person) => !text || person.name.includes(text) || person.ext.includes(text) || person.dept.includes(text))
  }, [query])
  const missed = history.filter((item) => item.direction === 'missed').length
  const unheard = mail.filter((item) => !item.heard).length

  function pushHistory(item: Omit<HistoryItem, 'id' | 'at'>) {
    setHistory((current) => [{ ...item, id: crypto.randomUUID(), at: Date.now() }, ...current].slice(0, 40))
  }

  function finish(direction: HistoryItem['direction'], seconds = elapsed) {
    if (!call) return
    pushHistory({ direction, name: call.name, number: call.number, seconds })
    setCall(null)
    setTransferOpen(false)
    setKeypadOpen(false)
    setConferenceOpen(false)
  }

  function startOutbound(number: string) {
    const target = number.trim()
    if (!target || call) return
    if (presence === 'dnd') {
      setNotice('وضعیت مزاحم نشوید است. برای تماس، وضعیت را عوض کنید.')
      return
    }
    const parked = parks.find((item) => item?.slot === target || item?.number === target)
    if (parked) {
      setCall({
        id: crypto.randomUUID(), direction: 'out', number: parked.number, name: parked.name,
        phase: 'active', connectedAt: Date.now(), muted: false, recording: false, video: false, speaker: true, conference: [],
      })
      setParks((current) => current.map((item) => item?.number === parked.number ? null : item))
      setTab('pad')
      setNotice('')
      return
    }
    setCall({
      id: crypto.randomUUID(), direction: 'out', number: target, name: lookup(target),
      phase: 'dialing', connectedAt: null, muted: false, recording: false, video: false, speaker: true, conference: [],
    })
    setDigits('')
    setNotice('')
    window.setTimeout(() => {
      setCall((current) => current && current.phase === 'dialing' && current.number === target
        ? { ...current, phase: 'active', connectedAt: Date.now() }
        : current)
    }, 1200)
  }

  function offerIncoming(name: string, number: string, queueId?: string) {
    if (call) {
      setNotice('اول مکالمهٔ فعلی را تمام کنید.')
      return
    }
    if (queueId) setQueue((current) => current.filter((item) => item.id !== queueId))
    setCall({
      id: crypto.randomUUID(), direction: 'in', number, name,
      phase: 'ringing', connectedAt: null, muted: false, recording: false, video: false, speaker: true, conference: [],
    })
    onOpenChange(true)
    setNotice('')
  }

  function press(key: string) {
    if (call && keypadOpen) {
      tone(440 + key.charCodeAt(0))
      setDigits((current) => (current + key).slice(0, 24))
      return
    }
    if (call) return
    tone(520 + key.charCodeAt(0))
    setDigits((current) => (current + key).slice(0, 18))
  }

  function parkCall(index: number) {
    if (!call || call.phase === 'ringing' || call.phase === 'dialing') return
    const slot = String(701 + index)
    setParks((current) => current.map((item, itemIndex) => itemIndex === index ? { slot, name: call.name, number: call.number } : item))
    pushHistory({ direction: call.direction === 'in' ? 'in' : 'out', name: call.name, number: call.number, seconds: elapsed })
    setCall(null)
    setNotice(`تماس در جایگاه ${fa(slot)} پارک شد.`)
  }

  const dockActive = call?.phase === 'active' || call?.phase === 'held' || call?.phase === 'dialing'
  const dockRinging = call?.phase === 'ringing'

  if (!open) {
    return (
      <button
        type="button"
        aria-label="باز کردن تلفن"
        onClick={() => onOpenChange(true)}
        className={`fixed bottom-4 left-4 sm:bottom-6 sm:left-6 z-40 w-14 h-14 rounded-full text-white shadow-lg grid place-items-center ${dockRinging ? 'phone-dock-ring' : ''}`}
        style={{ background: 'linear-gradient(135deg, #e879f9, #6366f1 55%, #3b82f6)' }}
      >
        {dockRinging ? <PhoneIncoming size={22} /> : <Phone size={22} />}
        {(dockActive || missed > 0 || unheard > 0) && (
          <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-rose-500 text-[10px] leading-5 text-center">
            {dockActive ? clock(elapsed) : fa(missed + unheard)}
          </span>
        )}
      </button>
    )
  }

  return (
    <section
      className="glass-card fixed bottom-3 left-3 right-3 z-40 w-auto max-h-[calc(100vh-1.5rem)] rounded-[28px] flex flex-col overflow-hidden sm:bottom-6 sm:left-6 sm:right-auto sm:w-[22.5rem] sm:max-w-[calc(100vw-3rem)] sm:max-h-[calc(100vh-3rem)]"
      style={{ fontFamily: "'Vazirmatn', sans-serif" }}
      aria-label="تلفن"
    >
      <header className="theme-banner px-4 pt-4 pb-3 flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold text-white">تلفن</p>
            <SectionHelp topic="phone" tone="banner" />
          </div>
          <p className="text-[11px] text-white/80 mt-0.5">داخلی {fa(201)} · {PRESENCE.find((item) => item.id === presence)?.label}</p>
        </div>
        <label className="text-[11px] text-white/80">
          <span className="sr-only">وضعیت حضور</span>
          <select
            value={presence}
            onChange={(event) => setPresence(event.target.value as Presence)}
            className="rounded-xl bg-white/15 border border-white/20 px-2 py-1 text-white"
          >
            {PRESENCE.map((item) => <option key={item.id} value={item.id} className="text-slate-800">{item.label}</option>)}
          </select>
        </label>
        <button type="button" aria-label="بستن" onClick={() => onOpenChange(false)} className="w-8 h-8 rounded-xl grid place-items-center text-white/90 hover:bg-white/15">
          <X size={16} />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3 min-h-0">
        {notice && <p className="text-xs text-slate-600 bg-white/40 rounded-xl px-3 py-2">{notice}</p>}
        {call && tab !== 'pad' && call.phase !== 'ringing' && (
          <button type="button" onClick={() => setTab('pad')} className="rounded-xl px-3 py-2 text-xs text-white text-right" style={{ background: 'linear-gradient(135deg,#e879f9,#6366f1)' }}>
            بازگشت به مکالمه · {call.connectedAt ? clock(elapsed) : 'در حال اتصال'}
          </button>
        )}
        {call && (tab === 'pad' || call.phase === 'ringing') ? (
          <CallStage
            call={call}
            elapsed={elapsed}
            digits={digits}
            keypadOpen={keypadOpen}
            transferOpen={transferOpen}
            transferTo={transferTo}
            conferenceOpen={conferenceOpen}
            conferenceTo={conferenceTo}
            onDigits={press}
            onBackspace={() => setDigits((current) => current.slice(0, -1))}
            onToggle={(key) => setCall((current) => current ? { ...current, [key]: !current[key] } : current)}
            onHold={() => setCall((current) => current ? { ...current, phase: current.phase === 'held' ? 'active' : 'held' } : current)}
            onHangup={() => finish(call.direction === 'in' ? 'in' : 'out')}
            onAnswer={() => setCall((current) => current ? { ...current, phase: 'active', connectedAt: Date.now() } : current)}
            onDecline={() => finish('missed', 0)}
            onKeypad={() => setKeypadOpen((current) => !current)}
            onTransfer={() => setTransferOpen((current) => !current)}
            onTransferTo={setTransferTo}
            onBlindTransfer={() => {
              if (!transferTo.trim()) return
              setNotice(`تماس به ${fa(transferTo)} منتقل شد.`)
              finish(call.direction === 'in' ? 'in' : 'out')
            }}
            onAttended={() => {
              if (!transferTo.trim()) return
              setCall((current) => current ? { ...current, phase: 'held' } : current)
              setNotice(`در حال مشاوره با ${lookup(transferTo)}. برای تکمیل، انتقال را بزنید.`)
            }}
            onConference={() => setConferenceOpen((current) => !current)}
            onConferenceTo={setConferenceTo}
            onAddConference={() => {
              const name = lookup(conferenceTo.trim())
              if (!conferenceTo.trim() || !call) return
              setCall((current) => current ? { ...current, conference: [...current.conference, name] } : current)
              setConferenceTo('')
              setConferenceOpen(false)
            }}
          />
        ) : tab === 'pad' ? (
          <Pad digits={digits} onPress={press} onBackspace={() => setDigits((current) => current.slice(0, -1))} onCall={() => startOutbound(digits)} />
        ) : tab === 'people' ? (
          <People query={query} onQuery={setQuery} people={people} onCall={(ext) => startOutbound(ext)} />
        ) : tab === 'history' ? (
          <HistoryList items={history} onCall={startOutbound} />
        ) : tab === 'mail' ? (
          <Mailbox items={mail} onToggle={(id) => setMail((current) => current.map((item) => item.id === id ? { ...item, heard: true } : item))} onCall={startOutbound} />
        ) : (
          <More
            queue={queue}
            parks={parks}
            ringtone={ringtone}
            onRingtone={setRingtone}
            onPickup={(item) => offerIncoming(item.name, item.number, item.id)}
            onPark={parkCall}
            onRetrieve={(slot) => startOutbound(slot)}
          />
        )}
      </div>

      <nav className="grid grid-cols-5 border-t border-white/10 px-1 py-1">
        <TabButton active={tab === 'pad'} label="شماره" onClick={() => setTab('pad')}>
          <Grip size={16} />
        </TabButton>
        <TabButton active={tab === 'people'} label="داخلی‌ها" onClick={() => setTab('people')}>
          <UserRound size={16} />
        </TabButton>
        <TabButton active={tab === 'history'} label="تاریخچه" badge={missed} onClick={() => setTab('history')}>
          <History size={16} />
        </TabButton>
        <TabButton active={tab === 'mail'} label="صوتی" badge={unheard} onClick={() => setTab('mail')}>
          <Voicemail size={16} />
        </TabButton>
        <TabButton active={tab === 'more'} label="بیشتر" onClick={() => setTab('more')}>
          <Settings size={16} />
        </TabButton>
      </nav>
    </section>
  )
}

function TabButton({ active, label, badge, onClick, children }: { active: boolean, label: string, badge?: number, onClick: () => void, children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} className={`relative flex flex-col items-center gap-0.5 py-2 text-[10px] ${active ? 'text-violet-600' : 'text-slate-400'}`}>
      {children}
      {label}
      {badge ? <span className="absolute top-1 left-3 min-w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] leading-4 px-1">{fa(badge)}</span> : null}
    </button>
  )
}

function Pad({ digits, onPress, onBackspace, onCall }: { digits: string, onPress: (key: string) => void, onBackspace: () => void, onCall: () => void }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="h-12 flex items-center justify-center gap-2">
        <p className="text-2xl font-semibold tracking-widest text-slate-800 min-h-8">{digits ? fa(digits) : <span className="text-sm text-slate-400 font-normal">شماره یا داخلی</span>}</p>
        {digits && <button type="button" aria-label="پاک کردن" onClick={onBackspace} className="text-slate-400"><Delete size={16} /></button>}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {KEYS.map((key) => (
          <button key={key} type="button" onClick={() => onPress(key)} className="h-12 rounded-2xl bg-white/40 text-lg font-semibold text-slate-800 hover:bg-white/70">
            {fa(key)}
          </button>
        ))}
      </div>
      <button type="button" onClick={onCall} className="h-12 rounded-2xl text-white font-semibold flex items-center justify-center gap-2" style={{ background: 'linear-gradient(135deg, #34d399, #059669)' }}>
        <Phone size={16} /> تماس
      </button>
    </div>
  )
}

function People({ query, onQuery, people, onCall }: { query: string, onQuery: (value: string) => void, people: Person[], onCall: (ext: string) => void }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input value={query} onChange={(event) => onQuery(event.target.value)} placeholder="جستجوی داخلی" aria-label="جستجوی داخلی" className="glass-input w-full rounded-xl pr-8 pl-3 py-2 text-sm" />
      </div>
      {people.map((person) => (
        <div key={person.ext} className="flex items-center gap-2 rounded-xl px-1 py-1">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: PRESENCE.find((item) => item.id === person.presence)?.color }} />
          <div className="min-w-0 flex-1">
            <p className="text-sm text-slate-800 truncate">{person.name}</p>
            <p className="text-[11px] text-slate-400">{person.dept} · {fa(person.ext)}</p>
          </div>
          <button type="button" aria-label={`تماس با ${person.name}`} onClick={() => onCall(person.ext)} className="w-8 h-8 rounded-full grid place-items-center text-white" style={{ background: 'linear-gradient(135deg, #34d399, #059669)' }}>
            <Phone size={14} />
          </button>
        </div>
      ))}
    </div>
  )
}

function HistoryList({ items, onCall }: { items: HistoryItem[], onCall: (number: string) => void }) {
  if (!items.length) return <p className="text-sm text-slate-500 text-center py-8">تاریخچه‌ای نیست.</p>
  return (
    <div className="flex flex-col gap-1">
      {items.map((item) => (
        <button key={item.id} type="button" onClick={() => onCall(item.number)} className="flex items-center gap-2 rounded-xl px-1 py-2 text-right hover:bg-white/40">
          {item.direction === 'missed' ? <PhoneIncoming size={15} className="text-rose-500" /> : item.direction === 'in' ? <PhoneIncoming size={15} className="text-emerald-500" /> : <Phone size={15} className="text-sky-500" />}
          <span className="min-w-0 flex-1">
            <span className={`block text-sm truncate ${item.direction === 'missed' ? 'text-rose-600' : 'text-slate-800'}`}>{item.name}</span>
            <span className="block text-[11px] text-slate-400">{fa(item.number)} · {clock(item.seconds)}</span>
          </span>
        </button>
      ))}
    </div>
  )
}

function Mailbox({ items, onToggle, onCall }: { items: Mail[], onToggle: (id: string) => void, onCall: (number: string) => void }) {
  return (
    <div className="flex flex-col gap-2">
      {items.map((item) => (
        <article key={item.id} className="rounded-xl border border-white/20 px-3 py-2 flex items-center gap-2">
          <button type="button" aria-label="پخش پیام" onClick={() => onToggle(item.id)} className="w-8 h-8 rounded-full grid place-items-center text-white" style={{ background: item.heard ? 'rgba(148,163,184,0.7)' : 'linear-gradient(135deg,#e879f9,#6366f1)' }}>
            <Play size={14} />
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-sm text-slate-800 truncate">{item.name}</p>
            <p className="text-[11px] text-slate-400">{fa(item.number)} · {clock(item.seconds)}{item.heard ? ' · شنیده شد' : ''}</p>
          </div>
          <button type="button" aria-label="تماس برگشتی" onClick={() => onCall(item.number)} className="text-slate-400"><Phone size={15} /></button>
        </article>
      ))}
    </div>
  )
}

function More({
  queue, parks, ringtone, onRingtone, onPickup, onPark, onRetrieve,
}: {
  queue: { id: string, name: string, number: string }[]
  parks: Parked[]
  ringtone: boolean
  onRingtone: (value: boolean) => void
  onPickup: (item: { id: string, name: string, number: string }) => void
  onPark: (index: number) => void
  onRetrieve: (slot: string) => void
}) {
  return (
    <div className="flex flex-col gap-4 text-sm">
      <div>
        <p className="text-xs font-semibold text-slate-500 mb-2">صف انتظار</p>
        {queue.length === 0 && <p className="text-xs text-slate-400">صف خالی است.</p>}
        {queue.map((item) => (
          <div key={item.id} className="flex items-center gap-2 py-1">
            <div className="flex-1 min-w-0">
              <p className="text-slate-800 truncate">{item.name}</p>
              <p className="text-[11px] text-slate-400">{fa(item.number)}</p>
            </div>
            <button type="button" onClick={() => onPickup(item)} className="px-2 py-1 rounded-lg text-xs text-white" style={{ background: 'linear-gradient(135deg,#34d399,#059669)' }}>پاسخ</button>
          </div>
        ))}
      </div>
      <div>
        <p className="text-xs font-semibold text-slate-500 mb-2">پارک تماس</p>
        <div className="grid grid-cols-5 gap-1">
          {parks.map((item, index) => (
            <button key={701 + index} type="button" onClick={() => item ? onRetrieve(item.slot) : onPark(index)} className="h-12 rounded-xl text-[11px] bg-white/40 text-slate-700">
              {fa(701 + index)}
              <span className="block text-[10px] text-slate-400">{item ? 'بردار' : 'پارک'}</span>
            </button>
          ))}
        </div>
      </div>
      <label className="flex items-center justify-between text-slate-700">
        زنگ تماس
        <input type="checkbox" checked={ringtone} onChange={(event) => onRingtone(event.target.checked)} />
      </label>
      <p className="text-[11px] text-slate-400 leading-5">بی‌صدا، نگه‌داشتن، انتقال مستقیم و با مشاوره، کنفرانس، ضبط، صف و صندوق صوتی از همین پنجره در دسترس است.</p>
    </div>
  )
}

function CallStage(props: {
  call: LiveCall
  elapsed: number
  digits: string
  keypadOpen: boolean
  transferOpen: boolean
  transferTo: string
  conferenceOpen: boolean
  conferenceTo: string
  onDigits: (key: string) => void
  onBackspace: () => void
  onToggle: (key: 'muted' | 'recording' | 'video' | 'speaker') => void
  onHold: () => void
  onHangup: () => void
  onAnswer: () => void
  onDecline: () => void
  onKeypad: () => void
  onTransfer: () => void
  onTransferTo: (value: string) => void
  onBlindTransfer: () => void
  onAttended: () => void
  onConference: () => void
  onConferenceTo: (value: string) => void
  onAddConference: () => void
}) {
  const { call } = props
  const title = call.phase === 'dialing' ? 'در حال شماره‌گیری' : call.phase === 'ringing' ? 'تماس ورودی' : call.phase === 'held' ? 'در حالت انتظار' : 'در حال مکالمه'
  return (
    <div className="flex flex-col gap-3">
      <div className="text-center py-2">
        <p className="text-xs text-slate-400">{title}{call.recording ? ' · در حال ضبط' : ''}</p>
        <p className="text-lg font-bold text-slate-800 mt-1">{call.name}</p>
        <p className="text-sm text-slate-500">{fa(call.number)}</p>
        <p className="text-sm font-semibold text-violet-600 mt-1">{call.connectedAt ? clock(props.elapsed) : '...'}</p>
        {call.conference.length > 0 && <p className="text-[11px] text-slate-400 mt-1">کنفرانس: {call.conference.join('، ')}</p>}
      </div>
      {call.phase === 'ringing' ? (
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={props.onDecline} className="h-11 rounded-2xl bg-rose-600 text-white text-sm font-semibold flex items-center justify-center gap-1"><PhoneOff size={15} /> رد</button>
          <button type="button" onClick={props.onAnswer} className="h-11 rounded-2xl text-white text-sm font-semibold flex items-center justify-center gap-1" style={{ background: 'linear-gradient(135deg,#34d399,#059669)' }}><Phone size={15} /> پاسخ</button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-4 gap-2 justify-items-center">
            <Mini label={call.muted ? 'وصل صدا' : 'بی‌صدا'} onClick={() => props.onToggle('muted')}>{call.muted ? <MicOff size={16} /> : <Mic size={16} />}</Mini>
            <Mini label={call.phase === 'held' ? 'ادامه' : 'انتظار'} onClick={props.onHold}>{call.phase === 'held' ? <Play size={16} /> : <Pause size={16} />}</Mini>
            <Mini label="انتقال" onClick={props.onTransfer}><PhoneForwarded size={16} /></Mini>
            <Mini label="کنفرانس" onClick={props.onConference}><Users size={16} /></Mini>
            <Mini label={call.recording ? 'توقف ضبط' : 'ضبط'} onClick={() => props.onToggle('recording')}>{call.recording ? <Square size={16} /> : <span className="w-3 h-3 rounded-full bg-rose-500 inline-block" />}</Mini>
            <Mini label="صفحه کلید" onClick={props.onKeypad}><Grip size={16} /></Mini>
            <Mini label="ویدیو" onClick={() => props.onToggle('video')}>{call.video ? <Video size={16} /> : <VideoOff size={16} />}</Mini>
            <Mini label="بلندگو" onClick={() => props.onToggle('speaker')}>{call.speaker ? <Volume2 size={16} /> : <VolumeX size={16} />}</Mini>
          </div>
          {props.keypadOpen && (
            <div className="grid grid-cols-3 gap-1">
              {KEYS.map((key) => (
                <button key={key} type="button" onClick={() => props.onDigits(key)} className="h-9 rounded-xl bg-white/40 text-slate-800">{fa(key)}</button>
              ))}
              <p className="col-span-2 text-center text-sm text-slate-600 self-center">{props.digits ? fa(props.digits) : 'DTMF'}</p>
              <button type="button" aria-label="پاک کردن رقم" onClick={props.onBackspace} className="h-9 rounded-xl bg-white/40 text-slate-500"><Delete size={14} className="mx-auto" /></button>
            </div>
          )}
          {props.transferOpen && (
            <div className="flex flex-col gap-2">
              <input value={props.transferTo} onChange={(event) => props.onTransferTo(event.target.value)} placeholder="داخلی مقصد" aria-label="داخلی مقصد" className="glass-input rounded-xl px-3 py-2 text-sm" />
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={props.onBlindTransfer} className="h-9 rounded-xl bg-white/50 text-xs text-slate-700">انتقال مستقیم</button>
                <button type="button" onClick={props.onAttended} className="h-9 rounded-xl bg-white/50 text-xs text-slate-700">انتقال با مشاوره</button>
              </div>
            </div>
          )}
          {props.conferenceOpen && (
            <div className="flex gap-2">
              <input value={props.conferenceTo} onChange={(event) => props.onConferenceTo(event.target.value)} placeholder="داخلی مهمان" aria-label="داخلی مهمان" className="glass-input flex-1 rounded-xl px-3 py-2 text-sm" />
              <button type="button" onClick={props.onAddConference} className="px-3 rounded-xl text-xs text-white" style={{ background: 'linear-gradient(135deg,#e879f9,#6366f1)' }}>افزودن</button>
            </div>
          )}
          {call.phase !== 'dialing' && (
            <button type="button" onClick={props.onHangup} className="h-11 rounded-2xl bg-rose-600 text-white text-sm font-semibold flex items-center justify-center gap-1">
              <PhoneOff size={15} /> قطع
            </button>
          )}
          {call.phase === 'dialing' && (
            <button type="button" onClick={props.onHangup} className="h-11 rounded-2xl bg-rose-600 text-white text-sm font-semibold">لغو</button>
          )}
        </>
      )}
    </div>
  )
}

function Mini({ label, onClick, children }: { label: string, onClick: () => void, children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="w-14 flex flex-col items-center gap-1 text-[10px] text-slate-500">
      <span className="w-10 h-10 rounded-full grid place-items-center bg-white/50 text-slate-700">{children}</span>
      {label}
    </button>
  )
}
