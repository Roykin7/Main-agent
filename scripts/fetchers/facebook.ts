import type { SocialPost } from './twitter'

function cleanPost(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}

/**
 * Fetches recent posts from a public Facebook Page via the Graph API.
 * Requires FACEBOOK_PAGE_ID and FACEBOOK_ACCESS_TOKEN in env.
 * Returns an empty array (with a warning) when credentials are not set.
 */
export async function fetchFacebookPosts(
  pageId: string,
  accessToken: string,
  limit = 50
): Promise<SocialPost[]> {
  const params = new URLSearchParams({
    fields: 'id,message,created_time,permalink_url',
    limit: String(limit),
    access_token: accessToken,
  })

  const res = await fetch(
    `https://graph.facebook.com/v19.0/${pageId}/posts?${params}`
  )
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Facebook Graph API ${res.status}: ${body}`)
  }

  const json = await res.json()
  const posts: any[] = json?.data ?? []

  return posts
    .filter((p) => p.message && p.message.trim().length >= 30)
    .map((p) => ({
      platform: 'facebook' as const,
      post_id: p.id,
      content: cleanPost(p.message),
      posted_at: p.created_time ?? null,
      url: p.permalink_url ?? null,
    }))
}
