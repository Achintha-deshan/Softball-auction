import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import ManagerLogin from './ManagerLogin'
import ManagerView from './ManagerView'

export default async function ManagerPage({
  params,
}: {
  params: Promise<{ leagueId: string }>
}) {
  const { leagueId } = await params
  const supabase = await createClient()

  // dan log wela inna kenek inawada?
  const { data: { user } } = await supabase.auth.getUser()

  // me league eke league name eka (login screen ekata) - admin client eken
  const admin = createAdminClient()
  const { data: league } = await admin
    .from('leagues').select('name').eq('id', leagueId).single()

  // user log wela inawanam, eyage team eka me league eke da?
  let myTeam = null
  if (user) {
    const { data: team } = await supabase
      .from('teams').select('*')
      .eq('league_id', leagueId)
      .eq('manager_user_id', user.id)
      .single()
    myTeam = team
  }

  if (!myTeam) {
    return <ManagerLogin leagueId={leagueId} leagueName={league?.name ?? 'League'} />
  }

  return <ManagerView leagueId={leagueId} teamId={myTeam.id} />
}