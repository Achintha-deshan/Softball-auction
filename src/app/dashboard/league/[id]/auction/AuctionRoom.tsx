'use client'

import { useState } from 'react'
import { putOnBlock, updateBid, sellPlayer, markUnsold, clearBlock } from '@/app/actions/auction'

type Tier = { upTo: number | null; step: number }
type Team = {
  id: string; name: string; budget: number
  logo_url: string | null
  manager_name: string | null
  manager_photo_url: string | null
}
type Player = {
  id: string; number: number | null; name: string; image_url: string | null
  role: string | null; bat_hand: string | null; bowl_hand: string | null
  current_team: string | null; base_price: number; status: string
  sold_to_team_id: string | null; sold_price: number | null
}

export default function AuctionRoom({
  leagueId, teams, players, bidTiers,
}: {
  leagueId: string; teams: Team[]; players: Player[]; bidTiers: Tier[]
}) {
  const [current, setCurrent] = useState<Player | null>(null)
  const [bid, setBid] = useState(0)
  const [leadTeam, setLeadTeam] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [sold, setSold] = useState(false)
  const [busy, setBusy] = useState(false)
  const [viewTeam, setViewTeam] = useState<string | null>(null)

  function teamSpent(teamId: string) {
    return players
      .filter((p) => p.sold_to_team_id === teamId && p.status === 'sold')
      .reduce((sum, p) => sum + (p.sold_price || 0), 0)
  }
  function teamLeft(teamId: string) {
    const t = teams.find((x) => x.id === teamId)
    return (t?.budget || 0) - teamSpent(teamId)
  }
  function teamSquad(teamId: string) {
    return players
      .filter((p) => p.sold_to_team_id === teamId && p.status === 'sold')
      .sort((a, b) => (b.sold_price || 0) - (a.sold_price || 0))
  }

  function nextStep(currentBid: number): number {
    const sorted = [...bidTiers].sort((a, b) => {
      if (a.upTo === null) return 1
      if (b.upTo === null) return -1
      return a.upTo - b.upTo
    })
    for (const t of sorted) {
      if (t.upTo === null || currentBid < t.upTo) return t.step
    }
    return sorted[sorted.length - 1]?.step || 1000
  }

  async function bringPlayer(p: Player) {
    setCurrent(p); setBid(p.base_price); setLeadTeam(null); setSold(false)
    await putOnBlock(leagueId, p.id, p.base_price)
  }
  async function raise() {
    const nb = bid + nextStep(bid)
    setBid(nb)
    await updateBid(leagueId, nb)
  }
  async function setBidManual(v: number) {
    setBid(v)
    await updateBid(leagueId, v)
  }
  async function doSell() {
    if (!current || !leadTeam) return
    if (teamLeft(leadTeam) < bid) {
      alert('That team cannot afford this bid.')
      return
    }
    setBusy(true)
    await sellPlayer(leagueId, current.id, leadTeam, bid)
    setBusy(false)
    setSold(true)
  }
  async function doUnsold() {
    if (!current) return
    await markUnsold(leagueId, current.id)
    setCurrent(null); setSold(false)
  }
  async function nextPlayer() {
    await clearBlock(leagueId)
    setCurrent(null); setLeadTeam(null); setSold(false)
  }

  const pool = players.filter((p) => p.status !== 'sold')
  const filtered = search
    ? pool.filter((p) =>
        String(p.number ?? '').includes(search) ||
        p.name.toLowerCase().includes(search.toLowerCase()))
    : pool

  const leadTeamObj = teams.find((t) => t.id === leadTeam)

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="grid md:grid-cols-2 gap-6">
        {/* LEFT: stage */}
        <div>
          {current ? (
            <div className="relative rounded-2xl overflow-hidden border border-slate-700 min-h-[560px] flex flex-col justify-end">
              {current.image_url ? (
                <img src={current.image_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-b from-slate-700 to-slate-900 flex items-center justify-center">
                  <span className="text-9xl font-black text-slate-600">{current.number ?? '?'}</span>
                </div>
              )}

              <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-black/10" />

              {sold && (
                <div className="absolute inset-0 flex items-center justify-center z-20">
                  <span className="text-6xl font-black text-emerald-400 border-4 border-emerald-400 rounded-2xl px-10 py-4 -rotate-12 bg-slate-900/70">
                    SOLD
                  </span>
                </div>
              )}

              <div className="relative z-10 p-7">
                <h2 className="text-4xl font-black drop-shadow-lg">{current.name}</h2>
                <div className="text-slate-200 text-sm mt-1 drop-shadow">
                  {current.number != null && `#${current.number} · `}
                  {current.role === 'both' ? 'All-rounder' : current.role || 'Player'}
                  {current.bat_hand ? ` · ${current.bat_hand === 'right' ? 'RH bat' : 'LH bat'}` : ''}
                  {current.bowl_hand ? ` · ${current.bowl_hand === 'right' ? 'RA bowl' : 'LA bowl'}` : ''}
                </div>
                {current.current_team && (
                  <div className="text-slate-400 text-xs mt-1 drop-shadow">From: {current.current_team}</div>
                )}

                <div className="mt-5 pt-5 border-t border-white/15">
                  <div className="text-xs uppercase tracking-widest text-slate-300">
                    {sold ? 'Sold for' : 'Current bid'}
                  </div>
                  <div className="text-6xl font-black text-amber-400 tabular-nums mt-1 drop-shadow-lg">
                    {bid.toLocaleString()}
                  </div>
                  <div className="h-7 mt-2">
                    {leadTeamObj && (
                      <span className="inline-block bg-black/50 backdrop-blur px-4 py-1 rounded-full text-sm font-semibold">
                        {leadTeamObj.name} {sold ? '' : 'leads'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400">
              <div className="text-2xl font-bold text-white mb-1">No player on the block</div>
              <div>Search and pick a player →</div>
            </div>
          )}
        </div>

        {/* RIGHT: controls */}
        <div>
          {current && !sold ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
              <h3 className="font-semibold">🎙️ Auctioneer controls</h3>

              <div className="flex gap-2">
                <input
                  type="number"
                  value={bid}
                  onChange={(e) => setBid(parseInt(e.target.value) || 0)}
                  className="flex-1 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-amber-400 font-bold text-xl text-center outline-none focus:border-amber-500"
                />
                <button onClick={() => setBidManual(bid)}
                  className="px-4 rounded-lg bg-slate-700 hover:bg-slate-600 text-sm">Set</button>
              </div>

              <button onClick={raise}
                className="w-full py-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold">
                + Raise (next: {nextStep(bid).toLocaleString()})
              </button>

              <div>
                <div className="text-xs uppercase tracking-wider text-slate-400 mb-2">Top bidder — tap a team</div>
                <div className="grid grid-cols-2 gap-2">
                  {teams.map((t) => {
                    const left = teamLeft(t.id)
                    const broke = left < bid
                    return (
                      <button key={t.id}
                        onClick={() => setLeadTeam(t.id)}
                        className={`flex items-center gap-2 p-2 rounded-lg border text-left transition
                          ${leadTeam === t.id ? 'border-amber-400 bg-amber-400/10' : 'border-slate-700 bg-slate-800'}
                          ${broke ? 'opacity-50' : ''}`}>
                        <div className="w-8 h-8 rounded bg-slate-700 overflow-hidden flex items-center justify-center text-xs flex-none">
                          {t.logo_url ? <img src={t.logo_url} alt="" className="w-full h-full object-cover" /> : '🛡️'}
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-semibold truncate">{t.name}</div>
                          <div className={`text-xs ${broke ? 'text-red-400' : 'text-slate-400'}`}>
                            Left: {left.toLocaleString()}
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button onClick={doSell} disabled={!leadTeam || busy}
                  className="flex-1 py-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 font-bold disabled:opacity-40">
                  ✓ SOLD
                </button>
                <button onClick={doUnsold}
                  className="px-4 py-3 rounded-lg bg-red-500/20 text-red-300 border border-red-500/40 font-semibold">
                  Unsold
                </button>
              </div>
            </div>
          ) : current && sold ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <button onClick={nextPlayer}
                className="w-full py-4 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold text-lg">
                Next player →
              </button>
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by player number or name…"
                className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-slate-700 outline-none focus:border-emerald-500 mb-4"
              />
              <div className="text-xs text-slate-400 mb-2">Pool ({pool.length})</div>
              <div className="grid grid-cols-3 gap-2 max-h-[420px] overflow-auto">
                {filtered.map((p) => (
                  <button key={p.id} onClick={() => bringPlayer(p)}
                    className="bg-slate-800 hover:border-amber-400 border border-slate-700 rounded-xl p-3 text-center transition">
                    <div className="w-12 h-12 rounded-full mx-auto bg-slate-700 overflow-hidden flex items-center justify-center mb-1">
                      {p.image_url ? <img src={p.image_url} alt="" className="w-full h-full object-cover" /> : (p.number ?? '?')}
                    </div>
                    <div className="text-xs font-semibold truncate">{p.name}</div>
                    <div className="text-xs text-amber-400">{p.base_price.toLocaleString()}</div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ===== TEAM CARDS ===== */}
      <div className="mt-10">
        <h3 className="text-lg font-semibold mb-3">Teams</h3>
        <div className="flex flex-wrap gap-2 mb-5">
          {teams.map((t) => (
            <button key={t.id}
              onClick={() => setViewTeam(viewTeam === t.id ? null : t.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition
                ${viewTeam === t.id ? 'border-amber-400 bg-amber-400/10' : 'border-slate-700 bg-slate-900'}`}>
              <div className="w-7 h-7 rounded bg-slate-700 overflow-hidden flex items-center justify-center text-xs flex-none">
                {t.logo_url ? <img src={t.logo_url} alt="" className="w-full h-full object-cover" /> : '🛡️'}
              </div>
              <span className="text-sm font-semibold">{t.name}</span>
              <span className="text-xs text-emerald-400">{teamSquad(t.id).length}</span>
            </button>
          ))}
        </div>

        {viewTeam && (() => {
          const t = teams.find((x) => x.id === viewTeam)!
          const squad = teamSquad(viewTeam)
          const spent = teamSpent(viewTeam)
          return (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden max-w-2xl">
              <div className="flex items-center gap-4 p-5 border-b border-slate-800 bg-slate-800/40">
                <div className="w-14 h-14 rounded-full bg-slate-700 overflow-hidden flex items-center justify-center flex-none">
                  {t.manager_photo_url
                    ? <img src={t.manager_photo_url} alt="" className="w-full h-full object-cover" />
                    : '👤'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded bg-slate-700 overflow-hidden flex items-center justify-center text-xs flex-none">
                      {t.logo_url ? <img src={t.logo_url} alt="" className="w-full h-full object-cover" /> : '🛡️'}
                    </div>
                    <h4 className="text-xl font-black truncate">{t.name}</h4>
                  </div>
                  <div className="text-sm text-slate-400">{t.manager_name || 'No manager'}</div>
                </div>
                <div className="text-right flex-none">
                  <div className="text-xs uppercase tracking-wider text-slate-400">Left</div>
                  <div className="text-xl font-black text-emerald-400 tabular-nums">
                    {(t.budget - spent).toLocaleString()}
                  </div>
                </div>
              </div>

              <div className="p-4">
                <div className="text-xs text-slate-400 mb-2">
                  {squad.length} players · spent {spent.toLocaleString()}
                </div>
                {squad.length === 0 ? (
                  <p className="text-slate-500 text-sm py-4 text-center">No players bought yet.</p>
                ) : (
                  <div className="space-y-2">
                    {squad.map((p) => (
                      <div key={p.id} className="flex items-center gap-3 bg-slate-800 rounded-lg p-2">
                        <div className="w-9 h-9 rounded-full bg-slate-700 overflow-hidden flex items-center justify-center text-xs flex-none">
                          {p.image_url ? <img src={p.image_url} alt="" className="w-full h-full object-cover" /> : (p.number ?? '?')}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold truncate">{p.name}</div>
                          <div className="text-xs text-slate-400">
                            {p.role === 'both' ? 'All-rounder' : p.role || 'Player'}
                          </div>
                        </div>
                        <div className="text-sm font-bold text-amber-400 tabular-nums">
                          {(p.sold_price || 0).toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )
        })()}
      </div>
    </div>
  )
}