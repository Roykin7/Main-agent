/**
 * Fetches ALL posts from Phaneroo's Facebook page via the Graph API,
 * embeds them with Voyage AI, and upserts into knowledge_chunks.
 *
 * On first run: walks back through full post history (paginated, up to 10,000 posts).
 * On subsequent runs: only fetches posts newer than the most recently stored FB post,
 * so each run is fast and cheap.
 *
 * Run manually:  npm run sync-social
 * Runs on schedule via: .github/workflows/sync-social.yml
 */
import { config } from 'dotenv'
config({ path: '.env.local' })

import { createClient } from '@supabase/supabase-js'
import { fetchFacebookPosts } from './fetchers/facebook'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function embedText(text: string): Promise<number[]> {
  const res = await fetch('https://api.voyageai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.VOYAGE_API_KEY!}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ input: [text], model: 'voyage-3-lite' }),
  })
  if (!res.ok) throw new Error(`Voyage embed error ${res.status}`)
  const data = await res.json()
  return data.data[0].embedding as number[]
}

async function alreadyStored(platform: string, postId: string): Promise<boolean> {
  const { data } = await supabase
    .from('knowledge_chunks')
    .select('id')
    .eq('source', platform)
    .eq('source_id', postId)
    .maybeSingle()
  return !!data
}

/**
 * Finds the posted_at date of the most recently stored post for a given platform.
 * Used as the `since` cutoff so we only fetch new posts on each run.
 */
async function getMostRecentPostDate(platform: string): Promise<string | null> {
  const { data } = await supabase
    .from('knowledge_chunks')
    .select('created_at')
    .eq('source', platform)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return data?.created_at ?? null
}

async function processPosts(
  posts: { platform: string; post_id: string; content: string; posted_at?: string | null; url?: string | null }[]
): Promise<{ inserted: number; skipped: number }> {
  let inserted = 0
  let skipped = 0

  for (const post of posts) {
    if (await alreadyStored(post.platform, post.post_id)) {
      skipped++
      continue
    }

    try {
      const embedding = await embedText(post.content)
      const title = post.content.slice(0, 80) + (post.content.length > 80 ? '...' : '')

      const { error } = await supabase.from('knowledge_chunks').insert({
        topic: 'phaneroo',
        title,
        content: post.content,
        embedding,
        source: post.platform,
        source_id: post.post_id,
      })

      if (error) {
        console.error(`  upsert error (${post.platform}/${post.post_id}):`, error.message)
      } else {
        inserted++
        console.log(`  [${inserted}] ${title}`)
      }
    } catch (err) {
      console.error(`  embed error for ${post.platform}/${post.post_id}:`, err)
    }

    await new Promise((r) => setTimeout(r, 200))
  }

  return { inserted, skipped }
}

async function checkFacebookTokenExpiry(token: string): Promise<void> {
  try {
    const res = await fetch(
      `https://graph.facebook.com/v21.0/debug_token?input_token=${token}&access_token=${token}`
    )
    if (!res.ok) return
    const data = await res.json()
    const expiresAt: number | undefined = data?.data?.expires_at
    if (!expiresAt) return // 0 = non-expiring page token — fine

    const daysLeft = (expiresAt * 1000 - Date.now()) / 86400_000
    if (daysLeft < 14) {
      console.warn(
        `⚠️  FACEBOOK TOKEN EXPIRES IN ${Math.floor(daysLeft)} DAYS (${new Date(expiresAt * 1000).toDateString()}).` +
        ' Renew it in the Meta Developer Console before it expires or social sync will stop.'
      )
    }
  } catch {
    // Non-critical — don't block the sync
  }
}

async function main() {
  console.log('=== ZOE social sync (Facebook) ===')
  console.log('  VOYAGE_API_KEY :', process.env.VOYAGE_API_KEY ? 'set' : 'NOT SET')
  console.log('  SUPABASE_URL   :', process.env.SUPABASE_URL ? 'set' : 'NOT SET')

  const fbPageId = process.env.FACEBOOK_PAGE_ID
  const fbToken = process.env.FACEBOOK_ACCESS_TOKEN

  if (!fbPageId || !fbToken) {
    console.log('\nFacebook: skipped (FACEBOOK_PAGE_ID or FACEBOOK_ACCESS_TOKEN not set)')
    return
  }

  await checkFacebookTokenExpiry(fbToken)

  // Find the most recent post we already have so we only fetch newer ones
  const sinceDate = await getMostRecentPostDate('facebook')
  if (sinceDate) {
    console.log(`\nIncremental sync — fetching Facebook posts newer than ${sinceDate}`)
  } else {
    console.log('\nFirst run — fetching full Facebook post history (this may take a while)')
  }

  let posts: any[] = []
  try {
    posts = await fetchFacebookPosts(fbPageId, fbToken, sinceDate)
    console.log(`  Fetched ${posts.length} posts`)
  } catch (err: any) {
    console.error('  Facebook fetch failed:', err?.message ?? err)
    process.exit(1)
  }

  if (posts.length === 0) {
    console.log('No new posts to process.')
    return
  }

  console.log(`\nProcessing ${posts.length} posts...`)
  const { inserted, skipped } = await processPosts(posts)
  console.log(`\nDone. Inserted: ${inserted}  Already existed: ${skipped}`)
}

main().catch((err) => {
  console.error('sync-social fatal error:', err)
  process.exit(1)
})
