import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { ApiError } from '../api/client'
import { currentUser, login as loginRequest, logout as logoutRequest, type CiwaUser } from '../api/session'

type SessionStatus = 'loading' | 'anonymous' | 'authenticated'

type SessionValue = {
  status: SessionStatus
  offline: boolean
  demo: boolean
  user: CiwaUser | null
  login: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
  enterDemo: () => void
}

const SessionContext = createContext<SessionValue | null>(null)

export function SessionProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<SessionStatus>('loading')
  const [offline, setOffline] = useState(false)
  const [demo, setDemo] = useState(false)
  const [user, setUser] = useState<CiwaUser | null>(null)

  useEffect(() => {
    let active = true
    currentUser()
      .then((next) => {
        if (!active) return
        setUser(next)
        setDemo(false)
        setOffline(false)
        setStatus('authenticated')
      })
      .catch((error: unknown) => {
        if (!active) return
        setUser(null)
        setDemo(false)
        setOffline(error instanceof ApiError && (error.status === 0 || error.status >= 500))
        setStatus('anonymous')
      })
    return () => {
      active = false
    }
  }, [])

  const value = useMemo<SessionValue>(() => ({
    status,
    offline,
    demo,
    user,
    async login(username, password) {
      await loginRequest(username, password)
      const next = await currentUser()
      setUser(next)
      setDemo(false)
      setOffline(false)
      setStatus('authenticated')
    },
    async logout() {
      if (!demo) await logoutRequest().catch(() => undefined)
      setUser(null)
      setDemo(false)
      setStatus('anonymous')
    },
    enterDemo() {
      setDemo(true)
      setUser({ id: 'demo', fullName: 'حسین مهرجو', userName: 'demo', isAdmin: true })
      setStatus('authenticated')
    },
  }), [demo, offline, status, user])

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export function useSession() {
  const value = useContext(SessionContext)
  if (!value) throw new Error('useSession must be used inside SessionProvider')
  return value
}
