import { useState, type FormEvent } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from './Toast'

export default function AuthForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const { signIn, signUp } = useAuth()
  const { toast } = useToast()

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    const fn = mode === 'login' ? signIn : signUp
    const errMsg = await fn(email, password)
    setSubmitting(false)

    if (errMsg) {
      setError(errMsg)
      toast(errMsg, 'error')
    } else {
      toast(mode === 'login' ? 'Signed in!' : 'Account created!', 'success')
    }
  }

  return (
    <div className="min-h-screen bg-surface text-text flex items-center justify-center p-4">
      <div className="bg-surface-raised rounded-2xl p-8 w-full max-w-sm">
        <h1 className="text-3xl font-bold text-center mb-2">
          Rock <span className="text-amber">Paper</span> Scissors
        </h1>
        <p className="text-text-soft text-center mb-8">
          {mode === 'login' ? 'Sign in to play' : 'Create an account'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={submitting}
            className="w-full bg-surface-over rounded-xl px-4 py-3 text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-indigo/50 disabled:opacity-50"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
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
            {submitting ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Sign Up'}
          </button>
        </form>

        <p className="text-text-soft text-sm text-center mt-6">
          {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}{' '}
          <button
            onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError('') }}
            disabled={submitting}
            className="text-indigo hover:underline disabled:opacity-50"
          >
            {mode === 'login' ? 'Sign Up' : 'Sign In'}
          </button>
        </p>
      </div>
    </div>
  )
}
