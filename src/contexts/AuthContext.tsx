import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { getPlayer, createPlayer, checkUsernameAvailable, type Player } from '../lib/api'

interface AuthState {
  user: User | null
  player: Player | null
  loading: boolean
}

interface AuthContextValue extends AuthState {
  signIn: (email: string, password: string) => Promise<string | null>
  signUp: (email: string, password: string) => Promise<string | null>
  signOut: () => Promise<void>
  createProfile: (username: string) => Promise<string | null>
  refreshPlayer: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue>(null!)

export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, player: null, loading: true })

  async function refreshPlayer() {
    if (!state.user) return
    try {
      const p = await getPlayer(state.user.id)
      setState((s) => ({ ...s, player: p }))
    } catch {
      setState((s) => ({ ...s, player: null }))
    }
  }

  useEffect(() => {
    let mounted = true

    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return
      if (data.user) {
        getPlayer(data.user.id)
          .then((p) => { if (mounted) setState({ user: data.user, player: p, loading: false }) })
          .catch(() => { if (mounted) setState({ user: data.user, player: null, loading: false }) })
      } else {
        if (mounted) setState({ user: null, player: null, loading: false })
      }
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null
      if (!mounted) return
      if (u) {
        setState((s) => ({ ...s, user: u }))
        getPlayer(u.id)
          .then((p) => { if (mounted) setState((s) => ({ ...s, player: p })) })
          .catch(() => { if (mounted) setState((s) => ({ ...s, player: null })) })
      } else {
        setState({ user: null, player: null, loading: false })
      }
    })

    return () => {
      mounted = false
      listener.subscription.unsubscribe()
    }
  }, [])

  async function authAction(fn: () => Promise<{ error: unknown }>): Promise<string | null> {
    try {
      const { error } = await fn()
      return error ? (typeof error === 'object' && error !== null ? (error as any).message : 'An error occurred') : null
    } catch {
      return 'Network error. Please try again.'
    }
  }

  const signIn = (email: string, password: string) =>
    authAction(() => supabase.auth.signInWithPassword({ email, password }))

  const signUp = (email: string, password: string) =>
    authAction(() => supabase.auth.signUp({ email, password }))

  const signOut = async () => {
    await supabase.auth.signOut()
    setState({ user: null, player: null, loading: false })
  }

  const createProfile = async (username: string): Promise<string | null> => {
    if (!state.user) return 'Not authenticated'

    try {
      const available = await checkUsernameAvailable(username)
      if (!available) return 'Username is already taken'

      const player = await createPlayer(state.user.id, state.user.email!, username)
      setState((s) => ({ ...s, player }))
      return null
    } catch (err: any) {
      if (err?.response?.status === 409 || err?.response?.data?.message?.includes('duplicate')) {
        return 'Username is already taken'
      }
      return err?.message || 'Failed to create profile'
    }
  }

  return (
    <AuthContext.Provider value={{ ...state, signIn, signUp, signOut, createProfile, refreshPlayer }}>
      {children}
    </AuthContext.Provider>
  )
}
