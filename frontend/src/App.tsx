import { useEffect, useRef, useState } from 'react'
import { useSession, SessionProvider } from './auth/SessionProvider'
import { LoginScreen } from './views/LoginScreen'
import { ModuleView } from './views/ModuleView'
import { DashboardView, SettingsView } from './views/DashboardView'
import { AiView } from './views/AiView'
import { groupLabel, groupOrder, moduleById, modules } from './crm/modules'
import { useTheme } from './theme/useTheme'
import { addonIcon } from './addons/icons'
import { useAddons } from './addons/useAddons'
import { AddonScreen, AddonsView } from './views/AddonsView'
import { Softphone } from './widgets/Softphone'
import { SupportView } from './views/SupportView'
import { BusyIndicator, LoadingMark } from './ui/LoadingMark'
import {
  LayoutDashboard, Users, TrendingUp, Ticket, Megaphone,
  CheckSquare, Calendar, BarChart2,
  DollarSign, Brain, Settings, Bell, Search, Sun, Moon, Menu, X, Puzzle, LifeBuoy,
  Zap, ChevronDown, Plus,
} from 'lucide-react'

const groupIcons = {
  people: Users,
  sales: TrendingUp,
  finance: DollarSign,
  marketing: Megaphone,
  activity: Calendar,
  support: Ticket,
  projects: CheckSquare,
  insight: BarChart2,
  admin: Settings,
} as const

const quickActions = [
  { id: 'contacts', label: 'افزودن مخاطب' },
  { id: 'accounts', label: 'افزودن مشتری' },
  { id: 'leads', label: 'افزودن سرنخ' },
  { id: 'opportunities', label: 'افزودن فرصت فروش' },
  { id: 'invoices', label: 'افزودن فاکتور' },
  { id: 'quotes', label: 'افزودن پیش‌فاکتور' },
  { id: 'cases', label: 'افزودن تیکت' },
  { id: 'tasks', label: 'افزودن وظیفه' },
  { id: 'meetings', label: 'افزودن قرار' },
  { id: 'calls', label: 'افزودن تماس' },
  { id: 'notes', label: 'افزودن یادداشت' },
] as const

// ── Sub-components ─────────────────────────────────────────────────────────

function QuickMenu({ open, onToggle, onPick }: { open: boolean; onToggle: () => void; onPick: (id: string) => void }) {
  return (
    <div className="mb-1">
      <button
        type="button"
        className={`sidebar-item w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-right ${open ? 'active' : 'text-slate-500'}`}
        aria-expanded={open}
        aria-controls="quick-actions"
        onClick={onToggle}
      >
        <Zap size={17} className="shrink-0" />
        <span className="flex-1">عملکرد سریع</span>
        <ChevronDown size={15} className={`shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div id="quick-actions" className="quick-menu mt-1 rounded-2xl p-1.5 flex flex-col gap-0.5">
          {quickActions.map((action) => (
            <button
              key={action.id}
              type="button"
              className="flex items-center gap-2 rounded-xl px-2.5 py-2 text-right text-xs font-medium text-slate-600 hover:bg-white/10"
              onClick={() => onPick(action.id)}
            >
              <Plus size={13} className="shrink-0" />
              <span>{action.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

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
      <BusyIndicator />
      <CrmShell />
    </SessionProvider>
  )
}

function CrmShell() {
  const session = useSession()
  const { theme, toggleTheme } = useTheme()
  const addons = useAddons(session.status === 'authenticated')
  const [section, setSection] = useState('dashboard')
  const [createRequest, setCreateRequest] = useState<{ id: string; token: number } | null>(null)
  const [quickOpen, setQuickOpen] = useState(false)
  const [headerQuery, setHeaderQuery] = useState('')
  const [phoneOpen, setPhoneOpen] = useState(false)
  const [navOpen, setNavOpen] = useState(false)
  const [compactNav, setCompactNav] = useState(() => window.matchMedia('(max-width: 1023px)').matches)
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
    setNavOpen(false)
    setQuickOpen(false)
  }

  function quickCreate(id: string) {
    setHeaderQuery('')
    setCreateRequest({ id, token: Date.now() })
    setSection(id)
    setNavOpen(false)
    setQuickOpen(false)
  }

  function openAddon(target: string) {
    const id = target.replace(/^addon:/, '')
    const addon = addons.addons.find((item) => item.id === id)
    setNavOpen(false)
    if (addon?.widget === 'softphone') {
      setPhoneOpen(true)
      return
    }
    openSection(target.startsWith('addon:') ? target : `addon:${id}`)
  }

  useEffect(() => {
    const media = window.matchMedia('(max-width: 1023px)')
    const sync = () => {
      setCompactNav(media.matches)
      if (!media.matches) setNavOpen(false)
    }
    media.addEventListener('change', sync)
    return () => media.removeEventListener('change', sync)
  }, [])

  useEffect(() => {
    if (!quickOpen) return
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setQuickOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [quickOpen])

  useEffect(() => {
    if (!navOpen) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setNavOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previous
      window.removeEventListener('keydown', onKey)
    }
  }, [navOpen])

  if (session.status === 'loading') {
    return (
      <div className="vision-app min-h-screen grid place-items-center">
        <div className="glass-card rounded-[28px] px-10 py-8 flex flex-col items-center gap-4" role="status" aria-live="polite">
          <LoadingMark label="در حال بررسی نشست..." large />
        </div>
      </div>
    )
  }

  if (session.status !== 'authenticated') return <LoginScreen />

  const displayName = session.user?.fullName || 'کاربر'
  const roleLabel = session.demo ? 'نمای نمونه' : session.user?.isAdmin ? 'مدیر سیستم' : 'کاربر'
  const initials = displayName.replace(/\s+/g, '').slice(0, 2)

  return (
    <div className="vision-app flex min-h-screen" style={{ fontFamily: "'Vazirmatn', sans-serif" }}>

      {navOpen && (
        <button
          type="button"
          aria-label="بستن منو"
          className="fixed inset-0 z-20 bg-black/50 lg:hidden"
          onClick={() => setNavOpen(false)}
        />
      )}

      <aside
        id="app-nav"
        inert={compactNav && !navOpen ? true : undefined}
        aria-hidden={compactNav && !navOpen}
        className={`glass-sidebar w-[min(18rem,88vw)] lg:w-60 shrink-0 fixed z-30 flex flex-col overflow-hidden top-0 bottom-0 right-0 rounded-none transition-transform duration-200 lg:top-3 lg:bottom-3 lg:right-3 lg:rounded-[28px] lg:translate-x-0 ${navOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}`}
      >

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
          <button type="button" aria-label="بستن منو" className="lg:hidden w-9 h-9 rounded-lg flex items-center justify-center text-slate-300 hover:bg-white/10" onClick={() => setNavOpen(false)}>
            <X size={16} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 flex flex-col gap-0.5 overflow-y-auto">
          <SidebarItem icon={LayoutDashboard} label="داشبورد" active={section === 'dashboard'} onClick={() => openSection('dashboard')} />
          <QuickMenu open={quickOpen} onToggle={() => setQuickOpen((current) => !current)} onPick={quickCreate} />
          {groupOrder.map((group) => (
            <div key={group}>
              <div className="my-3 px-3">
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-px bg-white/15" />
                  <span className="text-xs text-slate-400 font-medium whitespace-nowrap">{groupLabel[group]}</span>
                  <div className="flex-1 h-px bg-white/15" />
                </div>
              </div>
              {modules.filter((item) => item.group === group).map((item) => (
                <SidebarItem
                  key={item.id}
                  icon={groupIcons[group]}
                  label={item.label}
                  active={section === item.id}
                  onClick={() => openSection(item.id)}
                />
              ))}
            </div>
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
          <SidebarItem icon={Brain} label="هوش مصنوعی" active={section === 'ai'} onClick={() => openSection('ai')} />
          <SidebarItem icon={Settings} label="تنظیمات" active={section === 'settings'} onClick={() => openSection('settings')} />
        </nav>

        <div className="p-3 pb-4">
          <div className={`glass-card rounded-[22px] p-4 ${section === 'support' ? 'ring-1 ring-white/30' : ''}`}>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center mb-3"
              style={{ background: 'rgba(232,121,249,0.2)', border: '1px solid rgba(232,121,249,0.35)' }}>
              <LifeBuoy size={16} className="ciwa-accent" />
            </div>
            <p className="text-sm font-semibold text-slate-800 mb-1">پشتیبانی</p>
            <p className="text-xs text-slate-400 leading-5 mb-3">اگر به مشکل خوردید، با ما در تماس باشید.</p>
            <button type="button" className="btn-primary w-full rounded-xl py-2 text-xs font-semibold" onClick={() => openSection('support')}>
              تماس با پشتیبانی
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main Content ───────────────────────────────────────── */}
      <main className="flex-1 min-w-0 lg:mr-[16.5rem] flex flex-col min-h-screen">

        <header className="glass-bar sticky top-3 z-10 mx-3 mt-3 flex flex-col gap-3 px-3 py-3 rounded-[24px] sm:mx-4 lg:flex-row lg:items-center lg:justify-between lg:px-4 lg:gap-4">

          {/* User info */}
          <div className="flex items-center gap-2 min-w-0 sm:gap-3">
            <button
              type="button"
              aria-label="منو"
              aria-expanded={navOpen}
              aria-controls="app-nav"
              className="lg:hidden w-9 h-9 shrink-0 rounded-xl flex items-center justify-center text-slate-600 hover:bg-white/10"
              onClick={() => setNavOpen(true)}
            >
              <Menu size={18} />
            </button>
            <div className="flex flex-col items-end min-w-0">
              <p className="text-sm font-semibold text-slate-800 leading-none truncate max-w-[7.5rem] sm:max-w-none">{displayName}</p>
              <p className="text-xs text-slate-500 mt-0.5 hidden sm:block">{roleLabel}</p>
            </div>
            <div className="w-9 h-9 shrink-0 rounded-full flex items-center justify-center text-white text-sm font-semibold"
              style={{ background: 'linear-gradient(135deg, #e879f9, #6366f1 50%, #3b82f6)' }}>
              {initials}
            </div>
            <div className="hidden sm:block w-px h-8 bg-white/15" />
            {/* Icons */}
            <div className="flex items-center gap-0.5 mr-auto sm:mr-0 sm:gap-1">
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
          <div className="w-full lg:flex-1 lg:max-w-md">
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

        <div className="flex-1 min-w-0 p-3 sm:p-5 flex flex-col gap-5 overflow-y-auto">
          {session.demo && (
            <p className="text-sm text-slate-700 bg-white border border-slate-200 rounded-2xl px-4 py-3">
              هسته در دسترس نیست. این نما داده نمونه است و ذخیره نمی‌شود.
            </p>
          )}
          {section === 'dashboard' && (
            <DashboardView
              onOpen={openSection}
              onCreateContact={() => quickCreate('contacts')}
            />
          )}
          {section === 'settings' && <SettingsView onOpen={openSection} />}
          {section === 'ai' && <AiView />}
          {section === 'support' && <SupportView />}
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
              openCreateToken={createRequest?.id === section ? createRequest.token : 0}
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
