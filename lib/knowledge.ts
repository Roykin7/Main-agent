import { getSupabase } from './supabase'
import { embed, KnowledgeChunk } from './gemini'
import { detectScriptureRequest, getVerse } from './bible'

const MATCH_COUNT = 5

// Uganda is UTC+3
function ugandaDateString(offsetDays = 0): string {
  const ms = Date.now() + 3 * 3600_000 + offsetDays * 86400_000
  return new Date(ms).toISOString().split('T')[0]
}

function formatDisplayDate(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-UG', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })
}

function detectDevotionRequest(text: string): string | null {
  const lower = text.toLowerCase()
  const keywords = ['devotion', 'devo', 'daily word', 'word for today', 'morning word', 'daily bread']
  if (!keywords.some(k => lower.includes(k))) return null
  if (lower.includes('yesterday')) return ugandaDateString(-1)
  if (lower.includes('tomorrow')) return ugandaDateString(1)
  return ugandaDateString(0)
}

/**
 * Embeds the user's question and finds the most relevant knowledge_chunks
 * via pgvector cosine similarity (see match_knowledge_chunks in schema.sql).
 * If the message contains a Bible reference (e.g. "John 3:16"), fetches the
 * verse. If it contains a devotion request, looks up today's devotion with
 * the date clearly included so ZOE can mention it.
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

  const devotionDate = detectDevotionRequest(query)
  if (devotionDate) {
    const devotion = await getDevotion(devotionDate)
    if (devotion) {
      const displayDate = formatDisplayDate(devotionDate)
      const titleParts = [`Phaneroo Daily Devotion — ${displayDate}`]
      if (devotion.title) titleParts.push(`"${devotion.title}"`)
      if (devotion.scriptureRef) titleParts.push(`(${devotion.scriptureRef})`)
      chunks.unshift({
        title: titleParts.join(' '),
        content: devotion.content,
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
