import { createClient, SupabaseClient } from '@supabase/supabase-js'

let client: SupabaseClient | undefined

/**
 * Lazily creates the Supabase client on first use, so importing this
 * module doesn't require env vars to be set (e.g. during `next build`
 * page-data collection without a .env.local).
 */
export function getSupabase(): SupabaseClient {
  if (!client) {
    client = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  }
  return client
}
