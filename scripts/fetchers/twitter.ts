export type SocialPost = {
  platform: 'twitter' | 'facebook'
  post_id: string
  content: string
  posted_at: string | null
  url: string | null
}

const API_BASE = 'https://api.twitter.com/2'

async function twitterGet(path: string, token: string): Promise<any> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Twitter API ${res.status}: ${body}`)
  }
  return res.json()
}

function cleanTweet(text: string): string {
  return text
    .replace(/https?:\/\/t\.co\/\S+/g, '')  // strip t.co shortlinks
    .replace(/\s+/g, ' ')
    .trim()
}

function isUseful(text: string): boolean {
  if (text.startsWith('RT @')) return false  // skip retweets
  if (text.length < 30) return false          // skip near-empty posts
  return true
}

/**
 * Fetches the most recent tweets from a Twitter/X account.
 * Uses the API v2 user timeline endpoint — requires a Bearer Token.
 */
export async function fetchTwitterPosts(
  username: string,
  bearerToken: string,
  maxResults = 100
): Promise<SocialPost[]> {
  // Look up the numeric user ID from the username
  const userResp = await twitterGet(`/users/by/username/${username}`, bearerToken)
  const userId: string = userResp?.data?.id
  if (!userId) throw new Error(`Twitter user not found: ${username}`)

  // Fetch recent tweets (exclude replies and retweets)
  const params = new URLSearchParams({
    max_results: String(Math.min(maxResults, 100)),
    'tweet.fields': 'created_at,text',
    exclude: 'retweets,replies',
  })
  const tweetsResp = await twitterGet(`/users/${userId}/tweets?${params}`, bearerToken)
  const tweets: any[] = tweetsResp?.data ?? []
  console.log(`  API returned ${tweets.length} raw tweets for user ID ${userId}`)

  const results = tweets
    .map((t) => ({
      platform: 'twitter' as const,
      post_id: t.id,
      content: cleanTweet(t.text),
      posted_at: t.created_at ?? null,
      url: `https://twitter.com/${username}/status/${t.id}`,
    }))
    .filter((p) => isUseful(p.content))

  console.log(`  After filtering: ${results.length} posts kept`)
  return results
}
