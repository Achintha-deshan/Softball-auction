'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { managerLogin } from '@/app/actions/auth'

export default function ManagerLogin({
  leagueId, leagueName,
}: {
  leagueId: string; leagueName: string
}) {
  const router = useRouter()
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit() {
    setError(''); setLoading(true)
    const res = await managerLogin(leagueId, code)
    setLoading(false)
    if (res?.error) setError(res.error)
    else router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
      <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center">
        <div className="text-4xl mb-3">🏏</div>
        <h1 className="text-2xl font-bold text-white mb-1">{leagueName}</h1>
        <p className="text-slate-400 text-sm mb-6">Enter your team code to join the auction</p>

        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder="CODE"
          maxLength={6}
          className="w-full text-center text-2xl font-bold tracking-[0.4em] uppercase px-3 py-4 rounded-xl bg-slate-800 border border-slate-700 text-white outline-none focus:border-emerald-500 mb-4"
        />

        {error && <p className="text-red-400 text-sm mb-3">{error}</p>}

        <button onClick={submit} disabled={loading}
          className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold disabled:opacity-50">
          {loading ? 'Joining…' : 'Join auction'}
        </button>
      </div>
    </div>
  )
}