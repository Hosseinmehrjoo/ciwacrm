import { useEffect, useState } from 'react'
import {
  Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import {
  ArrowDownRight, ArrowUpRight, Building2, CheckCircle2, ChevronLeft, Circle, Clock,
  DollarSign, Mail, Phone, Plus, Send, Star, Ticket, TrendingUp, Users,
} from 'lucide-react'
import { ApiError } from '../api/client'
import { listModule, updateModuleRecord, type CrmRecord } from '../api/records'
import { useSession } from '../auth/SessionProvider'
import { moduleById, modules, optionLabel } from '../crm/modules'

const salesData = [
  { date: '۱ شه', sales: 12000, opportunities: 8000, newCustomers: 3000 },
  { date: '۵ شه', sales: 19000, opportunities: 10000, newCustomers: 5000 },
  { date: '۱۰ شه', sales: 16000, opportunities: 11000, newCustomers: 4000 },
  { date: '۱۵ شه', sales: 24000, opportunities: 15000, newCustomers: 7000 },
  { date: '۲۰ شه', sales: 21000, opportunities: 13000, newCustomers: 6000 },
  { date: '۲۵ شه', sales: 29000, opportunities: 18000, newCustomers: 9000 },
  { date: '۳۰ شه', sales: 36500, opportunities: 22000, newCustomers: 12000 },
]

const sampleTasks = [
  { title: 'تماس با مشتری جدید', done: true, priority: 'high' },
  { title: 'ارسال پیشنهاد قیمت', done: false, priority: 'high' },
  { title: 'پیگیری فاکتور شماره ۲۳۴۴', done: false, priority: 'medium' },
  { title: 'بررسی تیکت پشتیبانی', done: false, priority: 'low' },
]

const sampleContacts = [
  { name: 'سارا محمدی', company: 'شرکت نورینک', time: '۱۰ دقیقه پیش', initials: 'سم', color: '#e879f9' },
  { name: 'محمد کاظمی', company: 'شرکت آریا', time: '۴۵ دقیقه پیش', initials: 'مک', color: '#3b82f6' },
  { name: 'فاطمه حسینی', company: 'فروشگاه پارس', time: '۲ ساعت پیش', initials: 'فح', color: '#8b5cf6' },
  { name: 'علی رضایی', company: 'گروه مهر', time: '۳ ساعت پیش', initials: 'عر', color: '#f59e0b' },
]

const sampleMeetings = [
  { title: 'جلسه با مشتری VIP', time: '۱۰:۰۰', duration: '۶۰ دقیقه', color: '#a78bfa' },
  { title: 'پیگیری وضعیت تیکت‌ها', time: '۱۳:۳۰', duration: '۳۰ دقیقه', color: '#3b82f6' },
  { title: 'وبینار معرفی محصول', time: '۱۶:۰۰', duration: '۹۰ دقیقه', color: '#8b5cf6' },
]

const funnelStages = [
  { label: 'شناسایی', keys: ['Prospecting', 'Qualification'], color: '#e879f9' },
  { label: 'تحلیل', keys: ['Needs Analysis', 'Value Proposition', 'Id. Decision Makers', 'Perception Analysis'], color: '#a78bfa' },
  { label: 'پیشنهاد', keys: ['Proposal/Price Quote', 'Negotiation/Review'], color: '#818cf8' },
  { label: 'موفق', keys: ['Closed Won'], color: '#60a5fa' },
]

const kpis = [
  { title: 'فاکتورهای پرداخت‌شده', moduleId: 'invoices', icon: DollarSign, color: '#60a5fa', bg: 'rgba(96,165,250,0.16)', up: true },
  { title: 'فرصت‌های فروش', moduleId: 'opportunities', icon: TrendingUp, color: '#a78bfa', bg: 'rgba(167,139,250,0.16)', up: true },
  { title: 'مشتریان', moduleId: 'accounts', icon: Building2, color: '#e879f9', bg: 'rgba(232,121,249,0.16)', up: true },
  { title: 'تیکت‌های باز', moduleId: 'cases', icon: Ticket, color: '#f9a8d4', bg: 'rgba(249,168,212,0.16)', up: false },
  { title: 'مخاطبین', moduleId: 'contacts', icon: Users, color: '#818cf8', bg: 'rgba(129,140,248,0.16)', up: true },
]

export function DashboardView({
  onOpen,
  onCreateContact,
}: {
  onOpen: (id: string) => void
  onCreateContact: () => void
}) {
  const session = useSession()
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [tasks, setTasks] = useState<CrmRecord[]>([])
  const [contacts, setContacts] = useState<CrmRecord[]>([])
  const [meetings, setMeetings] = useState<CrmRecord[]>([])
  const [activities, setActivities] = useState<string[]>([])
  const [funnel, setFunnel] = useState<number[]>([48, 32, 18, 9])
  const [sampleDone, setSampleDone] = useState(sampleTasks.map((task) => task.done))

  useEffect(() => {
    if (session.demo) return
    let active = true
    void (async () => {
      try {
        const [opportunityPage, taskPage, contactPage, meetingPage, callPage] = await Promise.all([
          listFields('Opportunities', 'name,sales_stage,amount', 100),
          listFields('Tasks', 'name,status,priority', 6),
          listFields('Contacts', 'first_name,last_name,title,department', 4),
          listFields('Meetings', 'name,status,date_start,location', 4),
          listFields('Calls', 'name,status,date_start', 4),
        ])
        if (!active) return
        const stages = opportunityPage.records.map((record) => record.attributes.sales_stage)
        const nextFunnel = funnelStages.map((stage) => stages.filter((value) => stage.keys.includes(value)).length)
        if (nextFunnel.some((count) => count > 0)) setFunnel(nextFunnel)
        setTasks(taskPage.records)
        setContacts(contactPage.records)
        setMeetings(meetingPage.records)
        setActivities([
          ...callPage.records.map((record) => record.attributes.name),
          ...meetingPage.records.map((record) => record.attributes.name),
          ...taskPage.records.map((record) => record.attributes.name),
        ].filter(Boolean).slice(0, 4))
        const countEntries = await Promise.all(kpis.map(async (kpi) => {
          const module = moduleById(kpi.moduleId)
          if (!module) return [kpi.moduleId, 0] as const
          const page = await listFields(module.suite, 'id', 1)
          return [kpi.moduleId, page.records.length === 0 ? 0 : page.totalPages] as const
        }))
        if (!active) return
        setCounts(Object.fromEntries(countEntries))
      } catch (caught) {
        if (caught instanceof ApiError && caught.status === 401) void session.logout()
      }
    })()
    return () => {
      active = false
    }
  }, [session.demo, session.logout])

  const funnelMax = Math.max(...funnel, 1)

  return (
    <div className="flex flex-col gap-5">
      <div className="glass-card relative rounded-[28px] overflow-hidden" style={{ minHeight: 200, background: 'linear-gradient(135deg, rgba(232,121,249,0.35), rgba(99,102,241,0.28) 45%, rgba(37,99,235,0.38))' }}>
        <div className="hero-blob absolute -top-16 -left-16 w-72 h-72 rounded-full opacity-50" style={{ background: 'radial-gradient(circle, #e879f9 0%, transparent 70%)' }} />
        <div className="hero-blob absolute -bottom-20 left-40 w-56 h-56 rounded-full opacity-40" style={{ background: 'radial-gradient(circle, #3b82f6 0%, transparent 70%)', animationDelay: '2s' }} />
        <div className="hidden xl:block absolute left-64 top-8 rounded-2xl p-3 glass-chip">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full" style={{ background: 'linear-gradient(135deg, #e879f9, #3b82f6)' }} />
            <div>
              <p className="text-white text-xs font-semibold">سارا محمدی</p>
              <p className="text-xs" style={{ color: '#e9d5ff' }}>مشتری جدید</p>
            </div>
          </div>
        </div>
        <div className="relative z-10 flex flex-col justify-center h-full p-8 gap-3" style={{ minHeight: 200 }}>
          <h1 className="text-2xl font-extrabold text-white leading-normal">مدیریت ارتباطات، رشد کسب‌وکار</h1>
          <p className="text-sm text-white/80 leading-7 max-w-lg">تمام ابزارهای مورد نیاز شما برای مدیریت مشتریان، فروش و پشتیبانی در یک پلتفرم ساده و قدرتمند.</p>
          <button type="button" className="btn-primary flex items-center gap-2 w-fit rounded-2xl px-5 py-2.5 text-sm font-semibold mt-1" onClick={onCreateContact}>
            <Plus size={16} />
            ایجاد مخاطب جدید
          </button>
        </div>
      </div>

      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
        {kpis.map((kpi) => (
          <KpiCard key={kpi.title} kpi={kpi} value={counts[kpi.moduleId]} onOpen={() => onOpen(kpi.moduleId)} />
        ))}
      </div>

      <div className="dashboard-analytics grid gap-4">
        <div className="glass-card rounded-2xl p-5 min-w-0">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-semibold text-slate-800">روند فروش</h3>
            <span className="text-xs text-slate-500 bg-slate-100 px-3 py-1 rounded-xl">۳۰ روز گذشته</span>
          </div>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={salesData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--ciwa-chart)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--ciwa-chart)' }} axisLine={false} tickLine={false} width={36} />
                <Tooltip contentStyle={{ background: 'var(--ciwa-tooltip-bg)', border: '1px solid var(--ciwa-tooltip-border)', borderRadius: 16, color: 'var(--ciwa-text)' }} />
                <Area type="monotone" dataKey="sales" name="فروش" stroke="#e879f9" fill="rgba(232,121,249,0.22)" strokeWidth={2} />
                <Area type="monotone" dataKey="opportunities" name="فرصت‌ها" stroke="#a78bfa" fill="rgba(167,139,250,0.16)" strokeWidth={2} />
                <Area type="monotone" dataKey="newCustomers" name="مشتری جدید" stroke="#60a5fa" fill="rgba(96,165,250,0.16)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-800">قیف فروش</h3>
            <button type="button" className="text-xs text-emerald-700 font-medium" onClick={() => onOpen('opportunities')}>مشاهده همه</button>
          </div>
          <div className="flex flex-col gap-3">
            {funnelStages.map((stage, index) => (
              <div key={stage.label}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-slate-700 font-medium">{stage.label}</span>
                  <span className="text-slate-500">{funnel[index].toLocaleString('fa-IR')}</span>
                </div>
                <div className="h-3 rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${Math.max(8, (funnel[index] / funnelMax) * 100)}%`, background: stage.color }} />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-col items-center gap-1">
            {funnelStages.map((stage, index) => (
              <div key={stage.label} className="h-5 rounded-md" style={{ width: `${100 - index * 18}%`, background: stage.color, opacity: 0.85 - index * 0.12 }} />
            ))}
          </div>
        </div>

        <div className="glass-card rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-800">فعالیت‌های اخیر</h3>
            <button type="button" className="text-xs text-emerald-700 font-medium" onClick={() => onOpen('calls')}>مشاهده همه</button>
          </div>
          <div className="flex flex-col gap-2">
            {(activities.length > 0 ? activities : sampleTasks.map((task) => task.title)).map((title) => (
              <div key={title} className="activity-item flex items-center gap-2 rounded-xl px-2 py-2">
                <Phone size={14} className="text-emerald-600 shrink-0" />
                <span className="text-xs text-slate-700 font-medium">{title}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center gap-2 text-slate-400">
            <Phone size={12} />
            <Mail size={12} />
            <Send size={12} />
            <span className="text-xs">ارتباطات</span>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="glass-card rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-800">وظایف امروز</h3>
            <button type="button" className="text-xs text-emerald-700 font-medium" onClick={() => onOpen('tasks')}>
              {tasks.length > 0 ? `${tasks.filter((task) => task.attributes.status === 'Completed').length}/${tasks.length}` : `${sampleDone.filter(Boolean).length}/${sampleTasks.length}`}
            </button>
          </div>
          <div className="flex flex-col gap-2">
            {tasks.length > 0 ? tasks.map((task) => {
              const done = task.attributes.status === 'Completed'
              return (
                <button key={task.id} type="button" className="flex items-center gap-2 rounded-xl border px-2 py-2 text-right" onClick={() => void toggleTask(task, setTasks)}>
                  {done ? <CheckCircle2 size={16} className="text-emerald-600 shrink-0" /> : <Circle size={16} className="text-slate-300 shrink-0" />}
                  <span className={`text-xs flex-1 ${done ? 'text-slate-400 line-through' : 'text-slate-700 font-medium'}`}>{task.attributes.name}</span>
                </button>
              )
            }) : sampleTasks.map((task, index) => (
              <button
                key={task.title}
                type="button"
                className="flex items-center gap-2 rounded-xl border px-2 py-2 text-right"
                style={{ borderColor: sampleDone[index] ? 'rgba(167,139,250,0.45)' : 'rgba(255,255,255,0.14)', background: sampleDone[index] ? 'rgba(139,92,246,0.16)' : 'transparent' }}
                onClick={() => setSampleDone((current) => current.map((done, item) => item === index ? !done : done))}
              >
                {sampleDone[index] ? <CheckCircle2 size={16} className="text-emerald-600 shrink-0" /> : <Circle size={16} className="text-slate-300 shrink-0" />}
                <span className={`text-xs flex-1 ${sampleDone[index] ? 'text-slate-400 line-through' : 'text-slate-700 font-medium'}`}>{task.title}</span>
                <span className="text-xs px-1.5 py-0.5 rounded-lg" style={{
                  background: task.priority === 'high' ? 'rgba(239,68,68,0.1)' : task.priority === 'medium' ? 'rgba(245,158,11,0.1)' : 'rgba(148,163,184,0.15)',
                  color: task.priority === 'high' ? '#dc2626' : task.priority === 'medium' ? '#d97706' : '#64748b',
                }}>
                  {task.priority === 'high' ? 'بالا' : task.priority === 'medium' ? 'متوسط' : 'پایین'}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="glass-card rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-800">مخاطبین جدید</h3>
            <button type="button" className="text-xs text-emerald-700 font-medium" onClick={() => onOpen('contacts')}>مشاهده همه</button>
          </div>
          <div className="flex flex-col gap-2">
            {contacts.length > 0 ? contacts.map((contact) => {
              const name = [contact.attributes.first_name, contact.attributes.last_name].filter(Boolean).join(' ') || 'بدون نام'
              return (
                <button key={contact.id} type="button" className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 text-right" onClick={() => onOpen('contacts')}>
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0" style={{ background: 'linear-gradient(135deg, #e879f9, #3b82f6)' }}>
                    {name.replace(/\s+/g, '').slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-700">{name}</p>
                    <p className="text-xs text-slate-500">{contact.attributes.title || contact.attributes.department || 'مخاطب'}</p>
                  </div>
                </button>
              )
            }) : sampleContacts.map((contact) => (
              <div key={contact.name} className="flex items-center gap-3 p-2.5 rounded-xl">
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0" style={{ background: `linear-gradient(135deg, ${contact.color}, ${contact.color}aa)` }}>
                  {contact.initials}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-700">{contact.name}</p>
                  <p className="text-xs text-slate-500">{contact.company}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-xs text-slate-500">{contact.time}</span>
                  <Star size={12} className="text-slate-300" />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-800">تقویم و قرارها</h3>
            <button type="button" className="text-xs text-slate-600 flex items-center gap-1" onClick={() => onOpen('meetings')}>
              <Clock size={12} />
              امروز
            </button>
          </div>
          <WeekStrip />
          <div className="flex flex-col gap-2">
            {meetings.length > 0 ? meetings.map((meeting) => (
              <button key={meeting.id} type="button" className="flex items-center gap-3 p-2.5 rounded-xl text-right" style={{ background: 'rgba(129,140,248,0.1)', border: '1px solid rgba(167,139,250,0.28)' }} onClick={() => onOpen('meetings')}>
                <div className="w-1 h-10 rounded-full shrink-0" style={{ background: 'linear-gradient(#e879f9, #3b82f6)' }} />
                <div className="flex-1">
                  <p className="text-xs font-semibold text-slate-700">{meeting.attributes.name}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{meeting.attributes.date_start || meeting.attributes.location || optionLabel({ name: 'status', label: '', options: [{ value: meeting.attributes.status, label: meeting.attributes.status }] }, meeting.attributes.status)}</p>
                </div>
                <ChevronLeft size={14} className="text-slate-300" />
              </button>
            )) : sampleMeetings.map((meeting) => (
              <div key={meeting.title} className="flex items-center gap-3 p-2.5 rounded-xl" style={{ background: `${meeting.color}08`, border: `1px solid ${meeting.color}20` }}>
                <div className="w-1 h-10 rounded-full shrink-0" style={{ background: meeting.color }} />
                <div className="flex-1">
                  <p className="text-xs font-semibold text-slate-700">{meeting.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{meeting.time} • {meeting.duration}</p>
                </div>
                <ChevronLeft size={14} className="text-slate-300" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function KpiCard({
  kpi,
  value,
  onOpen,
}: {
  kpi: (typeof kpis)[number]
  value: number | undefined
  onOpen: () => void
}) {
  const Icon = kpi.icon
  const spark = Array.from({ length: 8 }, (_, index) => ({ v: 8 + index * (kpi.up ? 1.4 : -0.6) }))
  return (
    <button type="button" onClick={onOpen} className="glass-card kpi-card rounded-2xl p-4 flex flex-col gap-3 text-right min-w-0">
      <div className="flex items-center justify-between">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: kpi.bg }}>
          <Icon size={18} style={{ color: kpi.color }} />
        </div>
        <ResponsiveContainer width={64} height={32}>
          <AreaChart data={spark} margin={{ top: 2, right: 0, left: 0, bottom: 2 }}>
            <Area type="monotone" dataKey="v" stroke={kpi.color} strokeWidth={1.5} fill={kpi.bg} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div>
        <p className="text-xs text-slate-500 font-medium mb-1">{kpi.title}</p>
        <p className="text-xl font-bold text-slate-800 leading-none">{value == null ? '…' : value.toLocaleString('fa-IR')}</p>
      </div>
      <div className="flex items-center gap-1">
        {kpi.up ? <ArrowUpRight size={14} className="text-emerald-600" /> : <ArrowDownRight size={14} className="text-red-500" />}
        <span className="text-xs text-slate-500">ثبت‌شده</span>
      </div>
    </button>
  )
}

function WeekStrip() {
  const labels = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج']
  const today = new Date()
  const saturdayOffset = (today.getDay() + 1) % 7
  const saturday = new Date(today)
  saturday.setDate(today.getDate() - saturdayOffset)
  return (
    <div className="flex gap-1 mb-4">
      {labels.map((label, index) => {
        const day = new Date(saturday)
        day.setDate(saturday.getDate() + index)
        const current = day.toDateString() === today.toDateString()
        return (
          <div key={label} className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-xl ${current ? 'text-white' : 'text-slate-500'}`} style={current ? { background: 'linear-gradient(135deg, #e879f9, #3b82f6)' } : undefined}>
            <span className="text-xs">{label}</span>
            <span className="text-xs font-semibold">{day.getDate().toLocaleString('fa-IR')}</span>
          </div>
        )
      })}
    </div>
  )
}

async function listFields(module: string, fields: string, size: number) {
  const params = new URLSearchParams()
  params.set('page[size]', String(size))
  params.set('page[number]', '1')
  params.set(`fields[${module}]`, fields)
  return listModule(module, params)
}

async function toggleTask(task: CrmRecord, setTasks: (value: CrmRecord[] | ((current: CrmRecord[]) => CrmRecord[])) => void) {
  const done = task.attributes.status === 'Completed'
  const status = done ? 'Not Started' : 'Completed'
  setTasks((current) => current.map((item) => item.id === task.id ? { ...item, attributes: { ...item.attributes, status } } : item))
  try {
    await updateModuleRecord('Tasks', task.id, { status })
  } catch {
    setTasks((current) => current.map((item) => item.id === task.id ? task : item))
  }
}

export function SettingsView({ onOpen }: { onOpen: (id: string) => void }) {
  const session = useSession()
  return (
    <section className="glass-card rounded-2xl p-5 flex flex-col gap-4">
      <h2 className="text-sm font-semibold text-slate-800">تنظیمات</h2>
      <p className="text-sm text-slate-600 leading-7">
        نشست فعلی به کاربر {session.user?.fullName || 'کاربر'} وصل است. داده‌ها در هسته نگهداری می‌شوند.
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {modules.map((module) => (
          <button key={module.id} type="button" className="rounded-2xl border border-slate-200 px-4 py-3 text-right text-sm text-slate-700" onClick={() => onOpen(module.id)}>
            <span className="font-medium">{module.label}</span>
            <span className="block text-xs text-slate-500 mt-1">{module.suite}</span>
          </button>
        ))}
      </div>
    </section>
  )
}

export function AiView() {
  return (
    <section className="glass-card rounded-2xl p-6">
      <h2 className="text-sm font-semibold text-slate-800">هوش مصنوعی</h2>
      <p className="text-sm text-slate-600 mt-3 leading-7">
        هسته ماژول هوش مصنوعی ندارد. بخش‌های فروش، مخاطب، پشتیبانی و مالی با همین هسته همگام هستند.
      </p>
    </section>
  )
}
