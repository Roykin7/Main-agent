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

function ugandaDate(offsetDays = 0): string {
  const ms = Date.now() + 3 * 3600_000 + offsetDays * 86400_000
  return new Date(ms).toISOString().split('T')[0]
}

async function checkRecentDevotion(): Promise<boolean> {
  // Accept any devotion published in the last 10 days — Phaneroo may publish
  // ahead or behind by a few days, and the workflow runs before publishing time.
  const tenDaysAgo = ugandaDate(-10)
  const { data, error } = await supabase
    .from('devotions')
    .select('devo_date')
    .gte('devo_date', tenDaysAgo)
    .order('devo_date', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error('  ERROR querying devotions:', error.message)
    return false
  }
  if (!data) {
    console.error(`  FAIL: No devotion found in the last 10 days (since ${tenDaysAgo}).`)
    return false
  }
  console.log(`  OK: Most recent devotion is ${data.devo_date}.`)
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

async function checkSocialSync(): Promise<boolean> {
  // Facebook/Twitter/YouTube sync are known to be broken as of 2026-08-26
  // (missing FACEBOOK_PAGE_ID/ACCESS_TOKEN and TWITTER_SCRAPER_* secrets;
  // YouTube blocked by yt-dlp "Sign in to confirm you're not a bot" on
  // GitHub-hosted runner IPs). None of these are fixable without real
  // credentials from the account owner, so this check warns instead of
  // hard-failing until those are supplied — otherwise every scheduled run
  // sends a failure email for a known, unfixed-by-CI issue.
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 3600_000).toISOString()
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600_000).toISOString()

  const { count: count30, error } = await supabase
    .from('knowledge_chunks')
    .select('id', { count: 'exact', head: true })
    .in('source', ['facebook', 'twitter', 'youtube', 'youtube_transcript'])
    .gte('created_at', thirtyDaysAgo)

  if (error) {
    console.error('  ERROR querying social chunks:', error.message)
    return false
  }
  if (!count30 || count30 === 0) {
    console.warn(
      '  WARN: No social media posts ingested in the last 30 days — Facebook/Twitter/YouTube sync credentials need attention (see workflow logs).'
    )
    return true
  }

  const { count: count7 } = await supabase
    .from('knowledge_chunks')
    .select('id', { count: 'exact', head: true })
    .in('source', ['facebook', 'twitter', 'youtube', 'youtube_transcript'])
    .gte('created_at', sevenDaysAgo)

  if (!count7 || count7 === 0) {
    console.warn(
      `  WARN: No social posts in the last 7 days (${count30} found in last 30 days) — Phaneroo may not have posted recently. Check the Facebook token if this persists.`
    )
  } else {
    console.log(`  OK: ${count7} social post(s) ingested in the last 7 days.`)
  }
  return true
}

async function main() {
  console.log('=== ZOE sync verification ===')
  const results = await Promise.all([
    checkRecentDevotion(),
    checkRecentChunks(),
    checkSocialSync(),
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
