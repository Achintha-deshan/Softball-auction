'use client'

import { useState } from 'react'
import { createPlayer, deletePlayer } from '@/app/actions/player'
import { uploadImage } from '@/utils/cloudinary'

type Player = {
  id: string
  number: number | null
  name: string
  age: number | null
  phone: string | null
  image_url: string | null
  bat_hand: string | null
  bowl_hand: string | null
  role: string | null
  current_team: string | null
  base_price: number
  status: string
}

export default function PlayersSection({
  leagueId,
  players,
}: {
  leagueId: string
  players: Player[]
}) {
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [imageUrl, setImageUrl] = useState('')
  const [uploading, setUploading] = useState(false)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true); setError('')
    try {
      const url = await uploadImage(file)
      setImageUrl(url)
    } catch {
      setError('Image upload failed. Check Cloudinary settings.')
    }
    setUploading(false)
  }

  async function handleAdd(formData: FormData) {
    setError(''); setLoading(true)
    formData.set('image_url', imageUrl)
    const res = await createPlayer(leagueId, formData)
    setLoading(false)
    if (res?.error) setError(res.error)
    else { setShowForm(false); setImageUrl('') }
  }

  const inputCls =
    'w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 outline-none focus:border-emerald-500'

  return (
    <div className="mt-10">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Players ({players.length})</h2>
        <button onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 text-sm rounded-lg bg-emerald-600 hover:bg-emerald-500 font-semibold">
          {showForm ? 'Cancel' : '+ Add player'}
        </button>
      </div>

      {showForm && (
        <form action={handleAdd} className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 mb-6">
          {/* photo */}
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-xl bg-slate-800 border border-slate-700 overflow-hidden flex items-center justify-center text-slate-500 text-2xl">
              {imageUrl ? <img src={imageUrl} alt="" className="w-full h-full object-cover" /> : '📷'}
            </div>
            <div>
              <input type="file" accept="image/*" onChange={handleFile} className="text-sm text-slate-300" />
              {uploading && <p className="text-xs text-emerald-400 mt-1">Uploading…</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-300 mb-1">Player number</label>
              <input name="number" type="number" className={inputCls} />
            </div>
            <div>
              <label className="block text-sm text-slate-300 mb-1">Full name *</label>
              <input name="name" required className={inputCls} />
            </div>
            <div>
              <label className="block text-sm text-slate-300 mb-1">Age</label>
              <input name="age" type="number" className={inputCls} />
            </div>
            <div>
              <label className="block text-sm text-slate-300 mb-1">Phone</label>
              <input name="phone" className={inputCls} />
            </div>
            <div>
              <label className="block text-sm text-slate-300 mb-1">Batting hand</label>
              <select name="bat_hand" className={inputCls} defaultValue="">
                <option value="">—</option>
                <option value="right">Right hand</option>
                <option value="left">Left hand</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-300 mb-1">Role</label>
              <select name="role" className={inputCls} defaultValue="">
                <option value="">—</option>
                <option value="batsman">Batsman</option>
                <option value="bowler">Bowler</option>
                <option value="both">All-rounder</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-300 mb-1">Bowling arm</label>
              <select name="bowl_hand" className={inputCls} defaultValue="">
                <option value="">—</option>
                <option value="right">Right arm</option>
                <option value="left">Left arm</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-300 mb-1">Current team</label>
              <input name="current_team" className={inputCls} />
            </div>
            <div>
              <label className="block text-sm text-slate-300 mb-1">Base price (Rs)</label>
              <input name="base_price" type="number" defaultValue={25000} className={inputCls} />
            </div>
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button type="submit" disabled={loading || uploading}
            className="px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 font-semibold disabled:opacity-50">
            {loading ? 'Adding…' : 'Add player'}
          </button>
        </form>
      )}

      {players.length === 0 ? (
        <p className="text-slate-500 text-sm py-8 text-center">No players yet.</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {players.map((p) => (
            <div key={p.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4 relative">
              <button
                onClick={() => { if (confirm(`Remove ${p.name}?`)) deletePlayer(p.id, leagueId) }}
                className="absolute top-2 right-2 text-red-400 hover:text-red-300 text-sm">✕</button>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-slate-800 overflow-hidden flex items-center justify-center text-slate-500">
                  {p.image_url ? <img src={p.image_url} alt="" className="w-full h-full object-cover" /> : (p.number ?? '?')}
                </div>
                <div className="min-w-0">
                  <div className="font-semibold truncate">{p.name}</div>
                  <div className="text-xs text-slate-400">
                    {p.role === 'both' ? 'All-rounder' : p.role || 'Player'}
                    {p.bat_hand ? ` · ${p.bat_hand === 'right' ? 'RH bat' : 'LH bat'}` : ''}
                    {p.bowl_hand ? ` · ${p.bowl_hand === 'right' ? 'RA bowl' : 'LA bowl'}` : ''}
                  </div>
                </div>
              </div>
              <div className="text-sm text-emerald-400 font-semibold mt-2">Rs {p.base_price.toLocaleString()}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}