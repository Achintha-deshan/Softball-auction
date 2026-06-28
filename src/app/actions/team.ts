'use server'

import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { revalidatePath } from 'next/cache'

function genCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let s = ''
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)]
  return s
}
// manager login username eka (team name eken + random)
function genUsername(teamName: string) {
  const base = teamName.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 10) || 'team'
  return base + Math.floor(1000 + Math.random() * 9000)
}

export async function createTeam(leagueId: string, formData: FormData) {
  const name = String(formData.get('name') || '').trim()
  if (!name) return { error: 'Team name is required.' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not logged in.' }

  // 1) manager account hadanawa (admin client eken)
  //    code eka thamai password eka -> manager link eken code eka gahala log wenawa
  const admin = createAdminClient()
  const code = genCode()
  const username = genUsername(name)
  const email = `${username}@softball-auction.app`

  const { data: created, error: authErr } = await admin.auth.admin.createUser({
    email,
    password: code,        // <- code eka = password eka
    email_confirm: true,   // confirm nathuwa kelinma active
    user_metadata: { username, role: 'manager' },
  })
  if (authErr) return { error: 'Manager account failed: ' + authErr.message }

  const managerUserId = created.user?.id ?? null

  // 2) team eka hadanawa (manager user + email + code link ekka)
  const { error } = await supabase.from('teams').insert({
    league_id: leagueId,
    name,
    manager_name: String(formData.get('manager_name') || '').trim() || null,
    manager_phone: String(formData.get('manager_phone') || '').trim() || null,
    access_code: code,
    budget: parseInt(String(formData.get('budget') || '0'), 10) || 0,
    logo_url: String(formData.get('logo_url') || '') || null,
    manager_photo_url: String(formData.get('manager_photo_url') || '') || null,
    manager_user_id: managerUserId,
    manager_email: email,
  })
  if (error) return { error: error.message }

  revalidatePath(`/dashboard/league/${leagueId}`)
  // code eka apahu yawanawa -> admin ta penna / manager ta share karanna
  return { success: true, code }
}

export async function deleteTeam(teamId: string, leagueId: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('teams').delete().eq('id', teamId)
  if (error) return { error: error.message }
  revalidatePath(`/dashboard/league/${leagueId}`)
  return { success: true }
}