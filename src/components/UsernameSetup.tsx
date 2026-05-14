import { useState, type FormEvent } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from './Toast'

export default function UsernameSetup() {
  const [username, setUsername] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const { createProfile } = useAuth()
  const { toast } = useToast()

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')

    const name = username.trim()
    if (name.length < 2) return setError('Username must be at least 2 characters')
    if (!/^[a-zA-Z0-9_]+$/.test(name)) return setError('Only letters, numbers, and underscores')

    setSubmitting(true)
    const errMsg = await createProfile(name)
    setSubmitting(false)

    if (errMsg) {
      setError(errMsg)
      toast(errMsg, 'error')
    } else {
      toast('Welcome, ' + name + '!', 'success')
    }
  }

  return (
    <div className="min-h-screen bg-surface text-text flex items-center justify-center p-4">
      <div className="bg-surface-raised rounded-2xl p-8 w-full max-w-sm">
        <h1 className="text-2xl font-bold text-center mb-2">Welcome!</h1>
        <p className="text-text-soft text-center mb-8">Choose a unique username</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            maxLength={24}
            autoFocus
            disabled={submitting}
            className="w-full bg-surface-over rounded-xl px-4 py-3 text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-indigo/50 disabled:opacity-50"
          />

          {error && <p className="text-red text-sm">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-indigo hover:opacity-90 disabled:opacity-40 rounded-xl py-3 font-semibold transition-all flex items-center justify-center gap-2"
          >
            {submitting && (
              <span className="inline-block w-4 h-4 border-2 border-text/30 border-t-text rounded-full animate-spin" />
            )}
            {submitting ? 'Checking...' : 'Continue'}
          </button>
        </form>
      </div>
    </div>
  )
}
