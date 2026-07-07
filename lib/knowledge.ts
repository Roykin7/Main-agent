import { getSupabase } from './supabase'
import { embed } from './embeddings'

const MATCH_COUNT = 8

export type KnowledgeChunk = {
  title: string | null
  content: string
}

export type Devotion = {
  title: string | null
  scriptureRef: string | null
  content: string
  sourceUrl: string | null
}

/**
 * Vector-searches knowledge_chunks for the given query.
 * All content — seeded KB, social posts, user-contributed facts — lives here.
 */
export async function searchKnowledge(query: string): Promise<KnowledgeChunk[]> {
  const queryEmbedding = await embed(query)

  const { data, error } = await getSupabase().rpc('match_knowledge_chunks', {
    query_embedding: queryEmbedding,
    match_count: MATCH_COUNT,
    filter_topic: null,
  })

  if (error) {
    console.error('searchKnowledge error:', error)
    return []
  }

  return (data ?? []).map((row: any) => ({
    title: row.title,
    content: row.content,
  }))
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
