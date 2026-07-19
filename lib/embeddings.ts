import { createHash } from 'crypto'
import { getSupabase } from './supabase'

function hashQuery(text: string): string {
  return createHash('md5').update(text.toLowerCase().trim()).digest('hex')
}

export async function embed(text: string): Promise<number[]> {
  const hash = hashQuery(text)

  // Cache hit — skip the Voyage API call entirely
  const { data: cached } = await getSupabase()
    .from('embedding_cache')
    .select('embedding')
    .eq('query_hash', hash)
    .maybeSingle()

  if (cached?.embedding) return cached.embedding as number[]

  // Cache miss — call Voyage AI
  const res = await fetch('https://api.voyageai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.VOYAGE_API_KEY!}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ input: [text], model: 'voyage-3-lite' }),
  })
  if (!res.ok) throw new Error(`Voyage embed error ${res.status}: ${await res.text()}`)
  const data = await res.json()
  const embedding = data.data[0].embedding as number[]

  // Write to cache (fire-and-forget — don't block the response)
  // 23505 = unique_violation: two concurrent requests embedded the same query, harmless
  getSupabase()
    .from('embedding_cache')
    .insert({ query_hash: hash, embedding })
    .then(({ error }) => {
      if (error && error.code !== '23505') console.error('embed cache write:', error)
    })

  return embedding
}
