/**
 * Ingests Phaneroo Ministries' teachings, sermons, healing testimonials,
 * and prophetic words from phaneroo.org into knowledge_chunks for semantic search.
 *
 * Usage:
 *   npm run ingest-teachings          # ingest all categories, all time
 *   npm run ingest-teachings -- 2025  # a specific year only
 *
 * Safe to re-run: skips posts whose source URL already has an embedding.
 * New posts are picked up automatically on each run.
 */
import { config } from 'dotenv'
config({ path: '.env.local' })

const SITE = 'https://phaneroo.org'
const EMBED_DELAY_MS = 300

const CATEGORIES = [
  { id: 20, name: 'Sermon',            label: 'Phaneroo Sermon' },
  { id: 17, name: 'Healing Chronicle', label: 'Healing Testimony' },
  { id: 22, name: 'New Year Message',  label: 'New Year Message' },
  { id: 21, name: 'Prophetic Voice',   label: 'Prophetic Word' },
]

type WPPost = {
  id: number
  date: string
  title: { rendered: string }
  link: string
  content: { rendered: string }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function decodeEntities(text: string): string {
  return text
    .replace(/&#8217;|&#8216;/g, "'")
    .replace(/&#8220;|&#8221;/g, '"')
    .replace(/&#8211;/g, '-')
    .replace(/&#8212;/g, '—')
    .replace(/&#8230;/g, '...')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
}

function stripHtml(html: string): string {
  return decodeEntities(html.replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim()
}

async function fetchPosts(categoryId: number, after?: string, before?: string): Promise<WPPost[]> {
  const posts: WPPost[] = []
  let page = 1

  while (true) {
    let url =
      `${SITE}/wp-json/wp/v2/posts?categories=${categoryId}` +
      `&per_page=100&page=${page}&orderby=date&order=asc` +
      `&_fields=id,date,title,link,content`

    if (after)  url += `&after=${after}`
    if (before) url += `&before=${before}`

    const res = await fetch(url)
    if (!res.ok) {
      if (res.status === 400) break
      throw new Error(`WP API error ${res.status} on page ${page}`)
    }

    const data = (await res.json()) as WPPost[]
    if (data.length === 0) break

    posts.push(...data)
    page++
  }

  return posts
}

async function main() {
  const { embed } = await import('../lib/embeddings')
  const { getSupabase } = await import('../lib/supabase')
  const supabase = getSupabase()

  const yearArg = process.argv[2]
  const after  = yearArg ? `${yearArg}-01-01T00:00:00` : undefined
  const before = yearArg ? `${Number(yearArg) + 1}-01-01T00:00:00` : undefined

  let totalInserted = 0
  let totalSkipped  = 0
  let totalErrors   = 0

  for (const cat of CATEGORIES) {
    console.log(`\n── ${cat.label}s (category ${cat.id}) ──`)
    const posts = await fetchPosts(cat.id, after, before)
    console.log(`  Found ${posts.length} posts`)

    let catInserted = 0

    for (const post of posts) {
      const title = decodeEntities(post.title.rendered)
      const content = stripHtml(post.content.rendered)
      const postDate = post.date.slice(0, 10)

      if (content.length < 50) {
        totalSkipped++
        continue
      }

      // Check if already stored with a valid embedding
      const { data: existing } = await supabase
        .from('knowledge_chunks')
        .select('id, embedding')
        .eq('source', post.link)
        .maybeSingle()

      if (existing?.embedding) {
        totalSkipped++
        continue
      }

      const chunkTitle = `${cat.label} (${postDate}): ${title}`
      const embedding = await embed(`${title}\n${content}`)

      if (existing && !existing.embedding) {
        // Row exists but embedding was cleared — update it
        const { error } = await supabase
          .from('knowledge_chunks')
          .update({ embedding, title: chunkTitle })
          .eq('id', existing.id)
        if (error) {
          console.error(`  [${postDate}] update failed:`, error.message)
          totalErrors++
        } else {
          catInserted++
          totalInserted++
        }
      } else {
        // New post — insert
        const { error } = await supabase.from('knowledge_chunks').insert({
          topic: 'phaneroo',
          title: chunkTitle,
          content,
          embedding,
          source: post.link,
        })
        if (error) {
          console.error(`  [${postDate}] insert failed:`, error.message)
          totalErrors++
        } else {
          catInserted++
          totalInserted++
          console.log(`  [${catInserted}] ${title}`)
        }
      }

      await sleep(EMBED_DELAY_MS)
    }

    console.log(`  Done: ${catInserted} ingested`)
  }

  console.log(`\n═══════════════════════════════`)
  console.log(`Total inserted: ${totalInserted}  Skipped: ${totalSkipped}  Errors: ${totalErrors}`)
}

main().then(() => console.log('Done.')).catch((err) => {
  console.error('Fatal:', err)
  process.exit(1)
})
