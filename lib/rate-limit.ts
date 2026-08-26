import { getSupabase } from './supabase'

// Reuses the existing `messages` table (already indexed on phone, created_at)
// instead of a dedicated counter table — good enough for a best-effort limit
// and avoids a new migration + write path just for this.
const BURST_WINDOW_MS = 60_000
const BURST_MAX = 8 // user messages per minute
const DAILY_WINDOW_MS = 24 * 3600_000
const DAILY_MAX = 150 // user messages per day

export type RateLimitResult =
  | { limited: false }
  | { limited: true; reason: 'burst' | 'daily' }

/**
 * Checks how many messages this phone number has sent recently, without
 * counting the message currently being processed (it hasn't been saved yet).
 * Fails open — if the count query errors, treat as not limited so a Supabase
 * hiccup never blocks a legitimate farmer from getting a reply.
 */
export async function checkRateLimit(phone: string): Promise<RateLimitResult> {
  const now = Date.now()

  const [burstResult, dailyResult] = await Promise.all([
    getSupabase()
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('phone', phone)
      .eq('role', 'user')
      .gte('created_at', new Date(now - BURST_WINDOW_MS).toISOString()),
    getSupabase()
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('phone', phone)
      .eq('role', 'user')
      .gte('created_at', new Date(now - DAILY_WINDOW_MS).toISOString()),
  ])

  if (burstResult.error) console.error('checkRateLimit burst query error:', burstResult.error)
  if (dailyResult.error) console.error('checkRateLimit daily query error:', dailyResult.error)

  if (!burstResult.error && (burstResult.count ?? 0) >= BURST_MAX) {
    return { limited: true, reason: 'burst' }
  }
  if (!dailyResult.error && (dailyResult.count ?? 0) >= DAILY_MAX) {
    return { limited: true, reason: 'daily' }
  }
  return { limited: false }
}
