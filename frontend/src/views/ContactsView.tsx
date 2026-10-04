import { useEffect, useState, useRef } from 'react'
import { ApiError } from '../api/client'
import { deleteModuleRecord, listContacts, type CrmRecord } from '../api/records'
import { useSession } from '../auth/SessionProvider'
import { ContactForm } from './ContactForm'

export function ContactsView({ openCreateToken = 0 }: { openCreateToken?: number }) {
  const session = useSession()
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [revision, setRevision] = useState(0)
  const [records, setRecords] = useState<CrmRecord[]>([])
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(!session.demo)
  const [error, setError] = useState('')
  const [formRecord, setFormRecord] = useState<CrmRecord | null | undefined>(undefined)
  const [pendingDelete, setPendingDelete] = useState<CrmRecord | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (session.demo) return
    let active = true
    const handle = window.setTimeout(() => {
      setLoading(true)
      setError('')
      listContacts({ page, query })
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
          setError(caught instanceof ApiError ? caught.message : 'خواندن مخاطبین ناموفق بود.')
        })
        .finally(() => {
          if (active) setLoading(false)
        })
    }, 250)
    return () => {
      active = false
      window.clearTimeout(handle)
    }
  }, [page, query, revision, session.demo, session.logout])

  useEffect(() => {
    if (session.demo || openCreateToken === 0) return
    setFormRecord(null)
  }, [openCreateToken, session.demo])

  async function removeContact() {
    if (!pendingDelete) return
    setDeleting(true)
    setError('')
    try {
      await deleteModuleRecord('Contacts', pendingDelete.id)
      setPendingDelete(null)
      setRevision((current) => current + 1)
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 401) {
        void session.logout()
        return
      }
      setError(caught instanceof ApiError ? caught.message : 'حذف مخاطب ناموفق بود.')
      setPendingDelete(null)
    } finally {
      setDeleting(false)
    }
  }

  if (session.demo) {
    return (
      <section className="glass-card rounded-2xl p-6">
        <h2 className="text-sm font-semibold text-slate-800">مخاطبین</h2>
        <p className="text-sm text-slate-600 mt-3 leading-7">
          این فهرست وقتی هسته در دسترس باشد از سامانه خوانده می‌شود. الان اتصال برقرار نیست.
        </p>
      </section>
    )
  }

  return (
    <section className="glass-card rounded-2xl p-5 flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-slate-800">مخاطبین</h2>
        <button type="button" className="btn-primary rounded-2xl px-4 py-2 text-sm font-semibold" onClick={() => setFormRecord(null)}>
          افزودن مخاطب
        </button>
        <label className="sr-only" htmlFor="contact-search">جستجوی مخاطب</label>
        <input
          id="contact-search"
          value={query}
          onChange={(event) => {
            setPage(1)
            setQuery(event.target.value)
          }}
          placeholder="جستجو بر اساس نام"
          className="w-full max-w-xs rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
        />
      </div>

      {loading && <p className="text-sm text-slate-600">در حال خواندن مخاطبین...</p>}
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}

      {!loading && !error && records.length === 0 && (
        <p className="text-sm text-slate-600">مخاطبی با این مشخصات پیدا نشد.</p>
      )}

      {records.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-right">
            <thead>
              <tr className="text-slate-500 border-b border-slate-100">
                <th className="font-medium py-2 pl-3">نام</th>
                <th className="font-medium py-2 pl-3">سمت</th>
                <th className="font-medium py-2 pl-3">تلفن</th>
                <th className="font-medium py-2 pl-3">ایمیل</th>
                <th className="font-medium py-2">عملیات</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record) => {
                const name = [record.attributes.first_name, record.attributes.last_name].filter(Boolean).join(' ') || 'بدون نام'
                const phone = record.attributes.phone_mobile || record.attributes.phone_work || '—'
                return (
                  <tr key={record.id} className="border-b border-slate-50">
                    <td className="py-3 pl-3 font-medium text-slate-800">{name}</td>
                    <td className="py-3 pl-3 text-slate-600">{record.attributes.title || record.attributes.department || '—'}</td>
                    <td className="py-3 pl-3 text-slate-600">{phone}</td>
                    <td className="py-3 pl-3 text-slate-600">{record.attributes.email1 || '—'}</td>
                    <td className="py-3">
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
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <button type="button" className="px-3 py-1.5 rounded-xl border border-slate-200 disabled:opacity-40" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>
            قبلی
          </button>
          <span className="text-slate-600">{page} از {totalPages}</span>
          <button type="button" className="px-3 py-1.5 rounded-xl border border-slate-200 disabled:opacity-40" disabled={page >= totalPages} onClick={() => setPage((current) => current + 1)}>
            بعدی
          </button>
        </div>
      )}

      {formRecord !== undefined && (
        <ContactForm
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
        <DeleteContactDialog
          name={contactName(pendingDelete)}
          deleting={deleting}
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => void removeContact()}
        />
      )}
    </section>
  )
}

function contactName(record: CrmRecord) {
  return [record.attributes.first_name, record.attributes.last_name].filter(Boolean).join(' ') || 'این مخاطب'
}

function DeleteContactDialog({
  name,
  deleting,
  onCancel,
  onConfirm,
}: {
  name: string
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
      aria-labelledby="delete-contact-title"
      onCancel={(event) => {
        if (deleting) event.preventDefault()
        else onCancel()
      }}
    >
      <div className="glass-card rounded-2xl bg-white p-5 flex flex-col gap-4">
        <h2 id="delete-contact-title" className="text-base font-semibold text-slate-800">حذف مخاطب</h2>
        <p className="text-sm text-slate-700 leading-7">{name} حذف می‌شود.</p>
        <div className="flex justify-end gap-2">
          <button type="button" className="px-4 py-2 rounded-2xl border border-slate-200 text-sm" onClick={onCancel} disabled={deleting}>
            انصراف
          </button>
          <button type="button" className="px-4 py-2 rounded-2xl bg-red-700 text-white text-sm font-semibold disabled:opacity-60" onClick={onConfirm} disabled={deleting}>
            {deleting ? 'در حال حذف...' : 'حذف'}
          </button>
        </div>
      </div>
    </dialog>
  )
}
