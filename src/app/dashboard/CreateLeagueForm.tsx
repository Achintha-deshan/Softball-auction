'use client'

import { useState } from 'react'
import { createLeague } from '@/app/actions/league'

export default function CreateLeagueForm() {
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(formData: FormData) {
    setError(''); setLoading(true)
    const res = await createLeague(formData)
    setLoading(false)
    if (res?.error) setError(res.error)
  }

  return (
    <form action={handleSubmit} className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 max-w-md">
      <div>
        <label className="block text-sm text-slate-300 mb-1">League name</label>
        <input name="name" required
          className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 outline-none focus:border-emerald-500" />
      </div>
      <div>
        <label className="block text-sm text-slate-300 mb-1">Match date</label>
        <input name="match_date" type="date"
          className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 outline-none focus:border-emerald-500" />
      </div>
      <div>
        <label className="block text-sm text-slate-300 mb-1">Players per team</label>
        <select name="players_per_team" defaultValue="11"
          className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 outline-none focus:border-emerald-500">
          <option value="6">6-a-side</option>
          <option value="8">8-a-side</option>
          <option value="11">11-a-side</option>
        </select>
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <button type="submit" disabled={loading}
        className="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 font-semibold disabled:opacity-50">
        {loading ? 'Creating…' : 'Create league'}
      </button>
    </form>
  )
}