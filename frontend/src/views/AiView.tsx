import { useEffect, useId, useState, type FormEvent } from 'react'
import { AudioLines, CalendarRange, Eye, EyeOff, Phone, UserRound } from 'lucide-react'
import { ApiError } from '../api/client'
import { analyzeAi, analyzeVoice, aiSettings, clearAiKey, saveAiKey, type AiResult } from '../api/ai'
import { listModule } from '../api/records'
import { SectionHelp } from '../help/SectionHelp'

type ContactOption = { id: string; name: string }

export function AiView() {
  const keyErrorId = useId()
  const [ready, setReady] = useState(false)
  const [configured, setConfigured] = useState(false)
  const [hint, setHint] = useState('')
  const [editing, setEditing] = useState(false)
  const [apiKey, setApiKey] = useState('')
  const [baseUrl, setBaseUrl] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [keyError, setKeyError] = useState('')
  const [notice, setNotice] = useState('')
  const [savingKey, setSavingKey] = useState(false)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [result, setResult] = useState<AiResult | null>(null)
  const [contacts, setContacts] = useState<ContactOption[]>([])
  const [contactId, setContactId] = useState('')
  const [file, setFile] = useState<File | null>(null)

  useEffect(() => {
    let active = true
    aiSettings()
      .then((settings) => {
        if (!active) return
        setConfigured(settings.configured)
        setHint(settings.hint)
        setBaseUrl(settings.baseUrl || '')
        setEditing(!settings.configured)
      })
      .catch((caught) => {
        if (!active) return
        setError(caught instanceof ApiError ? caught.message : 'وضعیت هوش مصنوعی خوانده نشد.')
      })
      .finally(() => {
        if (active) setReady(true)
      })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!configured) return
    let active = true
    const params = new URLSearchParams()
    params.set('page[size]', '50')
    params.set('page[number]', '1')
    params.set('fields[Contacts]', 'first_name,last_name')
    listModule('Contacts', params)
      .then((page) => {
        if (!active) return
        const options = page.records.map((record) => ({
          id: record.id,
          name: [record.attributes.first_name, record.attributes.last_name].filter(Boolean).join(' ') || 'بدون نام',
        }))
        setContacts(options)
        setContactId((current) => current || options[0]?.id || '')
      })
      .catch(() => {
        if (active) setContacts([])
      })
    return () => {
      active = false
    }
  }, [configured])

  async function onSaveKey(event: FormEvent) {
    event.preventDefault()
    setKeyError('')
    setNotice('')
    if (apiKey.trim().length < 20) {
      setKeyError('کلید OpenAI را کامل وارد کنید.')
      return
    }
    setSavingKey(true)
    try {
      const settings = await saveAiKey(apiKey.trim(), baseUrl.trim())
      setConfigured(settings.configured)
      setHint(settings.hint)
      setBaseUrl(settings.baseUrl || '')
      setApiKey('')
      setEditing(false)
      setNotice('کلید ذخیره شد. از همین صفحه می‌توانید تحلیل را شروع کنید.')
    } catch (caught) {
      setKeyError(caught instanceof ApiError ? caught.message : 'ذخیره کلید ناموفق بود.')
    } finally {
      setSavingKey(false)
    }
  }

  async function onClearKey() {
    setError('')
    setNotice('')
    setSavingKey(true)
    try {
      await clearAiKey()
      setConfigured(false)
      setHint('')
      setBaseUrl('')
      setEditing(true)
      setResult(null)
      setNotice('کلید حذف شد.')
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'حذف کلید ناموفق بود.')
    } finally {
      setSavingKey(false)
    }
  }

  async function run(kind: 'month' | 'calls' | 'customer' | 'voice') {
    setError('')
    setNotice('')
    setBusy(kind)
    try {
      const next = kind === 'voice'
        ? await analyzeVoice(file as File)
        : await analyzeAi(kind, kind === 'customer' ? contactId : undefined)
      setResult(next)
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'تحلیل ناموفق بود.')
    } finally {
      setBusy('')
    }
  }

  const showForm = !configured || editing

  return (
    <div className="flex flex-col gap-4 min-w-0">
      <section className="glass-card rounded-[28px] p-5 sm:p-6">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-bold text-slate-800">هوش مصنوعی</h1>
          <SectionHelp topic="ai" />
        </div>
        <p className="text-sm text-slate-500 leading-7 mt-2 max-w-2xl">
          کلید OpenAI خودتان را بگذارید. بعد از آن، تحلیل ماه، مدت تماس‌ها، مکالمه صوتی و پرونده مشتری از همین صفحه انجام می‌شود.
        </p>
      </section>

      <section className="glass-card rounded-[28px] p-5 sm:p-6">
        {!ready && <p className="text-sm text-slate-500">در حال خواندن تنظیمات...</p>}
        {ready && configured && !editing && (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-700">متصل است. کلید <span dir="ltr">{hint}</span>{baseUrl ? <> · <span dir="ltr">{baseUrl}</span></> : null}</p>
            <div className="flex gap-2">
              <button type="button" className="rounded-xl px-3 py-2 text-xs font-semibold border border-white/20" onClick={() => { setEditing(true); setNotice(''); setKeyError('') }}>
                تعویض کلید
              </button>
              <button type="button" className="rounded-xl px-3 py-2 text-xs font-semibold border border-red-200 text-red-700" disabled={savingKey} onClick={() => void onClearKey()}>
                حذف کلید
              </button>
            </div>
          </div>
        )}
        {ready && showForm && (
          <form className="flex flex-col gap-3" onSubmit={(event) => void onSaveKey(event)}>
            <label className="text-sm font-medium text-slate-700" htmlFor="openai-key">کلید OpenAI</label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative flex-1">
                <input
                  id="openai-key"
                  name="openai-key"
                  type={showKey ? 'text' : 'password'}
                  autoComplete="off"
                  spellCheck={false}
                  value={apiKey}
                  placeholder="sk-..."
                  aria-invalid={Boolean(keyError)}
                  aria-describedby={keyError ? keyErrorId : undefined}
                  className="glass-input w-full rounded-2xl px-4 py-2.5 pl-12 text-sm outline-none"
                  dir="ltr"
                  onChange={(event) => setApiKey(event.target.value)}
                />
                <button
                  type="button"
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg text-slate-400"
                  aria-label={showKey ? 'مخفی کردن کلید' : 'نمایش کلید'}
                  onClick={() => setShowKey((current) => !current)}
                >
                  {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <button type="submit" className="btn-primary rounded-2xl px-4 py-2.5 text-sm font-semibold disabled:opacity-60" disabled={savingKey}>
                {savingKey ? 'در حال بررسی کلید...' : 'ذخیره و اتصال'}
              </button>
            </div>
            {keyError && <p id={keyErrorId} role="alert" className="text-sm text-red-700">{keyError}</p>}
            <label className="text-xs text-slate-500" htmlFor="openai-base">
              آدرس سرویس، اگر OpenAI از سرور شما باز نمی‌شود
              <input
                id="openai-base"
                value={baseUrl}
                placeholder="https://api.openai.com/v1"
                dir="ltr"
                autoComplete="off"
                className="glass-input mt-1 w-full rounded-2xl px-4 py-2.5 text-sm outline-none"
                onChange={(event) => setBaseUrl(event.target.value)}
              />
            </label>
            <p className="text-xs text-slate-500 leading-6">خالی بگذارید تا همان OpenAI استفاده شود. کلید فقط روی همین سرور می‌ماند و بعد از ذخیره به صفحه برنمی‌گردد.</p>
          </form>
        )}
        {notice && <p role="status" className="text-sm text-emerald-700 mt-3">{notice}</p>}
      </section>

      {configured && (
        <div className="grid gap-3 md:grid-cols-2">
          <Tool
            icon={CalendarRange}
            title="تحلیل این ماه"
            detail="آمار مخاطب، فروش، تیکت، فاکتور و تماس ماه جاری را جمع می‌کند و توضیح می‌دهد."
            action="تحلیل این ماه"
            pending={busy === 'month'}
            disabled={Boolean(busy)}
            onRun={() => void run('month')}
          />
          <Tool
            icon={Phone}
            title="مدت تماس‌ها"
            detail="تعداد، جهت و مدت تماس‌های ثبت‌شده را حساب می‌کند. مدت را می‌توانید در فرم تماس وارد کنید."
            action="تحلیل تماس‌ها"
            pending={busy === 'calls'}
            disabled={Boolean(busy)}
            onRun={() => void run('calls')}
          />
          <section className="glass-card rounded-[24px] p-4 flex flex-col gap-3">
            <div className="flex items-start gap-3">
              <span className="w-10 h-10 rounded-xl grid place-items-center shrink-0" style={{ background: 'rgba(139,92,246,0.15)' }}>
                <AudioLines size={18} className="ciwa-accent" />
              </span>
              <div>
                <h2 className="text-sm font-semibold text-slate-800">مکالمه صوتی</h2>
                <p className="text-xs text-slate-500 leading-6 mt-1">یک فایل صوتی بگذارید تا متن، مدت و جمع‌بندی مکالمه آماده شود.</p>
              </div>
            </div>
            <label className="text-xs text-slate-500">
              فایل صوتی
              <input
                type="file"
                accept="audio/*,video/mp4,video/webm,.mp3,.wav,.m4a,.ogg,.webm,.mp4"
                className="mt-1 block w-full text-xs text-slate-400 file:ml-3 file:rounded-xl file:border-0 file:bg-white file:px-3 file:py-2 file:text-xs file:text-slate-700"
                onChange={(event) => setFile(event.target.files?.[0] || null)}
              />
            </label>
            <button
              type="button"
              className="btn-primary rounded-xl px-4 py-2 text-xs font-semibold disabled:opacity-60 w-fit"
              disabled={Boolean(busy) || !file}
              onClick={() => void run('voice')}
            >
              {busy === 'voice' ? 'در حال شنیدن و تحلیل...' : 'تحلیل مکالمه'}
            </button>
          </section>
          <section className="glass-card rounded-[24px] p-4 flex flex-col gap-3">
            <div className="flex items-start gap-3">
              <span className="w-10 h-10 rounded-xl grid place-items-center shrink-0" style={{ background: 'rgba(139,92,246,0.15)' }}>
                <UserRound size={18} className="ciwa-accent" />
              </span>
              <div>
                <h2 className="text-sm font-semibold text-slate-800">پرونده مشتری</h2>
                <p className="text-xs text-slate-500 leading-6 mt-1">یک مخاطب را انتخاب کنید تا سابقه تماس، فرصت و تیکت او جمع‌بندی شود.</p>
              </div>
            </div>
            <label className="text-xs text-slate-500">
              مخاطب
              <select
                className="glass-input mt-1 w-full rounded-2xl px-3 py-2 text-sm outline-none"
                value={contactId}
                onChange={(event) => setContactId(event.target.value)}
              >
                {contacts.length === 0 && <option value="">مخاطبی ثبت نشده</option>}
                {contacts.map((contact) => (
                  <option key={contact.id} value={contact.id}>{contact.name}</option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="btn-primary rounded-xl px-4 py-2 text-xs font-semibold disabled:opacity-60 w-fit"
              disabled={Boolean(busy) || !contactId}
              onClick={() => void run('customer')}
            >
              {busy === 'customer' ? 'در حال تحلیل...' : 'تحلیل این مشتری'}
            </button>
          </section>
        </div>
      )}

      {busy && <p role="status" className="text-sm text-slate-400">{busy === 'voice' ? 'فایل در حال پیاده‌سازی و تحلیل است.' : 'داده‌ها در حال جمع شدن و تحلیل هستند.'}</p>}
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}

      {result && (
        <section className="glass-card rounded-[28px] p-5 sm:p-6 flex flex-col gap-4">
          <h2 className="text-base font-bold text-slate-800">{result.title}</h2>
          {result.stats.length > 0 && (
            <dl className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {result.stats.map((stat) => (
                <div key={stat.label} className="rounded-2xl border border-white/10 px-3 py-2">
                  <dt className="text-xs text-slate-500">{stat.label}</dt>
                  <dd className="text-sm font-semibold text-slate-800 mt-1">{stat.value}</dd>
                </div>
              ))}
            </dl>
          )}
          <p className="text-sm text-slate-700 leading-8 whitespace-pre-wrap">{result.analysis}</p>
          {result.transcript && (
            <details className="text-sm text-slate-400">
              <summary className="cursor-pointer text-slate-300">متن مکالمه</summary>
              <p className="mt-2 leading-7 whitespace-pre-wrap">{result.transcript}</p>
            </details>
          )}
        </section>
      )}
    </div>
  )
}

function Tool({
  icon: Icon,
  title,
  detail,
  action,
  pending,
  disabled,
  onRun,
}: {
  icon: typeof Phone
  title: string
  detail: string
  action: string
  pending: boolean
  disabled: boolean
  onRun: () => void
}) {
  return (
    <section className="glass-card rounded-[24px] p-4 flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <span className="w-10 h-10 rounded-xl grid place-items-center shrink-0" style={{ background: 'rgba(139,92,246,0.15)' }}>
          <Icon size={18} className="ciwa-accent" />
        </span>
        <div>
          <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
          <p className="text-xs text-slate-500 leading-6 mt-1">{detail}</p>
        </div>
      </div>
      <button type="button" className="btn-primary rounded-xl px-4 py-2 text-xs font-semibold disabled:opacity-60 w-fit" disabled={disabled} onClick={onRun}>
        {pending ? 'در حال تحلیل...' : action}
      </button>
    </section>
  )
}
