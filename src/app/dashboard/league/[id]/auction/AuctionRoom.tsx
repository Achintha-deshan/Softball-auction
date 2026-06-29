'use client'

import { useState, useEffect } from 'react'
import { putOnBlock, updateBid, sellPlayer, markUnsold, clearBlock } from '@/app/actions/auction'
import { updateSoldPlayer, unsellPlayer } from '@/app/actions/player'

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
  sold_to_team_id: string | null; sold_price: number | null; is_retained: boolean
}

export default function AuctionRoom({
  leagueId, leagueName, teams, players, bidTiers, playersPerTeam, minBid,
}: {
  leagueId: string; leagueName: string; teams: Team[]; players: Player[]
  bidTiers: Tier[]; playersPerTeam: number; minBid: number
}) {
  const [current, setCurrent] = useState<Player | null>(null)
  const [bid, setBid] = useState(0)
  const [leadTeam, setLeadTeam] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [sold, setSold] = useState(false)
  const [busy, setBusy] = useState(false)
  const [viewTeam, setViewTeam] = useState<string | null>(null)
  const [cardTeam, setCardTeam] = useState<string | null>(null)

  const [editPlayer, setEditPlayer] = useState<Player | null>(null)
  const [editPrice, setEditPrice] = useState(0)
  const [editTeam, setEditTeam] = useState('')

  useEffect(() => {
    return () => { clearBlock(leagueId) }
  }, [leagueId])

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

  // ===== reserve / budget rules =====
  function squadCount(teamId: string) {
    return players.filter((p) => p.sold_to_team_id === teamId && p.status === 'sold').length
  }
  function stillNeeded(teamId: string) {
    return Math.max(0, playersPerTeam - squadCount(teamId))
  }
  // me player ta danna puluwan max (ithuru ayata reserve karala)
  function maxAffordable(teamId: string) {
    const need = stillNeeded(teamId)
    if (need <= 0) return 0
    const reserve = (need - 1) * minBid
    return teamLeft(teamId) - reserve
  }
  function canAfford(teamId: string, amount: number) {
    return stillNeeded(teamId) > 0 && amount <= maxAffordable(teamId)
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
    if (!canAfford(leadTeam, bid)) {
      alert('That team cannot take this player at this price (must reserve budget for remaining players).')
      return
    }
    setBusy(true)
    await sellPlayer(leagueId, current.id, leadTeam, bid)
    setBusy(false)
    setSold(true)
  }
  async function skipPlayer() {
    if (!current) return
    await markUnsold(leagueId, current.id)
    setCurrent(null); setLeadTeam(null); setSold(false)
  }
  async function nextPlayer() {
    await clearBlock(leagueId)
    setCurrent(null); setLeadTeam(null); setSold(false)
  }

  function openEdit(p: Player) {
    setEditPlayer(p)
    setEditPrice(p.sold_price || 0)
    setEditTeam(p.sold_to_team_id || '')
  }
  async function saveEdit() {
    if (!editPlayer) return
    await updateSoldPlayer(leagueId, editPlayer.id, editTeam, editPrice)
    setEditPlayer(null)
  }
  async function cancelSale() {
    if (!editPlayer) return
    if (!confirm(`Cancel sale & send ${editPlayer.name} back to pool?`)) return
    await unsellPlayer(leagueId, editPlayer.id)
    setEditPlayer(null)
  }

  const round1 = players.filter((p) => p.status === 'pool')
  const round2 = players.filter((p) => p.status === 'unsold')
  const inRound2 = round1.length === 0 && round2.length > 0
  const activePool = round1.length > 0 ? round1 : round2

  const filtered = search
    ? activePool.filter((p) =>
        String(p.number ?? '').includes(search) ||
        p.name.toLowerCase().includes(search.toLowerCase()))
    : activePool

  const leadTeamObj = teams.find((t) => t.id === leadTeam)

  // lead team affordability (derived — bid maaru unaama auto)
  const leadNeed = leadTeam ? stillNeeded(leadTeam) : 0
  const leadMax = leadTeam ? maxAffordable(leadTeam) : 0
  const leadOk = leadTeam ? canAfford(leadTeam, bid) : false

  const highestSold = players
    .filter((p) => p.status === 'sold' && p.sold_price)
    .sort((a, b) => (b.sold_price || 0) - (a.sold_price || 0))[0] || null
  const highestTeam = highestSold
    ? teams.find((t) => t.id === highestSold.sold_to_team_id)
    : null

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
                    const need = stillNeeded(t.id)
                    const maxA = maxAffordable(t.id)
                    const ok = need > 0 && maxA >= bid
                    return (
                      <button key={t.id}
                        onClick={() => setLeadTeam(t.id)}
                        className={`flex items-center gap-2 p-2 rounded-lg border text-left transition
                          ${leadTeam === t.id ? 'border-amber-400 bg-amber-400/10' : 'border-slate-700 bg-slate-800'}
                          ${!ok ? 'opacity-50' : ''}`}>
                        <div className="w-8 h-8 rounded bg-slate-700 overflow-hidden flex items-center justify-center text-xs flex-none">
                          {t.logo_url ? <img src={t.logo_url} alt="" className="w-full h-full object-cover" /> : '🛡️'}
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-semibold truncate">{t.name}</div>
                          <div className={`text-xs ${ok ? 'text-slate-400' : 'text-red-400'}`}>
                            {need <= 0
                              ? 'Squad full'
                              : ok
                                ? `Left ${teamLeft(t.id).toLocaleString()} · need ${need}`
                                : `Max ${maxA.toLocaleString()}`}
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* lead team affordability warning */}
              {leadTeam && !leadOk && (
                <div className="bg-red-500/15 border border-red-500/40 text-red-300 rounded-lg px-3 py-2 text-sm">
                  ⚠️ {leadTeamObj?.name} can’t take at this price.{' '}
                  {leadNeed <= 0
                    ? 'Squad already full.'
                    : `Max bid Rs ${leadMax.toLocaleString()} — keep Rs ${((leadNeed - 1) * minBid).toLocaleString()} for ${leadNeed - 1} more player(s).`}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button onClick={doSell} disabled={!leadTeam || !leadOk || busy}
                  className="flex-1 py-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 font-bold disabled:opacity-40">
                  ✓ SOLD
                </button>
                <button onClick={skipPlayer}
                  className="px-4 py-3 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 font-semibold">
                  Skip →
                </button>
              </div>
              <p className="text-xs text-slate-500 text-center">
                Skip = no bids now. They come back in the next round.
              </p>
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
              {inRound2 && (
                <div className="mb-3 bg-amber-500/15 border border-amber-400/40 text-amber-300 rounded-lg px-3 py-2 text-sm font-semibold text-center">
                  🔁 Round 2 — players who were skipped
                </div>
              )}
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by player number or name…"
                className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-slate-700 outline-none focus:border-emerald-500 mb-4"
              />
              <div className="text-xs text-slate-400 mb-2">
                {inRound2 ? 'Skipped' : 'Pool'} ({activePool.length})
              </div>
              {activePool.length === 0 ? (
                <div className="text-center text-slate-500 py-10">
                  <div className="text-lg font-bold text-white mb-1">All done! 🎉</div>
                  <div className="text-sm">Every player has been sold or skipped.</div>
                </div>
              ) : (
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
              )}
            </div>
          )}
        </div>
      </div>

      {/* ===== HIGHEST SOLD ===== */}
      {highestSold && (
        <div className="mt-10">
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">🏆 Most expensive player</h3>
          <div className="relative rounded-2xl overflow-hidden border border-amber-500/40 max-w-md mx-auto">
            {highestSold.image_url ? (
              <img src={highestSold.image_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-b from-slate-700 to-slate-900 flex items-center justify-center">
                <span className="text-9xl font-black text-slate-600">{highestSold.number ?? '?'}</span>
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/50 to-amber-500/10" />
            <div className="relative z-10 min-h-[380px] flex flex-col justify-end p-6">
              <div className="absolute top-4 right-4 bg-amber-500 text-slate-900 font-black text-lg px-4 py-1.5 rounded-full shadow-lg tabular-nums">
                Rs {(highestSold.sold_price || 0).toLocaleString()}
              </div>
              <h2 className="text-4xl font-black drop-shadow-lg">{highestSold.name}</h2>
              <div className="text-slate-200 text-sm mt-1 drop-shadow">
                {highestSold.number != null && `#${highestSold.number} · `}
                {highestSold.role === 'both' ? 'All-rounder' : highestSold.role || 'Player'}
              </div>
              {highestTeam && (
                <div className="flex items-center gap-2 mt-4 bg-black/50 backdrop-blur w-fit px-3 py-2 rounded-xl">
                  <div className="w-8 h-8 rounded bg-slate-700 overflow-hidden flex items-center justify-center text-xs flex-none">
                    {highestTeam.logo_url ? <img src={highestTeam.logo_url} alt="" className="w-full h-full object-cover" /> : '🛡️'}
                  </div>
                  <span className="font-bold">{highestTeam.name}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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
              <span className="text-xs text-emerald-400">{teamSquad(t.id).length}/{playersPerTeam}</span>
            </button>
          ))}
        </div>

        {viewTeam && (() => {
          const t = teams.find((x) => x.id === viewTeam)!
          const squad = teamSquad(viewTeam)
          const spent = teamSpent(viewTeam)
          const need = stillNeeded(viewTeam)
          return (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden max-w-2xl">
              <div className="flex items-center gap-4 p-5 border-b border-slate-800 bg-slate-800/40">
                <div className="w-14 h-14 rounded-full bg-slate-700 overflow-hidden flex items-center justify-center flex-none">
                  {t.manager_photo_url ? <img src={t.manager_photo_url} alt="" className="w-full h-full object-cover" /> : '👤'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded bg-slate-700 overflow-hidden flex items-center justify-center text-xs flex-none">
                      {t.logo_url ? <img src={t.logo_url} alt="" className="w-full h-full object-cover" /> : '🛡️'}
                    </div>
                    <h4 className="text-xl font-black truncate">{t.name}</h4>
                    <button onClick={() => setCardTeam(t.id)}
                      className="text-xs text-amber-400 border border-amber-500/40 rounded-lg px-2 py-1 hover:bg-amber-500/10 flex-none">
                      🖼️ Team card
                    </button>
                  </div>
                  <div className="text-sm text-slate-400">{t.manager_name || 'No manager'}</div>
                </div>
                <div className="text-right flex-none">
                  <div className="text-xs uppercase tracking-wider text-slate-400">Left</div>
                  <div className="text-xl font-black text-emerald-400 tabular-nums">
                    {(t.budget - spent).toLocaleString()}
                  </div>
                  <div className="text-xs text-slate-400">need {need} more</div>
                </div>
              </div>

              <div className="p-4">
                <div className="text-xs text-slate-400 mb-2">
                  {squad.length}/{playersPerTeam} players · spent {spent.toLocaleString()}
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
                        <button onClick={() => openEdit(p)}
                          className="text-xs text-slate-400 hover:text-white border border-slate-600 rounded px-2 py-1">
                          Edit
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )
        })()}
      </div>

      {/* ===== EDIT SOLD PLAYER MODAL ===== */}
      {editPlayer && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur flex items-center justify-center z-50 p-4"
          onClick={() => setEditPlayer(null)}>
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-1">Edit sale</h3>
            <p className="text-sm text-slate-400 mb-5">{editPlayer.name}</p>
            <label className="block text-xs text-slate-400 mb-1">Team</label>
            <select value={editTeam} onChange={(e) => setEditTeam(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 outline-none focus:border-amber-500 mb-4">
              {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <label className="block text-xs text-slate-400 mb-1">Sold price (Rs)</label>
            <input type="number" value={editPrice}
              onChange={(e) => setEditPrice(parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-amber-400 font-bold outline-none focus:border-amber-500 mb-6" />
            <div className="flex gap-2">
              <button onClick={saveEdit}
                className="flex-1 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 font-semibold">Save</button>
              <button onClick={() => setEditPlayer(null)}
                className="px-4 py-2.5 rounded-lg bg-slate-700 hover:bg-slate-600">Cancel</button>
            </div>
            <button onClick={cancelSale}
              className="w-full mt-3 py-2 rounded-lg bg-red-500/15 text-red-300 border border-red-500/40 text-sm font-semibold">
              ↩ Cancel sale (back to pool)
            </button>
          </div>
        </div>
      )}

      {/* ===== FULLSCREEN TEAM CARD ===== */}
      {cardTeam && (() => {
        const t = teams.find((x) => x.id === cardTeam)!
        const squad = teamSquad(cardTeam)
        return (
          <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-xl flex items-center justify-center p-4 overflow-auto"
            onClick={() => setCardTeam(null)}>
            <div onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-3xl bg-gradient-to-br from-slate-800 via-slate-900 to-black border border-amber-500/30 rounded-3xl overflow-hidden shadow-2xl">
              <button onClick={() => setCardTeam(null)}
                className="absolute top-4 right-4 z-20 w-9 h-9 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center text-white">✕</button>
              <div className="text-center pt-8 pb-5 px-6 border-b border-white/10">
                <div className="text-amber-400 text-xs uppercase tracking-[0.3em] font-semibold">{leagueName}</div>
                <h2 className="text-4xl font-black mt-1">{t.name}</h2>
              </div>
              <div className="grid md:grid-cols-[260px_1fr] gap-0">
                <div className="flex flex-col items-center justify-center p-8 border-b md:border-b-0 md:border-r border-white/10 bg-black/20">
                  <div className="w-40 h-40 rounded-2xl overflow-hidden border-4 border-amber-500/50 bg-slate-700 flex items-center justify-center text-6xl shadow-xl">
                    {t.manager_photo_url ? <img src={t.manager_photo_url} alt="" className="w-full h-full object-cover" /> : '👤'}
                  </div>
                  <div className="mt-4 text-center">
                    <div className="text-[10px] uppercase tracking-widest text-slate-400">Manager</div>
                    <div className="text-lg font-bold">{t.manager_name || '—'}</div>
                  </div>
                  {t.logo_url && (
                    <div className="w-16 h-16 rounded-xl overflow-hidden mt-5 border border-white/10">
                      <img src={t.logo_url} alt="" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>
                <div className="p-6">
                  <div className="text-xs uppercase tracking-widest text-slate-400 mb-3">Squad ({squad.length}/{playersPerTeam})</div>
                  {squad.length === 0 ? (
                    <p className="text-slate-500 text-sm py-8 text-center">No players yet.</p>
                  ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                      {squad.map((p) => (
                        <div key={p.id} className="text-center">
                          <div className="w-full aspect-square rounded-xl overflow-hidden bg-slate-700 flex items-center justify-center text-2xl mb-1 border border-white/10">
                            {p.image_url ? <img src={p.image_url} alt="" loading="lazy" className="w-full h-full object-cover" /> : (p.number ?? '?')}
                          </div>
                          <div className="text-xs font-semibold truncate">{p.name}</div>
                          {p.is_retained && <div className="text-[9px] text-blue-400 font-bold">RET</div>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}