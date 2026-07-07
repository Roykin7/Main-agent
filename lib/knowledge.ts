import { getSupabase } from './supabase'
import { embed } from './embeddings'
import { detectScriptureRequest, getVerse } from './bible'

const MATCH_COUNT = 5
const SOCIAL_MATCH_COUNT = 3

export type KnowledgeChunk = {
  title: string | null
  content: string
}

// Uganda is UTC+3
function ugandaDateString(offsetDays = 0): string {
  const ms = Date.now() + 3 * 3600_000 + offsetDays * 86400_000
  return new Date(ms).toISOString().split('T')[0]
}

/**
 * Vector-searches both knowledge_chunks and social_posts for the given query.
 * Called by the search_knowledge tool — no heuristic detection, just raw search.
 */
export async function searchKnowledge(query: string): Promise<KnowledgeChunk[]> {
  const queryEmbedding = await embed(query)

  const [kbResult, socialResult] = await Promise.all([
    getSupabase().rpc('match_knowledge_chunks', {
      query_embedding: queryEmbedding,
      match_count: MATCH_COUNT,
      filter_topic: null,
    }),
    getSupabase().rpc('match_social_posts', {
      query_embedding: queryEmbedding,
      match_count: SOCIAL_MATCH_COUNT,
    }),
  ])

  const chunks: KnowledgeChunk[] = []

  if (kbResult.error) {
    console.error('searchKnowledge kb error:', kbResult.error)
  } else {
    chunks.push(
      ...(kbResult.data ?? []).map((row: any) => ({
        title: row.title,
        content: row.content,
      }))
    )
  }

  if (socialResult.error) {
    console.error('searchKnowledge social error:', socialResult.error)
  } else {
    chunks.push(
      ...(socialResult.data ?? []).map((row: any) => ({
        title: `Phaneroo on ${row.platform === 'twitter' ? 'Twitter/X' : 'Facebook'}`,
        content: row.content,
      }))
    )
  }

  return chunks
}

export type Devotion = {
  title: string | null
  scriptureRef: string | null
  content: string
  sourceUrl: string | null
}

export async function getDevotion(date: string): Promise<Devotion | null> {
  const { data, error } = await getSupabase()
    .from('devotions')
    .select('title, scripture_ref, content, source_url')
    .eq('devo_date', date)
    .maybeSingle()

  if (error) {
    console.error('getDevotion error:', error)
    return null
  }
  if (!data) return null

  return {
    title: data.title,
    scriptureRef: data.scripture_ref,
    content: data.content,
    sourceUrl: data.source_url,
  }
}
