import { useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase, createPlayer, isUsernameTaken, type Player } from './supabase'

interface Props {
  user: User
  onComplete: (player: Player) => void
}

export default function UsernameSetup({ user, onComplete }: Props) {
  const [username, setUsername] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    const name = username.trim()
    if (name.length < 2) {
      setError('Username must be at least 2 characters')
      return
    }
    if (!/^[a-zA-Z0-9_]+$/.test(name)) {
      setError('Only letters, numbers, and underscores allowed')
      return
    }

    setSubmitting(true)

    const taken = await isUsernameTaken(name)
    if (taken) {
      setError('Username is already taken')
      setSubmitting(false)
      return
    }

    try {
      const player = await createPlayer(user.id, user.email!, name)
      onComplete(player)
    } catch (err: any) {
      if (err?.message?.includes('duplicate key')) {
        setError('Username is already taken')
      } else {
        setError(err?.message || 'Something went wrong')
      }
    }
    setSubmitting(false)
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 w-full max-w-sm">
        <h1 className="text-2xl font-bold text-center mb-2">Welcome!</h1>
        <p className="text-gray-500 text-center mb-6">Choose a unique username</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            maxLength={24}
            autoFocus
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
          />

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-lg py-2.5 font-semibold transition-colors"
          >
            {submitting ? 'Checking...' : 'Continue'}
          </button>
        </form>
      </div>
    </div>
  )
}
