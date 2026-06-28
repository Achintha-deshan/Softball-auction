'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/utils/supabase/client'

type Team = { id: string; name: string; budget: number; logo_url: string | null; manager_name: string | null }
type Player = {
  id: string; number: number | null; name: string; image_url: string | null
  role: string | null; bat_hand: string | null; bowl_hand: string | null
  current_team: string | null; base_price: number; status: string
  sold_to_team_id: string | null; sold_price: number | null; is_retained: boolean
}
type Auction = {
  current_player_id: string | null; current_bid: number
  leading_team_id: string | null; status: string
}

export default function ManagerView({ leagueId, teamId }: { leagueId: string; teamId: string }) {
  const supabase = createClient()
  const [team, setTeam] = useState<Team | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [auction, setAuction] = useState<Auction | null>(null)

  const load = useCallback(async () => {
    const [t, ps, ts, au] = await Promise.all([
      supabase.from('teams').select('*').eq('id', teamId).single(),
      supabase.from('players').select('*').eq('league_id', leagueId),
      supabase.from('teams').select('*').eq('league_id', leagueId),
      supabase.from('auction_state').select('*').eq('league_id', leagueId).single(),
    ])
    if (t.data) setTeam(t.data)
    if (ps.data) setPlayers(ps.data)
    if (ts.data) setTeams(ts.data)
    if (au.data) setAuction(au.data)
  }, [leagueId, teamId, supabase])

useEffect(() => {
    load()

    // realtime: auction_state / players / teams maaru unaama -> aye load
    const channel = supabase
      .channel(`league-${leagueId}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'auction_state', filter: `league_id=eq.${leagueId}` },
        () => load()
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'players', filter: `league_id=eq.${leagueId}` },
        () => load()
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'teams', filter: `league_id=eq.${leagueId}` },
        () => load()
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [load, leagueId, supabase])
  
  const mySquad = players.filter((p) => p.sold_to_team_id === teamId && p.status === 'sold')
  const spent = mySquad.reduce((s, p) => s + (p.sold_price || 0), 0)
  const left = (team?.budget || 0) - spent

  const onBlock = auction?.current_player_id
    ? players.find((p) => p.id === auction.current_player_id)
    : null
  const leadTeam = auction?.leading_team_id ? teams.find((t) => t.id === auction.leading_team_id) : null
  const iLead = auction?.leading_team_id === teamId

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 max-w-lg mx-auto">
      {/* budget header */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-800 rounded-2xl p-5 flex items-center gap-4 mb-5">
        <div className="w-14 h-14 rounded-xl bg-slate-700 overflow-hidden flex items-center justify-center text-2xl flex-none">
          {team?.logo_url ? <img src={team.logo_url} alt="" className="w-full h-full object-cover" /> : '🛡️'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xl font-black truncate">{team?.name}</div>
          <div className="text-xs text-slate-400">{mySquad.length} players</div>
        </div>
        <div className="text-right flex-none">
          <div className="text-[10px] uppercase tracking-widest text-slate-400">Budget left</div>
          <div className="text-2xl font-black text-emerald-400 tabular-nums">{left.toLocaleString()}</div>
        </div>
      </div>

      {/* live auction */}
      {onBlock ? (
        <div className="relative rounded-2xl overflow-hidden border border-slate-700 min-h-[420px] flex flex-col justify-end mb-3">
          {onBlock.image_url ? (
            <img src={onBlock.image_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-b from-slate-700 to-slate-900 flex items-center justify-center">
              <span className="text-8xl font-black text-slate-600">{onBlock.number ?? '?'}</span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-black/10" />
          {auction?.status === 'sold' && (
            <div className="absolute inset-0 flex items-center justify-center z-20">
              <span className="text-5xl font-black text-emerald-400 border-4 border-emerald-400 rounded-2xl px-8 py-3 -rotate-12 bg-slate-900/70">SOLD</span>
            </div>
          )}
          <div className="relative z-10 p-6">
            <h2 className="text-3xl font-black drop-shadow-lg">{onBlock.name}</h2>
            <div className="text-slate-200 text-sm mt-1">
              {onBlock.number != null && `#${onBlock.number} · `}
              {onBlock.role === 'both' ? 'All-rounder' : onBlock.role || 'Player'}
              {onBlock.bat_hand ? ` · ${onBlock.bat_hand === 'right' ? 'RH bat' : 'LH bat'}` : ''}
              {onBlock.bowl_hand ? ` · ${onBlock.bowl_hand === 'right' ? 'RA bowl' : 'LA bowl'}` : ''}
            </div>
            <div className="mt-4 pt-4 border-t border-white/15">
              <div className="text-xs uppercase tracking-widest text-slate-300">
                {auction?.status === 'sold' ? 'Sold for' : 'Current bid'}
              </div>
              <div className="text-5xl font-black text-amber-400 tabular-nums drop-shadow-lg">
                {(auction?.current_bid || 0).toLocaleString()}
              </div>
              {leadTeam && (
                <span className="inline-block mt-2 bg-black/50 backdrop-blur px-3 py-1 rounded-full text-sm font-semibold">
                  {leadTeam.name} {auction?.status === 'sold' ? '' : 'leads'}
                </span>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 text-center text-slate-400 mb-3">
          <div className="text-lg font-bold text-white mb-1">No player on the block</div>
          <div className="text-sm">Waiting for the next player…</div>
        </div>
      )}

      {iLead && auction?.status !== 'sold' && (
        <div className="bg-amber-500/15 border border-amber-400 text-amber-300 rounded-xl p-3 text-center font-semibold mb-5">
          🔥 You're the top bid!
        </div>
      )}

      {/* my squad */}
      <h3 className="text-sm font-semibold text-slate-400 mb-2 mt-6">My team</h3>
      <div className="space-y-2">
        {mySquad.length === 0 ? (
          <p className="text-slate-500 text-sm py-4 text-center">No players yet.</p>
        ) : (
          mySquad.sort((a, b) => (b.sold_price || 0) - (a.sold_price || 0)).map((p) => (
            <div key={p.id} className="flex items-center gap-3 bg-slate-900 border border-slate-800 rounded-xl p-2.5">
              <div className="w-10 h-10 rounded-full bg-slate-800 overflow-hidden flex items-center justify-center text-xs flex-none">
                {p.image_url ? <img src={p.image_url} alt="" className="w-full h-full object-cover" /> : (p.number ?? '?')}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold truncate">
                  {p.name} {p.is_retained && <span className="text-[9px] font-bold text-blue-400 bg-blue-500/15 px-1.5 py-0.5 rounded">RET</span>}
                </div>
                <div className="text-xs text-slate-400">{p.role === 'both' ? 'All-rounder' : p.role || 'Player'}</div>
              </div>
              <div className="text-sm font-bold text-amber-400 tabular-nums">{(p.sold_price || 0).toLocaleString()}</div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}