'use client'

import { useState } from 'react'
import { updateBidTiers } from '@/app/actions/league'

type Tier = { upTo: number | null; step: number }

export default function BidTiersEditor({
  leagueId,
  initial,
}: {
  leagueId: string
  initial: Tier[]
}) {
  const [tiers, setTiers] = useState<Tier[]>(
    initial?.length ? initial : [{ upTo: null, step: 1000 }]
  )
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  function setField(i: number, key: 'upTo' | 'step', val: string) {
    const next = [...tiers]
    next[i] = { ...next[i], [key]: val === '' ? null : parseInt(val, 10) }
    setTiers(next)
  }
  function addTier() {
    setTiers([...tiers, { upTo: null, step: 1000 }])
  }
  function removeTier(i: number) {
    setTiers(tiers.filter((_, idx) => idx !== i))
  }

  async function save() {
    setSaving(true); setMsg('')
    // upTo අනුව sort කරනවා (null = අන්තිමට)
    const clean = [...tiers].sort((a, b) => {
      if (a.upTo === null) return 1
      if (b.upTo === null) return -1
      return a.upTo - b.upTo
    })
    const res = await updateBidTiers(leagueId, clean)
    setSaving(false)
    setMsg(res?.error ? res.error : 'Saved ✓')
    if (!res?.error) setTiers(clean)
  }

  const inputCls = 'px-2 py-1.5 rounded-lg bg-slate-800 border border-slate-700 outline-none focus:border-emerald-500 w-32'

  return (
    <div className="mt-10 bg-slate-900 border border-slate-800 rounded-xl p-5">
      <button onClick={() => setOpen(!open)} className="flex items-center justify-between w-full">
        <h2 className="text-lg font-semibold">⚙️ Bid increments</h2>
        <span className="text-slate-400 text-sm">{open ? 'Hide' : 'Edit'}</span>
      </button>

      {open && (
        <div className="mt-4 space-y-3">
          <p className="text-sm text-slate-400">
            Auction එකේදී bid එක මේ amounts වලින් වැඩි වෙනවා. (උදා: Rs 50,000 වෙනකන් 2,500 ගානේ.)
          </p>

          {tiers.map((t, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              <span className="text-slate-400">Up to Rs</span>
              <input
                type="number"
                placeholder="Above all"
                value={t.upTo ?? ''}
                onChange={(e) => setField(i, 'upTo', e.target.value)}
                className={inputCls}
              />
              <span className="text-slate-400">→ raise by</span>
              <input
                type="number"
                value={t.step}
                onChange={(e) => setField(i, 'step', e.target.value)}
                className={inputCls}
              />
              <button onClick={() => removeTier(i)} className="text-red-400 hover:text-red-300">✕</button>
            </div>
          ))}

          <div className="flex items-center gap-3 pt-2">
            <button onClick={addTier}
              className="text-sm border border-slate-700 rounded-lg px-3 py-1.5 hover:bg-slate-800">
              + Add tier
            </button>
            <button onClick={save} disabled={saving}
              className="text-sm bg-emerald-600 hover:bg-emerald-500 rounded-lg px-4 py-1.5 font-semibold disabled:opacity-50">
              {saving ? 'Saving…' : 'Save'}
            </button>
            {msg && <span className="text-sm text-emerald-400">{msg}</span>}
          </div>

          <p className="text-xs text-slate-500">
            "Up to Rs" හිස්ව තිබ්බොත් = ඊට උඩ ඔක්කොම (last tier එක).
          </p>
        </div>
      )}
    </div>
  )
}