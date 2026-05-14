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
    if (!/^[a-zA-Z0-9_]+$/.test(name)) return setError('Only letters, numbers, and underscores allowed')

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
            disabled={submitting}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 disabled:opacity-50"
          />

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg py-2.5 font-semibold transition-colors flex items-center justify-center gap-2"
          >
            {submitting && (
              <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            )}
            {submitting ? 'Checking...' : 'Continue'}
          </button>
        </form>
      </div>
    </div>
  )
}
