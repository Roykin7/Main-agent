import { GoogleGenAI, Chat } from '@google/genai'
import { ZOE_SYSTEM_PROMPT } from './zoe-prompt'

// Lazily created on first use, so importing this module doesn't require
// GEMINI_API_KEY to be set (e.g. during `next build` page-data collection).
let ai: GoogleGenAI | undefined

function getAI(): GoogleGenAI {
  if (!ai) {
    ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY!,
      httpOptions: { apiVersion: 'v1' },
    })
  }
  return ai
}

export type HistoryMessage = {
  role: 'user' | 'model'
  content: string
}

export type KnowledgeChunk = {
  title: string | null
  content: string
}

/**
 * Sends a user message to Gemini along with retrieved knowledge context
 * and recent conversation history, and returns ZOE's reply text.
 */
export async function chat(
  history: HistoryMessage[],
  userText: string,
  contextChunks: KnowledgeChunk[]
): Promise<string> {
  const knowledgeBlock =
    contextChunks.length > 0
      ? contextChunks
          .map((c) => (c.title ? `${c.title}: ${c.content}` : c.content))
          .join('\n---\n')
      : '(none found for this question)'

  const message = `Knowledge:\n${knowledgeBlock}\n\nUser message:\n${userText}`

  const session: Chat = getAI().chats.create({
    model: 'gemini-2.0-flash',
    config: { systemInstruction: ZOE_SYSTEM_PROMPT },
    history: history.map((m) => ({
      role: m.role,
      parts: [{ text: m.content }],
    })),
  })

  const result = await session.sendMessage({ message })
  return result.text ?? ''
}

/**
 * Returns a 768-dim embedding vector for the given text, used for
 * vector similarity search against knowledge_chunks.
 */
export async function embed(text: string): Promise<number[]> {
  const result = await getAI().models.embedContent({
    model: 'gemini-embedding-001',
    contents: text,
    config: { outputDimensionality: 768 },
  })
  return result.embeddings?.[0]?.values ?? []
}
