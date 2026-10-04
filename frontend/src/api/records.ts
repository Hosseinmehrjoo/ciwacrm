import { api } from './client'

export type CrmRecord = {
  id: string
  attributes: Record<string, string>
}

type JsonItem = { id?: string; attributes?: Record<string, unknown> }

type ListDocument = {
  data?: JsonItem[]
  meta?: { 'total-pages'?: number }
}

type RecordDocument = {
  data?: JsonItem
}

const MODULE_NAME = /^[A-Za-z][A-Za-z0-9_]*$/

export async function listContacts(options: { page: number; query: string; size?: number }) {
  const params = new URLSearchParams()
  params.set('page[size]', String(options.size || 20))
  params.set('page[number]', String(options.page))
  params.set('fields[Contacts]', 'first_name,last_name,phone_mobile,phone_work,email1,title,department')
  const query = options.query.trim()
  if (query) {
    params.set('filter[operator]', 'or')
    params.set('filter[first_name][like]', `%${query}%`)
    params.set('filter[last_name][like]', `%${query}%`)
    params.set('filter[phone_mobile][like]', `%${query}%`)
    params.set('filter[phone_work][like]', `%${query}%`)
  }
  return listModule('Contacts', params)
}

export async function listModule(module: string, params: URLSearchParams, quiet = false) {
  const document = await api<ListDocument>(`/api/crm/V8/module/${modulePath(module)}?${params.toString()}`, { quiet })
  return {
    records: (document.data ?? []).map(toRecord),
    totalPages: document.meta?.['total-pages'] ?? 1,
  }
}

export async function createModuleRecord(module: string, attributes: Record<string, string>) {
  const document = await api<RecordDocument>('/api/crm/V8/module', {
    method: 'POST',
    body: JSON.stringify({
      data: { type: modulePath(module), attributes },
    }),
  })
  return toRecord(document.data ?? {})
}

export async function updateModuleRecord(module: string, id: string, attributes: Record<string, string>) {
  const document = await api<RecordDocument>('/api/crm/V8/module', {
    method: 'PATCH',
    body: JSON.stringify({
      data: { type: modulePath(module), id, attributes },
    }),
  })
  return toRecord(document.data ?? {})
}

export async function deleteModuleRecord(module: string, id: string) {
  await api(`/api/crm/V8/module/${modulePath(module)}/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
}

export async function getModuleRecord(module: string, id: string, quiet = false) {
  const document = await api<RecordDocument>(`/api/crm/V8/module/${modulePath(module)}/${encodeURIComponent(id)}`, { quiet })
  return toRecord(document.data ?? {})
}

export async function listRelated(module: string, id: string, link: string) {
  const params = new URLSearchParams()
  params.set('page[size]', '20')
  const document = await api<ListDocument>(
    `/api/crm/V8/module/${modulePath(module)}/${encodeURIComponent(id)}/relationships/${encodeURIComponent(link)}?${params.toString()}`,
    { quiet: true },
  )
  return (document.data ?? []).map(toRecord)
}

function modulePath(module: string) {
  if (!MODULE_NAME.test(module)) throw new Error('نام ماژول مجاز نیست.')
  return module
}

function toRecord(item: JsonItem): CrmRecord {
  return {
    id: item.id || '',
    attributes: stringifyAttributes(item.attributes ?? {}),
  }
}

function stringifyAttributes(attributes: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(attributes).map(([key, value]) => [key, value == null ? '' : String(value)]),
  )
}
