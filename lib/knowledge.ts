import { getSupabase } from './supabase'
import { embed, KnowledgeChunk } from './gemini'
import { detectScriptureRequest, getVerse } from './bible'

const MATCH_COUNT = 5

/**
 * Embeds the user's question and finds the most relevant knowledge_chunks
 * via pgvector cosine similarity (see match_knowledge_chunks in schema.sql).
 * If the message contains a Bible reference (e.g. "John 3:16" or "Psalm
 * 23:1-3 in MSG"), also fetches that verse text and includes it as context.
 */
export async function retrieveContext(query: string): Promise<KnowledgeChunk[]> {
  const chunks: KnowledgeChunk[] = []

  const scriptureRequest = detectScriptureRequest(query)
  if (scriptureRequest) {
    const verseText = await getVerse(scriptureRequest.passageId, scriptureRequest.translation)
    if (verseText) {
      chunks.push({
        title: `${scriptureRequest.reference} (${scriptureRequest.translation})`,
        content: verseText,
      })
    }
  }

  try {
    const queryEmbedding = await embed(query)
    const { data, error } = await getSupabase().rpc('match_knowledge_chunks', {
      query_embedding: queryEmbedding,
      match_count: MATCH_COUNT,
      filter_topic: null,
    })
    if (error) {
      console.error('retrieveContext rpc error:', error)
    } else {
      chunks.push(
        ...(data ?? []).map((row: any) => ({
          title: row.title,
          content: row.content,
        }))
      )
    }
  } catch (err) {
    // Embedding quota exceeded or API error — ZOE replies without KB context.
    console.error('retrieveContext embed error (quota?):', err)
  }

  return chunks
}

export type Devotion = {
  title: string | null
  scriptureRef: string | null
  content: string
  sourceUrl: string | null
}

/**
 * Looks up a devotion for a specific date (YYYY-MM-DD). Returns null if
 * none has been added yet for that date.
 */
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
