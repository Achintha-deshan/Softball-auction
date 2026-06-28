import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // log wela inawanam -> dashboard, nathnam -> login
  if (user) redirect('/dashboard')
  redirect('/login')
}