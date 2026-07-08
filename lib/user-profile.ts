import { getSupabase } from './supabase'

const MAX_FACTS = 20

export async function loadUserProfile(phone: string): Promise<string[]> {
  const { data } = await getSupabase()
    .from('user_profiles')
    .select('facts')
    .eq('phone', phone)
    .maybeSingle()
  return data?.facts ?? []
}

export async function saveUserFact(phone: string, fact: string): Promise<void> {
  const trimmed = fact.trim()
  if (trimmed.length < 10) return

  const existing = await loadUserProfile(phone)

  // Skip if an identical fact already exists (case-insensitive)
  const lower = trimmed.toLowerCase()
  if (existing.some((f) => f.toLowerCase() === lower)) return

  // Keep the most recent MAX_FACTS facts; drop oldest if over limit
  const updated = [...existing, trimmed].slice(-MAX_FACTS)

  const { error } = await getSupabase()
    .from('user_profiles')
    .upsert(
      { phone, facts: updated, updated_at: new Date().toISOString() },
      { onConflict: 'phone' }
    )
  if (error) console.error('saveUserFact error:', error)
}
