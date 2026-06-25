import { createClient } from '@supabase/supabase-js'
import { env } from '@/config/env'

let supabaseAdmin: ReturnType<typeof createClient> | null = null

export function getSupabaseAdmin() {
  if (!supabaseAdmin) {
    supabaseAdmin = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
    console.log('✅ Supabase Admin client initialized')
  }
  return supabaseAdmin
}

export async function verifySupabaseToken(accessToken: string) {
  const supabase = getSupabaseAdmin()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(accessToken)
  if (error || !user) {
    throw new Error(error?.message ?? 'Invalid Supabase token')
  }
  return user
}
