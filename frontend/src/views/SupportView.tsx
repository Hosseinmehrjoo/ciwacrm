import { BookOpen, Bug, LifeBuoy, MessageCircle, MonitorSmartphone, Phone, Sparkles } from 'lucide-react'
import { SectionHelp } from '../help/SectionHelp'

const items = [
  {
    title: 'آموزش کار با نرم‌افزار',
    detail: 'راهنمای قدم‌به‌قدم استفاده از CIWA',
    href: 'https://crm.ciwa.ir/how-to-use',
    label: 'crm.ciwa.ir/how-to-use',
    icon: BookOpen,
  },
  {
    title: 'حداقل‌های مورد نیاز',
    detail: 'آنچه برای اجرای نرم‌افزار لازم است',
    href: 'https://crm.ciwa.ir/requirement',
    label: 'crm.ciwa.ir/requirement',
    icon: MonitorSmartphone,
  },
  {
    title: 'تماس با کارشناسان',
    detail: 'اگر جایی گیر کردید یا نرم‌افزار درست کار نمی‌کند',
    href: 'tel:09306416150',
    label: '۰۹۳۰۶۴۱۶۱۵۰',
    icon: Phone,
  },
  {
    title: 'چت آنلاین با کارشناسان',
    detail: 'گفتگوی مستقیم از همین‌جا',
    href: 'https://crm.ciwa.ir/chat',
    label: 'crm.ciwa.ir/chat',
    icon: MessageCircle,
  },
  {
    title: 'گزارش باگ و اشکال',
    detail: 'مشکل نرم‌افزار را برای ما بفرستید',
    href: 'mailto:report@crm.ciwa.ir',
    label: 'report@crm.ciwa.ir',
    icon: Bug,
  },
  {
    title: 'درخواست امکانات خاص',
    detail: 'اگر قابلیتی لازم دارید که الان در نرم‌افزار نیست',
    href: 'tel:09306416150',
    label: '۰۹۳۰۶۴۱۶۱۵۰',
    icon: Sparkles,
  },
]

export function SupportView() {
  return (
    <section className="flex flex-col gap-5">
      <div className="glass-card rounded-[28px] p-6">
        <div className="w-11 h-11 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'rgba(232,121,249,0.2)', border: '1px solid rgba(232,121,249,0.35)' }}>
          <LifeBuoy size={20} className="ciwa-accent" />
        </div>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-slate-800">پشتیبانی</h1>
          <SectionHelp topic="support" />
        </div>
        <p className="text-sm text-slate-500 leading-7 mt-2 max-w-2xl">
          اگر در کار با نرم‌افزار به مشکل خوردید، خودِ نرم‌افزار درست کار نمی‌کند، یا هر سؤال دیگری دارید، با ما در تماس باشید.
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {items.map((item) => {
          const Icon = item.icon
          return (
            <a
              key={item.title}
              href={item.href}
              className="glass-card rounded-[24px] p-4 flex items-start gap-3 hover:bg-white/10"
              {...(item.href.startsWith('http') ? { target: '_blank', rel: 'noreferrer' } : {})}
            >
              <span className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(139,92,246,0.15)' }}>
                <Icon size={18} className="ciwa-accent" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-slate-800">{item.title}</span>
                <span className="block text-xs text-slate-500 leading-6 mt-1">{item.detail}</span>
                <span className="block text-xs text-violet-600 mt-2 break-all" dir="ltr">{item.label}</span>
              </span>
            </a>
          )
        })}
      </div>
    </section>
  )
}
