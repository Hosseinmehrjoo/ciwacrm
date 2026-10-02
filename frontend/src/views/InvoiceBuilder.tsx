import { useEffect, useMemo, useState } from 'react'
import { ApiError } from '../api/client'
import { createModuleRecord, deleteModuleRecord, getModuleRecord, listModule, updateModuleRecord, type CrmRecord } from '../api/records'
import { SectionHelp } from '../help/SectionHelp'

const ISSUER_KEY = 'ciwa-invoice-issuer'
const VAT_OPTIONS = [
  { value: '0.0', label: 'بدون مالیات' },
  { value: '5.0', label: '۵٪' },
  { value: '9.0', label: '۹٪' },
  { value: '10.0', label: '۱۰٪' },
]

const quoteStages = [
  ['Draft', 'پیش‌نویس'],
  ['Negotiation', 'مذاکره'],
  ['Delivered', 'تحویل شده'],
  ['Confirmed', 'تأیید شده'],
  ['Closed Accepted', 'پذیرفته'],
  ['Closed Lost', 'از دست رفته'],
] as const

const invoiceStatuses = [
  ['Unpaid', 'پرداخت نشده'],
  ['Paid', 'پرداخت شده'],
  ['Cancelled', 'لغو شده'],
] as const

type Kind = 'quote' | 'invoice'

type Issuer = {
  name: string
  phone: string
  address: string
  economic: string
  national: string
}

type BuilderLine = {
  key: string
  id?: string
  name: string
  qty: string
  price: string
  discount: string
  vat: string
}

type RecentDoc = {
  id: string
  kind: Kind
  name: string
  total: string
}

const emptyIssuer = (): Issuer => ({ name: '', phone: '', address: '', economic: '', national: '' })

function newLine(): BuilderLine {
  return { key: `${Date.now()}-${Math.random().toString(16).slice(2)}`, name: '', qty: '1', price: '', discount: '0', vat: '10.0' }
}

function plainNumber(value: string) {
  const number = Number(value)
  return Number.isFinite(number) ? String(number) : value
}

function lineMath(line: BuilderLine) {
  const qty = Number(line.qty)
  const price = Number(line.price)
  const discount = Number(line.discount)
  const vat = Number(line.vat)
  const safeQty = Number.isFinite(qty) ? qty : 0
  const safePrice = Number.isFinite(price) ? price : 0
  const safeDiscount = Number.isFinite(discount) ? Math.min(100, Math.max(0, discount)) : 0
  const safeVat = Number.isFinite(vat) ? vat : 0
  const gross = safeQty * safePrice
  const discountAmount = gross * safeDiscount / 100
  const net = gross - discountAmount
  const vatAmount = net * safeVat / 100
  return { gross, discountAmount, net, vatAmount, total: net + vatAmount }
}

function money(value: number) {
  return value.toLocaleString('fa-IR')
}

function todayIso() {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

function toEngineDate(iso: string) {
  const [year, month, day] = iso.split('-')
  if (!year || !month || !day) return ''
  return `${month}/${day}/${year}`
}

function fromEngineDate(value: string) {
  if (!value) return ''
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10)
  const us = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  if (!us) return ''
  return `${us[3]}-${us[1].padStart(2, '0')}-${us[2].padStart(2, '0')}`
}

function jalali(iso: string) {
  if (!iso) return '—'
  const date = new Date(`${iso}T12:00:00`)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('fa-IR-u-ca-persian', { year: 'numeric', month: 'long', day: 'numeric' }).format(date)
}

function readIssuer(): Issuer {
  try {
    const raw = localStorage.getItem(ISSUER_KEY)
    if (!raw) return emptyIssuer()
    const parsed = JSON.parse(raw) as Partial<Issuer>
    return { ...emptyIssuer(), ...parsed }
  } catch {
    return emptyIssuer()
  }
}

function kindMeta(kind: Kind) {
  if (kind === 'quote') {
    return { suite: 'AOS_Quotes', label: 'پیش‌فاکتور', statusField: 'stage', untilField: 'expiration', statuses: quoteStages }
  }
  return { suite: 'AOS_Invoices', label: 'فاکتور', statusField: 'status', untilField: 'due_date', statuses: invoiceStatuses }
}

export function InvoiceBuilder() {
  const [kind, setKind] = useState<Kind>('invoice')
  const [savedId, setSavedId] = useState('')
  const [name, setName] = useState('')
  const [number, setNumber] = useState('')
  const [status, setStatus] = useState<string>(invoiceStatuses[0][0])
  const [issued, setIssued] = useState(todayIso)
  const [until, setUntil] = useState('')
  const [notes, setNotes] = useState('')
  const [accountId, setAccountId] = useState('')
  const [accountName, setAccountName] = useState('')
  const [accountQuery, setAccountQuery] = useState('')
  const [accountOpen, setAccountOpen] = useState(false)
  const [accounts, setAccounts] = useState<CrmRecord[]>([])
  const [accountPhone, setAccountPhone] = useState('')
  const [accountCity, setAccountCity] = useState('')
  const [lines, setLines] = useState<BuilderLine[]>([newLine()])
  const [removedIds, setRemovedIds] = useState<string[]>([])
  const [products, setProducts] = useState<CrmRecord[]>([])
  const [issuer, setIssuer] = useState<Issuer>(readIssuer)
  const [recent, setRecent] = useState<RecentDoc[]>([])
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [saving, setSaving] = useState(false)
  const meta = kindMeta(kind)

  const totals = useMemo(() => {
    return lines.reduce((sum, line) => {
      const math = lineMath(line)
      return {
        gross: sum.gross + math.gross,
        discount: sum.discount + math.discountAmount,
        vat: sum.vat + math.vatAmount,
        total: sum.total + math.total,
      }
    }, { gross: 0, discount: 0, vat: 0, total: 0 })
  }, [lines])

  useEffect(() => {
    localStorage.setItem(ISSUER_KEY, JSON.stringify(issuer))
  }, [issuer])

  useEffect(() => {
    const params = new URLSearchParams()
    params.set('page[size]', '50')
    params.set('fields[AOS_Products]', 'name,price')
    listModule('AOS_Products', params, true).then((result) => setProducts(result.records)).catch(() => setProducts([]))
  }, [])

  useEffect(() => {
    let active = true
    refreshRecent().then((docs) => {
      if (active) setRecent(docs)
    }).catch(() => {
      if (active) setRecent([])
    })
    return () => {
      active = false
    }
  }, [savedId])

  useEffect(() => {
    const term = accountQuery.trim()
    if (term.length < 1) {
      setAccounts([])
      return
    }
    let active = true
    const handle = window.setTimeout(() => {
      const params = new URLSearchParams()
      params.set('page[size]', '8')
      params.set('fields[Accounts]', 'name,phone_office,billing_address_city')
      params.set('filter[name][like]', `%${term}%`)
      listModule('Accounts', params, true)
        .then((result) => {
          if (active) setAccounts(result.records)
        })
        .catch(() => {
          if (active) setAccounts([])
        })
    }, 250)
    return () => {
      active = false
      window.clearTimeout(handle)
    }
  }, [accountQuery])

  function updateLine(key: string, patch: Partial<BuilderLine>) {
    setLines((current) => current.map((line) => (line.key === key ? { ...line, ...patch } : line)))
  }

  function removeLine(line: BuilderLine) {
    if (line.id) setRemovedIds((current) => [...current, line.id!])
    setLines((current) => current.filter((item) => item.key !== line.key))
  }

  function resetDocument(nextKind: Kind = kind) {
    const next = kindMeta(nextKind)
    setKind(nextKind)
    setSavedId('')
    setName('')
    setNumber('')
    setStatus(next.statuses[0][0])
    setIssued(todayIso())
    setUntil('')
    setNotes('')
    setAccountId('')
    setAccountName('')
    setAccountPhone('')
    setAccountCity('')
    setLines([newLine()])
    setRemovedIds([])
    setError('')
    setNotice('')
  }

  async function openDocument(doc: RecentDoc) {
    setError('')
    setNotice('')
    const chosen = kindMeta(doc.kind)
    const record = await getModuleRecord(chosen.suite, doc.id)
    const params = new URLSearchParams()
    params.set('page[size]', '50')
    params.set('fields[AOS_Products_Quotes]', 'name,product_qty,product_list_price,product_discount,vat,parent_id')
    params.set('filter[parent_id][eq]', doc.id)
    const loaded = await listModule('AOS_Products_Quotes', params, true)
    const account = record.attributes.billing_account_id
    setKind(doc.kind)
    setSavedId(record.id)
    setName(record.attributes.name || '')
    setNumber(record.attributes.number || '')
    setStatus(record.attributes[chosen.statusField] || chosen.statuses[0][0])
    setIssued(fromEngineDate(record.attributes.invoice_date || record.attributes.date_entered || '') || todayIso())
    setUntil(fromEngineDate(record.attributes[chosen.untilField] || ''))
    setNotes(record.attributes.description || '')
    setAccountId(account || '')
    setLines(loaded.records.length > 0 ? loaded.records.map((item) => ({
      key: item.id,
      id: item.id,
      name: item.attributes.name || '',
      qty: plainNumber(item.attributes.product_qty || '1'),
      price: plainNumber(item.attributes.product_list_price || ''),
      discount: plainNumber(item.attributes.product_discount || '0'),
      vat: normalizeVat(item.attributes.vat || '0.0'),
    })) : [newLine()])
    setRemovedIds([])
    if (account) {
      const customer = await getModuleRecord('Accounts', account, true).catch(() => null)
      setAccountName(customer?.attributes.name || '')
      setAccountPhone(customer?.attributes.phone_office || '')
      setAccountCity(customer?.attributes.billing_address_city || '')
    } else {
      setAccountName('')
      setAccountPhone('')
      setAccountCity('')
    }
  }

  async function save() {
    setError('')
    setNotice('')
    if (!name.trim()) {
      setError('عنوان سند را بنویسید.')
      return
    }
    if (!accountId) {
      setError('مشتری سند را انتخاب کنید.')
      return
    }
    const kept = lines.filter((line) => line.name.trim())
    if (kept.length === 0) {
      setError('حداقل یک ردیف با شرح لازم است.')
      return
    }
    setSaving(true)
    try {
      const attributes: Record<string, string> = {
        name: name.trim(),
        billing_account_id: accountId,
        [meta.statusField]: status,
        description: notes.trim(),
        total_amount: totals.total.toFixed(2),
        total_amt: totals.gross.toFixed(2),
        discount_amount: totals.discount.toFixed(2),
        tax_amount: totals.vat.toFixed(2),
      }
      if (number.trim()) attributes.number = number.trim()
      if (kind === 'invoice' && issued) attributes.invoice_date = toEngineDate(issued)
      if (until) attributes[meta.untilField] = toEngineDate(until)
      let id = savedId
      if (id) await updateModuleRecord(meta.suite, id, attributes)
      else {
        const created = await createModuleRecord(meta.suite, attributes)
        id = created.id
        setSavedId(id)
      }
      for (const removed of removedIds) await deleteModuleRecord('AOS_Products_Quotes', removed)
      for (const line of kept) {
        const math = lineMath(line)
        const lineAttributes: Record<string, string> = {
          name: line.name.trim(),
          product_qty: line.qty || '1',
          product_list_price: line.price || '0',
          product_discount: String(Number(line.discount) || 0),
          discount: 'Percentage',
          product_discount_amount: math.discountAmount.toFixed(2),
          product_unit_price: (Number(line.price || 0) * (1 - (Number(line.discount) || 0) / 100)).toFixed(2),
          product_total_price: math.net.toFixed(2),
          vat: normalizeVat(line.vat),
          vat_amt: math.vatAmount.toFixed(2),
          parent_type: meta.suite,
          parent_id: id,
        }
        if (line.id) await updateModuleRecord('AOS_Products_Quotes', line.id, lineAttributes)
        else {
          const created = await createModuleRecord('AOS_Products_Quotes', lineAttributes)
          line.id = created.id
        }
      }
      setLines(kept.map((line) => ({ ...line })))
      setRemovedIds([])
      setNotice(`${meta.label} ذخیره شد.`)
      setRecent(await refreshRecent())
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'ذخیره سند ناموفق بود.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="flex flex-col gap-4 min-w-0">
      <div className="glass-card rounded-2xl p-4 sm:p-5 flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-slate-800">فاکتورساز پیشرفته</h2>
            <SectionHelp topic="invoice-builder" />
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700" onClick={() => resetDocument()}>سند تازه</button>
            <button type="button" className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700" onClick={() => window.print()}>چاپ</button>
            <button type="button" className="btn-primary rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-60" disabled={saving} onClick={() => void save()}>
              {saving ? 'در حال ذخیره...' : 'ذخیره'}
            </button>
          </div>
        </div>
        <div className="flex gap-2">
          {(['invoice', 'quote'] as const).map((item) => (
            <button
              key={item}
              type="button"
              disabled={Boolean(savedId) && item !== kind}
              className={`rounded-xl px-3 py-1.5 text-sm ${kind === item ? 'bg-emerald-600 text-white' : 'border border-slate-200 text-slate-700'} disabled:opacity-40`}
              onClick={() => {
                setKind(item)
                setStatus(kindMeta(item).statuses[0][0])
              }}
            >
              {kindMeta(item).label}
            </button>
          ))}
        </div>
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        {notice && <p role="status" className="text-sm text-slate-700">{notice}</p>}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex flex-col gap-4 min-w-0">
          <div className="glass-card rounded-2xl p-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm text-slate-700 sm:col-span-2">
              عنوان
              <input value={name} onChange={(event) => setName(event.target.value)} className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-800 outline-none" />
            </label>
            <label className="relative flex flex-col gap-1 text-sm text-slate-700">
              مشتری
              <input
                value={accountOpen ? accountQuery : accountName}
                placeholder="نام مشتری را بنویسید"
                onFocus={() => {
                  setAccountOpen(true)
                  setAccountQuery(accountName)
                }}
                onBlur={() => window.setTimeout(() => setAccountOpen(false), 150)}
                onChange={(event) => {
                  setAccountQuery(event.target.value)
                  setAccountOpen(true)
                  if (!event.target.value.trim()) {
                    setAccountId('')
                    setAccountName('')
                    setAccountPhone('')
                    setAccountCity('')
                  }
                }}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-800 outline-none"
              />
              {accountOpen && accounts.length > 0 && (
                <ul className="absolute z-20 top-full mt-1 max-h-48 w-full overflow-auto rounded-2xl border border-slate-200 bg-white py-1 shadow-lg">
                  {accounts.map((account) => (
                    <li key={account.id}>
                      <button
                        type="button"
                        className="w-full px-4 py-2 text-right text-sm text-slate-800 hover:bg-slate-50"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => {
                          setAccountId(account.id)
                          setAccountName(account.attributes.name || '')
                          setAccountPhone(account.attributes.phone_office || '')
                          setAccountCity(account.attributes.billing_address_city || '')
                          setAccountQuery('')
                          setAccountOpen(false)
                        }}
                      >
                        {account.attributes.name}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </label>
            <label className="flex flex-col gap-1 text-sm text-slate-700">
              شماره
              <input value={number} onChange={(event) => setNumber(event.target.value)} className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-800 outline-none" />
            </label>
            <label className="flex flex-col gap-1 text-sm text-slate-700">
              وضعیت
              <select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-800 outline-none">
                {meta.statuses.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm text-slate-700">
              تاریخ صدور
              <input type="date" value={issued} onChange={(event) => setIssued(event.target.value)} className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-800 outline-none" />
            </label>
            <label className="flex flex-col gap-1 text-sm text-slate-700">
              {kind === 'invoice' ? 'سررسید' : 'اعتبار تا'}
              <input type="date" value={until} onChange={(event) => setUntil(event.target.value)} className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-800 outline-none" />
            </label>
          </div>

          <div className="glass-card rounded-2xl p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-slate-800">ردیف‌ها</p>
              <button type="button" className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs text-slate-700" onClick={() => setLines((current) => [...current, newLine()])}>ردیف جدید</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[40rem] text-sm text-right">
                <thead>
                  <tr className="text-slate-500">
                    <th className="py-2 font-medium">شرح</th>
                    <th className="py-2 font-medium">تعداد</th>
                    <th className="py-2 font-medium">قیمت</th>
                    <th className="py-2 font-medium">تخفیف ٪</th>
                    <th className="py-2 font-medium">مالیات</th>
                    <th className="py-2 font-medium">جمع</th>
                    <th className="py-2 font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line) => (
                    <tr key={line.key} className="border-t border-slate-100">
                      <td className="py-2 pl-2">
                        <input
                          value={line.name}
                          list={`builder-products-${line.key}`}
                          placeholder="کالا یا خدمت"
                          aria-label="شرح ردیف"
                          onChange={(event) => {
                            const nextName = event.target.value
                            const product = products.find((item) => item.attributes.name === nextName)
                            updateLine(line.key, { name: nextName, ...(product ? { price: product.attributes.price || line.price } : {}) })
                          }}
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none"
                        />
                        <datalist id={`builder-products-${line.key}`}>
                          {products.map((product) => <option key={product.id} value={product.attributes.name} />)}
                        </datalist>
                      </td>
                      <td className="py-2 pl-2">
                        <input value={line.qty} inputMode="decimal" aria-label="تعداد" onChange={(event) => updateLine(line.key, { qty: event.target.value })} className="w-20 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none" />
                      </td>
                      <td className="py-2 pl-2">
                        <input value={line.price} inputMode="decimal" aria-label="قیمت" onChange={(event) => updateLine(line.key, { price: event.target.value })} className="w-28 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none" />
                      </td>
                      <td className="py-2 pl-2">
                        <input value={line.discount} inputMode="decimal" aria-label="درصد تخفیف" onChange={(event) => updateLine(line.key, { discount: event.target.value })} className="w-16 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none" />
                      </td>
                      <td className="py-2 pl-2">
                        <select value={normalizeVat(line.vat)} aria-label="مالیات" onChange={(event) => updateLine(line.key, { vat: event.target.value })} className="rounded-xl border border-slate-200 bg-white px-2 py-2 text-sm text-slate-800 outline-none">
                          {VAT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                        </select>
                      </td>
                      <td className="py-2 pl-2 whitespace-nowrap text-slate-700">{money(lineMath(line).total)}</td>
                      <td className="py-2">
                        <button type="button" className="rounded-xl border border-red-200 px-2 py-1 text-xs text-red-700" onClick={() => removeLine(line)}>حذف</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <label className="glass-card rounded-2xl p-4 flex flex-col gap-1 text-sm text-slate-700">
            توضیح پایین سند
            <textarea value={notes} onChange={(event) => setNotes(event.target.value)} className="min-h-20 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-800 outline-none" />
          </label>

          <div className="glass-card rounded-2xl p-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <p className="sm:col-span-2 text-sm font-semibold text-slate-800">مشخصات فروشنده</p>
            <label className="flex flex-col gap-1 text-sm text-slate-700">
              نام
              <input value={issuer.name} onChange={(event) => setIssuer({ ...issuer, name: event.target.value })} className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-800 outline-none" />
            </label>
            <label className="flex flex-col gap-1 text-sm text-slate-700">
              تلفن
              <input value={issuer.phone} onChange={(event) => setIssuer({ ...issuer, phone: event.target.value })} className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-800 outline-none" />
            </label>
            <label className="flex flex-col gap-1 text-sm text-slate-700 sm:col-span-2">
              نشانی
              <input value={issuer.address} onChange={(event) => setIssuer({ ...issuer, address: event.target.value })} className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-800 outline-none" />
            </label>
            <label className="flex flex-col gap-1 text-sm text-slate-700">
              کد اقتصادی
              <input value={issuer.economic} onChange={(event) => setIssuer({ ...issuer, economic: event.target.value })} className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-800 outline-none" />
            </label>
            <label className="flex flex-col gap-1 text-sm text-slate-700">
              شناسه ملی
              <input value={issuer.national} onChange={(event) => setIssuer({ ...issuer, national: event.target.value })} className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-800 outline-none" />
            </label>
          </div>
        </div>

        <aside className="xl:sticky xl:top-4 xl:self-start">
          <article className="invoice-sheet rounded-2xl p-5 shadow-lg">
            <header className="flex items-start justify-between gap-3 border-b border-slate-200 pb-3">
              <div>
                <p className="text-xs">{meta.label}</p>
                <h3 className="mt-1 text-base font-bold">{name || 'بدون عنوان'}</h3>
                <p className="mt-1 text-xs">شماره {number || '—'}</p>
              </div>
              <div className="text-left text-xs leading-6">
                <p>{jalali(issued)}</p>
                <p>{kind === 'invoice' ? 'سررسید' : 'اعتبار'}: {jalali(until)}</p>
                <p>{meta.statuses.find(([value]) => value === status)?.[1]}</p>
              </div>
            </header>
            <div className="mt-3 grid grid-cols-2 gap-3 text-xs leading-6">
              <div>
                <p className="font-semibold">فروشنده</p>
                <p>{issuer.name || '—'}</p>
                <p>{issuer.phone}</p>
                <p>{issuer.address}</p>
                {issuer.economic && <p>کد اقتصادی {issuer.economic}</p>}
                {issuer.national && <p>شناسه ملی {issuer.national}</p>}
              </div>
              <div>
                <p className="font-semibold">خریدار</p>
                <p>{accountName || '—'}</p>
                <p>{accountPhone}</p>
                <p>{accountCity}</p>
              </div>
            </div>
            <table className="mt-4 w-full text-xs">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="py-1 text-right font-medium">شرح</th>
                  <th className="py-1 font-medium">تعداد</th>
                  <th className="py-1 font-medium">مبلغ</th>
                </tr>
              </thead>
              <tbody>
                {lines.filter((line) => line.name.trim()).map((line) => (
                  <tr key={line.key} className="border-b border-slate-100">
                    <td className="py-1">{line.name}</td>
                    <td className="py-1 text-center">{line.qty}</td>
                    <td className="py-1 text-left">{money(lineMath(line).total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <dl className="mt-3 flex flex-col gap-1 text-xs">
              <div className="flex justify-between"><dt>جمع جزء</dt><dd>{money(totals.gross)}</dd></div>
              <div className="flex justify-between"><dt>تخفیف</dt><dd>{money(totals.discount)}</dd></div>
              <div className="flex justify-between"><dt>مالیات</dt><dd>{money(totals.vat)}</dd></div>
              <div className="flex justify-between text-sm font-bold"><dt>قابل پرداخت</dt><dd>{money(totals.total)}</dd></div>
            </dl>
            {notes.trim() && <p className="mt-3 text-xs leading-6">{notes}</p>}
          </article>
        </aside>
      </div>

      <div className="glass-card rounded-2xl p-4">
        <p className="text-sm font-semibold text-slate-800">سندهای اخیر</p>
        {recent.length === 0 && <p className="mt-2 text-sm text-slate-600">هنوز سندی برای باز کردن نیست.</p>}
        <ul className="mt-2 flex flex-col gap-2">
          {recent.map((doc) => (
            <li key={`${doc.kind}-${doc.id}`}>
              <button type="button" className="flex w-full items-center justify-between rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800" onClick={() => void openDocument(doc).catch(() => setError('باز کردن سند ناموفق بود.'))}>
                <span>{kindMeta(doc.kind).label} · {doc.name}</span>
                <span>{money(Number(doc.total) || 0)}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

function normalizeVat(value: string) {
  const number = Number(value)
  const match = VAT_OPTIONS.find((option) => Number(option.value) === number)
  return match?.value || '0.0'
}

async function refreshRecent() {
  const docs: RecentDoc[] = []
  for (const kind of ['invoice', 'quote'] as const) {
    const meta = kindMeta(kind)
    const params = new URLSearchParams()
    params.set('page[size]', '8')
    params.set(`fields[${meta.suite}]`, 'name,total_amount')
    const result = await listModule(meta.suite, params, true)
    for (const record of result.records) {
      docs.push({ id: record.id, kind, name: record.attributes.name || 'بدون عنوان', total: record.attributes.total_amount || '0' })
    }
  }
  return docs
}
