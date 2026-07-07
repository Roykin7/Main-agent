import OpenAI from 'openai'
import { ZOE_SYSTEM_PROMPT } from './zoe-prompt'
import { ZOE_TOOLS, executeToolCall } from './tools'

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

export type HistoryMessage = {
  role: 'user' | 'model'
  content: string
}

/**
 * Agentic chat loop. ZOE decides which tools to call (search_knowledge,
 * get_devotion, get_bible_verse), executes them, and uses the results to
 * build a grounded reply — rather than having all context blindly injected
 * upfront. Runs up to 3 tool-call rounds before returning.
 */
export async function chat(
  history: HistoryMessage[],
  userText: string,
  summary: string | null = null
): Promise<string> {
  const messages: OpenAI.ChatCompletionMessageParam[] = [
    { role: 'system', content: ZOE_SYSTEM_PROMPT },
  ]

  if (summary) {
    messages.push({
      role: 'system',
      content: `Earlier in this conversation:\n${summary}`,
    })
  }

  messages.push(
    ...history.map((m) => ({
      role: (m.role === 'model' ? 'assistant' : 'user') as 'user' | 'assistant',
      content: m.content,
    }))
  )

  messages.push({ role: 'user', content: userText })

  const model = process.env.OPENROUTER_MODEL ?? 'openai/gpt-4o-mini'

  for (let round = 0; round < 3; round++) {
    const response = await getOpenRouter().chat.completions.create({
      model,
      messages,
      tools: ZOE_TOOLS,
      tool_choice: 'auto',
    })

    const msg = response.choices[0].message

    // No tool calls — this is the final reply
    if (!msg.tool_calls || msg.tool_calls.length === 0) {
      return msg.content ?? ''
    }

    // Filter to function calls only — type predicate ensures .function is accessible
    const fnCalls = msg.tool_calls.filter(
      (tc): tc is OpenAI.ChatCompletionMessageFunctionToolCall => tc.type === 'function'
    )

    // Add assistant turn (with tool_calls) to the thread
    messages.push({
      role: 'assistant',
      content: msg.content ?? null,
      tool_calls: fnCalls,
    })

    // Execute every requested tool and add results
    for (const toolCall of fnCalls) {
      console.log(`Tool: ${toolCall.function.name}(${toolCall.function.arguments})`)
      let result: string
      try {
        result = await executeToolCall(
          toolCall.function.name,
          JSON.parse(toolCall.function.arguments)
        )
      } catch (err) {
        result = `Tool execution error: ${err}`
      }
      messages.push({
        role: 'tool',
        tool_call_id: toolCall.id,
        content: result,
      })
    }
  }

  // Max rounds reached — get a final answer without offering more tool calls
  const fallback = await getOpenRouter().chat.completions.create({ model, messages })
  return fallback.choices[0]?.message?.content ?? ''
}

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
