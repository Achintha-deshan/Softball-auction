import { createClient } from '@/utils/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import TeamsSection from './TeamsSection'
import PlayersSection from './PlayersSection'
import BidTiersEditor from './BidTiersEditor'

export default async function LeaguePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: league } = await supabase
    .from('leagues').select('*').eq('id', id).single()
  if (!league) notFound()

  const { data: teams } = await supabase
    .from('teams').select('*').eq('league_id', id)
    .order('created_at', { ascending: true })
  
  const { data: players } = await supabase
    .from('players').select('*').eq('league_id', id)
    .order('created_at', { ascending: true })

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-slate-800 px-6 py-4">
        <Link href="/dashboard" className="text-sm text-slate-400 hover:text-white">
          ← All leagues
        </Link>
        <h1 className="text-2xl font-bold mt-1">{league.name}</h1>
        <Link href={`/dashboard/league/${id}/auction`}
          className="inline-block mt-3 px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold">
          🔨 Start Live Auction
        </Link>
        <p className="text-sm text-slate-400">
          {league.match_date ? new Date(league.match_date).toLocaleDateString() : 'No date'}
          {' · '}{league.players_per_team}-a-side
        </p>
      </header>

      <main className="max-w-4xl mx-auto p-6">
        <TeamsSection leagueId={id} teams={teams ?? []} />
        <PlayersSection leagueId={id} players={players ?? []} />
        <BidTiersEditor leagueId={id} initial={league.bid_tiers ?? []} />
       </main>
    </div>
  )
}