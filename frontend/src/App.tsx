import { useEffect, useRef, useState } from 'react'
import { useSession, SessionProvider } from './auth/SessionProvider'
import { LoginScreen } from './views/LoginScreen'
import { ModuleView } from './views/ModuleView'
import { AiView, DashboardView, SettingsView } from './views/DashboardView'
import { moduleById } from './crm/modules'
import { useTheme } from './theme/useTheme'
import { addonIcon } from './addons/icons'
import { useAddons } from './addons/useAddons'
import { AddonScreen, AddonsView } from './views/AddonsView'
import { Softphone } from './widgets/Softphone'
import {
  LayoutDashboard, Users, TrendingUp, Building2, Ticket, Megaphone,
  CheckSquare, Calendar, FileText, BarChart2, MessageSquare, ShoppingCart,
  DollarSign, Brain, Settings, Bell, Search, Sun, Moon, Menu, Puzzle,
} from 'lucide-react'

const navItems = [
  { id: 'dashboard', icon: LayoutDashboard, label: 'داشبورد' },
  { id: 'contacts', icon: Users, label: 'مخاطبین' },
  { id: 'opportunities', icon: TrendingUp, label: 'فرصت‌های فروش' },
  { id: 'accounts', icon: Building2, label: 'مشتریان' },
  { id: 'cases', icon: Ticket, label: 'تیکت‌ها' },
  { id: 'campaigns', icon: Megaphone, label: 'کمپین‌ها' },
  { id: 'tasks', icon: CheckSquare, label: 'وظایف' },
  { id: 'meetings', icon: Calendar, label: 'قرارها' },
  { id: 'invoices', icon: FileText, label: 'فاکتورها' },
  { id: 'reports', icon: BarChart2, label: 'گزارش‌ها' },
]

const moduleItems = [
  { id: 'calls', icon: MessageSquare, label: 'ارتباطات' },
  { id: 'leads', icon: ShoppingCart, label: 'بازاریابی' },
  { id: 'invoices', icon: DollarSign, label: 'مالی' },
  { id: 'ai', icon: Brain, label: 'هوش مصنوعی' },
  { id: 'settings', icon: Settings, label: 'تنظیمات' },
]

// ── Sub-components ─────────────────────────────────────────────────────────

function SidebarItem({ icon: Icon, label, active, onClick }: { icon: any, label: string, active?: boolean, onClick?: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-current={active ? 'page' : undefined} className={`sidebar-item w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-right ${active ? 'active' : 'text-slate-500'}`}>
      <Icon size={17} className="shrink-0" />
      <span>{label}</span>
    </button>
  )
}

// ── Main App ───────────────────────────────────────────────────────────────

export default function App() {
  return (
    <SessionProvider>
      <CrmShell />
    </SessionProvider>
  )
}

function CrmShell() {
  const session = useSession()
  const { theme, toggleTheme } = useTheme()
  const addons = useAddons(session.status === 'authenticated')
  const [section, setSection] = useState('dashboard')
  const [createContactToken, setCreateContactToken] = useState(0)
  const [headerQuery, setHeaderQuery] = useState('')
  const [phoneOpen, setPhoneOpen] = useState(false)
  const phoneSeen = useRef<boolean | null>(null)
  const phoneAddon = addons.addons.find((addon) => addon.installed && addon.widget === 'softphone')

  useEffect(() => {
    if (!addons.ready) return
    const installed = Boolean(phoneAddon)
    if (phoneSeen.current === null) {
      phoneSeen.current = installed
      return
    }
    if (!phoneSeen.current && installed) setPhoneOpen(true)
    if (!installed) setPhoneOpen(false)
    phoneSeen.current = installed
  }, [addons.ready, phoneAddon])

  function openSection(id: string) {
    setHeaderQuery('')
    setSection(id)
  }

  function openAddon(target: string) {
    const id = target.replace(/^addon:/, '')
    const addon = addons.addons.find((item) => item.id === id)
    if (addon?.widget === 'softphone') {
      setPhoneOpen(true)
      return
    }
    openSection(target.startsWith('addon:') ? target : `addon:${id}`)
  }

  if (session.status === 'loading') {
    return (
      <div className="min-h-screen grid place-items-center bg-slate-100 text-sm text-slate-600">
        در حال بررسی نشست...
      </div>
    )
  }

  if (session.status !== 'authenticated') return <LoginScreen />

  const displayName = session.user?.fullName || 'کاربر'
  const roleLabel = session.demo ? 'نمای نمونه' : session.user?.isAdmin ? 'مدیر سیستم' : 'کاربر'
  const initials = displayName.replace(/\s+/g, '').slice(0, 2)

  return (
    <div className="vision-app flex min-h-screen" style={{ fontFamily: "'Vazirmatn', sans-serif" }}>

      <aside className="glass-sidebar w-60 shrink-0 fixed right-3 top-3 bottom-3 rounded-[28px] flex flex-col z-20 overflow-hidden">

        <div className="p-4 flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-2.5 min-w-0">
            <img
              src="/ciwa-brand.jpg"
              alt="ciwaCRM"
              className="h-10 w-10 rounded-xl object-cover"
            />
            <div>
              <p className="text-sm font-bold leading-none brand-text">CIWA CRM</p>
              <p className="text-xs text-slate-400 mt-0.5">v2026.1</p>
            </div>
          </div>
          <button type="button" aria-label="منو" className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-300 hover:bg-white/10">
            <Menu size={15} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 flex flex-col gap-0.5 overflow-y-auto">
          {navItems.map(item => (
            <SidebarItem key={item.id} icon={item.icon} label={item.label} active={section === item.id} onClick={() => openSection(item.id)} />
          ))}

          <div className="my-3 px-3">
            <div className="flex items-center gap-2">
              <div className="flex-1 h-px bg-white/15" />
              <span className="text-xs text-slate-400 font-medium whitespace-nowrap">ماژول‌ها</span>
              <div className="flex-1 h-px bg-white/15" />
            </div>
          </div>

          {addons.addons.filter((addon) => addon.installed).map((addon) => (
            <SidebarItem
              key={addon.id}
              icon={addonIcon(addon.icon)}
              label={addon.navLabel}
              active={addon.widget === 'softphone' ? phoneOpen : section === `addon:${addon.id}`}
              onClick={() => openAddon(`addon:${addon.id}`)}
            />
          ))}
          <SidebarItem icon={Puzzle} label="نصب ماژول جدید" active={section === 'addon-store'} onClick={() => openSection('addon-store')} />
          {moduleItems.map(item => (
            <SidebarItem key={item.id} icon={item.icon} label={item.label} active={section === item.id} onClick={() => openSection(item.id)} />
          ))}
        </nav>

        {/* AI Card */}
        <div className="p-3 pb-4">
          <div className="glass-card rounded-[22px] p-4">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center mb-3"
              style={{ background: 'rgba(232,121,249,0.2)', border: '1px solid rgba(232,121,249,0.35)' }}>
              <Brain size={16} style={{ color: '#e9d5ff' }} />
            </div>
            <p className="text-sm font-semibold text-white mb-1">به CIWA خوش آمدید</p>
            <p className="text-xs text-slate-400 leading-5 mb-3">با هوش مصنوعی، کارها را سریع‌تر و حرفه‌ای‌تر انجام دهید.</p>
            <button type="button" className="btn-primary w-full rounded-xl py-2 text-xs font-semibold" onClick={() => openSection('ai')}>
              مشاهده امکانات AI
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main Content ───────────────────────────────────────── */}
      <main className="flex-1 mr-[16.5rem] flex flex-col min-h-screen">

        <header className="glass-bar sticky top-3 z-10 mx-4 mt-3 flex items-center justify-between px-4 py-3 gap-4 rounded-[24px]">

          {/* User info */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="flex flex-col items-end">
              <p className="text-sm font-semibold text-slate-800 leading-none">{displayName}</p>
              <p className="text-xs text-slate-500 mt-0.5">{roleLabel}</p>
            </div>
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-semibold"
              style={{ background: 'linear-gradient(135deg, #e879f9, #6366f1 50%, #3b82f6)' }}>
              {initials}
            </div>
            <div className="w-px h-8 bg-white/15" />
            {/* Icons */}
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => void session.logout()} className="px-2.5 h-8 rounded-xl text-xs font-medium text-slate-600 hover:bg-white">
                خروج
              </button>
              <button type="button" aria-label="اعلان‌ها" className="relative w-8 h-8 rounded-xl flex items-center justify-center text-slate-500 hover:bg-white hover:text-slate-700 transition-all">
                <Bell size={17} aria-hidden="true" />
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500 border border-white" />
              </button>
              <button
                type="button"
                aria-label={theme === 'dark' ? 'حالت روشن' : 'حالت تیره'}
                aria-pressed={theme === 'light'}
                onClick={toggleTheme}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-500 hover:bg-white hover:text-slate-700 transition-all"
              >
                {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
              </button>
              <button type="button" aria-label="تنظیمات" onClick={() => openSection('settings')} className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-500 hover:bg-white hover:text-slate-700 transition-all">
                <Settings size={17} />
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="flex-1 max-w-md">
            <div className="relative">
              <input
                type="text"
                value={headerQuery}
                onChange={(event) => {
                  setHeaderQuery(event.target.value)
                  if (!moduleById(section)) setSection('contacts')
                }}
                placeholder="جستجو در بخش فعلی..."
                aria-label="جستجو"
                className="w-full pl-4 pr-10 py-2.5 rounded-2xl text-sm glass-input outline-none"
                style={{ direction: 'rtl' }}
              />
              <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            </div>
          </div>
        </header>

        <div className="flex-1 p-5 flex flex-col gap-5 overflow-y-auto">
          {session.demo && (
            <p className="text-sm text-slate-700 bg-white border border-slate-200 rounded-2xl px-4 py-3">
              هسته در دسترس نیست. این نما داده نمونه است و ذخیره نمی‌شود.
            </p>
          )}
          {section === 'dashboard' && (
            <DashboardView
              onOpen={openSection}
              onCreateContact={() => {
                setCreateContactToken((current) => current + 1)
                openSection('contacts')
              }}
            />
          )}
          {section === 'settings' && <SettingsView onOpen={openSection} />}
          {section === 'ai' && <AiView />}
          {section === 'addon-store' && (
            <AddonsView
              addons={addons.addons}
              ready={addons.ready}
              error={addons.error}
              actions={addons}
              onOpen={openAddon}
            />
          )}
          {section.startsWith('addon:') && addons.addons.some((addon) => addon.installed && !addon.widget && `addon:${addon.id}` === section) && (
            <AddonScreen addon={addons.addons.find((addon) => `addon:${addon.id}` === section)!} />
          )}
          {moduleById(section) && (
            <ModuleView
              key={section}
              moduleId={section}
              openCreateToken={section === 'contacts' ? createContactToken : 0}
              externalQuery={headerQuery}
              onOpenModule={openSection}
              onQueryChange={setHeaderQuery}
            />
          )}
        </div>
      </main>
      {phoneAddon && <Softphone open={phoneOpen} onOpenChange={setPhoneOpen} />}
    </div>
  )
}
