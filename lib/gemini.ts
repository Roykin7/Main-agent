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
  contextChunks: KnowledgeChunk[],
  summary: string | null = null
): Promise<string> {
  const messages: OpenAI.ChatCompletionMessageParam[] = [
    { role: 'system', content: ZOE_SYSTEM_PROMPT },
  ]

  // For long conversations, inject the rolling summary of older turns so ZOE
  // remembers context that has scrolled out of the raw history window.
  if (summary) {
    messages.push({
      role: 'system',
      content: `Earlier in this conversation:\n${summary}`,
    })
  }

  // Past turns — user messages are plain text, model replies are plain text.
  // Keeping them clean (no knowledge wrappers) lets the model treat the
  // history as a real conversation rather than a series of fresh templates.
  messages.push(
    ...history.map((m) => ({
      role: (m.role === 'model' ? 'assistant' : 'user') as 'user' | 'assistant',
      content: m.content,
    }))
  )

  // Inject retrieved knowledge as a system turn immediately before the user's
  // message so the structure stays consistent across all turns.
  if (contextChunks.length > 0) {
    const knowledgeBlock = contextChunks
      .map((c) => (c.title ? `${c.title}: ${c.content}` : c.content))
      .join('\n---\n')
    messages.push({ role: 'system', content: `Retrieved context for this question:\n${knowledgeBlock}` })
  }

  messages.push({ role: 'user', content: userText })

  const response = await getOpenRouter().chat.completions.create({
    model: process.env.OPENROUTER_MODEL ?? 'openai/gpt-4o-mini',
    messages,
  })

  return response.choices[0]?.message?.content ?? ''
}

/**
 * Incrementally updates a rolling summary. Called by maybeUpdateSummary()
 * when a batch of messages has just slipped outside the raw history window.
 * Folds the new batch into any existing summary so no context is ever lost.
 */
export async function summarizeHistory(
  newMessages: HistoryMessage[],
  existingSummary: string | null
): Promise<string> {
  const transcript = newMessages
    .map((m) => `${m.role === 'user' ? 'User' : 'ZOE'}: ${m.content}`)
    .join('\n')

  const prompt = existingSummary
    ? `You are maintaining a running summary of a WhatsApp conversation between a user and ZOE (an assistant for coffee farming and Phaneroo Ministries).\n\nExisting summary:\n${existingSummary}\n\nNew messages to incorporate:\n${transcript}\n\nWrite an updated concise summary covering the full conversation so far. Include key topics, decisions, and specific details the user shared (their farm, problems, questions). 3–5 sentences max.`
    : `Summarize this WhatsApp conversation between a user and ZOE (an assistant for coffee farming and Phaneroo Ministries) in 2–3 sentences. Capture the main topics and any key details the user shared:\n\n${transcript}`

  const response = await getOpenRouter().chat.completions.create({
    model: process.env.OPENROUTER_MODEL ?? 'openai/gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 250,
  })

  return response.choices[0]?.message?.content ?? existingSummary ?? ''
}

export async function embed(text: string): Promise<number[]> {
  const result = await getEmbedAI().models.embedContent({
    model: 'gemini-embedding-001',
    contents: text,
    config: { outputDimensionality: 768 },
  })
  return result.embeddings?.[0]?.values ?? []
}
