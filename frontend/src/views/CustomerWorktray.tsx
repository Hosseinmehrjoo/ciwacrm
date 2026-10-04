import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  Briefcase, Building2, FileText, Headphones, Mail, Phone, Plus, RefreshCw, Search, Ticket, TrendingUp, Users,
} from 'lucide-react'
import { ApiError } from '../api/client'
import { listPhoneRecordings, type PhoneRecording } from '../addons/phoneApi'
import { getModuleRecord, listModule, listRelated, type CrmRecord } from '../api/records'
import { useSession } from '../auth/SessionProvider'
import { moduleById } from '../crm/modules'
import { SectionHelp } from '../help/SectionHelp'
import { RecordDetail } from './RecordDetail'

type TrayTab =
  | 'overview'
  | 'contacts'
  | 'opportunities'
  | 'cases'
  | 'finance'
  | 'activities'
  | 'documents'
  | 'conversations'

type RelatedBundle = {
  contacts: CrmRecord[]
  opportunities: CrmRecord[]
  cases: CrmRecord[]
  leads: CrmRecord[]
  quotes: CrmRecord[]
  invoices: CrmRecord[]
  contracts: CrmRecord[]
  tasks: CrmRecord[]
  meetings: CrmRecord[]
  calls: CrmRecord[]
  notes: CrmRecord[]
  documents: CrmRecord[]
  projects: CrmRecord[]
}

const emptyBundle = (): RelatedBundle => ({
  contacts: [],
  opportunities: [],
  cases: [],
  leads: [],
  quotes: [],
  invoices: [],
  contracts: [],
  tasks: [],
  meetings: [],
  calls: [],
  notes: [],
  documents: [],
  projects: [],
})

const baseTabs: { id: TrayTab; label: string }[] = [
  { id: 'overview', label: 'خلاصه' },
  { id: 'contacts', label: 'مخاطبین' },
  { id: 'opportunities', label: 'فرصت‌ها' },
  { id: 'cases', label: 'تیکت‌ها' },
  { id: 'finance', label: 'مالی' },
  { id: 'activities', label: 'فعالیت‌ها' },
  { id: 'documents', label: 'اسناد' },
]

export function CustomerWorktray({
  onOpen,
  phoneEnabled = false,
}: {
  onOpen: (id: string) => void
  phoneEnabled?: boolean
}) {
  const session = useSession()
  const [query, setQuery] = useState('')
  const [accounts, setAccounts] = useState<CrmRecord[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [account, setAccount] = useState<CrmRecord | null>(null)
  const [related, setRelated] = useState<RelatedBundle>(emptyBundle)
  const [tab, setTab] = useState<TrayTab>('overview')
  const [loadingList, setLoadingList] = useState(true)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)
  const [recordings, setRecordings] = useState<PhoneRecording[]>([])
  const [recordingsError, setRecordingsError] = useState('')
  const [loadingRecordings, setLoadingRecordings] = useState(false)
  const [playingId, setPlayingId] = useState('')
  const [viewRecord, setViewRecord] = useState<{ moduleId: string; record: CrmRecord } | null>(null)

  const tabs = useMemo(() => (
    phoneEnabled
      ? [...baseTabs.slice(0, 6), { id: 'conversations' as const, label: 'مکالمات' }, ...baseTabs.slice(6)]
      : baseTabs
  ), [phoneEnabled])

  useEffect(() => {
    if (session.demo) return
    let active = true
    const handle = window.setTimeout(() => {
      setLoadingList(true)
      const params = new URLSearchParams()
      params.set('page[size]', '30')
      params.set('fields[Accounts]', 'name,phone_office,email1,website,billing_address_city,industry,account_type,assigned_user_id')
      const term = query.trim()
      if (term) {
        params.set('filter[operator]', 'or')
        params.set('filter[name][like]', `%${term}%`)
        params.set('filter[phone_office][like]', `%${term}%`)
        params.set('filter[email1][like]', `%${term}%`)
      }
      listModule('Accounts', params)
        .then((result) => {
          if (!active) return
          setAccounts(result.records)
          setSelectedId((current) => current || result.records[0]?.id || '')
        })
        .catch((caught: unknown) => {
          if (!active) return
          if (caught instanceof ApiError && caught.status === 401) {
            void session.logout()
            return
          }
          setError(caught instanceof ApiError ? caught.message : 'خواندن مشتریان ناموفق بود.')
        })
        .finally(() => {
          if (active) setLoadingList(false)
        })
    }, 250)
    return () => {
      active = false
      window.clearTimeout(handle)
    }
  }, [query, revision, session.demo, session.logout])

  useEffect(() => {
    if (session.demo || !selectedId) {
      setAccount(null)
      setRelated(emptyBundle())
      return
    }
    let active = true
    setLoadingDetail(true)
    setError('')
    void (async () => {
      try {
        const detail = await getModuleRecord('Accounts', selectedId)
        if (!active) return
        setAccount(detail)
        const entries = await Promise.all([
          safeRelated('Accounts', selectedId, 'contacts'),
          safeRelated('Accounts', selectedId, 'opportunities'),
          safeRelated('Accounts', selectedId, 'cases'),
          safeRelated('Accounts', selectedId, 'leads'),
          safeRelated('Accounts', selectedId, 'aos_quotes'),
          safeRelated('Accounts', selectedId, 'aos_invoices'),
          safeRelated('Accounts', selectedId, 'aos_contracts'),
          safeRelated('Accounts', selectedId, 'tasks'),
          safeRelated('Accounts', selectedId, 'meetings'),
          safeRelated('Accounts', selectedId, 'calls'),
          safeRelated('Accounts', selectedId, 'notes'),
          safeRelated('Accounts', selectedId, 'documents'),
          safeRelated('Accounts', selectedId, 'project'),
        ])
        if (!active) return
        setRelated({
          contacts: entries[0],
          opportunities: entries[1],
          cases: entries[2],
          leads: entries[3],
          quotes: entries[4],
          invoices: entries[5],
          contracts: entries[6],
          tasks: entries[7],
          meetings: entries[8],
          calls: entries[9],
          notes: entries[10],
          documents: entries[11],
          projects: entries[12],
        })
      } catch (caught) {
        if (!active) return
        if (caught instanceof ApiError && caught.status === 401) {
          void session.logout()
          return
        }
        setError(caught instanceof ApiError ? caught.message : 'خواندن کارتابل مشتری ناموفق بود.')
      } finally {
        if (active) setLoadingDetail(false)
      }
    })()
    return () => {
      active = false
    }
  }, [selectedId, revision, session.demo, session.logout])

  useEffect(() => {
    if (!phoneEnabled || session.demo || !account) {
      setRecordings([])
      setRecordingsError('')
      return
    }
    let active = true
    setLoadingRecordings(true)
    setRecordingsError('')
    const numbers = collectCustomerNumbers(account, related.contacts)
    listPhoneRecordings({ numbers })
      .then((result) => {
        if (!active) return
        setRecordings(result.items || [])
      })
      .catch((caught: unknown) => {
        if (!active) return
        setRecordings([])
        setRecordingsError(caught instanceof ApiError ? caught.message : 'خواندن مکالمات از CIWA Telecom ناموفق بود.')
      })
      .finally(() => {
        if (active) setLoadingRecordings(false)
      })
    return () => {
      active = false
    }
  }, [account, phoneEnabled, related.contacts, revision, session.demo])

  useEffect(() => {
    if (!phoneEnabled && tab === 'conversations') setTab('overview')
  }, [phoneEnabled, tab])

  const openCases = related.cases.filter((item) => (item.attributes.state || item.attributes.status || '').toLowerCase().includes('open') || (item.attributes.status || '').startsWith('Open'))
  const openOpps = related.opportunities.filter((item) => !['Closed Won', 'Closed Lost'].includes(item.attributes.sales_stage || ''))
  const unpaidInvoices = related.invoices.filter((item) => (item.attributes.status || '') === 'Unpaid')

  const timeline = useMemo(() => {
    const rows = [
      ...related.calls.map((item) => ({ id: item.id, kind: 'تماس', title: item.attributes.name || 'تماس', when: item.attributes.date_start || item.attributes.date_entered || '' })),
      ...related.meetings.map((item) => ({ id: item.id, kind: 'قرار', title: item.attributes.name || 'قرار', when: item.attributes.date_start || item.attributes.date_entered || '' })),
      ...related.tasks.map((item) => ({ id: item.id, kind: 'وظیفه', title: item.attributes.name || 'وظیفه', when: item.attributes.date_due || item.attributes.date_entered || '' })),
      ...related.notes.map((item) => ({ id: item.id, kind: 'یادداشت', title: item.attributes.name || 'یادداشت', when: item.attributes.date_entered || '' })),
      ...related.cases.map((item) => ({ id: item.id, kind: 'تیکت', title: item.attributes.name || 'تیکت', when: item.attributes.date_entered || '' })),
    ]
    return rows.sort((a, b) => String(b.when).localeCompare(String(a.when))).slice(0, 12)
  }, [related])

  if (session.demo) {
    return (
      <section className="glass-card rounded-2xl p-6">
        <h2 className="text-sm font-semibold text-slate-800">کارتابل مشتری</h2>
        <p className="text-sm text-slate-600 mt-3 leading-7">این بخش وقتی هسته در دسترس باشد فعال می‌شود.</p>
      </section>
    )
  }

  return (
    <section className="flex flex-col gap-4 min-w-0">
      <div className="glass-card rounded-2xl p-4 sm:p-5 flex flex-col gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(99,102,241,0.15)' }}>
              <Briefcase size={18} className="text-indigo-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-slate-800">کارتابل مشتری</h2>
                <SectionHelp topic="customer-worktray" />
              </div>
              <p className="text-xs text-slate-500 mt-0.5">همهٔ پرونده‌ها، فعالیت‌ها و مالی یک مشتری در یک صفحه</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="rounded-2xl border border-slate-200 px-3 py-2 text-xs text-slate-700 inline-flex items-center gap-1.5" onClick={() => setRevision((n) => n + 1)}>
              <RefreshCw size={14} />
              بروزرسانی
            </button>
            <button type="button" className="rounded-2xl border border-slate-200 px-3 py-2 text-xs text-slate-700" onClick={() => onOpen('accounts')}>
              فهرست مشتریان
            </button>
            <button type="button" className="btn-primary rounded-2xl px-3 py-2 text-xs font-semibold inline-flex items-center gap-1.5" onClick={() => onOpen('accounts')}>
              <Plus size={14} />
              مشتری جدید
            </button>
          </div>
        </div>
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      </div>

      <div className="grid gap-4 xl:grid-cols-[18rem_minmax(0,1fr)]">
        <aside className="glass-card rounded-2xl p-3 flex flex-col gap-3 min-h-[28rem]">
          <label className="relative block">
            <span className="sr-only">جستجوی مشتری</span>
            <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="جستجو نام، تلفن یا ایمیل..."
              className="w-full rounded-2xl border border-slate-200 bg-white pr-9 pl-3 py-2 text-sm outline-none focus:border-emerald-400"
            />
          </label>
          <div className="flex-1 overflow-y-auto flex flex-col gap-1">
            {loadingList && <p className="text-xs text-slate-500 px-2 py-3">در حال خواندن مشتریان...</p>}
            {!loadingList && accounts.length === 0 && <p className="text-xs text-slate-500 px-2 py-3">مشتری پیدا نشد.</p>}
            {accounts.map((item) => {
              const active = item.id === selectedId
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setSelectedId(item.id)
                    setTab('overview')
                  }}
                  className={`rounded-2xl px-3 py-2.5 text-right transition ${active ? 'bg-indigo-600 text-white' : 'hover:bg-white/70 text-slate-700'}`}
                >
                  <p className="text-sm font-medium truncate">{item.attributes.name || 'بدون نام'}</p>
                  <p className={`text-[11px] mt-0.5 truncate ${active ? 'text-white/80' : 'text-slate-500'}`}>
                    {item.attributes.phone_office || item.attributes.email1 || item.attributes.billing_address_city || '—'}
                  </p>
                </button>
              )
            })}
          </div>
        </aside>

        <div className="glass-card rounded-2xl p-4 sm:p-5 flex flex-col gap-4 min-w-0">
          {!selectedId && <p className="text-sm text-slate-600">یک مشتری را از فهرست انتخاب کنید.</p>}
          {selectedId && loadingDetail && <p className="text-sm text-slate-600">در حال بارگذاری کارتابل...</p>}
          {selectedId && !loadingDetail && account && (
            <>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <button
                    type="button"
                    className="flex items-center gap-2 text-right min-w-0"
                    onClick={() => setViewRecord({ moduleId: 'accounts', record: account })}
                  >
                    <Building2 size={18} className="text-indigo-600 shrink-0" />
                    <h3 className="text-base font-semibold text-slate-800 truncate hover:underline underline-offset-4">{account.attributes.name}</h3>
                  </button>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
                    {account.attributes.phone_office && (
                      <span className="inline-flex items-center gap-1"><Phone size={12} />{account.attributes.phone_office}</span>
                    )}
                    {account.attributes.email1 && (
                      <a className="inline-flex items-center gap-1 underline" href={`mailto:${account.attributes.email1}`}><Mail size={12} />{account.attributes.email1}</a>
                    )}
                    {account.attributes.website && <span>{account.attributes.website}</span>}
                    {account.attributes.billing_address_city && <span>{account.attributes.billing_address_city}</span>}
                    {account.attributes.industry && <span>{account.attributes.industry}</span>}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="rounded-xl border border-emerald-200 bg-emerald-50/40 px-2.5 py-1.5 text-xs text-emerald-800"
                    onClick={() => setViewRecord({ moduleId: 'accounts', record: account })}
                  >
                    نمایش جزئیات
                  </button>
                  <QuickLink label="تیکت" onClick={() => onOpen('cases')} />
                  <QuickLink label="فرصت" onClick={() => onOpen('opportunities')} />
                  <QuickLink label="فاکتور" onClick={() => onOpen('invoices')} />
                  <QuickLink label="تماس" onClick={() => onOpen('calls')} />
                </div>
              </div>

              <div className={`grid grid-cols-2 gap-2 ${phoneEnabled ? 'sm:grid-cols-5' : 'sm:grid-cols-4'}`}>
                <StatCard icon={Users} label="مخاطب" value={related.contacts.length} />
                <StatCard icon={TrendingUp} label="فرصت باز" value={openOpps.length} />
                <StatCard icon={Ticket} label="تیکت باز" value={openCases.length || related.cases.length} />
                <StatCard icon={FileText} label="فاکتور پرداخت‌نشده" value={unpaidInvoices.length} />
                {phoneEnabled && <StatCard icon={Headphones} label="مکالمه" value={recordings.length} />}
              </div>

              <div className="flex flex-wrap gap-1.5 border-b border-slate-100 pb-2">
                {tabs.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setTab(item.id)}
                    className={`rounded-xl px-3 py-1.5 text-xs font-medium ${tab === item.id ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {tab === 'overview' && (
                <div className="grid gap-4 lg:grid-cols-2">
                  <Panel title="آخرین فعالیت‌ها">
                    {timeline.length === 0 && <Empty />}
                    <ul className="flex flex-col gap-2">
                      {timeline.map((item) => (
                        <li key={`${item.kind}-${item.id}`}>
                          <button
                            type="button"
                            className="w-full rounded-xl bg-slate-50 px-3 py-2 text-right hover:bg-slate-100"
                            onClick={() => {
                              const moduleId = timelineModuleId(item.kind)
                              const source = timelineRecord(item, related)
                              if (moduleId && source) setViewRecord({ moduleId, record: source })
                            }}
                          >
                            <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500">
                              <span>{item.kind}</span>
                              <span dir="ltr">{item.when || '—'}</span>
                            </div>
                            <p className="text-sm text-slate-800 mt-0.5">{item.title}</p>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </Panel>
                  <div className="flex flex-col gap-4">
                    <Panel title="مخاطبین کلیدی">
                      <RecordList
                        records={related.contacts.slice(0, 5)}
                        title={(r) => personName(r)}
                        subtitle={(r) => r.attributes.title || r.attributes.email1 || r.attributes.phone_mobile || '—'}
                        onOpen={(r) => setViewRecord({ moduleId: 'contacts', record: r })}
                      />
                    </Panel>
                    <Panel title="تیکت‌ها">
                      <RecordList
                        records={related.cases.slice(0, 5)}
                        title={(r) => r.attributes.name || 'تیکت'}
                        subtitle={(r) => r.attributes.status || r.attributes.priority || '—'}
                        onOpen={(r) => setViewRecord({ moduleId: 'cases', record: r })}
                      />
                    </Panel>
                  </div>
                </div>
              )}

              {tab === 'contacts' && (
                <Panel title="مخاطبین">
                  <RecordList
                    records={related.contacts}
                    title={(r) => personName(r)}
                    subtitle={(r) => [r.attributes.title, r.attributes.phone_mobile || r.attributes.phone_work, r.attributes.email1].filter(Boolean).join(' · ') || '—'}
                    onOpen={(r) => setViewRecord({ moduleId: 'contacts', record: r })}
                  />
                  {related.leads.length > 0 && (
                    <div className="mt-4">
                      <p className="text-xs font-semibold text-slate-500 mb-2">سرنخ‌های مرتبط</p>
                      <RecordList
                        records={related.leads}
                        title={(r) => personName(r)}
                        subtitle={(r) => r.attributes.status || '—'}
                        onOpen={(r) => setViewRecord({ moduleId: 'leads', record: r })}
                      />
                    </div>
                  )}
                </Panel>
              )}

              {tab === 'opportunities' && (
                <Panel title="فرصت‌های فروش">
                  <RecordList
                    records={related.opportunities}
                    title={(r) => r.attributes.name || 'فرصت'}
                    subtitle={(r) => [r.attributes.sales_stage, r.attributes.amount, r.attributes.date_closed].filter(Boolean).join(' · ') || '—'}
                    onOpen={(r) => setViewRecord({ moduleId: 'opportunities', record: r })}
                  />
                  {related.projects.length > 0 && (
                    <div className="mt-4">
                      <p className="text-xs font-semibold text-slate-500 mb-2">پروژه‌ها</p>
                      <RecordList
                        records={related.projects}
                        title={(r) => r.attributes.name || 'پروژه'}
                        subtitle={(r) => r.attributes.status || '—'}
                        onOpen={(r) => setViewRecord({ moduleId: 'projects', record: r })}
                      />
                    </div>
                  )}
                </Panel>
              )}

              {tab === 'cases' && (
                <Panel title="تیکت‌های پشتیبانی">
                  <RecordList
                    records={related.cases}
                    title={(r) => r.attributes.name || 'تیکت'}
                    subtitle={(r) => [r.attributes.status, r.attributes.priority, r.attributes.case_number].filter(Boolean).join(' · ') || '—'}
                    onOpen={(r) => setViewRecord({ moduleId: 'cases', record: r })}
                  />
                </Panel>
              )}

              {tab === 'finance' && (
                <div className="grid gap-4 lg:grid-cols-3">
                  <Panel title="پیش‌فاکتورها">
                    <RecordList
                      records={related.quotes}
                      title={(r) => r.attributes.name || 'پیش‌فاکتور'}
                      subtitle={(r) => [r.attributes.stage, r.attributes.total_amount].filter(Boolean).join(' · ') || '—'}
                      onOpen={(r) => setViewRecord({ moduleId: 'quotes', record: r })}
                    />
                  </Panel>
                  <Panel title="فاکتورها">
                    <RecordList
                      records={related.invoices}
                      title={(r) => r.attributes.name || 'فاکتور'}
                      subtitle={(r) => [r.attributes.status, r.attributes.total_amount, r.attributes.due_date].filter(Boolean).join(' · ') || '—'}
                      onOpen={(r) => setViewRecord({ moduleId: 'invoices', record: r })}
                    />
                  </Panel>
                  <Panel title="قراردادها">
                    <RecordList
                      records={related.contracts}
                      title={(r) => r.attributes.name || 'قرارداد'}
                      subtitle={(r) => [r.attributes.status, r.attributes.total_contract_value].filter(Boolean).join(' · ') || '—'}
                      onOpen={(r) => setViewRecord({ moduleId: 'contracts', record: r })}
                    />
                  </Panel>
                </div>
              )}

              {tab === 'activities' && (
                <div className="grid gap-4 lg:grid-cols-2">
                  <Panel title="وظایف">
                    <RecordList records={related.tasks} title={(r) => r.attributes.name || 'وظیفه'} subtitle={(r) => [r.attributes.status, r.attributes.date_due].filter(Boolean).join(' · ') || '—'} onOpen={(r) => setViewRecord({ moduleId: 'tasks', record: r })} />
                  </Panel>
                  <Panel title="قرارها">
                    <RecordList records={related.meetings} title={(r) => r.attributes.name || 'قرار'} subtitle={(r) => [r.attributes.status, r.attributes.date_start].filter(Boolean).join(' · ') || '—'} onOpen={(r) => setViewRecord({ moduleId: 'meetings', record: r })} />
                  </Panel>
                  <Panel title="تماس‌ها">
                    <RecordList records={related.calls} title={(r) => r.attributes.name || 'تماس'} subtitle={(r) => [r.attributes.direction, r.attributes.date_start].filter(Boolean).join(' · ') || '—'} onOpen={(r) => setViewRecord({ moduleId: 'calls', record: r })} />
                  </Panel>
                  <Panel title="یادداشت‌ها">
                    <RecordList records={related.notes} title={(r) => r.attributes.name || 'یادداشت'} subtitle={(r) => (r.attributes.description || '').slice(0, 80) || '—'} onOpen={(r) => setViewRecord({ moduleId: 'notes', record: r })} />
                  </Panel>
                </div>
              )}

              {tab === 'documents' && (
                <Panel title="اسناد">
                  <RecordList
                    records={related.documents}
                    title={(r) => r.attributes.document_name || r.attributes.name || 'سند'}
                    subtitle={(r) => [r.attributes.status_id, r.attributes.filename, r.attributes.revision].filter(Boolean).join(' · ') || '—'}
                    onOpen={(r) => setViewRecord({ moduleId: 'documents', record: r })}
                  />
                </Panel>
              )}

              {tab === 'conversations' && phoneEnabled && (
                <Panel title="مکالمات CIWA Telecom">
                  <p className="text-[11px] text-slate-500 mb-3 leading-5">
                    فایل‌های صوتی مستقیماً از حافظهٔ سرور CIWA Telecom خوانده می‌شوند و فقط مکالمات مرتبط با شمارهٔ این مشتری/مخاطبینش نمایش داده می‌شود.
                  </p>
                  {loadingRecordings && <p className="text-xs text-slate-500">در حال خواندن مکالمات از مرکز تلفن...</p>}
                  {recordingsError && <p className="text-xs text-red-700 mb-2">{recordingsError}</p>}
                  {!loadingRecordings && !recordingsError && recordings.length === 0 && (
                    <Empty />
                  )}
                  <ul className="flex flex-col gap-2">
                    {recordings.map((item) => (
                      <li key={item.id} className="rounded-xl border border-slate-100 px-3 py-2.5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm text-slate-800 truncate">{item.name}</p>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              {[
                                item.direction === 'in' ? 'ورودی' : item.direction === 'out' ? 'خروجی' : item.folder || 'مکالمه',
                                item.number || '—',
                                item.at ? new Date(item.at).toLocaleString('fa-IR') : '',
                                item.size ? `${Math.max(1, Math.round(item.size / 1024)).toLocaleString('fa-IR')} KB` : '',
                              ].filter(Boolean).join(' · ')}
                            </p>
                          </div>
                          <button
                            type="button"
                            className={`rounded-xl px-3 py-1.5 text-xs font-medium ${playingId === item.id ? 'bg-indigo-600 text-white' : 'border border-slate-200 text-slate-700'}`}
                            onClick={() => setPlayingId((current) => current === item.id ? '' : item.id)}
                          >
                            {playingId === item.id ? 'توقف' : 'پخش'}
                          </button>
                        </div>
                        {playingId === item.id && (
                          <audio
                            className="mt-2 w-full"
                            controls
                            autoPlay
                            preload="metadata"
                            src={item.playUrl}
                            onEnded={() => setPlayingId('')}
                          >
                            مرورگر شما پخش صوت را پشتیبانی نمی‌کند.
                          </audio>
                        )}
                      </li>
                    ))}
                  </ul>
                </Panel>
              )}
            </>
          )}
        </div>
      </div>

      {viewRecord && (() => {
        const viewModule = moduleById(viewRecord.moduleId)
        if (!viewModule) return null
        return (
          <RecordDetail
            module={viewModule}
            record={viewRecord.record}
            onClose={() => setViewRecord(null)}
            onEdit={() => {
              const moduleId = viewRecord.moduleId
              setViewRecord(null)
              onOpen(moduleId)
            }}
            onOpenRelated={(moduleId, relatedRecord) => setViewRecord({ moduleId, record: relatedRecord })}
          />
        )
      })()}
    </section>
  )
}

function collectCustomerNumbers(account: CrmRecord, contacts: CrmRecord[]) {
  const values = [
    account.attributes.phone_office,
    account.attributes.phone_alternate,
    account.attributes.phone_fax,
    ...contacts.flatMap((contact) => [
      contact.attributes.phone_mobile,
      contact.attributes.phone_work,
      contact.attributes.phone_home,
      contact.attributes.phone_fax,
    ]),
  ]
  return [...new Set(values.map((value) => String(value || '').replace(/\D+/g, '')).filter((value) => value.length >= 6))]
}

function QuickLink({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="rounded-xl border border-slate-200 px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-50">
      + {label}
    </button>
  )
}

function StatCard({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white/70 px-3 py-3">
      <div className="flex items-center gap-2 text-slate-500">
        <Icon size={14} />
        <span className="text-[11px]">{label}</span>
      </div>
      <p className="mt-1 text-lg font-semibold text-slate-800">{value.toLocaleString('fa-IR')}</p>
    </div>
  )
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-100 p-3">
      <p className="text-xs font-semibold text-slate-600 mb-2">{title}</p>
      {children}
    </div>
  )
}

function Empty() {
  return <p className="text-xs text-slate-500">موردی ثبت نشده.</p>
}

function RecordList({
  records,
  title,
  subtitle,
  onOpen,
}: {
  records: CrmRecord[]
  title: (record: CrmRecord) => string
  subtitle: (record: CrmRecord) => string
  onOpen?: (record: CrmRecord) => void
}) {
  if (records.length === 0) return <Empty />
  return (
    <ul className="flex flex-col gap-1.5">
      {records.map((record) => (
        <li key={record.id}>
          <button
            type="button"
            className="w-full rounded-xl px-2.5 py-2 text-right hover:bg-slate-50 group"
            onClick={() => onOpen?.(record)}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm text-slate-800 group-hover:underline underline-offset-4">{title(record)}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">{subtitle(record)}</p>
              </div>
              {onOpen && (
                <span className="shrink-0 rounded-lg border border-slate-200 px-2 py-1 text-[10px] text-slate-600">نمایش</span>
              )}
            </div>
          </button>
        </li>
      ))}
    </ul>
  )
}

function timelineModuleId(kind: string) {
  if (kind === 'تماس') return 'calls'
  if (kind === 'قرار') return 'meetings'
  if (kind === 'وظیفه') return 'tasks'
  if (kind === 'یادداشت') return 'notes'
  if (kind === 'تیکت') return 'cases'
  return ''
}

function timelineRecord(item: { id: string; kind: string }, related: RelatedBundle) {
  if (item.kind === 'تماس') return related.calls.find((row) => row.id === item.id) || null
  if (item.kind === 'قرار') return related.meetings.find((row) => row.id === item.id) || null
  if (item.kind === 'وظیفه') return related.tasks.find((row) => row.id === item.id) || null
  if (item.kind === 'یادداشت') return related.notes.find((row) => row.id === item.id) || null
  if (item.kind === 'تیکت') return related.cases.find((row) => row.id === item.id) || null
  return null
}

function personName(record: CrmRecord) {
  return [record.attributes.first_name, record.attributes.last_name].filter(Boolean).join(' ') || record.attributes.name || 'بدون نام'
}

async function safeRelated(module: string, id: string, link: string) {
  try {
    return await listRelated(module, id, link)
  } catch {
    return []
  }
}
