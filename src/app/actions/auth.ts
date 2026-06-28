'use server'

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

// username -> synthetic email (Supabase email auth use karanna)
const toEmail = (username: string) =>
  `${username.trim().toLowerCase()}@softball-auction.app`

export async function signUp(formData: FormData) {
  const username = String(formData.get('username') || '').trim()
  const password = String(formData.get('password') || '')

  if (!username || !password) {
    return { error: 'Username and password are required.' }
  }
  if (password.length < 6) {
    return { error: 'Password must be at least 6 characters.' }
  }

  const supabase = await createClient()

  const { error } = await supabase.auth.signUp({
    email: toEmail(username),
    password,
    options: { data: { username } }, // -> profiles table eke trigger eka meka use karanawa
  })

  if (error) {
    if (error.message.toLowerCase().includes('already')) {
      return { error: 'That username is already taken.' }
    }
    return { error: error.message }
  }

  redirect('/dashboard')
}

export async function signIn(formData: FormData) {
  const username = String(formData.get('username') || '').trim()
  const password = String(formData.get('password') || '')

  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({
    email: toEmail(username),
    password,
  })

  if (error) {
    return { error: 'Wrong username or password.' }
  }

  redirect('/dashboard')
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

export async function managerLogin(leagueId: string, code: string) {
  const cleanCode = code.trim().toUpperCase()
  if (!cleanCode) return { error: 'Enter your code.' }

  const supabase = await createClient()

  // code eken team eka hoyanawa (admin client eken - RLS bypass)
  const { createAdminClient } = await import('@/utils/supabase/admin')
  const admin = createAdminClient()
  const { data: team } = await admin
    .from('teams')
    .select('manager_email, access_code')
    .eq('league_id', leagueId)
    .eq('access_code', cleanCode)
    .single()

  if (!team || !team.manager_email) {
    return { error: 'Wrong code. Check and try again.' }
  }

  // code eka password eka -> login
  const { error } = await supabase.auth.signInWithPassword({
    email: team.manager_email,
    password: cleanCode,
  })
  if (error) return { error: 'Login failed. Contact your league admin.' }

  return { success: true }
}