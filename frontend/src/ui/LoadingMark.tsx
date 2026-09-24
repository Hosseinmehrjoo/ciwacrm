import { useEffect, useState, useSyncExternalStore } from 'react'
import { activitySnapshot, subscribeActivity } from '../api/client'
import { useSession } from '../auth/SessionProvider'

export function LoadingMark({ label, large = false }: { label: string; large?: boolean }) {
  return (
    <>
      <span className={large ? 'ciwa-spinner ciwa-spinner-lg' : 'ciwa-spinner'} aria-hidden="true" />
      <span className="text-sm text-slate-600">{label}</span>
    </>
  )
}

export function useBusy(delay = 180) {
  const count = useSyncExternalStore(subscribeActivity, activitySnapshot, () => 0)
  const active = count > 0
  const [shown, setShown] = useState(false)

  useEffect(() => {
    if (!active) {
      setShown(false)
      return
    }
    const timer = window.setTimeout(() => setShown(true), delay)
    return () => window.clearTimeout(timer)
  }, [active, delay])

  return shown
}

export function BusyIndicator() {
  const session = useSession()
  const shown = useBusy()
  if (session.status === 'loading' || !shown) return null
  return (
    <div className="vision-app">
      <div className="ciwa-busy glass-card" role="status" aria-live="polite">
        <LoadingMark label="در حال بارگذاری" />
      </div>
    </div>
  )
}
