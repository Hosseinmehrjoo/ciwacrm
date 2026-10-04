import { useState } from 'react'
import { ApiError } from '../api/client'
import { listModule } from '../api/records'
import { modules } from '../crm/modules'

const sources = modules.filter((item) => item.fields.some((field) => field.kind === 'select' && field.options?.length))

export function ReportBuilder() {
  const [moduleId, setModuleId] = useState(sources[0]?.id || '')
  const source = sources.find((item) => item.id === moduleId) || sources[0]
  const selectFields = source?.fields.filter((field) => field.kind === 'select' && field.options?.length) ?? []
  const [fieldName, setFieldName] = useState(selectFields[0]?.name || '')
  const field = selectFields.find((item) => item.name === fieldName) || selectFields[0]
  const [rows, setRows] = useState<{ label: string; count: number }[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [ran, setRan] = useState(false)

  async function run() {
    if (!source || !field) return
    setBusy(true)
    setError('')
    try {
      const params = new URLSearchParams()
      params.set('page[size]', '100')
      params.set(`fields[${source.suite}]`, field.name)
      const result = await listModule(source.suite, params)
      const counts = new Map<string, number>()
      for (const option of field.options || []) counts.set(option.value, 0)
      for (const record of result.records) {
        const value = record.attributes[field.name] || ''
        counts.set(value, (counts.get(value) || 0) + 1)
      }
      setRows((field.options || []).map((option) => ({
        label: option.label,
        count: counts.get(option.value) || 0,
      })))
      setRan(true)
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'ساخت گزارش ناموفق بود.')
    } finally {
      setBusy(false)
    }
  }

  const max = Math.max(1, ...rows.map((row) => row.count))

  return (
    <div className="rounded-2xl border border-slate-200 p-3 flex flex-col gap-3">
      <p className="text-sm font-semibold text-slate-800">خلاصهٔ زنده</p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_auto]">
        <label className="flex flex-col gap-1 text-xs text-slate-600">
          بخش
          <select
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800"
            value={source?.id || ''}
            onChange={(event) => {
              const next = sources.find((item) => item.id === event.target.value)
              setModuleId(event.target.value)
              setFieldName(next?.fields.find((fieldItem) => fieldItem.kind === 'select')?.name || '')
              setRan(false)
            }}
          >
            {sources.map((item) => (
              <option key={item.id} value={item.id}>{item.label}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-slate-600">
          گروه‌بندی
          <select
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800"
            value={field?.name || ''}
            onChange={(event) => {
              setFieldName(event.target.value)
              setRan(false)
            }}
          >
            {selectFields.map((item) => (
              <option key={item.name} value={item.name}>{item.label}</option>
            ))}
          </select>
        </label>
        <button type="button" className="btn-primary self-end rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-60" disabled={busy} onClick={() => void run()}>
          {busy ? 'در حال ساخت...' : 'نمایش'}
        </button>
      </div>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      {ran && rows.every((row) => row.count === 0) && <p className="text-sm text-slate-600">در این بخش رکوردی برای گروه‌بندی نیست.</p>}
      {rows.some((row) => row.count > 0) && (
        <ul className="flex flex-col gap-2">
          {rows.filter((row) => row.count > 0).map((row) => (
            <li key={row.label} className="grid grid-cols-[7rem_1fr_2rem] items-center gap-2 text-xs text-slate-700">
              <span className="truncate">{row.label}</span>
              <span className="h-2 overflow-hidden rounded-full bg-slate-100">
                <span className="block h-full rounded-full bg-violet-500" style={{ width: `${Math.round((row.count / max) * 100)}%` }} />
              </span>
              <span>{row.count.toLocaleString('fa-IR')}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
