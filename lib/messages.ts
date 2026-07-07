import { getSupabase } from './supabase'
import { HistoryMessage, summarizeHistory } from './gemini'

const HISTORY_LIMIT = 20   // raw messages always passed to the model
const SUMMARIZE_EVERY = 10 // how many messages must fall outside the window before we re-summarize

export type ConversationContext = {
  summary: string | null
  messages: HistoryMessage[]
  totalCount: number
}

/**
 * Fetches the last HISTORY_LIMIT messages plus any existing rolling summary
 * and the total message count — all in parallel.
 */
export async function getConversationContext(phone: string): Promise<ConversationContext> {
  const [msgsResult, summaryResult, countResult] = await Promise.all([
    getSupabase()
      .from('messages')
      .select('role, content')
      .eq('phone', phone)
      .order('created_at', { ascending: false })
      .limit(HISTORY_LIMIT),
    getSupabase()
      .from('conversation_summaries')
      .select('summary')
      .eq('phone', phone)
      .maybeSingle(),
    getSupabase()
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('phone', phone),
  ])

  if (msgsResult.error) console.error('getConversationContext error:', msgsResult.error)

  return {
    summary: summaryResult.data?.summary ?? null,
    messages: (msgsResult.data ?? []).reverse().map((row) => ({
      role: row.role as 'user' | 'model',
      content: row.content,
    })),
    totalCount: countResult.count ?? 0,
  }
}

export async function saveMessage(
  phone: string,
  role: 'user' | 'model',
  content: string
): Promise<void> {
  const { error } = await getSupabase().from('messages').insert({ phone, role, content })
  if (error) console.error('saveMessage error:', error)
}

/**
 * Called after saving a user+model exchange. When a fresh batch of
 * SUMMARIZE_EVERY messages has just slipped outside the raw history window,
 * fetches that batch, generates an incremental rolling summary via the LLM,
 * and persists it. Only triggers every 10 messages so the extra LLM call is
 * rare and the response time stays low on most requests.
 *
 * @param totalCountBefore  the message count returned by getConversationContext
 *                          (before the current user+model pair was saved)
 */
export async function maybeUpdateSummary(
  phone: string,
  totalCountBefore: number
): Promise<void> {
  const newTotal = totalCountBefore + 2 // +2 for the user message + model reply just saved
  const olderCount = newTotal - HISTORY_LIMIT

  if (olderCount <= 0 || olderCount % SUMMARIZE_EVERY !== 0) return

  const batchStart = olderCount - SUMMARIZE_EVERY
  const batchEnd = olderCount - 1

  const [batchResult, existingResult] = await Promise.all([
    getSupabase()
      .from('messages')
      .select('role, content')
      .eq('phone', phone)
      .order('created_at', { ascending: true })
      .range(batchStart, batchEnd),
    getSupabase()
      .from('conversation_summaries')
      .select('summary')
      .eq('phone', phone)
      .maybeSingle(),
  ])

  if (batchResult.error || !batchResult.data || batchResult.data.length === 0) return

  const batchMessages: HistoryMessage[] = batchResult.data.map((row) => ({
    role: row.role as 'user' | 'model',
    content: row.content,
  }))

  try {
    const newSummary = await summarizeHistory(batchMessages, existingResult.data?.summary ?? null)
    const { error } = await getSupabase()
      .from('conversation_summaries')
      .upsert(
        { phone, summary: newSummary, updated_at: new Date().toISOString() },
        { onConflict: 'phone' }
      )
    if (error) console.error('maybeUpdateSummary upsert error:', error)
  } catch (err) {
    console.error('maybeUpdateSummary summarize error:', err)
  }
}
