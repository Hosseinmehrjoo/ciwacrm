import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import {
  Building2, Calendar, FileText, Hash, Mail, MapPin, Phone, Tag, UserRound, Wallet,
} from 'lucide-react'
import { getModuleRecord, type CrmRecord } from '../api/records'
import { modules, optionLabel, type FieldDef, type ModuleDef } from '../crm/modules'
import { CaseUpdatesPanel, loadLines, relateLabel, RelatedPanel, type LineDraft, type RelateConfig } from './RecordExtras'

export function RecordDetail({
  module,
  record,
  onClose,
  onEdit,
  onOpenRelated,
}: {
  module: ModuleDef
  record: CrmRecord
  onClose: () => void
  onEdit?: () => void
  onOpenRelated?: (moduleId: string, related: CrmRecord) => void
}) {
  const titleId = useId()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [live, setLive] = useState(record)
  const [loading, setLoading] = useState(true)
  const [lines, setLines] = useState<LineDraft[]>([])
  const [relateLabels, setRelateLabels] = useState<Record<string, string>>({})

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog?.open) dialog?.showModal()
    return () => {
      if (dialog?.open) dialog.close()
    }
  }, [])

  useEffect(() => {
    let active = true
    setLoading(true)
    getModuleRecord(module.suite, record.id, true)
      .then((fresh) => {
        if (active) setLive(fresh)
      })
      .catch(() => {
        if (active) setLive(record)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [module.suite, record])

  useEffect(() => {
    if (!module.lines) return
    let active = true
    loadLines(record.id)
      .then((loaded) => {
        if (active) setLines(loaded)
      })
      .catch(() => {
        if (active) setLines([])
      })
    return () => {
      active = false
    }
  }, [module.lines, record.id])

  useEffect(() => {
    const relateFields = module.fields.filter((field) => field.kind === 'relate' && field.relate && live.attributes[field.name])
    if (relateFields.length === 0) {
      setRelateLabels({})
      return
    }
    let active = true
    Promise.all(relateFields.map(async (field) => {
      try {
        const related = await getModuleRecord(field.relate!.suite, live.attributes[field.name], true)
        return [field.name, relateLabel(related, field.relate as RelateConfig)] as const
      } catch {
        return [field.name, live.attributes[field.name]] as const
      }
    })).then((entries) => {
      if (active) setRelateLabels(Object.fromEntries(entries))
    })
    return () => {
      active = false
    }
  }, [live, module.fields])

  const title = recordTitle(module, live)
  const initials = initialsFrom(title)
  const highlightFields = module.fields.filter((field) => (
    field.kind === 'select' || field.name.includes('status') || field.name.includes('stage') || field.name.includes('priority')
    || field.name.includes('amount') || field.name.includes('total') || field.name === 'probability'
  )).filter((field) => live.attributes[field.name]).slice(0, 6)

  const detailFields = module.fields.filter((field) => field.kind !== 'password' && field.name !== 'ciwa_password')
  const primaryFields = detailFields.filter((field) => !highlightFields.some((item) => item.name === field.name))

  return (
    <dialog
      ref={dialogRef}
      className="crm-dialog crm-dialog-detail"
      aria-labelledby={titleId}
      onCancel={onClose}
      onClick={(event) => {
        if (event.target === dialogRef.current) onClose()
      }}
    >
      <div className="glass-card record-detail rounded-3xl overflow-hidden max-h-[90vh] flex flex-col">
        <header className="record-detail-hero relative px-5 sm:px-6 pt-5 pb-6">
          <div className="relative z-10 flex flex-col gap-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="record-detail-avatar shrink-0 grid place-items-center text-base font-bold">
                  {initials}
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-medium tracking-wide text-white/75 mb-1">{module.label}</p>
                  <h2 id={titleId} className="text-xl sm:text-2xl font-bold text-white truncate">{title}</h2>
                  <p className="text-sm text-white/80 mt-1 truncate">{heroSubtitle(module, live)}</p>
                </div>
              </div>
              <div className="flex shrink-0 flex-wrap justify-end gap-2">
                {onEdit && (
                  <button type="button" className="rounded-2xl bg-white/15 hover:bg-white/25 px-3 py-2 text-sm text-white border border-white/20" onClick={onEdit}>
                    ویرایش
                  </button>
                )}
                <button type="button" className="rounded-2xl bg-white/10 hover:bg-white/20 px-3 py-2 text-sm text-white border border-white/15" onClick={onClose}>
                  بستن
                </button>
              </div>
            </div>

            {highlightFields.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {highlightFields.map((field) => (
                  <span key={field.name} className="record-detail-chip inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs text-white">
                    <Tag size={12} />
                    <span className="opacity-80">{field.label}:</span>
                    <strong className="font-semibold">{formatField(field, live.attributes[field.name], relateLabels[field.name])}</strong>
                  </span>
                ))}
              </div>
            )}
          </div>
        </header>

        <div className="px-5 sm:px-6 py-5 overflow-y-auto flex flex-col gap-5">
          {loading && <p className="text-sm text-slate-500">در حال بارگذاری جزئیات...</p>}

          <section>
            <h3 className="text-sm font-semibold text-slate-800 mb-3">اطلاعات {module.singular}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {primaryFields.map((field) => {
                const value = formatField(field, live.attributes[field.name], relateLabels[field.name])
                if (value === '—') return null
                return (
                  <DetailTile
                    key={field.name}
                    label={field.label}
                    value={value}
                    wide={field.kind === 'textarea'}
                    icon={fieldIcon(field)}
                  />
                )
              })}
            </div>
          </section>

          {module.lines && lines.length > 0 && (
            <section className="rounded-2xl border border-slate-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-800">ردیف‌ها</h3>
                <span className="text-xs text-slate-500">{lines.length.toLocaleString('fa-IR')} مورد</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-right">
                  <thead>
                    <tr className="text-slate-500 border-b border-slate-100">
                      <th className="font-medium py-2 px-3">شرح</th>
                      <th className="font-medium py-2 px-3">تعداد</th>
                      <th className="font-medium py-2 px-3">قیمت</th>
                      <th className="font-medium py-2 px-3">جمع</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((line) => (
                      <tr key={line.key} className="border-b border-slate-50">
                        <td className="py-2.5 px-3 text-slate-800">{line.name || '—'}</td>
                        <td className="py-2.5 px-3 text-slate-700">{Number(line.qty || 0).toLocaleString('fa-IR')}</td>
                        <td className="py-2.5 px-3 text-slate-700">{Number(line.price || 0).toLocaleString('fa-IR')}</td>
                        <td className="py-2.5 px-3 text-slate-800 font-medium">
                          {(Number(line.qty || 0) * Number(line.price || 0)).toLocaleString('fa-IR')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {module.id === 'cases' && (
            <section className="rounded-2xl border border-slate-200 p-4">
              <CaseUpdatesPanel caseId={live.id} />
            </section>
          )}

          {module.links && module.links.length > 0 && (
            <section className="rounded-2xl border border-slate-200 p-4">
              <RelatedPanel
                suite={module.suite}
                id={live.id}
                links={module.links}
                onOpenRecord={onOpenRelated ? (suite, related) => {
                  const target = moduleBySuite(suite)
                  if (target) onOpenRelated(target.id, related)
                } : undefined}
              />
            </section>
          )}
        </div>
      </div>
    </dialog>
  )
}

function DetailTile({
  label,
  value,
  icon: Icon,
  wide,
}: {
  label: string
  value: string
  icon: typeof Mail
  wide?: boolean
}) {
  const isLink = value.startsWith('http') || value.includes('@') || /^[0-9+\-\s()]{6,}$/.test(value)
  let content: ReactNode = value
  if (value.includes('@') && value.includes('.')) {
    content = <a className="underline decoration-white/20 hover:decoration-white/60" href={`mailto:${value}`} dir="ltr">{value}</a>
  } else if (value.startsWith('http')) {
    content = <a className="underline decoration-white/20 hover:decoration-white/60" href={value} target="_blank" rel="noreferrer" dir="ltr">{value}</a>
  } else if (/^[0-9+\-\s()]{6,}$/.test(value)) {
    content = <a className="underline decoration-white/20 hover:decoration-white/60" href={`tel:${value.replace(/\s+/g, '')}`} dir="ltr">{value}</a>
  }

  return (
    <div className={`record-detail-tile rounded-2xl px-3.5 py-3 ${wide ? 'sm:col-span-2' : ''}`}>
      <div className="flex items-center gap-2 text-slate-500 mb-1.5">
        <Icon size={14} />
        <span className="text-[11px] font-medium">{label}</span>
      </div>
      <p className={`text-sm text-slate-800 leading-6 whitespace-pre-wrap break-words ${isLink ? '' : ''}`} dir={/[A-Za-z0-9@.:]/.test(value) && !/[\u0600-\u06FF]/.test(value) ? 'ltr' : undefined}>
        {content}
      </p>
    </div>
  )
}

function fieldIcon(field: FieldDef) {
  if (field.kind === 'email' || field.name.includes('email')) return Mail
  if (field.kind === 'tel' || field.name.includes('phone')) return Phone
  if (field.kind === 'date' || field.kind === 'datetime' || field.name.includes('date')) return Calendar
  if (field.kind === 'number' || field.name.includes('amount') || field.name.includes('total') || field.name.includes('price')) return Wallet
  if (field.name.includes('address') || field.name.includes('city') || field.name.includes('country')) return MapPin
  if (field.kind === 'relate' || field.name.includes('account') || field.name.includes('contact') || field.name.includes('user')) return UserRound
  if (field.name.includes('number') || field.name.includes('code')) return Hash
  if (field.name.includes('company') || field.name === 'name') return Building2
  return FileText
}

function formatField(field: FieldDef, value: string | undefined, relateText?: string) {
  if (!value) return '—'
  if (field.kind === 'relate') return relateText || value
  if (field.kind === 'select') return optionLabel(field, value)
  if (field.kind === 'number' || field.name.includes('amount') || field.name.includes('total') || field.name.includes('price') || field.name === 'probability') {
    const num = Number(value)
    if (!Number.isNaN(num)) return num.toLocaleString('fa-IR')
  }
  return value
}

export function recordTitle(module: ModuleDef, record: CrmRecord) {
  const named = [record.attributes.first_name, record.attributes.last_name].filter(Boolean).join(' ')
  return named || record.attributes.name || record.attributes.document_name || record.attributes.user_name || `این ${module.singular}`
}

function heroSubtitle(module: ModuleDef, record: CrmRecord) {
  const parts = [
    record.attributes.title,
    record.attributes.email1,
    record.attributes.phone_mobile || record.attributes.phone_work || record.attributes.phone_office,
    record.attributes.account_name,
    record.attributes.status || record.attributes.sales_stage || record.attributes.stage,
  ].filter(Boolean)
  return parts.slice(0, 3).join(' · ') || module.singular
}

function initialsFrom(title: string) {
  const parts = title.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '؟'
  if (parts.length === 1) return parts[0].slice(0, 2)
  return `${parts[0][0]}${parts[1][0]}`
}

export function moduleBySuite(suite: string) {
  return modules.find((item) => item.suite === suite)
}
