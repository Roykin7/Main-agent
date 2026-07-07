/**
 * Fetches new posts from Twitter/X (and optionally Facebook), embeds them
 * with Gemini, and upserts them into the social_posts table.
 *
 * Run manually:  npm run sync-social
 * Runs daily via:  .github/workflows/sync-social.yml
 */
import { config } from 'dotenv'
config({ path: '.env.local' })

import { createClient } from '@supabase/supabase-js'
import { GoogleGenAI } from '@google/genai'
import { fetchTwitterPosts, type SocialPost } from './fetchers/twitter'
import { fetchFacebookPosts } from './fetchers/facebook'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const genai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY!,
  httpOptions: { apiVersion: 'v1' },
})

async function embedText(text: string): Promise<number[]> {
  const result = await genai.models.embedContent({
    model: 'gemini-embedding-001',
    contents: text,
    config: { outputDimensionality: 768 },
  })
  return result.embeddings?.[0]?.values ?? []
}

async function upsertPost(post: SocialPost, embedding: number[]): Promise<boolean> {
  const { error } = await supabase.from('social_posts').upsert(
    {
      platform: post.platform,
      post_id: post.post_id,
      content: post.content,
      posted_at: post.posted_at,
      url: post.url,
      embedding,
    },
    { onConflict: 'platform,post_id', ignoreDuplicates: true }
  )
  if (error) {
    console.error(`  upsert error (${post.platform}/${post.post_id}):`, error.message)
    return false
  }
  return true
}

async function processPosts(posts: SocialPost[]): Promise<{ inserted: number; skipped: number }> {
  let inserted = 0
  let skipped = 0

  for (const post of posts) {
    // Check if already ingested to avoid paying for embeddings on duplicates
    const { data: existing } = await supabase
      .from('social_posts')
      .select('id')
      .eq('platform', post.platform)
      .eq('post_id', post.post_id)
      .maybeSingle()

    if (existing) {
      skipped++
      continue
    }

    try {
      const embedding = await embedText(post.content)
      const ok = await upsertPost(post, embedding)
      if (ok) inserted++
    } catch (err) {
      console.error(`  embed error for ${post.platform}/${post.post_id}:`, err)
    }

    // Small delay to stay within Gemini embedding rate limits
    await new Promise((r) => setTimeout(r, 200))
  }

  return { inserted, skipped }
}

async function main() {
  console.log('=== ZOE social sync ===')

  // Diagnostic: confirm env vars are loaded (token masked)
  const twitterToken = process.env.TWITTER_BEARER_TOKEN
  const twitterUsername = process.env.TWITTER_PHANEROO_USERNAME
  console.log('\nEnv check:')
  console.log('  TWITTER_BEARER_TOKEN :', twitterToken ? `set (${twitterToken.length} chars)` : 'NOT SET')
  console.log('  TWITTER_PHANEROO_USERNAME:', twitterUsername || 'NOT SET')
  console.log('  GEMINI_API_KEY        :', process.env.GEMINI_API_KEY ? 'set' : 'NOT SET')
  console.log('  SUPABASE_URL          :', process.env.SUPABASE_URL ? 'set' : 'NOT SET')

  const allPosts: SocialPost[] = []

  // --- Twitter/X ---
  if (twitterToken && twitterUsername) {
    console.log(`\nFetching Twitter posts for @${twitterUsername}...`)
    try {
      const tweets = await fetchTwitterPosts(twitterUsername, twitterToken)
      console.log(`  Fetched ${tweets.length} posts after filtering`)
      allPosts.push(...tweets)
    } catch (err: any) {
      console.error('  Twitter fetch failed:', err?.message ?? err)
    }
  } else {
    console.log('\nTwitter: skipped (TWITTER_BEARER_TOKEN or TWITTER_PHANEROO_USERNAME not set)')
  }

  // --- Facebook ---
  const fbPageId = process.env.FACEBOOK_PAGE_ID
  const fbToken = process.env.FACEBOOK_ACCESS_TOKEN

  if (fbPageId && fbToken) {
    console.log('\nFetching Facebook posts...')
    try {
      const fbPosts = await fetchFacebookPosts(fbPageId, fbToken)
      console.log(`  Fetched ${fbPosts.length} posts`)
      allPosts.push(...fbPosts)
    } catch (err) {
      console.error('  Facebook fetch failed:', err)
    }
  } else {
    console.log('Facebook: skipped (FACEBOOK_PAGE_ID or FACEBOOK_ACCESS_TOKEN not set)')
  }

  if (allPosts.length === 0) {
    console.log('\nNo posts to process.')
    return
  }

  console.log(`\nProcessing ${allPosts.length} posts (embedding + upsert)...`)
  const { inserted, skipped } = await processPosts(allPosts)
  console.log(`\nDone. Inserted: ${inserted}  Already existed: ${skipped}`)
}

main().catch((err) => {
  console.error('sync-social fatal error:', err)
  process.exit(1)
})
