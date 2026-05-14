import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase, getPlayer, type Player } from './supabase'
import { ToastProvider } from './Toast'
import AuthForm from './AuthForm'
import UsernameSetup from './UsernameSetup'
import Game from './Game'

export default function App() {
  const [user, setUser] = useState<User | null>(null)
  const [player, setPlayer] = useState<Player | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) checkPlayer(data.user)
      else setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null
      setUser(u)
      if (u) { setLoading(true); checkPlayer(u) }
      else { setPlayer(null); setLoading(false) }
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  async function checkPlayer(u: User) {
    try {
      const p = await getPlayer(u.id)
      setPlayer(p)
    } catch {
      setPlayer(null)
    }
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <p className="text-gray-500 text-lg">Loading...</p>
      </div>
    )
  }

  return (
    <ToastProvider>
      {!user ? <AuthForm /> : !player ? <UsernameSetup user={user} onComplete={(p) => setPlayer(p)} /> : <Game player={player} />}
    </ToastProvider>
  )
}
