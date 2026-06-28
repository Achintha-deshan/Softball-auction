import { createClient } from '@/utils/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import AuctionRoom from './AuctionRoom'

export default async function AuctionPage({
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
    .from('teams').select('*').eq('league_id', id).order('created_at')

  const { data: players } = await supabase
    .from('players').select('*').eq('league_id', id).order('number')

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-slate-800 px-6 py-4">
        <Link href={`/dashboard/league/${id}`} className="text-sm text-slate-400 hover:text-white">
          ← Back to league
        </Link>
        <h1 className="text-2xl font-bold mt-1">{league.name} — Live Auction</h1>
      </header>
      <AuctionRoom
        leagueId={id}
        teams={teams ?? []}
        players={players ?? []}
        bidTiers={league.bid_tiers ?? []}
      />
    </div>
  )
}