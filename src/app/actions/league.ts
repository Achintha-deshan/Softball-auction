'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createLeague(formData: FormData) {
  const name = String(formData.get('name') || '').trim()
  const matchDate = String(formData.get('match_date') || '')
  const perTeam = parseInt(String(formData.get('players_per_team') || '11'), 10)

  if (!name) return { error: 'League name is required.' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not logged in.' }

  const { error } = await supabase.from('leagues').insert({
    owner_id: user.id,
    name,
    match_date: matchDate || null,
    players_per_team: perTeam || 11,
  })

  if (error) return { error: error.message }

  revalidatePath('/dashboard')
  return { success: true }
}

export async function updateBidTiers(
  leagueId: string,
  tiers: { upTo: number | null; step: number }[]
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not logged in.' }

  const { error } = await supabase
    .from('leagues')
    .update({ bid_tiers: tiers })
    .eq('id', leagueId)

  if (error) return { error: error.message }
  revalidatePath(`/dashboard/league/${leagueId}`)
  return { success: true }
}