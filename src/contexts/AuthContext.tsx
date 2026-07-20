import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { AppUser, Company, UserRole } from '../types/database'

interface AuthContextValue {
  session: Session | null
  profile: AppUser | null
  company: Company | null
  loading: boolean
  authError: string | null
  signUp: (email: string, password: string, username: string, role: UserRole) => Promise<{ needsEmailConfirmation: boolean }>
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  refreshCompany: () => Promise<void>
  retryProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<AppUser | null>(null)
  const [company, setCompany] = useState<Company | null>(null)
  const [loading, setLoading] = useState(true)
  const [authError, setAuthError] = useState<string | null>(null)

  async function loadProfile(userId: string) {
    const { data, error } = await supabase.from('users').select('*').eq('id', userId).maybeSingle()
    if (error) throw error
    setProfile(data as AppUser | null)
    return data as AppUser | null
  }

  async function loadCompany(p: AppUser | null) {
    if (!p) {
      setCompany(null)
      return
    }

    if (p.role === 'owner') {
      const { data } = await supabase
        .from('company')
        .select('*')
        .eq('owner_id', p.id)
        .maybeSingle()
      setCompany(data as Company | null)
      return
    }

    const { data } = await supabase
      .from('company_worker')
      .select('company:company!company_worker_work_at_fkey(*)')
      .eq('employee_id', p.id)
      .maybeSingle()
    setCompany((data?.company as unknown as Company) ?? null)
  }

  async function bootstrap(currentSession: Session | null) {
    setSession(currentSession)
    setAuthError(null)
    try {
      if (currentSession?.user) {
        const p = await loadProfile(currentSession.user.id)
        await loadCompany(p)
      } else {
        setProfile(null)
        setCompany(null)
      }
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Gagal memuat profil')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      bootstrap(data.session)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      bootstrap(newSession)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  async function signUp(email: string, password: string, username: string, role: UserRole) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username, role } },
    })
    if (error) throw error
    // Kalau "Confirm email" dimatikan di Supabase Auth settings, signUp langsung
    // mengembalikan session dan kita bisa masuk tanpa menunggu link email.
    if (data.session) {
      await bootstrap(data.session)
    }
    return { needsEmailConfirmation: !data.session }
  }

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  async function refreshCompany() {
    await loadCompany(profile)
  }

  async function retryProfile() {
    setLoading(true)
    await bootstrap(session)
  }

  return (
    <AuthContext.Provider
      value={{ session, profile, company, loading, authError, signUp, signIn, signOut, refreshCompany, retryProfile }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
