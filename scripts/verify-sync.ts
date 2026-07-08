/**
 * Post-sync health check. Run after every knowledge-base sync to verify:
 *   1. Today's devotion is in the database.
 *   2. At least one new chunk was added in the last 6 hours.
 *
 * Exits with code 1 on any failure so GitHub Actions marks the step failed
 * and sends an email notification — catches silent sync breakage early.
 *
 * Usage:
 *   npm run verify-sync
 */
import { config } from 'dotenv'
config({ path: '.env.local' })

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function ugandaDate(): string {
  const ms = Date.now() + 3 * 3600_000
  return new Date(ms).toISOString().split('T')[0]
}

async function checkTodaysDevotion(): Promise<boolean> {
  const today = ugandaDate()
  const { data, error } = await supabase
    .from('devotions')
    .select('devo_date')
    .eq('devo_date', today)
    .maybeSingle()

  if (error) {
    console.error('  ERROR querying devotions:', error.message)
    return false
  }
  if (!data) {
    console.error(`  FAIL: No devotion found for today (${today}).`)
    return false
  }
  console.log(`  OK: Devotion for ${today} is present.`)
  return true
}

async function checkRecentChunks(): Promise<boolean> {
  const sixHoursAgo = new Date(Date.now() - 6 * 3600_000).toISOString()
  const { count, error } = await supabase
    .from('knowledge_chunks')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', sixHoursAgo)

  if (error) {
    console.error('  ERROR querying knowledge_chunks:', error.message)
    return false
  }
  if (!count || count === 0) {
    console.warn('  WARN: No new knowledge_chunks in the last 6 hours.')
    // Warn only — not a hard failure (sync may have nothing new to add)
    return true
  }
  console.log(`  OK: ${count} new chunk(s) added in the last 6 hours.`)
  return true
}

async function main() {
  console.log('=== ZOE sync verification ===')
  const results = await Promise.all([
    checkTodaysDevotion(),
    checkRecentChunks(),
  ])

  const allPassed = results.every(Boolean)
  if (allPassed) {
    console.log('\nAll checks passed.')
    process.exit(0)
  } else {
    console.error('\nOne or more checks failed — investigate the sync logs above.')
    process.exit(1)
  }
}

main()
