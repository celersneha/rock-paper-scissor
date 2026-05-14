import { useState } from 'react'
import { supabase } from './supabase'
import { useToast } from './Toast'

export default function AuthForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const { toast } = useToast()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    const timeout = setTimeout(() => {
      setSubmitting(false)
      toast('Request timed out. Please try again.', 'error')
    }, 10000)

    try {
      const fn = mode === 'login' ? supabase.auth.signInWithPassword : supabase.auth.signUp
      const { error: err } = await fn({ email, password })

      if (err) {
        if (err.message === 'User already registered') {
          setError('This email is already registered. Please log in instead.')
          toast('Account already exists', 'error')
        } else {
          setError(err.message)
          toast(err.message, 'error')
        }
      } else if (mode === 'signup') {
        toast('Account created! Setting up your profile...', 'success')
      } else {
        toast('Signed in successfully!', 'success')
      }
    } catch (err: any) {
      setError(err?.message || 'Something went wrong')
      toast('Network error. Please try again.', 'error')
    } finally {
      clearTimeout(timeout)
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 w-full max-w-sm">
        <h1 className="text-3xl font-bold text-center mb-6">
          Rock <span className="text-amber-400">Paper</span> Scissors
        </h1>
        <p className="text-gray-500 text-center mb-6">
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
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 disabled:opacity-50"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
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
            {submitting ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Sign Up'}
          </button>
        </form>

        <p className="text-gray-500 text-sm text-center mt-6">
          {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}{' '}
          <button
            onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError('') }}
            disabled={submitting}
            className="text-indigo-400 hover:underline disabled:opacity-50"
          >
            {mode === 'login' ? 'Sign Up' : 'Sign In'}
          </button>
        </p>
      </div>
    </div>
  )
}
