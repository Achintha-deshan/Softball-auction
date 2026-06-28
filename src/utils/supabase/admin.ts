import { createClient } from '@supabase/supabase-js'

// MEKA SERVER EKE WITHRI! secret key eka use karanawa.
// admin walata withri (user create wගේ privileged ops).
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}