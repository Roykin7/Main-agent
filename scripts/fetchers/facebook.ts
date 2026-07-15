export type SocialPost = {
  platform: 'facebook' | 'twitter'
  post_id: string
  content: string
  posted_at: string | null
  url: string | null
}

function cleanPost(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}

/**
 * Fetches posts from a Facebook Page via the Graph API with full pagination.
 *
 * On first run (no sinceDate): walks back through ALL posts in history.
 * On subsequent runs (sinceDate provided): only fetches posts newer than that
 * date, stopping pagination as soon as it reaches older content.
 *
 * Fetches both `message` (text posts) and `story` + attachment descriptions
 * so photo captions, video descriptions, and shared links are captured too.
 */
export async function fetchFacebookPosts(
  pageId: string,
  accessToken: string,
  sinceDate?: string | null   // ISO date string e.g. "2026-06-15T12:00:00+0000"
): Promise<SocialPost[]> {
  const allPosts: SocialPost[] = []

  const params = new URLSearchParams({
    fields: 'id,message,story,created_time,permalink_url,attachments{description,title}',
    limit: '100',
    access_token: accessToken,
  })

  // Facebook `since` param takes a Unix timestamp
  if (sinceDate) {
    const ts = Math.floor(new Date(sinceDate).getTime() / 1000)
    if (!isNaN(ts)) params.set('since', String(ts))
  }

  let url: string | null =
    `https://graph.facebook.com/v21.0/${pageId}/posts?${params}`

  let pageCount = 0
  const MAX_PAGES = 100  // safety cap (~10,000 posts)

  while (url && pageCount < MAX_PAGES) {
    const res: Response = await fetch(url)
    if (!res.ok) {
      const body = await res.text()
      throw new Error(`Facebook Graph API ${res.status}: ${body}`)
    }

    const json: any = await res.json()
    const posts: any[] = json?.data ?? []
    if (posts.length === 0) break

    for (const p of posts) {
      // Build the best available text content
      const parts: string[] = []
      if (p.message) parts.push(p.message)
      if (p.story && !parts.some((t) => t.includes(p.story))) parts.push(p.story)

      // Pull attachment descriptions (photo captions, link blurbs, video descriptions)
      const attachments: any[] = p.attachments?.data ?? []
      for (const att of attachments) {
        if (att.description && !parts.some((t) => t.includes(att.description)))
          parts.push(att.description)
        if (att.title && !parts.some((t) => t.includes(att.title)))
          parts.push(att.title)
      }

      const content = cleanPost(parts.join(' — '))
      if (content.length < 30) continue

      allPosts.push({
        platform: 'facebook',
        post_id: p.id,
        content,
        posted_at: p.created_time ?? null,
        url: p.permalink_url ?? null,
      })
    }

    // Follow pagination cursor
    url = json?.paging?.next ?? null
    pageCount++
  }

  return allPosts
}
