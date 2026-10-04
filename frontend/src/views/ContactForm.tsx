import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { ApiError } from '../api/client'
import { createModuleRecord, updateModuleRecord, type CrmRecord } from '../api/records'

const fields = [
  { name: 'first_name', label: 'نام', autoComplete: 'given-name' },
  { name: 'last_name', label: 'نام خانوادگی', autoComplete: 'family-name', required: true },
  { name: 'title', label: 'سمت', autoComplete: 'organization-title' },
  { name: 'department', label: 'دپارتمان', autoComplete: 'organization' },
  { name: 'phone_mobile', label: 'موبایل', autoComplete: 'tel', inputMode: 'tel' as const },
  { name: 'phone_work', label: 'تلفن', autoComplete: 'tel', inputMode: 'tel' as const },
  { name: 'email1', label: 'ایمیل', autoComplete: 'email', type: 'email' },
] as const

type FieldName = (typeof fields)[number]['name']
type Draft = Record<FieldName, string>

const emptyDraft: Draft = {
  first_name: '',
  last_name: '',
  title: '',
  department: '',
  phone_mobile: '',
  phone_work: '',
  email1: '',
}

export function ContactForm({
  record,
  onClose,
  onSaved,
}: {
  record: CrmRecord | null
  onClose: () => void
  onSaved: () => void
}) {
  const titleId = useId()
  const summaryRef = useRef<HTMLDivElement>(null)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [draft, setDraft] = useState<Draft>(() => draftFrom(record))
  const [errors, setErrors] = useState<Partial<Record<FieldName, string>>>({})
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const editing = Boolean(record)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog?.open) dialog?.showModal()
    return () => {
      if (dialog?.open) dialog.close()
    }
  }, [])

  async function submit(event: FormEvent) {
    event.preventDefault()
    const nextErrors = validate(draft)
    setErrors(nextErrors)
    setFormError('')
    if (Object.keys(nextErrors).length > 0) {
      summaryRef.current?.focus()
      return
    }

    setSaving(true)
    try {
      const attributes = Object.fromEntries(
        Object.entries(draft)
          .map(([key, value]) => [key, value.trim()] as const)
          .filter(([, value]) => record || value !== ''),
      )
      if (record) await updateModuleRecord('Contacts', record.id, attributes)
      else await createModuleRecord('Contacts', attributes)
      onSaved()
    } catch (caught) {
      setFormError(caught instanceof ApiError ? caught.message : 'ذخیره مخاطب ناموفق بود.')
      summaryRef.current?.focus()
    } finally {
      setSaving(false)
    }
  }

  const errorEntries = Object.entries(errors) as [FieldName, string][]

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
      <form onSubmit={submit} className="glass-card rounded-2xl bg-white p-5 flex flex-col gap-4" noValidate>
        <div className="flex items-start justify-between gap-3">
          <h2 id={titleId} className="text-base font-semibold text-slate-800">
            {editing ? 'ویرایش مخاطب' : 'مخاطب جدید'}
          </h2>
          <button type="button" className="text-sm text-slate-600 px-2 py-1 rounded-lg hover:bg-slate-100" onClick={onClose} disabled={saving}>
            بستن
          </button>
        </div>

        {(errorEntries.length > 0 || formError) && (
          <div ref={summaryRef} tabIndex={-1} role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 outline-none">
            <p className="font-semibold">اطلاعات فرم کامل نیست.</p>
            {formError && <p className="mt-1">{formError}</p>}
            {errorEntries.length > 0 && (
              <ul className="mt-2 list-disc pr-4">
                {errorEntries.map(([name, message]) => (
                  <li key={name}>
                    <a className="underline" href={`#contact-${name}`}>{message}</a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {fields.map((field) => (
            <label key={field.name} className="flex flex-col gap-1 text-sm text-slate-700" htmlFor={`contact-${field.name}`}>
              <span>
                {field.label}
                {'required' in field && field.required ? <span className="text-red-700"> *</span> : null}
              </span>
              <input
                id={`contact-${field.name}`}
                name={field.name}
                value={draft[field.name]}
                autoComplete={field.autoComplete}
                inputMode={'inputMode' in field ? field.inputMode : undefined}
                type={'type' in field ? field.type : 'text'}
                required={'required' in field ? field.required : undefined}
                aria-invalid={Boolean(errors[field.name])}
                aria-describedby={errors[field.name] ? `contact-${field.name}-error` : undefined}
                onChange={(event) => setDraft((current) => ({ ...current, [field.name]: event.target.value }))}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-800 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
              />
              {errors[field.name] && (
                <span id={`contact-${field.name}-error`} className="text-xs text-red-700">{errors[field.name]}</span>
              )}
            </label>
          ))}
        </div>

        <div className="flex items-center justify-end gap-2">
          <button type="button" className="px-4 py-2 rounded-2xl border border-slate-200 text-sm text-slate-700" onClick={onClose} disabled={saving}>
            انصراف
          </button>
          <button type="submit" className="btn-primary rounded-2xl px-5 py-2 text-sm font-semibold disabled:opacity-60" disabled={saving}>
            {saving ? 'در حال ذخیره...' : 'ذخیره'}
          </button>
        </div>
      </form>
    </dialog>
  )
}

function draftFrom(record: CrmRecord | null): Draft {
  if (!record) return emptyDraft
  return {
    first_name: record.attributes.first_name || '',
    last_name: record.attributes.last_name || '',
    title: record.attributes.title || '',
    department: record.attributes.department || '',
    phone_mobile: record.attributes.phone_mobile || '',
    phone_work: record.attributes.phone_work || '',
    email1: record.attributes.email1 || '',
  }
}

function validate(draft: Draft) {
  const errors: Partial<Record<FieldName, string>> = {}
  if (!draft.last_name.trim()) errors.last_name = 'نام خانوادگی را وارد کنید.'
  if (draft.email1.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email1.trim())) {
    errors.email1 = 'ایمیل معتبر وارد کنید.'
  }
  for (const name of ['phone_mobile', 'phone_work'] as const) {
    const value = draft[name].trim()
    if (value && !/^[0-9+\-\s()]{6,20}$/.test(value)) errors[name] = 'شماره تلفن معتبر وارد کنید.'
  }
  return errors
}
