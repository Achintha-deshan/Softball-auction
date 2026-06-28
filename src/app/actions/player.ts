'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createPlayer(leagueId: string, formData: FormData) {
  const name = String(formData.get('name') || '').trim()
  if (!name) return { error: 'Player name is required.' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not logged in.' }

  // me league eka mage da verify karanawa (security)
  const { data: league } = await supabase
    .from('leagues').select('id').eq('id', leagueId).eq('owner_id', user.id).single()
  if (!league) return { error: 'Not your league.' }

  const numRaw = String(formData.get('number') || '')
  const ageRaw = String(formData.get('age') || '')

  // admin client eken insert (owner verify una nisa safe)
  const { createAdminClient } = await import('@/utils/supabase/admin')
  const admin = createAdminClient()

  const { error } = await admin.from('players').insert({
    league_id: leagueId,
    name,
    number: numRaw ? parseInt(numRaw, 10) : null,
    age: ageRaw ? parseInt(ageRaw, 10) : null,
    phone: String(formData.get('phone') || '').trim() || null,
    image_url: String(formData.get('image_url') || '') || null,
    bat_hand: String(formData.get('bat_hand') || '') || null,
    bowl_hand: String(formData.get('bowl_hand') || '') || null,
    role: String(formData.get('role') || '') || null,
    current_team: String(formData.get('current_team') || '').trim() || null,
    base_price: parseInt(String(formData.get('base_price') || '0'), 10) || 0,
    status: 'pool',
  })

  if (error) {
    console.log('❌ PLAYER INSERT ERROR:', error)
    return { error: error.message }
  }
  revalidatePath(`/dashboard/league/${leagueId}`)
  return { success: true }
}

export async function deletePlayer(playerId: string, leagueId: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('players').delete().eq('id', playerId)
  if (error) return { error: error.message }
  revalidatePath(`/dashboard/league/${leagueId}`)
  return { success: true }
}

export async function addRetainedPlayer(
  leagueId: string,
  teamId: string,
  formData: FormData
) {
  const name = String(formData.get('name') || '').trim()
  if (!name) return { error: 'Player name is required.' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not logged in.' }

  // me league eka mage da kiyala verify karanawa (security)
  const { data: league } = await supabase
    .from('leagues').select('id').eq('id', leagueId).eq('owner_id', user.id).single()
  if (!league) return { error: 'Not your league.' }

  const price = parseInt(String(formData.get('price') || '0'), 10) || 0
  const ageRaw = String(formData.get('age') || '')

  // admin client eken insert (RLS bypass - owner verify una nisa safe)
  const { createAdminClient } = await import('@/utils/supabase/admin')
  const admin = createAdminClient()

  const { error } = await admin.from('players').insert({
    league_id: leagueId,
    name,
    age: ageRaw ? parseInt(ageRaw, 10) : null,
    image_url: String(formData.get('image_url') || '') || null,
    role: String(formData.get('role') || '') || null,
    bat_hand: String(formData.get('bat_hand') || '') || null,
    bowl_hand: String(formData.get('bowl_hand') || '') || null,
    base_price: price,
    status: 'sold',
    sold_to_team_id: teamId,
    sold_price: price,
    is_retained: true,
  })

  if (error) {
    console.log('❌ RETAINED INSERT ERROR:', error)
    return { error: error.message }
  }
  revalidatePath(`/dashboard/league/${leagueId}`)
  return { success: true }
}

// sold player kenekge price / team eka maaru karanawa
export async function updateSoldPlayer(
  leagueId: string,
  playerId: string,
  newTeamId: string,
  newPrice: number
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not logged in.' }

  const { data: league } = await supabase
    .from('leagues').select('id').eq('id', leagueId).eq('owner_id', user.id).single()
  if (!league) return { error: 'Not your league.' }

  const { createAdminClient } = await import('@/utils/supabase/admin')
  const admin = createAdminClient()

  const { error } = await admin.from('players')
    .update({ sold_to_team_id: newTeamId, sold_price: newPrice })
    .eq('id', playerId)

  if (error) return { error: error.message }
  revalidatePath(`/dashboard/league/${leagueId}`)
  return { success: true }
}

// sold player kenekwa aye pool ekata danawa (sale eka cancel)
export async function unsellPlayer(leagueId: string, playerId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not logged in.' }

  const { data: league } = await supabase
    .from('leagues').select('id').eq('id', leagueId).eq('owner_id', user.id).single()
  if (!league) return { error: 'Not your league.' }

  const { createAdminClient } = await import('@/utils/supabase/admin')
  const admin = createAdminClient()

  const { error } = await admin.from('players')
    .update({ status: 'pool', sold_to_team_id: null, sold_price: null, is_retained: false })
    .eq('id', playerId)

  if (error) return { error: error.message }
  revalidatePath(`/dashboard/league/${leagueId}`)
  return { success: true }
}