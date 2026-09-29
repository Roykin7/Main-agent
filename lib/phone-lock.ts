import { getSupabase } from './supabase'

// Just under app/api/webhook/route.ts's maxDuration (60s) — a lock older than
// this can only mean the function that held it was killed before releasing,
// so it's safe to steal rather than leave the phone stuck locked forever.
const STALE_LOCK_MS = 55_000

/**
 * Acquires a per-phone mutex so two near-simultaneous webhook deliveries for
 * the same number can't race through the pipeline concurrently. Fails open
 * (returns true) on any Supabase error — a DB hiccup should never silently
 * drop a farmer's message, same philosophy as checkRateLimit.
 */
export async function acquirePhoneLock(phone: string): Promise<boolean> {
  const now = new Date()

  const inserted = await getSupabase()
    .from('phone_locks')
    .insert({ phone, locked_at: now.toISOString() })

  if (!inserted.error) return true

  // Only a primary-key conflict means "lock already held" — any other error
  // (network blip, RLS misconfig, etc.) should fail open, not be treated as
  // someone else holding the lock.
  if (inserted.error.code !== '23505') {
    console.error('acquirePhoneLock error:', inserted.error)
    return true // fail open
  }

  // Lock already held — steal it only if it's stale (the previous holder
  // crashed or timed out without releasing).
  const staleThreshold = new Date(now.getTime() - STALE_LOCK_MS).toISOString()
  const stolen = await getSupabase()
    .from('phone_locks')
    .update({ locked_at: now.toISOString() })
    .eq('phone', phone)
    .lt('locked_at', staleThreshold)
    .select('phone')
    .maybeSingle()

  if (stolen.error) {
    console.error('acquirePhoneLock error:', stolen.error)
    return true // fail open
  }

  return !!stolen.data
}

/**
 * Releases a phone lock. Best-effort — swallows errors since a lock that
 * fails to release just gets stolen once it goes stale.
 */
export async function releasePhoneLock(phone: string): Promise<void> {
  try {
    await getSupabase().from('phone_locks').delete().eq('phone', phone)
  } catch (err) {
    console.error('releasePhoneLock error:', err)
  }
}
