import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { signOut } from '@/app/actions/auth'
import CreateLeagueForm from './CreateLeagueForm'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // username eka profiles table eken
  const { data: profile } = await supabase
    .from('profiles')
    .select('username')
    .eq('id', user.id)
    .single()

  // mu user ge leagues
  const { data: leagues } = await supabase
    .from('leagues')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-slate-800 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold">Softball Premier League</h1>
          <p className="text-sm text-slate-400">
            Welcome, {profile?.username ?? 'manager'}
          </p>
        </div>
        <form action={signOut}>
          <button className="px-4 py-2 text-sm rounded-lg border border-slate-700 hover:bg-slate-800">
            Log out
          </button>
        </form>
      </header>

      <main className="max-w-3xl mx-auto p-6">
        {leagues && leagues.length > 0 ? (
          <div>
            <h2 className="text-xl font-semibold mb-4">Your leagues</h2>
            <div className="space-y-3">
              {leagues.map((l) => (
  <Link
    key={l.id}
    href={`/dashboard/league/${l.id}`}
    className="block bg-slate-900 border border-slate-800 rounded-xl p-4 hover:border-emerald-600 transition"
  >
    <div className="font-semibold text-lg">{l.name}</div>
    <div className="text-sm text-slate-400">
      {l.match_date ? new Date(l.match_date).toLocaleDateString() : 'No date set'}
      {' · '}{l.players_per_team}-a-side
    </div>
  </Link>
))}
            </div>
            <div className="mt-8">
              <h3 className="text-sm font-semibold text-slate-400 mb-3">Create another league</h3>
              <CreateLeagueForm />
            </div>
          </div>
        ) : (
          <div>
            <h2 className="text-xl font-semibold mb-2">Create your first league</h2>
            <p className="text-slate-400 text-sm mb-6">
              Set up your league to start adding teams and players.
            </p>
            <CreateLeagueForm />
          </div>
        )}
      </main>
    </div>
  )
}