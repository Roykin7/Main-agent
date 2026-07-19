/**
 * Reads the interaction_feedback table and surfaces recurring patterns:
 *   — Which topics have the most knowledge gaps (had_empty_results = true)
 *   — Which domains the verify pass corrects most often (verify_corrected = true)
 *   — How often ZOE hits the 5-round tool limit (max_rounds_reached = true)
 *
 * Run this periodically to know where to add KB content and improve prompts.
 *
 * Usage:  npm run check-feedback
 */
import { config } from 'dotenv'
config({ path: '.env.local' })

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function main() {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 3600_000).toISOString()

  const [totalRes, emptyRes, correctionRes, maxRoundsRes] = await Promise.all([
    supabase
      .from('interaction_feedback')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', thirtyDaysAgo),

    supabase
      .from('interaction_feedback')
      .select('domain, question_summary')
      .eq('had_empty_results', true)
      .gte('created_at', thirtyDaysAgo)
      .order('created_at', { ascending: false }),

    supabase
      .from('interaction_feedback')
      .select('domain, question_summary')
      .eq('verify_corrected', true)
      .gte('created_at', thirtyDaysAgo)
      .order('created_at', { ascending: false }),

    supabase
      .from('interaction_feedback')
      .select('id', { count: 'exact', head: true })
      .eq('max_rounds_reached', true)
      .gte('created_at', thirtyDaysAgo),
  ])

  const total      = totalRes.count ?? 0
  const empties    = emptyRes.data ?? []
  const corrections = correctionRes.data ?? []
  const maxRounds  = maxRoundsRes.count ?? 0

  const pct = (n: number) => total > 0 ? ` (${Math.round(n / total * 100)}%)` : ''

  console.log('\n=== ZOE Feedback Patterns — last 30 days ===')
  console.log(`Total interactions   : ${total}`)
  console.log(`Knowledge gaps       : ${empties.length}${pct(empties.length)}`)
  console.log(`Verify corrections   : ${corrections.length}${pct(corrections.length)}`)
  console.log(`Max rounds reached   : ${maxRounds}${pct(maxRounds)}`)

  // ── Knowledge gaps by domain ─────────────────────────────────────────────
  const byDomain = (rows: { domain: string }[]) =>
    rows.reduce((acc: Record<string, number>, r) => {
      acc[r.domain] = (acc[r.domain] ?? 0) + 1
      return acc
    }, {})

  if (empties.length > 0) {
    console.log('\n📭  Knowledge gaps by domain (add KB content for these):')
    for (const [domain, count] of Object.entries(byDomain(empties)).sort((a, b) => b[1] - a[1])) {
      console.log(`   ${domain.padEnd(10)} ${count}`)
    }
    console.log('\n   Top unanswered questions:')
    empties.slice(0, 10).forEach((r, i) => {
      console.log(`   ${i + 1}. [${r.domain}] ${r.question_summary}`)
    })
  } else {
    console.log('\n✅  No knowledge gaps recorded — KB appears well-covered.')
  }

  // ── Verify corrections by domain ─────────────────────────────────────────
  if (corrections.length > 0) {
    console.log('\n✏️   Verify corrections by domain (consider improving prompts):')
    for (const [domain, count] of Object.entries(byDomain(corrections)).sort((a, b) => b[1] - a[1])) {
      console.log(`   ${domain.padEnd(10)} ${count}`)
    }
    console.log('\n   Top corrected questions:')
    corrections.slice(0, 5).forEach((r, i) => {
      console.log(`   ${i + 1}. [${r.domain}] ${r.question_summary}`)
    })
  } else {
    console.log('\n✅  No verify corrections — ZOE\'s first drafts are passing quality checks.')
  }

  // ── Action items ──────────────────────────────────────────────────────────
  console.log('\n📋  Recommended actions:')
  let actions = 0
  if (empties.length > 5) {
    actions++
    console.log(`   ${actions}. Add knowledge base content for the top unanswered questions above.`)
    console.log(`      Run: npm run seed   (or add chunks directly in Supabase)`)
  }
  if (corrections.length > 3) {
    actions++
    const topDomain = Object.entries(byDomain(corrections)).sort((a, b) => b[1] - a[1])[0]?.[0]
    console.log(`   ${actions}. Improve the system prompt for the "${topDomain}" domain — verify is correcting it most.`)
  }
  if (maxRounds > total * 0.1) {
    actions++
    console.log(`   ${actions}. ZOE is hitting the 5-round tool limit on ${pct(maxRounds).slice(2)} of interactions.`)
    console.log(`      Consider improving tool descriptions so the model calls the right tool first.`)
  }
  if (actions === 0) {
    console.log('   None — ZOE is performing well across all metrics.')
  }

  console.log('')
}

main().catch((err) => {
  console.error('check-feedback-patterns error:', err)
  process.exit(1)
})
