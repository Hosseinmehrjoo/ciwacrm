import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { ApiError } from '../api/client'
import { createModuleRecord, deleteModuleRecord, listModule, updateModuleRecord, type CrmRecord } from '../api/records'
import { useSession } from '../auth/SessionProvider'
import { moduleById, modulesInGroup, optionLabel, probabilityForStage, type FieldDef, type ModuleDef } from '../crm/modules'
import { SectionHelp } from '../help/SectionHelp'
import { OpportunityBoard } from './OpportunityBoard'
import { ReportBuilder } from './ReportBuilder'
import { moduleBySuite, RecordDetail, recordTitle } from './RecordDetail'
import { CaseUpdatesPanel, emptyLine, LineEditor, loadLines, persistLines, RelateField, RelatedPanel, type LineDraft } from './RecordExtras'

export function ModuleView({
  moduleId,
  openCreateToken = 0,
  createDefaults,
  externalQuery = '',
  onOpenModule,
  onQueryChange,
}: {
  moduleId: string
  openCreateToken?: number
  createDefaults?: Record<string, string>
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
  const [viewRecord, setViewRecord] = useState<{ moduleId: string; record: CrmRecord } | null>(null)
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
    setFormRecord(createDefaults && Object.keys(createDefaults).length > 0
      ? { id: '', attributes: { ...createDefaults } }
      : null)
  }, [createDefaults, openCreateToken, session.demo])

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
          <button
            type="button"
            className="rounded-2xl border border-slate-200 px-4 py-2 text-sm text-slate-700"
            onClick={() => exportCsv(module, records, columns)}
            disabled={records.length === 0}
          >
            خروجی CSV
          </button>
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
          onOpen={(record) => setViewRecord({ moduleId: module.id, record })}
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
                <tr
                  key={record.id}
                  className="border-b border-slate-50 cursor-pointer"
                  onClick={() => setViewRecord({ moduleId: module.id, record })}
                >
                  {columns.map((field) => (
                    <td key={field.name} className="py-3 pl-3 text-slate-700 whitespace-nowrap">
                      <button
                        type="button"
                        className="text-right hover:text-violet-300 underline-offset-4 hover:underline"
                        onClick={(event) => {
                          event.stopPropagation()
                          setViewRecord({ moduleId: module.id, record })
                        }}
                      >
                        {displayValue(field, record.attributes[field.name])}
                      </button>
                    </td>
                  ))}
                  <td className="py-3 whitespace-nowrap" onClick={(event) => event.stopPropagation()}>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="px-3 py-1.5 rounded-xl border border-emerald-200 text-emerald-800 bg-emerald-50/40"
                        onClick={() => setViewRecord({ moduleId: module.id, record })}
                      >
                        نمایش
                      </button>
                      <button type="button" className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700" onClick={() => setFormRecord(record)}>
                        ویرایش
                      </button>
                      <button
                        type="button"
                        className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700"
                        onClick={() => setFormRecord({ id: '', attributes: { ...record.attributes } })}
                      >
                        رونوشت
                      </button>
                      {module.id === 'leads' && record.attributes.status !== 'Converted' && (
                        <button
                          type="button"
                          className="px-3 py-1.5 rounded-xl border border-emerald-200 text-emerald-800"
                          onClick={() => void convertLead(record, () => setRevision((current) => current + 1), setError, session.logout)}
                        >
                          تبدیل
                        </button>
                      )}
                      {module.id === 'quotes' && (
                        <button
                          type="button"
                          className="px-3 py-1.5 rounded-xl border border-emerald-200 text-emerald-800"
                          onClick={() => void convertQuoteToInvoice(record, () => setRevision((current) => current + 1), setError, session.logout)}
                        >
                          تبدیل به فاکتور
                        </button>
                      )}
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

      {viewRecord && (() => {
        const viewModule = moduleById(viewRecord.moduleId) || module
        return (
          <RecordDetail
            module={viewModule}
            record={viewRecord.record}
            onClose={() => setViewRecord(null)}
            onEdit={() => {
              const editing = viewRecord.record
              setViewRecord(null)
              if (viewModule.id === module.id) setFormRecord(editing)
              else onOpenModule?.(viewModule.id)
            }}
            onOpenRelated={(moduleId, related) => setViewRecord({ moduleId, record: related })}
          />
        )
      })()}

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
          onOpenRelated={(suite, related) => {
            const target = moduleBySuite(suite)
            if (target) setViewRecord({ moduleId: target.id, record: related })
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
  onOpenRelated,
}: {
  module: ModuleDef
  record: CrmRecord | null
  onClose: () => void
  onSaved: () => void
  onOpenRelated?: (suite: string, related: CrmRecord) => void
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
  const [issuedLogin, setIssuedLogin] = useState<{ username: string, password: string } | null>(null)
  const isLoginModule = module.id === 'users' || module.id === 'employees'

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
    const nextErrors = validate(module, draft, record)
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
          .filter(([name, value]) => {
            if (name === 'ciwa_password' && !value) return false
            return record || savedId || value !== ''
          }),
      )
      let id = record?.id || savedId
      if (id) await updateModuleRecord(module.suite, id, attributes)
      else {
        const created = await createModuleRecord(module.suite, attributes)
        id = created.id
        setSavedId(id)
        if (isLoginModule && draft.user_name && draft.ciwa_password) {
          setIssuedLogin({ username: draft.user_name.trim(), password: draft.ciwa_password })
          setSaving(false)
          return
        }
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
            {issuedLogin ? 'حساب ورود آماده شد' : record?.id ? `ویرایش ${module.singular}` : `${module.singular} جدید`}
          </h2>
          <button type="button" className="text-sm text-slate-600 px-2 py-1 rounded-lg hover:bg-slate-100" onClick={onClose} disabled={saving}>بستن</button>
        </div>
        {issuedLogin && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-950">
            <p className="font-semibold mb-2">این مشخصات را به همکار بدهید. رمز دوباره نمایش داده نمی‌شود.</p>
            <div className="grid gap-2 font-mono text-[13px]" dir="ltr">
              <div className="flex items-center justify-between gap-3 rounded-xl bg-white/80 px-3 py-2">
                <span>username: <b>{issuedLogin.username}</b></span>
                <button type="button" className="text-xs text-emerald-800" onClick={() => void navigator.clipboard.writeText(issuedLogin.username)}>کپی</button>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-xl bg-white/80 px-3 py-2">
                <span>password: <b>{issuedLogin.password}</b></span>
                <button type="button" className="text-xs text-emerald-800" onClick={() => void navigator.clipboard.writeText(issuedLogin.password)}>کپی</button>
              </div>
              <button
                type="button"
                className="text-xs text-emerald-900 underline text-right"
                onClick={() => void navigator.clipboard.writeText(`username: ${issuedLogin.username}\npassword: ${issuedLogin.password}`)}
              >
                کپی هر دو
              </button>
            </div>
            <button type="button" className="btn-primary mt-4 rounded-2xl px-5 py-2 text-sm font-semibold" onClick={onSaved}>
              متوجه شدم
            </button>
          </div>
        )}
        {(errorEntries.length > 0 || formError) && !issuedLogin && (
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
        {!issuedLogin && (
          <>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {isLoginModule && !record && (
            <p className="sm:col-span-2 text-xs text-slate-600 leading-6 rounded-xl bg-slate-50 border border-slate-200 px-3 py-2">
              نام کاربری و رمز را وارد کنید. بعد از ذخیره، همین مشخصات برای تحویل به همکار نمایش داده می‌شود.
            </p>
          )}
          {module.fields.map((field) => (
            <label key={field.name} className={`flex flex-col gap-1 text-sm text-slate-700 ${field.kind === 'textarea' || field.kind === 'password' ? 'sm:col-span-2' : ''}`} htmlFor={`field-${field.name}`}>
              <span>
                {field.label}
                {field.required && !(field.kind === 'password' && record) ? <span className="text-red-700"> *</span> : null}
                {field.kind === 'password' && record ? <span className="text-slate-500 font-normal"> (خالی = بدون تغییر)</span> : null}
              </span>
              {field.kind === 'textarea' ? (
                <textarea
                  id={`field-${field.name}`}
                  value={draft[field.name] || ''}
                  aria-invalid={Boolean(errors[field.name])}
                  onChange={(event) => setDraft((current) => ({ ...current, [field.name]: event.target.value }))}
                  className="min-h-24 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-800 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                />
              ) : field.kind === 'relate' && field.relate ? (
                <RelateField
                  id={`field-${field.name}`}
                  value={draft[field.name] || ''}
                  invalid={Boolean(errors[field.name])}
                  relate={field.relate}
                  placeholder={`${field.label} را جستجو کنید`}
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
              ) : field.kind === 'password' ? (
                <div className="flex gap-2">
                  <input
                    id={`field-${field.name}`}
                    value={draft[field.name] || ''}
                    type="text"
                    autoComplete="new-password"
                    aria-invalid={Boolean(errors[field.name])}
                    onChange={(event) => setDraft((current) => ({ ...current, [field.name]: event.target.value }))}
                    className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-800 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                    dir="ltr"
                  />
                  <button
                    type="button"
                    className="shrink-0 rounded-2xl border border-slate-200 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50"
                    onClick={() => setDraft((current) => ({ ...current, [field.name]: generatePassword() }))}
                  >
                    ساخت رمز
                  </button>
                </div>
              ) : (
                <input
                  id={`field-${field.name}`}
                  value={draft[field.name] || ''}
                  type={inputType(field)}
                  inputMode={field.kind === 'tel' || field.kind === 'number' ? field.kind === 'number' ? 'decimal' : 'tel' : undefined}
                  aria-invalid={Boolean(errors[field.name])}
                  onChange={(event) => setDraft((current) => ({ ...current, [field.name]: event.target.value }))}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-800 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                  dir={field.name === 'user_name' ? 'ltr' : undefined}
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
          {(module.id === 'contacts' || module.id === 'leads' || module.id === 'accounts') && draft.email1?.includes('@') && (
            <a className="sm:col-span-2 text-sm text-slate-700 underline" href={`mailto:${draft.email1}`}>ارسال ایمیل با برنامهٔ نامهٔ شما</a>
          )}
          {module.id === 'cases' && (record?.id || savedId) && (
            <CaseUpdatesPanel caseId={record?.id || savedId} />
          )}
          {(record?.id || savedId) && module.links && module.links.length > 0 && (
            <RelatedPanel suite={module.suite} id={record?.id || savedId} links={module.links} onOpenRecord={onOpenRelated} />
          )}
        </div>
        <div className="flex items-center justify-end gap-2">
          <button type="button" className="px-4 py-2 rounded-2xl border border-slate-200 text-sm text-slate-700" onClick={onClose} disabled={saving}>انصراف</button>
          <button type="submit" className="btn-primary rounded-2xl px-5 py-2 text-sm font-semibold disabled:opacity-60" disabled={saving}>
            {saving ? 'در حال ذخیره...' : 'ذخیره'}
          </button>
        </div>
          </>
        )}
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
  const isNew = !record?.id
  const skipOnCopy = new Set(['case_number', 'bug_number', 'number', 'ciwa_password'])
  for (const field of module.fields) {
    if (field.kind === 'password') {
      draft[field.name] = isNew ? generatePassword() : ''
      continue
    }
    const current = record?.attributes[field.name]
    if (current && !(isNew && skipOnCopy.has(field.name))) draft[field.name] = incoming(field, current)
    else if (isNew && field.kind === 'select' && field.required && field.options?.[0] && !current) draft[field.name] = field.options[0].value
    else if (isNew && field.kind === 'date' && field.required && !current) draft[field.name] = today
    else if (isNew && field.kind === 'datetime' && field.required && !current) draft[field.name] = `${today}T09:00`
    else if (isNew && field.name === 'graphs_per_row' && !current) draft[field.name] = '2'
    else if (!current) draft[field.name] = ''
  }
  if (isNew && draft.sales_stage && !draft.probability) draft.probability = probabilityForStage(draft.sales_stage)
  return draft
}

function validate(module: ModuleDef, draft: Record<string, string>, record: CrmRecord | null = null) {
  const errors: Record<string, string> = {}
  for (const field of module.fields) {
    const value = (draft[field.name] || '').trim()
    const required = field.required && !(field.kind === 'password' && record)
    if (required && !value) errors[field.name] = `${field.label} را وارد کنید.`
    if (field.name === 'user_name' && value && !/^[A-Za-z0-9._-]{3,60}$/.test(value)) {
      errors[field.name] = 'نام کاربری فقط حروف انگلیسی، عدد، نقطه، خط تیره و زیرخط (حداقل ۳ کاراکتر).'
    }
    if (field.kind === 'password' && value && value.length < 8) errors[field.name] = 'رمز حداقل ۸ کاراکتر باشد.'
    if (field.kind === 'email' && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) errors[field.name] = 'ایمیل معتبر وارد کنید.'
    if (field.kind === 'tel' && value && !/^[0-9+\-\s()]{6,20}$/.test(value)) errors[field.name] = 'شماره تلفن معتبر وارد کنید.'
    if (field.kind === 'number' && value && Number.isNaN(Number(value))) errors[field.name] = 'عدد معتبر وارد کنید.'
  }
  return errors
}

function generatePassword() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%'
  const bytes = new Uint8Array(12)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (value) => alphabet[value % alphabet.length]).join('')
}

function inputType(field: FieldDef) {
  if (field.kind === 'email') return 'email'
  if (field.kind === 'number') return 'number'
  if (field.kind === 'date') return 'date'
  if (field.kind === 'datetime') return 'datetime-local'
  if (field.kind === 'password') return 'text'
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

function exportCsv(module: ModuleDef, records: CrmRecord[], columns: FieldDef[]) {
  const header = columns.map((field) => field.label)
  const rows = records.map((record) => columns.map((field) => {
    const raw = displayValue(field, record.attributes[field.name])
    const text = raw.split('"').join('""')
    return `"${text}"`
  }))
  const csv = ['\uFEFF' + header.join(','), ...rows.map((row) => row.join(','))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `${module.id}.csv`
  anchor.click()
  URL.revokeObjectURL(url)
}

async function convertLead(
  lead: CrmRecord,
  onDone: () => void,
  setError: (message: string) => void,
  logout: () => Promise<void>,
) {
  try {
    const accountName = lead.attributes.account_name?.trim() || [lead.attributes.first_name, lead.attributes.last_name].filter(Boolean).join(' ') || 'مشتری جدید'
    const account = await createModuleRecord('Accounts', {
      name: accountName,
      phone_office: lead.attributes.phone_work || lead.attributes.phone_mobile || '',
      email1: lead.attributes.email1 || '',
      website: lead.attributes.website || '',
      assigned_user_id: lead.attributes.assigned_user_id || '',
      description: lead.attributes.description || '',
    })
    const contact = await createModuleRecord('Contacts', {
      first_name: lead.attributes.first_name || '',
      last_name: lead.attributes.last_name || 'بدون نام',
      title: lead.attributes.title || '',
      phone_mobile: lead.attributes.phone_mobile || '',
      phone_work: lead.attributes.phone_work || '',
      email1: lead.attributes.email1 || '',
      account_id: account.id,
      lead_source: lead.attributes.lead_source || '',
      assigned_user_id: lead.attributes.assigned_user_id || '',
      description: lead.attributes.description || '',
    })
    if (lead.attributes.opportunity_amount) {
      const due = new Date()
      due.setMonth(due.getMonth() + 1)
      const local = new Date(due.getTime() - due.getTimezoneOffset() * 60000)
      const [year, month, day] = local.toISOString().slice(0, 10).split('-')
      await createModuleRecord('Opportunities', {
        name: `فرصت ${accountName}`,
        account_id: account.id,
        amount: lead.attributes.opportunity_amount,
        sales_stage: 'Prospecting',
        probability: '10',
        date_closed: `${month}/${day}/${year}`,
        lead_source: lead.attributes.lead_source || '',
        assigned_user_id: lead.attributes.assigned_user_id || '',
      })
    }
    await updateModuleRecord('Leads', lead.id, {
      status: 'Converted',
      account_name: accountName,
      contact_id: contact.id,
    })
    onDone()
  } catch (caught) {
    if (caught instanceof ApiError && caught.status === 401) {
      void logout()
      return
    }
    setError(caught instanceof ApiError ? caught.message : 'تبدیل سرنخ ناموفق بود.')
  }
}

async function convertQuoteToInvoice(
  quote: CrmRecord,
  onDone: () => void,
  setError: (message: string) => void,
  logout: () => Promise<void>,
) {
  try {
    const invoice = await createModuleRecord('AOS_Invoices', {
      name: quote.attributes.name || 'فاکتور',
      billing_account_id: quote.attributes.billing_account_id || '',
      billing_contact_id: quote.attributes.billing_contact_id || '',
      status: 'Unpaid',
      total_amount: quote.attributes.total_amount || '0',
      due_date: localToday().replace(/^(\d{4})-(\d{2})-(\d{2})$/, (_, y, m, d) => `${m}/${d}/${y}`),
      invoice_date: localToday().replace(/^(\d{4})-(\d{2})-(\d{2})$/, (_, y, m, d) => `${m}/${d}/${y}`),
      assigned_user_id: quote.attributes.assigned_user_id || '',
      description: quote.attributes.description || '',
      quote_number: quote.attributes.number || '',
    })
    const lines = await loadLines(quote.id)
    if (lines.length > 0) {
      await persistLines('AOS_Invoices', invoice.id, lines.map((line) => ({ ...line, id: undefined, key: `${line.key}-copy` })), [], 'total_amount')
    }
    onDone()
  } catch (caught) {
    if (caught instanceof ApiError && caught.status === 401) {
      void logout()
      return
    }
    setError(caught instanceof ApiError ? caught.message : 'تبدیل پیش‌فاکتور به فاکتور ناموفق بود.')
  }
}
