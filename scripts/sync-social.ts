/**
 * Fetches new posts from Facebook (Twitter handled by sync-twitter.py),
 * embeds them with Voyage AI, and upserts into knowledge_chunks.
 *
 * Run manually:  npm run sync-social
 * Runs daily via:  .github/workflows/sync-social.yml
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

async function processPosts(
  posts: { platform: string; post_id: string; content: string; posted_at?: string; url?: string }[]
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

  console.log('\nFetching Facebook posts...')
  let posts: any[] = []
  try {
    posts = await fetchFacebookPosts(fbPageId, fbToken)
    console.log(`  Fetched ${posts.length} posts`)
  } catch (err: any) {
    console.error('  Facebook fetch failed:', err?.message ?? err)
    return
  }

  if (posts.length === 0) {
    console.log('No posts to process.')
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
