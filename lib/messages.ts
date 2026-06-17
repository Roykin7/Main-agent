import { getSupabase } from './supabase'
import { HistoryMessage } from './gemini'

const HISTORY_LIMIT = 10

/**
 * Returns the most recent messages for a phone number, oldest first,
 * suitable for passing to Gemini as chat history.
 */
export async function getRecentHistory(phone: string): Promise<HistoryMessage[]> {
  const { data, error } = await getSupabase()
    .from('messages')
    .select('role, content')
    .eq('phone', phone)
    .order('created_at', { ascending: false })
    .limit(HISTORY_LIMIT)

  if (error) {
    console.error('getRecentHistory error:', error)
    return []
  }

  return (data ?? []).reverse().map((row) => ({
    role: row.role as 'user' | 'model',
    content: row.content,
  }))
}

export async function saveMessage(
  phone: string,
  role: 'user' | 'model',
  content: string
): Promise<void> {
  const { error } = await getSupabase().from('messages').insert({ phone, role, content })
  if (error) console.error('saveMessage error:', error)
}
