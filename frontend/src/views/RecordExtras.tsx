import { useEffect, useState } from 'react'
import { createModuleRecord, deleteModuleRecord, getModuleRecord, listModule, listRelated, updateModuleRecord, type CrmRecord } from '../api/records'
import type { ModuleLink } from '../crm/modules'

const accountRelate = { suite: 'Accounts', label: 'name' }

export function RelateField({
  id,
  value,
  onChange,
  invalid,
}: {
  id: string
  value: string
  onChange: (value: string) => void
  invalid?: boolean
}) {
  const [query, setQuery] = useState('')
  const [label, setLabel] = useState('')
  const [options, setOptions] = useState<CrmRecord[]>([])
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!value) {
      setLabel('')
      return
    }
    let active = true
    getModuleRecord(accountRelate.suite, value, true)
      .then((record) => {
        if (active) setLabel(record.attributes[accountRelate.label] || value)
      })
      .catch(() => {
        if (active) setLabel(value)
      })
    return () => {
      active = false
    }
  }, [value])

  useEffect(() => {
    const term = query.trim()
    if (term.length < 1) {
      setOptions([])
      return
    }
    let active = true
    const handle = window.setTimeout(() => {
      const params = new URLSearchParams()
      params.set('page[size]', '8')
      params.set(`fields[${accountRelate.suite}]`, accountRelate.label)
      params.set(`filter[${accountRelate.label}][like]`, `%${term}%`)
      listModule(accountRelate.suite, params, true)
        .then((result) => {
          if (active) setOptions(result.records)
        })
        .catch(() => {
          if (active) setOptions([])
        })
    }, 250)
    return () => {
      active = false
      window.clearTimeout(handle)
    }
  }, [query])

  return (
    <div className="relative">
      <input
        id={id}
        value={open ? query : label}
        aria-invalid={invalid}
        placeholder="نام مشتری را بنویسید"
        onFocus={() => {
          setOpen(true)
          setQuery(label)
        }}
        onChange={(event) => {
          setQuery(event.target.value)
          setOpen(true)
          if (!event.target.value.trim()) onChange('')
        }}
        onBlur={() => {
          window.setTimeout(() => setOpen(false), 150)
        }}
        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-800 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
      />
      {open && options.length > 0 && (
        <ul className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-2xl border border-slate-200 bg-white py-1 shadow-lg">
          {options.map((option) => (
            <li key={option.id}>
              <button
                type="button"
                className="w-full px-4 py-2 text-right text-sm text-slate-800 hover:bg-slate-50"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  onChange(option.id)
                  setLabel(option.attributes[accountRelate.label] || '')
                  setQuery('')
                  setOpen(false)
                }}
              >
                {option.attributes[accountRelate.label]}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export type LineDraft = {
  key: string
  id?: string
  name: string
  qty: string
  price: string
}

export function emptyLine(): LineDraft {
  return { key: `${Date.now()}-${Math.random().toString(16).slice(2)}`, name: '', qty: '1', price: '' }
}

function plainNumber(value: string) {
  const number = Number(value)
  return Number.isFinite(number) ? String(number) : value
}

export function lineTotal(line: LineDraft) {
  const qty = Number(line.qty)
  const price = Number(line.price)
  if (!Number.isFinite(qty) || !Number.isFinite(price)) return 0
  return qty * price
}

export async function loadLines(parentId: string) {
  const params = new URLSearchParams()
  params.set('page[size]', '50')
  params.set('fields[AOS_Products_Quotes]', 'name,product_qty,product_list_price,parent_id')
  params.set('filter[parent_id][eq]', parentId)
  const result = await listModule('AOS_Products_Quotes', params, true)
  return result.records.map((record) => ({
    key: record.id,
    id: record.id,
    name: record.attributes.name || '',
    qty: plainNumber(record.attributes.product_qty || '1'),
    price: plainNumber(record.attributes.product_list_price || ''),
  }))
}

export async function persistLines(parentSuite: string, parentId: string, lines: LineDraft[], removedIds: string[], totalField: string) {
  const kept = lines.filter((line) => line.name.trim())
  for (const id of removedIds) {
    await deleteModuleRecord('AOS_Products_Quotes', id)
  }
  for (const line of kept) {
    const total = lineTotal(line).toFixed(2)
    const attributes: Record<string, string> = {
      name: line.name.trim(),
      product_qty: line.qty || '1',
      product_list_price: line.price || '0',
      product_unit_price: line.price || '0',
      product_total_price: total,
      vat: '0',
      vat_amt: '0',
      discount: 'Percentage',
      product_discount: '0',
      product_discount_amount: '0',
      parent_type: parentSuite,
      parent_id: parentId,
    }
    if (line.id) await updateModuleRecord('AOS_Products_Quotes', line.id, attributes)
    else await createModuleRecord('AOS_Products_Quotes', attributes)
  }
  const sum = kept.reduce((total, line) => total + lineTotal(line), 0).toFixed(2)
  await updateModuleRecord(parentSuite, parentId, { [totalField]: sum, total_amt: sum })
}

export function LineEditor({
  lines,
  onChange,
}: {
  lines: LineDraft[]
  onChange: (lines: LineDraft[]) => void
}) {
  const [products, setProducts] = useState<CrmRecord[]>([])

  useEffect(() => {
    const params = new URLSearchParams()
    params.set('page[size]', '50')
    params.set('fields[AOS_Products]', 'name,price')
    listModule('AOS_Products', params, true)
      .then((result) => setProducts(result.records))
      .catch(() => setProducts([]))
  }, [])

  function update(key: string, patch: Partial<LineDraft>) {
    onChange(lines.map((line) => (line.key === key ? { ...line, ...patch } : line)))
  }

  const sum = lines.reduce((total, line) => total + lineTotal(line), 0)

  return (
    <div className="sm:col-span-2 flex flex-col gap-2 rounded-2xl border border-slate-200 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-slate-800">ردیف‌ها</p>
        <button type="button" className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs text-slate-700" onClick={() => onChange([...lines, emptyLine()])}>
          ردیف جدید
        </button>
      </div>
      {lines.length === 0 && <p className="text-xs text-slate-600">هنوز ردیفی نیست. کالا یا خدمت را همین‌جا اضافه کنید.</p>}
      {lines.map((line) => (
        <div key={line.key} className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_5.5rem_6.5rem_auto]">
          <input
            value={line.name}
            placeholder="شرح"
            list={`products-${line.key}`}
            onChange={(event) => {
              const name = event.target.value
              const product = products.find((item) => item.attributes.name === name)
              update(line.key, { name, ...(product ? { price: product.attributes.price || line.price } : {}) })
            }}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-emerald-400"
          />
          <datalist id={`products-${line.key}`}>
            {products.map((product) => (
              <option key={product.id} value={product.attributes.name} />
            ))}
          </datalist>
          <input
            value={line.qty}
            inputMode="decimal"
            aria-label="تعداد"
            placeholder="تعداد"
            onChange={(event) => update(line.key, { qty: event.target.value })}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-emerald-400"
          />
          <input
            value={line.price}
            inputMode="decimal"
            aria-label="قیمت"
            placeholder="قیمت"
            onChange={(event) => update(line.key, { price: event.target.value })}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-emerald-400"
          />
          <button
            type="button"
            className="rounded-xl border border-red-200 px-3 py-2 text-xs text-red-700"
            onClick={() => onChange(lines.filter((item) => item.key !== line.key))}
          >
            حذف
          </button>
        </div>
      ))}
      {lines.length > 0 && (
        <p className="text-sm text-slate-700">جمع ردیف‌ها: {sum.toLocaleString('fa-IR')}</p>
      )}
    </div>
  )
}

function relatedTitle(link: ModuleLink, record: CrmRecord) {
  if (link.title === 'person') {
    return [record.attributes.first_name, record.attributes.last_name].filter(Boolean).join(' ') || 'بدون نام'
  }
  return record.attributes.name || 'بدون نام'
}

export function RelatedPanel({ suite, id, links }: { suite: string; id: string; links: ModuleLink[] }) {
  const [groups, setGroups] = useState<{ link: ModuleLink; records: CrmRecord[]; error: string }[]>([])

  useEffect(() => {
    let active = true
    Promise.all(links.map(async (link) => {
      try {
        const records = await listRelated(suite, id, link.link)
        return { link, records, error: '' }
      } catch (caught) {
        return { link, records: [], error: caught instanceof Error ? caught.message : 'خواندن رابطه‌ها ناموفق بود.' }
      }
    })).then((next) => {
      if (active) setGroups(next)
    })
    return () => {
      active = false
    }
  }, [suite, id, links])

  return (
    <div className="sm:col-span-2 flex flex-col gap-3">
      <p className="text-sm font-semibold text-slate-800">پرونده‌های مرتبط</p>
      {groups.map((group) => (
        <div key={group.link.link} className="rounded-2xl border border-slate-200 px-3 py-2">
          <p className="text-xs font-semibold text-slate-600">{group.link.label}</p>
          {group.error && <p className="mt-1 text-xs text-red-700">{group.error}</p>}
          {!group.error && group.records.length === 0 && <p className="mt-1 text-xs text-slate-500">موردی وصل نیست.</p>}
          {group.records.length > 0 && (
            <ul className="mt-1 flex flex-col gap-1">
              {group.records.map((record) => (
                <li key={record.id} className="text-sm text-slate-800">{relatedTitle(group.link, record)}</li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  )
}
