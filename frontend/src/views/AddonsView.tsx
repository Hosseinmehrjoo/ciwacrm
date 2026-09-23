import { useEffect, useState, type FormEvent } from 'react'
import { ApiError } from '../api/client'
import { createAddonRecord, deleteAddonRecord, listAddonRecords } from '../addons/api'
import { addonIcon } from '../addons/icons'
import type { AddonManifest, AddonRecord } from '../addons/types'
import { Puzzle, Trash2, Upload } from 'lucide-react'

type AddonActions = {
  install: (id: string) => Promise<void>
  remove: (id: string) => Promise<void>
  upload: (file: File) => Promise<void>
}

export function AddonsView({
  addons,
  ready,
  error,
  actions,
  onOpen,
}: {
  addons: AddonManifest[]
  ready: boolean
  error: string
  actions: AddonActions
  onOpen: (id: string) => void
}) {
  const [notice, setNotice] = useState('')
  const [busyId, setBusyId] = useState('')
  const installed = addons.filter((addon) => addon.installed)
  const available = addons.filter((addon) => !addon.installed)

  async function run(id: string, task: () => Promise<void>, success: string) {
    setBusyId(id)
    setNotice('')
    try {
      await task()
      setNotice(success)
    } catch (caught) {
      setNotice(caught instanceof ApiError ? caught.message : 'عملیات ماژول ناموفق بود.')
    } finally {
      setBusyId('')
    }
  }

  return (
    <section className="flex flex-col gap-5">
      <div className="glass-card rounded-[28px] p-6">
        <p className="text-xs text-slate-400 mb-2">ماژول‌ها</p>
        <h1 className="text-xl font-bold text-slate-800">امکانات نصب‌شدنی</h1>
        <p className="text-sm text-slate-500 leading-7 mt-2 max-w-2xl">
          هر ماژول یک قابلیت اضافه است. بعد از نصب، بخش تازه‌اش در منوی ماژول‌ها دیده می‌شود. حذف ماژول دادهٔ ثبت‌شده را نگه می‌دارد تا دوباره نصب شود.
        </p>
      </div>

      {(error || notice) && (
        <p className="text-sm text-slate-700 bg-white/70 border border-slate-200 rounded-2xl px-4 py-3" role="status">{error || notice}</p>
      )}

      <div className="glass-card rounded-[28px] p-5">
        <h2 className="text-sm font-semibold text-slate-800 mb-4">ماژول‌های نصب‌شده</h2>
        {!ready && <p className="text-sm text-slate-500">در حال خواندن فهرست...</p>}
        {ready && installed.length === 0 && <p className="text-sm text-slate-500">هنوز ماژولی نصب نشده است.</p>}
        <div className="grid gap-3">
          {installed.map((addon) => {
            const Icon = addonIcon(addon.icon)
            return (
              <article key={addon.id} className="rounded-2xl border border-slate-200 px-4 py-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(139,92,246,0.15)' }}>
                  <Icon size={18} style={{ color: '#7c3aed' }} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-800">{addon.name}</p>
                  <p className="text-xs text-slate-500 mt-1">نسخه {addon.version}</p>
                </div>
                <button type="button" className="px-3 py-2 rounded-xl text-xs font-semibold text-violet-700" onClick={() => onOpen(`addon:${addon.id}`)}>
                  باز کردن
                </button>
                <button
                  type="button"
                  className="px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-600 disabled:opacity-60"
                  disabled={busyId === addon.id}
                  onClick={() => void run(addon.id, () => actions.remove(addon.id), `${addon.name} حذف شد.`)}
                >
                  {busyId === addon.id ? '...' : 'حذف'}
                </button>
              </article>
            )
          })}
        </div>
      </div>

      <div className="glass-card rounded-[28px] p-5">
        <div className="flex items-center gap-2 mb-2">
          <Puzzle size={18} style={{ color: '#7c3aed' }} />
          <h2 className="text-sm font-semibold text-slate-800">نصب ماژول جدید</h2>
        </div>
        <p className="text-sm text-slate-500 leading-7 mb-4">از فهرست آماده نصب کنید، یا یک فایل module.json و یا zip حاوی همان پرونده را بارگذاری کنید.</p>
        <div className="grid gap-3 md:grid-cols-2">
          {available.map((addon) => {
            const Icon = addonIcon(addon.icon)
            return (
              <article key={addon.id} className="rounded-2xl border border-slate-200 p-4 flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(232,121,249,0.15)' }}>
                    <Icon size={18} style={{ color: '#c026d3' }} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{addon.name}</p>
                    <p className="text-xs text-slate-500">نسخه {addon.version}</p>
                  </div>
                </div>
                <p className="text-sm text-slate-600 leading-7 flex-1">{addon.description}</p>
                <button
                  type="button"
                  className="btn-primary rounded-xl py-2 text-xs font-semibold disabled:opacity-60"
                  disabled={busyId === addon.id}
                  onClick={() => void run(addon.id, () => actions.install(addon.id), `${addon.name} نصب شد و به منو اضافه شد.`)}
                >
                  {busyId === addon.id ? 'در حال نصب...' : 'نصب'}
                </button>
              </article>
            )
          })}
        </div>
        {ready && available.length === 0 && <p className="text-sm text-slate-500 mb-4">همهٔ ماژول‌های آماده نصب شده‌اند. بستهٔ تازه‌ای بارگذاری کنید.</p>}
        <label className="mt-4 flex items-center justify-center gap-2 rounded-2xl border border-dashed border-violet-300 px-4 py-5 text-sm text-slate-600 cursor-pointer">
          <Upload size={16} />
          بارگذاری بستهٔ ماژول
          <input
            type="file"
            accept=".json,.zip,application/json,application/zip"
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0]
              event.target.value = ''
              if (!file) return
              void run('upload', () => actions.upload(file), 'بسته نصب شد و به منو اضافه شد.')
            }}
          />
        </label>
      </div>
    </section>
  )
}

export function AddonScreen({ addon }: { addon: AddonManifest }) {
  const [records, setRecords] = useState<AddonRecord[]>([])
  const [draft, setDraft] = useState<Record<string, string>>({})
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [open, setOpen] = useState(false)
  const Icon = addonIcon(addon.icon)

  useEffect(() => {
    let cancel = false
    listAddonRecords(addon.id)
      .then((payload) => {
        if (!cancel) setRecords(payload.records)
      })
      .catch((caught) => {
        if (!cancel) setError(caught instanceof ApiError ? caught.message : 'رکوردها خوانده نشدند.')
      })
    return () => {
      cancel = true
    }
  }, [addon.id])

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      const payload = await createAddonRecord(addon.id, draft)
      setRecords((current) => [payload.record, ...current])
      setDraft({})
      setOpen(false)
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'ذخیره ناموفق بود.')
    } finally {
      setSaving(false)
    }
  }

  async function remove(recordId: string) {
    setRecords((current) => current.filter((record) => record.id !== recordId))
    try {
      await deleteAddonRecord(addon.id, recordId)
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'حذف ناموفق بود.')
      const payload = await listAddonRecords(addon.id)
      setRecords(payload.records)
    }
  }

  return (
    <section className="glass-card rounded-[28px] p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(139,92,246,0.15)' }}>
            <Icon size={20} style={{ color: '#7c3aed' }} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-800">{addon.name}</h1>
            <p className="text-sm text-slate-500 leading-6 mt-1">{addon.description}</p>
          </div>
        </div>
        <button type="button" className="btn-primary rounded-xl px-4 py-2 text-xs font-semibold shrink-0" onClick={() => setOpen((current) => !current)}>
          {addon.recordLabel} جدید
        </button>
      </div>
      {error && <p className="text-sm text-red-700 bg-red-50 rounded-2xl px-4 py-3" role="alert">{error}</p>}
      {open && (
        <form className="grid gap-3 md:grid-cols-2" onSubmit={(event) => void onSubmit(event)}>
          {addon.fields.map((field) => (
            <label key={field.name} className={`flex flex-col gap-1 text-xs text-slate-500 ${field.kind === 'textarea' ? 'md:col-span-2' : ''}`}>
              {field.label}
              {field.kind === 'textarea' ? (
                <textarea
                  className="glass-input rounded-2xl px-3 py-2 text-sm min-h-24"
                  value={draft[field.name] || ''}
                  required={field.required}
                  onChange={(event) => setDraft((current) => ({ ...current, [field.name]: event.target.value }))}
                />
              ) : (
                <input
                  className="glass-input rounded-2xl px-3 py-2 text-sm"
                  type={field.kind === 'number' ? 'number' : 'text'}
                  value={draft[field.name] || ''}
                  required={field.required}
                  onChange={(event) => setDraft((current) => ({ ...current, [field.name]: event.target.value }))}
                />
              )}
            </label>
          ))}
          <div className="md:col-span-2 flex justify-end">
            <button type="submit" className="btn-primary rounded-xl px-4 py-2 text-xs font-semibold disabled:opacity-60" disabled={saving}>
              {saving ? 'در حال ذخیره...' : 'ذخیره'}
            </button>
          </div>
        </form>
      )}
      {records.length === 0 && <p className="text-sm text-slate-500">{`هنوز هیچ ${addon.recordLabel}ی ثبت نشده است.`}</p>}
      <div className="grid gap-2">
        {records.map((record) => (
          <article key={record.id} className="rounded-2xl border border-slate-200 px-4 py-3 flex items-start gap-3">
            <div className="flex-1 min-w-0">
              {addon.fields.map((field) => (
                record.attributes[field.name] == null ? null : (
                  <p key={field.name} className="text-sm text-slate-700 leading-6">
                    <span className="text-slate-400">{field.label}: </span>
                    {String(record.attributes[field.name])}
                  </p>
                )
              ))}
            </div>
            <button type="button" aria-label="حذف" className="text-slate-400 hover:text-red-700" onClick={() => void remove(record.id)}>
              <Trash2 size={16} />
            </button>
          </article>
        ))}
      </div>
    </section>
  )
}
