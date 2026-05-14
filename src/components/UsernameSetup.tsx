import { useState, useEffect, useRef, type FormEvent } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from './Toast'
import { checkUsernameAvailable } from '../lib/api'

type ValidationStatus = 'idle' | 'checking' | 'valid' | 'invalid'

export default function UsernameSetup() {
  const [username, setUsername] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [validation, setValidation] = useState<ValidationStatus>('idle')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { createProfile } = useAuth()
  const { toast } = useToast()

  useEffect(() => {
    setError('')
    const name = username.trim()

    if (name.length < 2) { setValidation('idle'); return }
    if (!/^[a-zA-Z0-9_]+$/.test(name)) { setValidation('invalid'); return }

    setValidation('checking')

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      try {
        const available = await checkUsernameAvailable(name)
        setValidation(available ? 'valid' : 'invalid')
      } catch {
        setValidation('idle')
      }
    }, 500)

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [username])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')

    const name = username.trim()
    if (name.length < 2) return setError('Username must be at least 2 characters')
    if (!/^[a-zA-Z0-9_]+$/.test(name)) return setError('Only letters, numbers, and underscores')
    if (validation === 'invalid') return setError('Username is already taken')

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
          <div className="relative">
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              maxLength={24}
              autoFocus
              disabled={submitting}
              className="w-full bg-surface-over rounded-xl px-4 py-3 pr-12 text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-indigo/50 disabled:opacity-50"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
              {validation === 'checking' && (
                <span className="inline-block w-5 h-5 border-2 border-text-muted/30 border-t-text-muted rounded-full animate-spin" />
              )}
              {validation === 'valid' && (
                <span className="inline-block w-5 h-5 rounded-full bg-green flex items-center justify-center text-xs text-white font-bold">✓</span>
              )}
              {validation === 'invalid' && (
                <span className="inline-block w-5 h-5 rounded-full bg-red flex items-center justify-center text-xs text-white font-bold">✕</span>
              )}
            </div>
          </div>

          {error && <p className="text-red text-sm">{error}</p>}

          <button
            type="submit"
            disabled={submitting || validation === 'checking' || validation === 'invalid'}
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