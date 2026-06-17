import { GoogleGenAI, Chat } from '@google/genai'
import { ZOE_SYSTEM_PROMPT } from './zoe-prompt'

// Two clients: v1beta for chat (supports systemInstruction), v1 for embeddings.
let chatAI: GoogleGenAI | undefined
let embedAI: GoogleGenAI | undefined

function getChatAI(): GoogleGenAI {
  if (!chatAI) chatAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! })
  return chatAI
}

function getEmbedAI(): GoogleGenAI {
  if (!embedAI) {
    embedAI = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY!,
      httpOptions: { apiVersion: 'v1' },
    })
  }
  return embedAI
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

  const session: Chat = getChatAI().chats.create({
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
  const result = await getEmbedAI().models.embedContent({
    model: 'gemini-embedding-001',
    contents: text,
    config: { outputDimensionality: 768 },
  })
  return result.embeddings?.[0]?.values ?? []
}
