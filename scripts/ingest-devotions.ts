/**
 * Ingests Phaneroo Ministries' daily devotions from phaneroo.org into the
 * `devotions` table (date-keyed lookups) and `knowledge_chunks` (semantic
 * search), via the public WordPress REST API.
 *
 * Usage:
 *   npm run ingest-devotions            # current year, Jan 1 - today
 *   npm run ingest-devotions -- 2025    # a specific year
 *
 * Safe to re-run: devotions are upserted by date, and knowledge_chunks
 * entries are skipped if one already exists for the same source URL - so
 * re-running periodically picks up newly published devotions only.
 */
import { config } from 'dotenv'
config({ path: '.env.local' })

const SITE = 'https://phaneroo.org'
const DEVOTION_CATEGORY_ID = 19 // "Phaneroo Devotion"
const EMBED_DELAY_MS = 250

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

/**
 * The devotion content is an Elementor "tabs" widget with one tab per
 * language. Tab 1 is always English. Falls back to the raw content if the
 * expected structure isn't found (older/differently formatted posts).
 */
function extractEnglishContent(html: string): string {
  const match = html.match(
    /<div id="elementor-tab-content-\d+" class="elementor-tab-content elementor-clearfix" data-tab="1"[^>]*>([\s\S]*?)<\/div>\s*<div class="elementor-tab-title/
  )
  return match ? match[1] : html
}

function stripHtml(html: string): string {
  return decodeEntities(html.replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Best-effort extraction of a "Book Chapter:Verse(-Verse) (TRANSLATION)"
 * style reference, e.g. "Job 1:9-12 (NKJV)". Returns null if none found.
 */
function extractScriptureRef(text: string): string | null {
  const match = text.match(/([1-3]?\s?[A-Z][a-zA-Z]+\.?\s\d+:\d+(?:-\d+)?(?:\s*\([A-Z]+\))?)/)
  return match ? match[1].trim() : null
}

async function fetchDevotionPosts(after: string, before: string): Promise<WPPost[]> {
  const posts: WPPost[] = []
  let page = 1

  while (true) {
    const url =
      `${SITE}/wp-json/wp/v2/posts?categories=${DEVOTION_CATEGORY_ID}` +
      `&per_page=100&page=${page}&after=${after}&before=${before}` +
      `&orderby=date&order=asc&_fields=id,date,title,link,content`

    const res = await fetch(url)
    if (!res.ok) {
      // WP returns 400 once `page` exceeds the available range.
      if (res.status === 400) break
      throw new Error(`Failed to fetch devotions page ${page}: ${res.status}`)
    }

    const data = (await res.json()) as WPPost[]
    if (data.length === 0) break

    posts.push(...data)
    page++
  }

  return posts
}

async function main() {
  const { embed } = await import('../lib/gemini')
  const { getSupabase } = await import('../lib/supabase')
  const supabase = getSupabase()

  const year = process.argv[2] ?? String(new Date().getFullYear())
  const after = `${year}-01-01T00:00:00`
  const before = `${Number(year) + 1}-01-01T00:00:00`

  console.log(`Fetching ${year} devotions from phaneroo.org...`)
  const posts = await fetchDevotionPosts(after, before)
  console.log(`Found ${posts.length} devotions for ${year}.`)

  for (const post of posts) {
    const text = stripHtml(extractEnglishContent(post.content.rendered))
    const title = decodeEntities(post.title.rendered)
    const devoDate = post.date.slice(0, 10)
    const scriptureRef = extractScriptureRef(text)

    const { error: devoError } = await supabase
      .from('devotions')
      .upsert(
        { devo_date: devoDate, title, scripture_ref: scriptureRef, content: text, source_url: post.link },
        { onConflict: 'devo_date' }
      )

    if (devoError) {
      console.error(`[${devoDate}] devotions upsert failed:`, devoError.message)
      continue
    }

    const { data: existingChunk } = await supabase
      .from('knowledge_chunks')
      .select('id')
      .eq('source', post.link)
      .maybeSingle()

    if (!existingChunk) {
      const embedding = await embed(`${title}\n${text}`)
      const { error: chunkError } = await supabase.from('knowledge_chunks').insert({
        topic: 'phaneroo',
        title: `Devotion (${devoDate}): ${title}`,
        content: text,
        embedding,
        source: post.link,
      })
      if (chunkError) console.error(`[${devoDate}] knowledge_chunks insert failed:`, chunkError.message)
      await sleep(EMBED_DELAY_MS)
    }

    console.log(`Ingested ${devoDate}: ${title}${scriptureRef ? ` (${scriptureRef})` : ''}`)
  }
}

main().then(() => console.log('Done.'))
