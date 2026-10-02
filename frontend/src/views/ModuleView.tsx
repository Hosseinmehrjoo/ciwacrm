import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { ApiError } from '../api/client'
import { createModuleRecord, deleteModuleRecord, listModule, updateModuleRecord, type CrmRecord } from '../api/records'
import { useSession } from '../auth/SessionProvider'
import { moduleById, modulesInGroup, optionLabel, probabilityForStage, type FieldDef, type ModuleDef } from '../crm/modules'
import { SectionHelp } from '../help/SectionHelp'
import { OpportunityBoard } from './OpportunityBoard'
import { ReportBuilder } from './ReportBuilder'
import { emptyLine, LineEditor, loadLines, persistLines, RelateField, RelatedPanel, type LineDraft } from './RecordExtras'

export function ModuleView({
  moduleId,
  openCreateToken = 0,
  externalQuery = '',
  onOpenModule,
  onQueryChange,
}: {
  moduleId: string
  openCreateToken?: number
  externalQuery?: string
  onOpenModule?: (id: string) => void
  onQueryChange?: (value: string) => void
}) {
  const session = useSession()
  const module = moduleById(moduleId)
  const [query, setQuery] = useState(externalQuery)
  const [page, setPage] = useState(1)
  const [revision, setRevision] = useState(0)
  const [records, setRecords] = useState<CrmRecord[]>([])
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(!session.demo)
  const [error, setError] = useState('')
  const [formRecord, setFormRecord] = useState<CrmRecord | null | undefined>(undefined)
  const [pendingDelete, setPendingDelete] = useState<CrmRecord | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [layout, setLayout] = useState<'list' | 'board'>('list')

  useEffect(() => {
    setQuery(externalQuery)
    setPage(1)
  }, [externalQuery])

  useEffect(() => {
    if (!module || session.demo) return
    let active = true
    const handle = window.setTimeout(() => {
      setLoading(true)
      setError('')
      const params = new URLSearchParams()
      params.set('page[size]', module.board && layout === 'board' ? '100' : '20')
      params.set('page[number]', String(page))
      params.set(`fields[${module.suite}]`, module.fields.map((field) => field.name).join(','))
      const term = query.trim()
      const searchFields = module.fields.filter((field) => field.search)
      if (term && searchFields.length > 1) params.set('filter[operator]', 'or')
      if (term) {
        for (const field of searchFields) params.set(`filter[${field.name}][like]`, `%${term}%`)
      }
      listModule(module.suite, params)
        .then((result) => {
          if (!active) return
          setRecords(result.records)
          setTotalPages(result.totalPages || 1)
        })
        .catch((caught: unknown) => {
          if (!active) return
          if (caught instanceof ApiError && caught.status === 401) {
            void session.logout()
            return
          }
          setError(caught instanceof ApiError ? caught.message : 'خواندن رکوردها ناموفق بود.')
        })
        .finally(() => {
          if (active) setLoading(false)
        })
    }, 250)
    return () => {
      active = false
      window.clearTimeout(handle)
    }
  }, [layout, module, page, query, revision, session.demo, session.logout])

  useEffect(() => {
    if (session.demo || openCreateToken === 0) return
    setFormRecord(null)
  }, [openCreateToken, session.demo])

  if (!module) return null

  if (session.demo) {
    return (
      <section className="glass-card rounded-2xl p-6">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-slate-800">{module.label}</h2>
          <SectionHelp topic={module.id} />
        </div>
        <p className="text-sm text-slate-600 mt-3 leading-7">این بخش وقتی هسته در دسترس باشد از سامانه خوانده می‌شود.</p>
      </section>
    )
  }

  const columns = module.fields.filter((field) => field.list).slice(0, 4)
  const siblings = modulesInGroup(module.group)

  async function removeRecord() {
    if (!pendingDelete || !module) return
    setDeleting(true)
    setError('')
    try {
      await deleteModuleRecord(module.suite, pendingDelete.id)
      setPendingDelete(null)
      setRevision((current) => current + 1)
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 401) {
        void session.logout()
        return
      }
      setError(caught instanceof ApiError ? caught.message : 'حذف رکورد ناموفق بود.')
      setPendingDelete(null)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <section className="glass-card rounded-2xl p-4 sm:p-5 flex flex-col gap-4 min-w-0">
      {siblings.length > 1 && siblings.length <= 8 && (
        <div className="flex flex-wrap gap-2">
          {siblings.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-current={item.id === module.id ? 'page' : undefined}
              className={`px-3 py-1.5 rounded-xl text-sm ${item.id === module.id ? 'bg-emerald-600 text-white' : 'border border-slate-200 text-slate-700'}`}
              onClick={() => onOpenModule?.(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-slate-800">{module.label}</h2>
          <SectionHelp topic={module.id} />
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {module.board && (
            <div className="flex rounded-2xl border border-slate-200 p-0.5">
              <button type="button" className={`rounded-xl px-3 py-1.5 text-sm ${layout === 'list' ? 'bg-emerald-600 text-white' : 'text-slate-700'}`} onClick={() => { setLayout('list'); setPage(1) }}>فهرست</button>
              <button type="button" className={`rounded-xl px-3 py-1.5 text-sm ${layout === 'board' ? 'bg-emerald-600 text-white' : 'text-slate-700'}`} onClick={() => { setLayout('board'); setPage(1) }}>برد فروش</button>
            </div>
          )}
          <label className="sr-only" htmlFor={`${module.id}-search`}>جستجو در {module.label}</label>
          <input
            id={`${module.id}-search`}
            value={query}
            onChange={(event) => {
              setPage(1)
              setQuery(event.target.value)
              onQueryChange?.(event.target.value)
            }}
            placeholder={`جستجو در ${module.label}`}
            className="w-full sm:w-64 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
          />
          <button type="button" className="btn-primary rounded-2xl px-4 py-2 text-sm font-semibold" onClick={() => setFormRecord(null)}>
            افزودن {module.singular}
          </button>
        </div>
      </div>

      {module.id === 'reports' && <ReportBuilder />}

      {loading && <p className="text-sm text-slate-600">در حال خواندن {module.label}...</p>}
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      {!loading && !error && records.length === 0 && (
        <p className="text-sm text-slate-600">رکوردی در {module.label} پیدا نشد.</p>
      )}

      {module.board && layout === 'board' && !loading && records.length > 0 && (
        <OpportunityBoard
          records={records}
          stageField={module.fields.find((field) => field.name === 'sales_stage')!}
          onMoved={() => setRevision((current) => current + 1)}
        />
      )}

      {records.length > 0 && layout === 'list' && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-right">
            <thead>
              <tr className="text-slate-500 border-b border-slate-100">
                {columns.map((field) => (
                  <th key={field.name} className="font-medium py-2 pl-3 whitespace-nowrap">{field.label}</th>
                ))}
                <th className="font-medium py-2 whitespace-nowrap">عملیات</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record) => (
                <tr key={record.id} className="border-b border-slate-50">
                  {columns.map((field) => (
                    <td key={field.name} className="py-3 pl-3 text-slate-700 whitespace-nowrap">{displayValue(field, record.attributes[field.name])}</td>
                  ))}
                  <td className="py-3 whitespace-nowrap">
                    <div className="flex gap-2">
                      <button type="button" className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700" onClick={() => setFormRecord(record)}>
                        ویرایش
                      </button>
                      <button type="button" className="px-3 py-1.5 rounded-xl border border-red-200 text-red-700" onClick={() => setPendingDelete(record)}>
                        حذف
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <button type="button" className="px-3 py-1.5 rounded-xl border border-slate-200 disabled:opacity-40" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>قبلی</button>
          <span className="text-slate-600">{page} از {totalPages}</span>
          <button type="button" className="px-3 py-1.5 rounded-xl border border-slate-200 disabled:opacity-40" disabled={page >= totalPages} onClick={() => setPage((current) => current + 1)}>بعدی</button>
        </div>
      )}

      {formRecord !== undefined && (
        <RecordForm
          module={module}
          record={formRecord}
          onClose={() => setFormRecord(undefined)}
          onSaved={() => {
            setFormRecord(undefined)
            setPage(1)
            setRevision((current) => current + 1)
          }}
        />
      )}

      {pendingDelete && (
        <ConfirmDelete
          label={recordTitle(module, pendingDelete)}
          deleting={deleting}
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => void removeRecord()}
        />
      )}
    </section>
  )
}

function RecordForm({
  module,
  record,
  onClose,
  onSaved,
}: {
  module: ModuleDef
  record: CrmRecord | null
  onClose: () => void
  onSaved: () => void
}) {
  const titleId = useId()
  const summaryRef = useRef<HTMLDivElement>(null)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [draft, setDraft] = useState<Record<string, string>>(() => draftFrom(module, record))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const [savedId, setSavedId] = useState(record?.id || '')
  const [lines, setLines] = useState<LineDraft[]>([])
  const [removedLineIds, setRemovedLineIds] = useState<string[]>([])

  useEffect(() => {
    if (!module.lines || !record?.id) return
    let active = true
    loadLines(record.id)
      .then((loaded) => {
        if (active) setLines(loaded)
      })
      .catch(() => {
        if (active) setFormError('ردیف‌های قبلی خوانده نشد.')
      })
    return () => {
      active = false
    }
  }, [module.lines, record?.id])

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog?.open) dialog?.showModal()
    return () => {
      if (dialog?.open) dialog.close()
    }
  }, [])

  async function submit(event: FormEvent) {
    event.preventDefault()
    const nextErrors = validate(module, draft)
    setErrors(nextErrors)
    setFormError('')
    if (Object.keys(nextErrors).length > 0) {
      summaryRef.current?.focus()
      return
    }
    setSaving(true)
    try {
      const attributes = Object.fromEntries(
        module.fields
          .map((field) => [field.name, outgoing(field, draft[field.name] || '')] as const)
          .filter(([, value]) => record || savedId || value !== ''),
      )
      let id = record?.id || savedId
      if (id) await updateModuleRecord(module.suite, id, attributes)
      else {
        const created = await createModuleRecord(module.suite, attributes)
        id = created.id
        setSavedId(id)
      }
      if (module.lines && id) {
        const totalField = module.id === 'contracts' ? 'total_contract_value' : 'total_amount'
        await persistLines(module.suite, id, lines, removedLineIds, totalField)
      }
      onSaved()
    } catch (caught) {
      setFormError(caught instanceof ApiError ? caught.message : 'ذخیره ناموفق بود.')
      summaryRef.current?.focus()
    } finally {
      setSaving(false)
    }
  }

  const errorEntries = Object.entries(errors)

  return (
    <dialog
      ref={dialogRef}
      className="crm-dialog"
      aria-labelledby={titleId}
      onCancel={(event) => {
        if (saving) event.preventDefault()
        else onClose()
      }}
      onClick={(event) => {
        if (event.target === dialogRef.current && !saving) onClose()
      }}
    >
      <form onSubmit={submit} className="glass-card rounded-2xl bg-white p-5 flex flex-col gap-4 max-h-[85vh] overflow-y-auto" noValidate>
        <div className="flex items-start justify-between gap-3">
          <h2 id={titleId} className="text-base font-semibold text-slate-800">
            {record ? `ویرایش ${module.singular}` : `${module.singular} جدید`}
          </h2>
          <button type="button" className="text-sm text-slate-600 px-2 py-1 rounded-lg hover:bg-slate-100" onClick={onClose} disabled={saving}>بستن</button>
        </div>
        {(errorEntries.length > 0 || formError) && (
          <div ref={summaryRef} tabIndex={-1} role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 outline-none">
            <p className="font-semibold">اطلاعات فرم کامل نیست.</p>
            {formError && <p className="mt-1">{formError}</p>}
            {errorEntries.length > 0 && (
              <ul className="mt-2 list-disc pr-4">
                {errorEntries.map(([name, message]) => (
                  <li key={name}><a className="underline" href={`#field-${name}`}>{message}</a></li>
                ))}
              </ul>
            )}
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {module.fields.map((field) => (
            <label key={field.name} className={`flex flex-col gap-1 text-sm text-slate-700 ${field.kind === 'textarea' ? 'sm:col-span-2' : ''}`} htmlFor={`field-${field.name}`}>
              <span>{field.label}{field.required ? <span className="text-red-700"> *</span> : null}</span>
              {field.kind === 'textarea' ? (
                <textarea
                  id={`field-${field.name}`}
                  value={draft[field.name] || ''}
                  aria-invalid={Boolean(errors[field.name])}
                  onChange={(event) => setDraft((current) => ({ ...current, [field.name]: event.target.value }))}
                  className="min-h-24 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-800 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                />
              ) : field.kind === 'relate' ? (
                <RelateField
                  id={`field-${field.name}`}
                  value={draft[field.name] || ''}
                  invalid={Boolean(errors[field.name])}
                  onChange={(value) => setDraft((current) => ({ ...current, [field.name]: value }))}
                />
              ) : field.kind === 'select' ? (
                <select
                  id={`field-${field.name}`}
                  value={draft[field.name] || ''}
                  aria-invalid={Boolean(errors[field.name])}
                  onChange={(event) => {
                    const value = event.target.value
                    setDraft((current) => ({
                      ...current,
                      [field.name]: value,
                      ...(field.name === 'sales_stage' ? { probability: probabilityForStage(value) } : {}),
                    }))
                  }}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-800 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                >
                  <option value="">انتخاب کنید</option>
                  {field.options?.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              ) : (
                <input
                  id={`field-${field.name}`}
                  value={draft[field.name] || ''}
                  type={inputType(field)}
                  inputMode={field.kind === 'tel' || field.kind === 'number' ? field.kind === 'number' ? 'decimal' : 'tel' : undefined}
                  aria-invalid={Boolean(errors[field.name])}
                  onChange={(event) => setDraft((current) => ({ ...current, [field.name]: event.target.value }))}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-800 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                />
              )}
              {errors[field.name] && <span className="text-xs text-red-700">{errors[field.name]}</span>}
            </label>
          ))}
          {module.lines && (
            <LineEditor
              lines={lines}
              onChange={(next) => {
                const removed = lines.filter((line) => line.id && !next.some((item) => item.id === line.id)).map((line) => line.id!)
                setRemovedLineIds((current) => [...current, ...removed])
                setLines(next)
              }}
            />
          )}
          {module.id === 'contacts' && draft.email1?.includes('@') && (
            <a className="sm:col-span-2 text-sm text-slate-700 underline" href={`mailto:${draft.email1}`}>ارسال ایمیل با برنامهٔ نامهٔ شما</a>
          )}
          {record && module.links && module.links.length > 0 && (
            <RelatedPanel suite={module.suite} id={record.id} links={module.links} />
          )}
        </div>
        <div className="flex items-center justify-end gap-2">
          <button type="button" className="px-4 py-2 rounded-2xl border border-slate-200 text-sm text-slate-700" onClick={onClose} disabled={saving}>انصراف</button>
          <button type="submit" className="btn-primary rounded-2xl px-5 py-2 text-sm font-semibold disabled:opacity-60" disabled={saving}>
            {saving ? 'در حال ذخیره...' : 'ذخیره'}
          </button>
        </div>
      </form>
    </dialog>
  )
}

function ConfirmDelete({
  label,
  deleting,
  onCancel,
  onConfirm,
}: {
  label: string
  deleting: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog?.open) dialog?.showModal()
    return () => {
      if (dialog?.open) dialog.close()
    }
  }, [])
  return (
    <dialog
      ref={dialogRef}
      className="crm-dialog"
      aria-labelledby="delete-record-title"
      onCancel={(event) => {
        if (deleting) event.preventDefault()
        else onCancel()
      }}
    >
      <div className="glass-card rounded-2xl bg-white p-5 flex flex-col gap-4">
        <h2 id="delete-record-title" className="text-base font-semibold text-slate-800">حذف رکورد</h2>
        <p className="text-sm text-slate-700 leading-7">{label} حذف می‌شود.</p>
        <div className="flex justify-end gap-2">
          <button type="button" className="px-4 py-2 rounded-2xl border border-slate-200 text-sm" onClick={onCancel} disabled={deleting}>انصراف</button>
          <button type="button" className="px-4 py-2 rounded-2xl bg-red-700 text-white text-sm font-semibold disabled:opacity-60" onClick={onConfirm} disabled={deleting}>
            {deleting ? 'در حال حذف...' : 'حذف'}
          </button>
        </div>
      </div>
    </dialog>
  )
}

function localToday() {
  const now = new Date()
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 10)
}

function draftFrom(module: ModuleDef, record: CrmRecord | null) {
  const today = localToday()
  const draft: Record<string, string> = {}
  for (const field of module.fields) {
    const current = record?.attributes[field.name]
    if (current) draft[field.name] = incoming(field, current)
    else if (!record && field.kind === 'select' && field.required && field.options?.[0]) draft[field.name] = field.options[0].value
    else if (!record && field.kind === 'date' && field.required) draft[field.name] = today
    else if (!record && field.kind === 'datetime' && field.required) draft[field.name] = `${today}T09:00`
    else if (!record && field.name === 'graphs_per_row') draft[field.name] = '2'
    else draft[field.name] = ''
  }
  if (!record && draft.sales_stage) draft.probability = probabilityForStage(draft.sales_stage)
  return draft
}

function validate(module: ModuleDef, draft: Record<string, string>) {
  const errors: Record<string, string> = {}
  for (const field of module.fields) {
    const value = (draft[field.name] || '').trim()
    if (field.required && !value) errors[field.name] = `${field.label} را وارد کنید.`
    if (field.kind === 'email' && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) errors[field.name] = 'ایمیل معتبر وارد کنید.'
    if (field.kind === 'tel' && value && !/^[0-9+\-\s()]{6,20}$/.test(value)) errors[field.name] = 'شماره تلفن معتبر وارد کنید.'
    if (field.kind === 'number' && value && Number.isNaN(Number(value))) errors[field.name] = 'عدد معتبر وارد کنید.'
  }
  return errors
}

function inputType(field: FieldDef) {
  if (field.kind === 'email') return 'email'
  if (field.kind === 'number') return 'number'
  if (field.kind === 'date') return 'date'
  if (field.kind === 'datetime') return 'datetime-local'
  return 'text'
}

function outgoing(field: FieldDef, value: string) {
  const trimmed = value.trim()
  if (!trimmed) return ''
  if (field.kind === 'date') {
    const [year, month, day] = trimmed.split('-')
    if (!year || !month || !day) return trimmed
    return `${month}/${day}/${year}`
  }
  if (field.kind === 'datetime') {
    const [date, time] = trimmed.split('T')
    const [year, month, day] = date.split('-')
    if (!year || !month || !day) return trimmed
    return `${month}/${day}/${year} ${time || '00:00'}`
  }
  return trimmed
}

function incoming(field: FieldDef, value: string) {
  if (field.kind === 'date' || field.kind === 'datetime') {
    const iso = value.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?/)
    if (iso) return field.kind === 'datetime' ? `${iso[1]}-${iso[2]}-${iso[3]}T${iso[4] || '00'}:${iso[5] || '00'}` : `${iso[1]}-${iso[2]}-${iso[3]}`
    const us = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?: (\d{2}):(\d{2}))?/)
    if (us) {
      const date = `${us[3]}-${us[1].padStart(2, '0')}-${us[2].padStart(2, '0')}`
      return field.kind === 'datetime' ? `${date}T${us[4] || '00'}:${us[5] || '00'}` : date
    }
  }
  return value
}

function displayValue(field: FieldDef, value: string | undefined) {
  if (!value) return '—'
  if (field.kind === 'select') return optionLabel(field, value)
  return value
}

function recordTitle(module: ModuleDef, record: CrmRecord) {
  const named = [record.attributes.first_name, record.attributes.last_name].filter(Boolean).join(' ')
  return named || record.attributes.name || `این ${module.singular}`
}
