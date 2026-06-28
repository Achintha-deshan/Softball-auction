'use client'

import { useState } from 'react'
import { signIn, signUp } from '@/app/actions/auth'

export default function LoginPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(formData: FormData) {
    setError('')
    setLoading(true)
    const action = mode === 'login' ? signIn : signUp
    const result = await action(formData)
    // success unahama redirect wenawa; error ekak awoth withri meka return wenne
    if (result?.error) {
      setError(result.error)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
      <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-8">
        <h1 className="text-2xl font-bold text-white mb-1">
          {mode === 'login' ? 'Welcome back' : 'Create account'}
        </h1>
        <p className="text-slate-400 text-sm mb-6">
          Softball Premier League — Auction
        </p>

        <form action={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-slate-300 mb-1">Username</label>
            <input
              name="username"
              type="text"
              autoComplete="username"
              required
              className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-sm text-slate-300 mb-1">Password</label>
            <input
              name="password"
              type="password"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              required
              className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white outline-none focus:border-emerald-500"
            />
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold disabled:opacity-50"
          >
            {loading ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Sign up'}
          </button>
        </form>

        <button
          onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError('') }}
          className="w-full text-center text-sm text-slate-400 hover:text-white mt-5"
        >
          {mode === 'login'
            ? "No account? Create one"
            : 'Already have an account? Log in'}
        </button>
      </div>
    </div>
  )
}