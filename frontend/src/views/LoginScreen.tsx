import { useState, type FormEvent } from 'react'
import { ApiError } from '../api/client'
import { useSession } from '../auth/SessionProvider'

export function LoginScreen() {
  const session = useSession()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError('')
    setPending(true)
    try {
      await session.login(username, password)
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'ورود انجام نشد.')
    } finally {
      setPending(false)
    }
  }

  return (
    <main className="vision-app min-h-screen grid place-items-center p-4 sm:p-6">
      <form onSubmit={onSubmit} className="glass-card w-full max-w-md rounded-[28px] p-5 sm:p-8 flex flex-col gap-5">
        <img src="/ciwa-brand.jpg" alt="ciwaCRM" className="w-28 h-28 sm:w-40 sm:h-40 mx-auto rounded-3xl object-cover" />
        <div className="text-center">
          <h1 className="text-lg font-bold brand-text">ورود به CIWA CRM</h1>
          <p className="text-sm text-slate-400 mt-1">با حساب کاربری خود وارد شوید.</p>
        </div>

        {session.offline && (
          <p className="text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 leading-6">
            سرویس اتصال در دسترس نیست. تا وقتی هسته بالا نیامده، می‌توانید نمای نمونه را ببینید.
          </p>
        )}

        <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
          نام کاربری
          <input
            name="username"
            autoComplete="username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            className="glass-input rounded-2xl px-4 py-2.5 text-sm font-normal outline-none"
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
          رمز عبور
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="glass-input rounded-2xl px-4 py-2.5 text-sm font-normal outline-none"
          />
        </label>

        {error && (
          <p role="alert" className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-2xl px-4 py-3">
            {error}
          </p>
        )}

        <button type="submit" className="btn-primary rounded-2xl py-3 text-sm font-semibold disabled:opacity-60" disabled={pending}>
          {pending ? 'در حال ورود...' : 'ورود'}
        </button>

        {session.offline && (
          <button type="button" onClick={session.enterDemo} className="text-sm font-medium text-violet-700">
            مشاهده نمای نمونه
          </button>
        )}
      </form>
    </main>
  )
}
