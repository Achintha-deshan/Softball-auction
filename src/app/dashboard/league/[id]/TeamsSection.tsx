'use client'

import { useState } from 'react'
import { createTeam, deleteTeam } from '@/app/actions/team'
import { addRetainedPlayer } from '@/app/actions/player'
import { uploadImage } from '@/utils/cloudinary'

type Team = {
  id: string
  name: string
  manager_name: string | null
  manager_phone: string | null
  access_code: string
  budget: number
  logo_url: string | null
  manager_photo_url: string | null
}

export default function TeamsSection({
  leagueId,
  teams,
}: {
  leagueId: string
  teams: Team[]
}) {
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [logoUrl, setLogoUrl] = useState('')
  const [mgrUrl, setMgrUrl] = useState('')
  const [uploading, setUploading] = useState('')
  const [retainFor, setRetainFor] = useState<string | null>(null)
  const [retainImg, setRetainImg] = useState('')
  const [retainBusy, setRetainBusy] = useState(false)

  async function handleUpload(
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (u: string) => void,
    which: string
  ) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(which); setError('')
    try {
      const url = await uploadImage(file)
      setter(url)
    } catch {
      setError('Image upload failed. Check Cloudinary settings.')
    }
    setUploading('')
  }

  async function handleAdd(formData: FormData) {
    setError(''); setLoading(true)
    formData.set('logo_url', logoUrl)
    formData.set('manager_photo_url', mgrUrl)
    const res = await createTeam(leagueId, formData)
    setLoading(false)
    if (res?.error) setError(res.error)
    else { setShowForm(false); setLogoUrl(''); setMgrUrl('') }
  }

  async function handleRetainImg(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setRetainBusy(true); setError('')
    try { setRetainImg(await uploadImage(file)) }
    catch { setError('Image upload failed.') }
    setRetainBusy(false)
  }

  async function handleAddRetained(teamId: string, formData: FormData) {
    setError('')
    formData.set('image_url', retainImg)
    const res = await addRetainedPlayer(leagueId, teamId, formData)
    if (res?.error) setError(res.error)
    else { setRetainFor(null); setRetainImg('') }
  }

  const inputCls =
    'w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 outline-none focus:border-emerald-500 text-sm'

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Teams ({teams.length})</h2>
        <button onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 text-sm rounded-lg bg-emerald-600 hover:bg-emerald-500 font-semibold">
          {showForm ? 'Cancel' : '+ Add team'}
        </button>
      </div>

      {showForm && (
        <form action={handleAdd} className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 mb-6">
          {/* logo + manager photo */}
          <div className="flex gap-6">
            <div className="text-center">
              <div className="w-20 h-20 rounded-xl bg-slate-800 border border-slate-700 overflow-hidden flex items-center justify-center text-slate-500 text-2xl mx-auto">
                {logoUrl ? <img src={logoUrl} alt="" className="w-full h-full object-cover" /> : '🛡️'}
              </div>
              <label className="block text-xs text-slate-400 mt-2">Team logo</label>
              <input type="file" accept="image/*" onChange={(e) => handleUpload(e, setLogoUrl, 'logo')}
                className="text-xs text-slate-300 mt-1 w-28" />
              {uploading === 'logo' && <p className="text-xs text-emerald-400">Uploading…</p>}
            </div>
            <div className="text-center">
              <div className="w-20 h-20 rounded-full bg-slate-800 border border-slate-700 overflow-hidden flex items-center justify-center text-slate-500 text-2xl mx-auto">
                {mgrUrl ? <img src={mgrUrl} alt="" className="w-full h-full object-cover" /> : '👤'}
              </div>
              <label className="block text-xs text-slate-400 mt-2">Manager photo</label>
              <input type="file" accept="image/*" onChange={(e) => handleUpload(e, setMgrUrl, 'mgr')}
                className="text-xs text-slate-300 mt-1 w-28" />
              {uploading === 'mgr' && <p className="text-xs text-emerald-400">Uploading…</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-300 mb-1">Team name</label>
              <input name="name" required className={inputCls} />
            </div>
            <div>
              <label className="block text-sm text-slate-300 mb-1">Budget (Rs)</label>
              <input name="budget" type="number" defaultValue={500000} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm text-slate-300 mb-1">Manager name</label>
              <input name="manager_name" className={inputCls} />
            </div>
            <div>
              <label className="block text-sm text-slate-300 mb-1">Manager phone</label>
              <input name="manager_phone" className={inputCls} />
            </div>
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button type="submit" disabled={loading || !!uploading}
            className="px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 font-semibold disabled:opacity-50">
            {loading ? 'Adding…' : 'Add team'}
          </button>
        </form>
      )}

      {teams.length === 0 ? (
        <p className="text-slate-500 text-sm py-8 text-center">
          No teams yet. Add your first team to get started.
        </p>
      ) : (
        <div className="space-y-3">
          {teams.map((t) => (
            <div key={t.id} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-lg bg-slate-800 overflow-hidden flex items-center justify-center text-slate-500 flex-none">
                    {t.logo_url ? <img src={t.logo_url} alt="" className="w-full h-full object-cover" /> : '🛡️'}
                  </div>
                  <div>
                    <div className="font-semibold">{t.name}</div>
                    <div className="text-sm text-slate-400">
                      {t.manager_name || 'No manager'}
                      {t.manager_phone ? ` · ${t.manager_phone}` : ''}
                      {' · Budget Rs '}{t.budget.toLocaleString()}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { setRetainFor(retainFor === t.id ? null : t.id); setRetainImg('') }}
                    className="text-sm text-amber-400 border border-amber-500/40 rounded-lg px-3 py-1 hover:bg-amber-500/10">
                    + Retained
                  </button>
                  <button
                    onClick={() => { navigator.clipboard.writeText(t.access_code); alert(`Code copied: ${t.access_code}`) }}
                    title="Click to copy code"
                    className="font-mono text-emerald-400 bg-slate-800 hover:bg-slate-700 px-3 py-1 rounded-lg tracking-widest text-sm">
                    {t.access_code}
                  </button>
                  <button
                    onClick={() => {
                      const link = `${window.location.origin}/m/${leagueId}`
                      const text = `🏏 ${t.name} — Auction\n\nLink: ${link}\nYour code: ${t.access_code}\n\nLink එක open කරලා, ඔයාගේ code එක ගහන්න.`
                      navigator.clipboard.writeText(text)
                      alert('Link + code copied! Paste it to your manager on WhatsApp.')
                    }}
                    className="text-sm text-emerald-300 hover:text-emerald-200 border border-emerald-700/50 rounded-lg px-3 py-1">
                    📋 Copy link
                  </button>
                  <button
                    onClick={() => { if (confirm(`Remove ${t.name}?`)) deleteTeam(t.id, leagueId) }}
                    className="text-red-400 hover:text-red-300 text-sm">✕</button>
                </div>
              </div>

              {/* retained player form */}
              {retainFor === t.id && (
                <form action={(fd) => handleAddRetained(t.id, fd)}
                  className="border-t border-slate-800 bg-slate-800/40 p-4 space-y-3">
                  <div className="text-sm font-semibold text-amber-400">Add retained player to {t.name}</div>
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-full bg-slate-800 border border-slate-700 overflow-hidden flex items-center justify-center text-slate-500 flex-none">
                      {retainImg ? <img src={retainImg} alt="" className="w-full h-full object-cover" /> : '📷'}
                    </div>
                    <input type="file" accept="image/*" onChange={handleRetainImg} className="text-xs text-slate-300" />
                    {retainBusy && <span className="text-xs text-emerald-400">Uploading…</span>}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <input name="name" required placeholder="Player name" className={inputCls} />
                    <input name="price" type="number" placeholder="Retained price (Rs)" defaultValue={0} className={inputCls} />
                    <input name="age" type="number" placeholder="Age" className={inputCls} />
                    <select name="role" defaultValue="" className={inputCls}>
                      <option value="">Role —</option>
                      <option value="batsman">Batsman</option>
                      <option value="bowler">Bowler</option>
                      <option value="both">All-rounder</option>
                    </select>
                    <select name="bat_hand" defaultValue="" className={inputCls}>
                      <option value="">Batting —</option>
                      <option value="right">Right hand</option>
                      <option value="left">Left hand</option>
                    </select>
                    <select name="bowl_hand" defaultValue="" className={inputCls}>
                      <option value="">Bowling —</option>
                      <option value="right">Right arm</option>
                      <option value="left">Left arm</option>
                    </select>
                  </div>
                  <button type="submit" disabled={retainBusy}
                    className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold text-sm disabled:opacity-50">
                    Add retained player
                  </button>
                </form>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}