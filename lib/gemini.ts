import { GoogleGenAI } from '@google/genai'
import OpenAI from 'openai'
import { ZOE_SYSTEM_PROMPT } from './zoe-prompt'

// OpenRouter for chat — OpenAI-compatible API, much more generous quota.
let openRouter: OpenAI | undefined
function getOpenRouter(): OpenAI {
  if (!openRouter) {
    openRouter = new OpenAI({
      apiKey: process.env.OPENROUTER_API_KEY!,
      baseURL: 'https://openrouter.ai/api/v1',
    })
  }
  return openRouter
}

// Gemini v1 for embeddings only (separate quota from chat, unaffected).
let embedAI: GoogleGenAI | undefined
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

  const messages: OpenAI.ChatCompletionMessageParam[] = [
    { role: 'system', content: ZOE_SYSTEM_PROMPT },
    ...history.map((m) => ({
      role: (m.role === 'model' ? 'assistant' : 'user') as 'user' | 'assistant',
      content: m.content,
    })),
    { role: 'user', content: message },
  ]

  const response = await getOpenRouter().chat.completions.create({
    model: process.env.OPENROUTER_MODEL ?? 'google/gemini-2.0-flash-001',
    messages,
  })

  return response.choices[0]?.message?.content ?? ''
}

export async function embed(text: string): Promise<number[]> {
  const result = await getEmbedAI().models.embedContent({
    model: 'gemini-embedding-001',
    contents: text,
    config: { outputDimensionality: 768 },
  })
  return result.embeddings?.[0]?.values ?? []
}
