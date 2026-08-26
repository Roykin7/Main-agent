/**
 * Reviews content the LLM has written to the shared knowledge base or
 * diagnosis-case memory (via the store_knowledge / store_diagnosis_case
 * tools). Both write with approved=false — pending rows are invisible to
 * search_knowledge/search_diagnosis_cases until approved here, so a
 * confidently-worded wrong answer from one conversation can't silently
 * become "fact" served to every other farmer.
 *
 * Usage:
 *   npm run review-pending                              # list everything pending
 *   npm run review-pending -- approve knowledge <id>     # publish it
 *   npm run review-pending -- reject  knowledge <id>     # delete it
 *   npm run review-pending -- approve diagnosis <id>
 *   npm run review-pending -- reject  diagnosis <id>
 */
import { config } from 'dotenv'
config({ path: '.env.local' })

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

type Kind = 'knowledge' | 'diagnosis'

const TABLE: Record<Kind, string> = {
  knowledge: 'knowledge_chunks',
  diagnosis: 'diagnosis_cases',
}

async function listPending() {
  const [{ data: knowledge, error: kErr }, { data: diagnosis, error: dErr }] = await Promise.all([
    supabase.from('pending_knowledge_chunks').select('*'),
    supabase.from('pending_diagnosis_cases').select('*'),
  ])

  if (kErr) console.error('Error loading pending knowledge:', kErr.message)
  if (dErr) console.error('Error loading pending diagnosis cases:', dErr.message)

  console.log('\n=== Pending knowledge_chunks ===')
  if (!knowledge || knowledge.length === 0) {
    console.log('  (none)')
  } else {
    for (const row of knowledge) {
      console.log(`\n  [${row.id}] (${row.topic}) ${row.title ?? '(no title)'}`)
      console.log(`  ${row.content}`)
      console.log(`  submitted: ${row.created_at}`)
    }
  }

  console.log('\n=== Pending diagnosis_cases ===')
  if (!diagnosis || diagnosis.length === 0) {
    console.log('  (none)')
  } else {
    for (const row of diagnosis) {
      console.log(`\n  [${row.id}] ${row.diagnosis}${row.region ? ` — ${row.region}` : ''}`)
      console.log(`  Symptoms: ${row.symptom_description}`)
      if (row.affected_part) console.log(`  Affected: ${row.affected_part}`)
      console.log(`  Treatment: ${row.treatment}`)
      console.log(`  submitted: ${row.created_at}`)
    }
  }

  console.log(
    '\nApprove with: npm run review-pending -- approve <knowledge|diagnosis> <id>' +
    '\nReject with:  npm run review-pending -- reject <knowledge|diagnosis> <id>\n'
  )
}

async function decide(action: 'approve' | 'reject', kind: Kind, id: number) {
  const table = TABLE[kind]

  if (action === 'approve') {
    const { error } = await supabase.from(table).update({ approved: true }).eq('id', id)
    if (error) {
      console.error(`Failed to approve ${kind} #${id}:`, error.message)
      process.exit(1)
    }
    console.log(`Approved ${kind} #${id} — now live in search results.`)
    return
  }

  const { error } = await supabase.from(table).delete().eq('id', id)
  if (error) {
    console.error(`Failed to reject ${kind} #${id}:`, error.message)
    process.exit(1)
  }
  console.log(`Rejected and deleted ${kind} #${id}.`)
}

async function main() {
  const [action, kind, idStr] = process.argv.slice(2)

  if (!action) {
    await listPending()
    return
  }

  if ((action !== 'approve' && action !== 'reject') || (kind !== 'knowledge' && kind !== 'diagnosis') || !idStr) {
    console.error('Usage: npm run review-pending -- <approve|reject> <knowledge|diagnosis> <id>')
    process.exit(1)
  }

  const id = Number(idStr)
  if (!Number.isInteger(id)) {
    console.error(`Invalid id: "${idStr}"`)
    process.exit(1)
  }

  await decide(action, kind, id)
}

main()
