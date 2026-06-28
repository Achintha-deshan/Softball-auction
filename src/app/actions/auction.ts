'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

// player kenek block ekata danawa (auction_state update)
export async function putOnBlock(leagueId: string, playerId: string, basePrice: number) {
  const supabase = await createClient()
  const { error } = await supabase.from('auction_state').upsert({
    league_id: leagueId,
    current_player_id: playerId,
    current_bid: basePrice,
    leading_team_id: null,
    status: 'live',
    updated_at: new Date().toISOString(),
  })
  if (error) return { error: error.message }
  return { success: true }
}

// bid amount eka update karanawa
export async function updateBid(leagueId: string, newBid: number) {
  const supabase = await createClient()
  const { error } = await supabase.from('auction_state')
    .update({ current_bid: newBid, updated_at: new Date().toISOString() })
    .eq('league_id', leagueId)
  if (error) return { error: error.message }
  return { success: true }
}

// player wikkenawa -> team ekata, budget aduwenawa
export async function sellPlayer(
  leagueId: string, playerId: string, teamId: string, price: number
) {
  const supabase = await createClient()

  // player eka sold karanawa
  const { error: e1 } = await supabase.from('players')
    .update({ status: 'sold', sold_to_team_id: teamId, sold_price: price })
    .eq('id', playerId)
  if (e1) return { error: e1.message }

  // auction_state -> sold flash
  const { error: e2 } = await supabase.from('auction_state')
    .update({ status: 'sold', leading_team_id: teamId, current_bid: price,
              updated_at: new Date().toISOString() })
    .eq('league_id', leagueId)
  if (e2) return { error: e2.message }

  revalidatePath(`/dashboard/league/${leagueId}`)
  return { success: true }
}

// unsold karanawa
export async function markUnsold(leagueId: string, playerId: string) {
  const supabase = await createClient()
  await supabase.from('players').update({ status: 'unsold' }).eq('id', playerId)
  await supabase.from('auction_state')
    .update({ status: 'idle', current_player_id: null, leading_team_id: null,
              updated_at: new Date().toISOString() })
    .eq('league_id', leagueId)
  revalidatePath(`/dashboard/league/${leagueId}`)
  return { success: true }
}

// next player ekata yanna (idle)
export async function clearBlock(leagueId: string) {
  const supabase = await createClient()
  await supabase.from('auction_state')
    .update({ status: 'idle', current_player_id: null, leading_team_id: null,
              updated_at: new Date().toISOString() })
    .eq('league_id', leagueId)
  revalidatePath(`/dashboard/league/${leagueId}`)
  return { success: true }
}