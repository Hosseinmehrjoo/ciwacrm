import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import JsSIP from 'jssip'
import {
  Delete, Grip, History, Mic, MicOff, Pause, Phone, PhoneIncoming, PhoneOff,
  Play, Search, Settings, UserRound, X,
} from 'lucide-react'
import {
  getPhoneCredentials,
  getPhoneSettings,
  getPhoneStatus,
  listPhoneCdr,
  listPhoneExtensions,
  originatePhoneCall,
  savePhoneSettings,
  type PhoneCdr,
  type PhonePerson,
  type PhoneSettings,
} from '../addons/phoneApi'
import { ApiError } from '../api/client'
import { listContacts } from '../api/records'
import { SectionHelp } from '../help/SectionHelp'

type Tab = 'pad' | 'people' | 'history' | 'settings'
type Phase = 'dialing' | 'ringing' | 'active' | 'held'
type LiveCall = {
  id: string
  direction: 'in' | 'out'
  number: string
  name: string
  phase: Phase
  connectedAt: number | null
  muted: boolean
  speaker: boolean
  mode: 'originate' | 'webrtc' | 'local'
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#']
const HISTORY_KEY = 'ciwa-phone-history'
const LETTERS: Record<string, string> = {
  '2': 'ABC', '3': 'DEF', '4': 'GHI', '5': 'JKL', '6': 'MNO', '7': 'PQRS', '8': 'TUV', '9': 'WXYZ',
}

function fa(value: string | number) {
  return String(value).replace(/\d/g, (digit) => '۰۱۲۳۴۵۶۷۸۹'[Number(digit)])
}

function normalizeDial(value: string | undefined | null) {
  return String(value || '').replace(/[^\d+*#]/g, '').replace(/^00/, '+').slice(0, 24)
}

function clock(totalSeconds: number) {
  const safe = Math.max(0, totalSeconds)
  return fa(`${String(Math.floor(safe / 60)).padStart(2, '0')}:${String(safe % 60).padStart(2, '0')}`)
}

function tone(frequency: number, duration = 0.07) {
  try {
    const audio = new AudioContext()
    const oscillator = audio.createOscillator()
    const gain = audio.createGain()
    oscillator.frequency.value = frequency
    gain.gain.value = 0.03
    oscillator.connect(gain).connect(audio.destination)
    oscillator.start()
    oscillator.stop(audio.currentTime + duration)
    oscillator.onended = () => void audio.close()
  } catch {
    /* ignore */
  }
}

function loadLocalHistory(): PhoneCdr[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function emptySettings(): PhoneSettings {
  return {
    apiUrl: 'http://127.0.0.1:8788',
    extension: '',
    secret: '',
    displayName: '',
    sipHost: '',
    wssUrl: '',
    mode: 'originate',
    hasSecret: false,
  }
}

export function Softphone({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) {
  const [tab, setTab] = useState<Tab>('pad')
  const [digits, setDigits] = useState('')
  const [query, setQuery] = useState('')
  const [call, setCall] = useState<LiveCall | null>(null)
  const [now, setNow] = useState(Date.now())
  const [clockText, setClockText] = useState('')
  const [history, setHistory] = useState<PhoneCdr[]>(loadLocalHistory)
  const [people, setPeople] = useState<PhonePerson[]>([])
  const [settings, setSettings] = useState<PhoneSettings>(emptySettings)
  const [draft, setDraft] = useState<PhoneSettings>(emptySettings)
  const [statusLine, setStatusLine] = useState('در حال اتصال به CIWA Telecom...')
  const [registered, setRegistered] = useState(false)
  const [notice, setNotice] = useState('')
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const uaRef = useRef<InstanceType<typeof JsSIP.UA> | null>(null)
  const sessionRef = useRef<any>(null)
  const remoteAudio = useRef<HTMLAudioElement | null>(null)

  const elapsed = call?.connectedAt ? Math.floor((now - call.connectedAt) / 1000) : 0
  const missed = history.filter((item) => item.direction === 'in' && item.disposition === 'missed').length
  const filteredPeople = useMemo(() => {
    const text = query.trim()
    return people.filter((person) => {
      if (!text) return true
      return person.name.includes(text)
        || person.number.includes(text)
        || (person.subtitle || '').includes(text)
    })
  }, [people, query])

  useEffect(() => {
    remoteAudio.current = new Audio()
    remoteAudio.current.autoplay = true
    return () => {
      remoteAudio.current?.pause()
      remoteAudio.current = null
      stopUa()
    }
  }, [])

  useEffect(() => {
    const tick = () => {
      setClockText(new Intl.DateTimeFormat('fa-IR', { hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date()))
      setNow(Date.now())
    }
    tick()
    const timer = window.setInterval(tick, 1000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 40)))
  }, [history])

  useEffect(() => {
    void bootstrap()
  }, [])

  useEffect(() => {
    if (tab !== 'people') return
    let active = true
    const timer = window.setTimeout(() => {
      void loadDirectory(query).then((items) => {
        if (active) setPeople(items)
      }).catch(() => undefined)
    }, 280)
    return () => {
      active = false
      window.clearTimeout(timer)
    }
  }, [query, tab])

  useEffect(() => {
    if (!call || (call.phase !== 'active' && call.phase !== 'held')) return
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [call])

  useEffect(() => {
    if (call?.phase !== 'ringing') return
    tone(880, 0.16)
    const timer = window.setInterval(() => tone(880, 0.16), 1400)
    return () => window.clearInterval(timer)
  }, [call?.phase])

  async function bootstrap() {
    try {
      const current = await getPhoneSettings()
      setSettings(current)
      setDraft({ ...current, secret: '' })
      await refreshLink(current)
    } catch (caught) {
      setStatusLine(caught instanceof ApiError ? caught.message : 'تنظیمات تلفن خوانده نشد.')
    }
  }

  async function refreshLink(current = settings) {
    try {
      const status = await getPhoneStatus()
      const connected = status.telecom?.connected
      const amiError = status.telecom?.amiError
      if (!status.configured) setStatusLine('داخلی و نشانی CIWA Telecom را در تنظیمات وارد کنید.')
      else if (connected) setStatusLine(`وصل به ${status.telecom.product || 'CIWA Telecom'} · هسته آماده`)
      else setStatusLine(`API وصل است · هسته: ${amiError || 'قطع'}`)
      setPeople(await loadDirectory())
      const cdr = await listPhoneCdr().catch(() => ({ items: [] as PhoneCdr[] }))
      if (cdr.items?.length) {
        setHistory((local) => {
          const merged = [...cdr.items, ...local]
          const seen = new Set<string>()
          return merged.filter((item) => {
            const key = `${item.number}-${item.at}`
            if (seen.has(key)) return false
            seen.add(key)
            return true
          }).slice(0, 40)
        })
      }
      if (current.mode === 'webrtc' && current.extension && current.hasSecret) {
        await startUa()
      } else {
        stopUa()
        setRegistered(false)
      }
    } catch (caught) {
      setStatusLine(caught instanceof ApiError ? caught.message : 'CIWA Telecom در دسترس نیست.')
      setPeople(await loadDirectory().catch(() => []))
      stopUa()
      setRegistered(false)
    }
  }

  async function loadDirectory(search = query): Promise<PhonePerson[]> {
    const contacts = await listContacts({ page: 1, query: search, size: 100 }).catch(() => ({ records: [] as Awaited<ReturnType<typeof listContacts>>['records'] }))
    const fromCrm: PhonePerson[] = contacts.records.flatMap((record) => {
      const name = [record.attributes.first_name, record.attributes.last_name].filter(Boolean).join(' ').trim() || 'بدون نام'
      const phones = [record.attributes.phone_mobile, record.attributes.phone_work]
        .map((value) => normalizeDial(value))
        .filter(Boolean)
      const unique = [...new Set(phones)]
      if (!unique.length) {
        return [{
          id: `contact-${record.id}`,
          number: '',
          name,
          kind: 'contact' as const,
          subtitle: record.attributes.title || record.attributes.email1 || 'بدون شماره',
        }]
      }
      return unique.map((number, index) => ({
        id: `contact-${record.id}-${index}`,
        number,
        name,
        kind: 'contact' as const,
        subtitle: number === normalizeDial(record.attributes.phone_mobile) ? 'موبایل' : 'تلفن',
      }))
    })

    const directory = await listPhoneExtensions().catch(() => ({ items: [] as PhonePerson[] }))
    const fromExt: PhonePerson[] = (directory.items || []).map((item) => ({
      ...item,
      kind: 'extension' as const,
      subtitle: item.subtitle || 'داخلی مرکز تلفن',
    }))

    const seen = new Set<string>()
    return [...fromCrm, ...fromExt].filter((person) => {
      const key = `${person.kind}-${person.number || person.id}-${person.name}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }

  function stopUa() {
    try { sessionRef.current?.terminate?.() } catch { /* ignore */ }
    sessionRef.current = null
    try { uaRef.current?.stop() } catch { /* ignore */ }
    uaRef.current = null
    setRegistered(false)
  }

  async function startUa() {
    stopUa()
    const credentials = await getPhoneCredentials()
    if (credentials.mode !== 'webrtc') return
    const socket = new JsSIP.WebSocketInterface(credentials.wssUrl)
    const ua = new JsSIP.UA({
      sockets: [socket],
      uri: credentials.sipUri,
      password: credentials.secret,
      display_name: credentials.displayName,
      register: true,
      session_timers: false,
    })
    ua.on('registered', () => {
      setRegistered(true)
      setStatusLine(`WebRTC ثبت شد · داخلی ${fa(credentials.extension)}`)
    })
    ua.on('unregistered', () => setRegistered(false))
    ua.on('registrationFailed', (event: { cause?: string }) => {
      setRegistered(false)
      setStatusLine(`ثبت WebRTC ناموفق: ${event.cause || 'خطا'}`)
    })
    ua.on('newRTCSession', (event: { originator: string, session: any }) => {
      const session = event.session
      sessionRef.current = session
      bindSession(session)
      if (event.originator === 'remote') {
        const number = String(session.remote_identity?.uri?.user || '')
        setCall({
          id: crypto.randomUUID(),
          direction: 'in',
          number,
          name: lookup(number),
          phase: 'ringing',
          connectedAt: null,
          muted: false,
          speaker: true,
          mode: 'webrtc',
        })
        onOpenChange(true)
        setTab('pad')
      }
    })
    ua.start()
    uaRef.current = ua
  }

  function bindSession(session: any) {
    session.on('peerconnection', (data: { peerconnection: RTCPeerConnection }) => {
      data.peerconnection.addEventListener('track', (event) => {
        if (remoteAudio.current && event.streams[0]) {
          remoteAudio.current.srcObject = event.streams[0]
          void remoteAudio.current.play().catch(() => undefined)
        }
      })
    })
    session.on('accepted', () => {
      setCall((current) => current ? { ...current, phase: 'active', connectedAt: Date.now() } : current)
    })
    session.on('confirmed', () => {
      setCall((current) => current ? { ...current, phase: 'active', connectedAt: current.connectedAt || Date.now() } : current)
    })
    session.on('ended', () => finishCurrent('out'))
    session.on('failed', () => finishCurrent('missed'))
  }

  function lookup(number: string) {
    return people.find((person) => person.number === number)?.name || number
  }

  function pushHistory(item: Omit<PhoneCdr, 'id'>) {
    setHistory((current) => [{ ...item, id: crypto.randomUUID() }, ...current].slice(0, 40))
  }

  function finishCurrent(direction: 'in' | 'out' | 'missed') {
    setCall((current) => {
      if (!current) return null
      pushHistory({
        name: current.name,
        number: current.number,
        direction: direction === 'missed' ? 'in' : current.direction,
        seconds: current.connectedAt ? Math.floor((Date.now() - current.connectedAt) / 1000) : 0,
        at: Date.now(),
        disposition: direction === 'missed' ? 'missed' : 'answered',
      })
      return null
    })
    sessionRef.current = null
  }

  async function startOutbound(number: string) {
    const target = normalizeDial(number)
    if (!target || call) {
      if (!target) setNotice('برای این مخاطب شماره‌ای ثبت نشده است.')
      return
    }
    const name = lookup(target)
    setDigits('')
    setNotice('')
    setTab('pad')

    if (settings.mode === 'webrtc' && uaRef.current && registered) {
      const credentials = await getPhoneCredentials()
      const session = uaRef.current.call(`sip:${target}@${credentials.sipHost}`, {
        mediaConstraints: { audio: true, video: false },
        pcConfig: { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] },
      })
      sessionRef.current = session
      bindSession(session)
      setCall({
        id: crypto.randomUUID(), direction: 'out', number: target, name,
        phase: 'dialing', connectedAt: null, muted: false, speaker: true, mode: 'webrtc',
      })
      return
    }

    if (settings.extension && settings.apiUrl) {
      setCall({
        id: crypto.randomUUID(), direction: 'out', number: target, name,
        phase: 'dialing', connectedAt: null, muted: false, speaker: true, mode: 'originate',
      })
      try {
        await originatePhoneCall(target)
        setCall((current) => current && current.number === target
          ? { ...current, phase: 'active', connectedAt: Date.now() }
          : current)
        setNotice(`تماس از داخلی ${fa(settings.extension)} در CIWA Telecom شروع شد. گوشی یا کلاینت همان داخلی را بردارید.`)
      } catch (caught) {
        setCall(null)
        setNotice(caught instanceof ApiError ? caught.message : 'شروع تماس از مرکز تلفن ناموفق بود.')
      }
      return
    }

    setCall({
      id: crypto.randomUUID(), direction: 'out', number: target, name,
      phase: 'dialing', connectedAt: null, muted: false, speaker: true, mode: 'local',
    })
    setNotice('تنظیمات CIWA Telecom کامل نیست؛ این تماس فقط محلی است.')
    window.setTimeout(() => {
      setCall((current) => current && current.phase === 'dialing' && current.number === target
        ? { ...current, phase: 'active', connectedAt: Date.now() }
        : current)
    }, 900)
  }

  function hangup() {
    try { sessionRef.current?.terminate?.() } catch { /* ignore */ }
    finishCurrent(call?.direction === 'in' ? 'in' : 'out')
  }

  function press(key: string) {
    if (call && call.phase !== 'ringing') {
      tone(440 + key.charCodeAt(0))
      try { sessionRef.current?.sendDTMF?.(key) } catch { /* ignore */ }
      return
    }
    if (call) return
    tone(520 + key.charCodeAt(0))
    setDigits((current) => (current + key).slice(0, 18))
  }

  async function saveSettingsForm() {
    setSaving(true)
    setNotice('')
    try {
      const payload: Partial<PhoneSettings> = {
        apiUrl: draft.apiUrl,
        extension: draft.extension,
        displayName: draft.displayName,
        sipHost: draft.sipHost,
        wssUrl: draft.wssUrl,
        mode: draft.mode,
      }
      if (draft.secret && draft.secret !== '********') payload.secret = draft.secret
      const saved = await savePhoneSettings(payload)
      setSettings(saved)
      setDraft({ ...saved, secret: '' })
      setNotice('تنظیمات CIWA Telecom ذخیره شد.')
      await refreshLink(saved)
    } catch (caught) {
      setNotice(caught instanceof ApiError ? caught.message : 'ذخیره تنظیمات ناموفق بود.')
    } finally {
      setSaving(false)
    }
  }

  async function testSettings() {
    setTesting(true)
    setNotice('')
    try {
      if (draft.apiUrl !== settings.apiUrl || draft.extension !== settings.extension) {
        await saveSettingsForm()
      }
      await refreshLink()
      setNotice('آزمایش اتصال انجام شد.')
    } finally {
      setTesting(false)
    }
  }

  const dockActive = call?.phase === 'active' || call?.phase === 'held' || call?.phase === 'dialing'
  const dockRinging = call?.phase === 'ringing'

  if (!open) {
    return (
      <button
        type="button"
        aria-label="باز کردن تلفن"
        onClick={() => onOpenChange(true)}
        className={`iphone-dock phone-dock fixed bottom-4 left-4 sm:bottom-6 sm:left-6 z-40 ${dockRinging ? 'phone-dock-ring' : ''}`}
      >
        <span className="iphone-dock-screen">
          {dockRinging ? <PhoneIncoming size={20} /> : <Phone size={20} />}
        </span>
        {(dockActive || missed > 0) && (
          <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-[#ff3b30] text-[10px] leading-5 text-center text-white">
            {dockActive ? clock(elapsed) : fa(missed)}
          </span>
        )}
      </button>
    )
  }

  return (
    <section className="iphone-frame fixed bottom-3 left-3 right-3 z-40 mx-auto w-auto max-w-[22rem] sm:bottom-6 sm:left-6 sm:right-auto sm:mx-0" aria-label="تلفن">
      <div className="iphone-bezel">
        <div className="iphone-island" aria-hidden="true" />
        <div className="iphone-status">
          <span>{clockText || '—'}</span>
          <span className="iphone-status-right">
            <span className={`iphone-signal ${registered || settings.extension ? 'on' : ''}`} />
            <span className="iphone-wifi" aria-hidden="true" />
            <span className="iphone-battery" />
          </span>
        </div>

        <div className="iphone-screen">
          <header className="flex items-center justify-between px-1 pb-2">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-[15px] font-semibold text-white">تلفن</p>
                <SectionHelp topic="phone" tone="banner" />
              </div>
              <p className="text-[10px] text-white/55 mt-0.5 truncate">{statusLine}</p>
            </div>
            <button type="button" aria-label="بستن" onClick={() => onOpenChange(false)} className="w-8 h-8 rounded-full bg-white/10 text-white/80 grid place-items-center">
              <X size={14} />
            </button>
          </header>

          {notice && <p className="mb-2 rounded-2xl bg-white/10 px-3 py-2 text-[11px] leading-5 text-white/80">{notice}</p>}

          <div className="flex-1 min-h-0 overflow-y-auto">
            {call && (tab === 'pad' || call.phase === 'ringing') ? (
              <CallStage
                call={call}
                elapsed={elapsed}
                onMute={() => {
                  const next = !call.muted
                  try {
                    if (next) sessionRef.current?.mute?.({ audio: true })
                    else sessionRef.current?.unmute?.({ audio: true })
                  } catch { /* ignore */ }
                  setCall({ ...call, muted: next })
                }}
                onHold={() => setCall({ ...call, phase: call.phase === 'held' ? 'active' : 'held' })}
                onHangup={hangup}
                onAnswer={() => {
                  try { sessionRef.current?.answer?.({ mediaConstraints: { audio: true, video: false } }) } catch { /* ignore */ }
                  setCall({ ...call, phase: 'active', connectedAt: Date.now() })
                }}
                onDecline={() => {
                  try { sessionRef.current?.terminate?.() } catch { /* ignore */ }
                  finishCurrent('missed')
                }}
                onDigits={press}
              />
            ) : tab === 'pad' ? (
              <Pad digits={digits} onPress={press} onBackspace={() => setDigits((current) => current.slice(0, -1))} onCall={() => void startOutbound(digits)} />
            ) : tab === 'people' ? (
              <People query={query} onQuery={setQuery} people={filteredPeople} onCall={(ext) => void startOutbound(ext)} />
            ) : tab === 'history' ? (
              <HistoryList items={history} onCall={(number) => void startOutbound(number)} />
            ) : (
              <SettingsPanel
                draft={draft}
                saving={saving}
                testing={testing}
                registered={registered}
                onChange={setDraft}
                onSave={() => void saveSettingsForm()}
                onTest={() => void testSettings()}
              />
            )}
          </div>

          <nav className="iphone-tabbar">
            <TabButton active={tab === 'pad'} label="صفحه‌کلید" onClick={() => setTab('pad')}><Grip size={18} /></TabButton>
            <TabButton active={tab === 'people'} label="مخاطبین" onClick={() => setTab('people')}><UserRound size={18} /></TabButton>
            <TabButton active={tab === 'history'} label="اخیر" badge={missed} onClick={() => setTab('history')}><History size={18} /></TabButton>
            <TabButton active={tab === 'settings'} label="تنظیمات" onClick={() => setTab('settings')}><Settings size={18} /></TabButton>
          </nav>
          <div className="iphone-home" aria-hidden="true" />
        </div>
      </div>
    </section>
  )
}

function TabButton({ active, label, badge, onClick, children }: { active: boolean, label: string, badge?: number, onClick: () => void, children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} className={`relative flex flex-col items-center gap-0.5 text-[10px] ${active ? 'text-[#0a84ff]' : 'text-white/45'}`}>
      {children}
      {label}
      {badge ? <span className="absolute -top-0.5 left-3 min-w-4 h-4 rounded-full bg-[#ff3b30] text-white text-[9px] leading-4 px-1">{fa(badge)}</span> : null}
    </button>
  )
}

function Pad({ digits, onPress, onBackspace, onCall }: { digits: string, onPress: (key: string) => void, onBackspace: () => void, onCall: () => void }) {
  return (
    <div className="flex h-full flex-col justify-end gap-4 pb-2">
      <div className="min-h-14 flex items-center justify-center gap-2 px-2">
        <p className="text-[34px] font-light tracking-[0.08em] text-white text-center break-all">{digits ? fa(digits) : ''}</p>
      </div>
      <div className="grid grid-cols-3 gap-x-5 gap-y-3 place-items-center px-3">
        {KEYS.map((key) => (
          <button key={key} type="button" onClick={() => onPress(key)} className="iphone-key">
            <span className="iphone-key-digit">{fa(key)}</span>
            {LETTERS[key] && <span className="iphone-key-letters">{LETTERS[key]}</span>}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-3 place-items-center px-3 pb-1">
        <span />
        <button type="button" aria-label="تماس" onClick={onCall} className="iphone-call">
          <Phone size={28} fill="currentColor" />
        </button>
        {digits ? (
          <button type="button" aria-label="پاک کردن" onClick={onBackspace} className="text-white/70"><Delete size={22} /></button>
        ) : <span />}
      </div>
    </div>
  )
}

function People({ query, onQuery, people, onCall }: { query: string, onQuery: (value: string) => void, people: PhonePerson[], onCall: (ext: string) => void }) {
  const contacts = people.filter((person) => person.kind !== 'extension')
  const extensions = people.filter((person) => person.kind === 'extension')
  return (
    <div className="flex flex-col gap-2 pt-1">
      <div className="relative">
        <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/35" />
        <input value={query} onChange={(event) => onQuery(event.target.value)} placeholder="جستجو در مخاطبین" aria-label="جستجوی مخاطب" className="iphone-input pr-8" />
      </div>
      {people.length === 0 && <p className="text-center text-xs text-white/45 py-10">مخاطبی در نرم‌افزار نیست. از بخش مخاطبین اضافه کنید.</p>}
      {contacts.length > 0 && <p className="px-1 text-[10px] uppercase tracking-wide text-white/40">مخاطبین CRM</p>}
      {contacts.map((person) => (
        <button
          key={person.id || person.number}
          type="button"
          onClick={() => onCall(person.number)}
          disabled={!person.number}
          className="flex items-center gap-3 rounded-2xl px-2 py-2 text-right hover:bg-white/5 disabled:opacity-40"
        >
          <span className="w-10 h-10 rounded-full bg-[#3a3a3c] text-white grid place-items-center text-sm font-semibold">{person.name.slice(0, 1)}</span>
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] text-white truncate">{person.name}</span>
            <span className="block text-[11px] text-white/45">{person.number ? fa(person.number) : person.subtitle || 'بدون شماره'}{person.number && person.subtitle ? ` · ${person.subtitle}` : ''}</span>
          </span>
          <Phone size={16} className="text-[#30d158]" />
        </button>
      ))}
      {extensions.length > 0 && <p className="px-1 pt-2 text-[10px] uppercase tracking-wide text-white/40">داخلی‌های مرکز تلفن</p>}
      {extensions.map((person) => (
        <button key={person.id || person.number} type="button" onClick={() => onCall(person.number)} className="flex items-center gap-3 rounded-2xl px-2 py-2 text-right hover:bg-white/5">
          <span className="w-10 h-10 rounded-full bg-[#1c3a5f] text-white grid place-items-center text-sm font-semibold">{person.name.slice(0, 1)}</span>
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] text-white truncate">{person.name}</span>
            <span className="block text-[11px] text-white/45">{fa(person.number)}</span>
          </span>
          <Phone size={16} className="text-[#0a84ff]" />
        </button>
      ))}
    </div>
  )
}

function HistoryList({ items, onCall }: { items: PhoneCdr[], onCall: (number: string) => void }) {
  if (!items.length) return <p className="text-center text-xs text-white/45 py-10">هنوز تماسی ثبت نشده است.</p>
  return (
    <div className="flex flex-col gap-1 pt-1">
      {items.map((item) => (
        <button key={item.id} type="button" onClick={() => onCall(item.number)} className="flex items-center gap-3 rounded-2xl px-2 py-2 text-right hover:bg-white/5">
          {item.direction === 'in' ? <PhoneIncoming size={16} className={item.disposition === 'missed' ? 'text-[#ff453a]' : 'text-[#30d158]'} /> : <Phone size={16} className="text-[#0a84ff]" />}
          <span className="min-w-0 flex-1">
            <span className={`block text-[15px] truncate ${item.disposition === 'missed' ? 'text-[#ff453a]' : 'text-white'}`}>{item.name}</span>
            <span className="block text-[11px] text-white/45">{fa(item.number)} · {clock(item.seconds)}</span>
          </span>
        </button>
      ))}
    </div>
  )
}

function SettingsPanel({
  draft, saving, testing, registered, onChange, onSave, onTest,
}: {
  draft: PhoneSettings
  saving: boolean
  testing: boolean
  registered: boolean
  onChange: (value: PhoneSettings) => void
  onSave: () => void
  onTest: () => void
}) {
  function set<K extends keyof PhoneSettings>(key: K, value: PhoneSettings[K]) {
    onChange({ ...draft, [key]: value })
  }
  return (
    <div className="flex flex-col gap-3 pt-1 pb-2 text-[13px] text-white">
      <p className="text-[11px] text-white/55 leading-5">اتصال واقعی به نرم‌افزار CIWA Telecom. داخلی و رمز همان چیزی است که در مرکز تلفن تعریف کرده‌اید.</p>
      <label className="iphone-field">نشانی API مرکز تلفن
        <input value={draft.apiUrl} onChange={(event) => set('apiUrl', event.target.value)} className="iphone-input" placeholder="http://127.0.0.1:8788" />
      </label>
      <label className="iphone-field">داخلی
        <input value={draft.extension} onChange={(event) => set('extension', event.target.value)} className="iphone-input" placeholder="101" />
      </label>
      <label className="iphone-field">رمز داخلی
        <input type="password" value={draft.secret} onChange={(event) => set('secret', event.target.value)} className="iphone-input" placeholder={draft.hasSecret ? '••••••••' : 'رمز'} autoComplete="off" />
      </label>
      <label className="iphone-field">نام نمایشی
        <input value={draft.displayName} onChange={(event) => set('displayName', event.target.value)} className="iphone-input" />
      </label>
      <label className="iphone-field">میزبان SIP
        <input value={draft.sipHost} onChange={(event) => set('sipHost', event.target.value)} className="iphone-input" placeholder="127.0.0.1" />
      </label>
      <label className="iphone-field">نشانی WebSocket
        <input value={draft.wssUrl} onChange={(event) => set('wssUrl', event.target.value)} className="iphone-input" placeholder="wss://127.0.0.1:8089/ws" />
      </label>
      <label className="iphone-field">حالت تماس
        <select value={draft.mode} onChange={(event) => set('mode', event.target.value as PhoneSettings['mode'])} className="iphone-input">
          <option value="originate">زنگ به داخلی (AMI / Click-to-Call)</option>
          <option value="webrtc">تماس داخل مرورگر (WebRTC)</option>
        </select>
      </label>
      <p className="text-[11px] text-white/45">وضعیت ثبت: {registered ? 'فعال' : 'خاموش'}</p>
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={onTest} disabled={testing} className="h-11 rounded-2xl bg-[#3a3a3c] text-white text-sm disabled:opacity-50">{testing ? '...' : 'آزمایش اتصال'}</button>
        <button type="button" onClick={onSave} disabled={saving} className="h-11 rounded-2xl bg-[#0a84ff] text-white text-sm font-semibold disabled:opacity-50">{saving ? '...' : 'ذخیره'}</button>
      </div>
    </div>
  )
}

function CallStage({
  call, elapsed, onMute, onHold, onHangup, onAnswer, onDecline, onDigits,
}: {
  call: LiveCall
  elapsed: number
  onMute: () => void
  onHold: () => void
  onHangup: () => void
  onAnswer: () => void
  onDecline: () => void
  onDigits: (key: string) => void
}) {
  const title = call.phase === 'dialing' ? 'در حال تماس...' : call.phase === 'ringing' ? 'تماس ورودی' : call.phase === 'held' ? 'نگه‌داشته شده' : 'تلفن همراه'
  return (
    <div className="flex h-full flex-col items-center justify-between py-4 text-white">
      <div className="text-center pt-6">
        <p className="text-[13px] text-white/55">{title}</p>
        <p className="mt-3 text-[28px] font-semibold tracking-tight">{call.name}</p>
        <p className="mt-1 text-[15px] text-white/55">{fa(call.number)}</p>
        <p className="mt-4 text-[18px] tabular-nums text-white/80">{call.connectedAt ? clock(elapsed) : call.mode === 'originate' ? 'زنگ داخلی' : '...'}</p>
      </div>
      {call.phase === 'ringing' ? (
        <div className="grid w-full grid-cols-2 gap-8 px-8 pb-6">
          <button type="button" onClick={onDecline} className="flex flex-col items-center gap-2 text-[12px] text-white/80">
            <span className="w-16 h-16 rounded-full bg-[#ff3b30] grid place-items-center"><PhoneOff size={28} /></span>
            رد
          </button>
          <button type="button" onClick={onAnswer} className="flex flex-col items-center gap-2 text-[12px] text-white/80">
            <span className="w-16 h-16 rounded-full bg-[#30d158] grid place-items-center"><Phone size={28} fill="currentColor" /></span>
            پاسخ
          </button>
        </div>
      ) : (
        <div className="w-full flex flex-col gap-6 pb-4">
          <div className="grid grid-cols-3 gap-4 place-items-center px-6">
            <RoundAction label={call.muted ? 'صدا باز' : 'بی‌صدا'} onClick={onMute}>{call.muted ? <MicOff size={20} /> : <Mic size={20} />}</RoundAction>
            <RoundAction label="صفحه‌کلید" onClick={() => onDigits('1')}><Grip size={20} /></RoundAction>
            <RoundAction label={call.phase === 'held' ? 'ادامه' : 'نگه داشتن'} onClick={onHold}>{call.phase === 'held' ? <Play size={20} /> : <Pause size={20} />}</RoundAction>
          </div>
          <div className="flex justify-center">
            <button type="button" aria-label="قطع" onClick={onHangup} className="w-16 h-16 rounded-full bg-[#ff3b30] grid place-items-center text-white">
              <PhoneOff size={28} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function RoundAction({ label, onClick, children }: { label: string, onClick: () => void, children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="flex flex-col items-center gap-2 text-[11px] text-white/70">
      <span className="w-14 h-14 rounded-full bg-white/12 grid place-items-center text-white">{children}</span>
      {label}
    </button>
  )
}
