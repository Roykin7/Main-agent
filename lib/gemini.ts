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

// Tools that return factual information — their results are verified before sending.
const INFO_TOOLS = new Set([
  'search_knowledge',
  'get_devotion',
  'get_bible_verse',
  'get_weather',
  'get_commodity_price',
  'web_search',
])

/**
 * After the main tool loop, run a quick second-pass review against the tool
 * results to catch invented facts, wrong lengths, or off-target replies.
 * Returns the draft unchanged (PASS) or a corrected version.
 * Fails open — always returns something even if the review call errors.
 */
async function verifyResponse(
  question: string,
  toolResults: string[],
  draft: string,
  model: string
): Promise<string> {
  const toolContext = toolResults
    .map((r) => r.slice(0, 600))
    .join('\n---\n')

  const prompt = `You are a quality reviewer for ZOE, a WhatsApp assistant for coffee farmers and Phaneroo Ministries.

User asked: ${question}

Information ZOE retrieved from tools:
${toolContext}

ZOE's draft reply:
${draft}

Review silently on three points:
1. Accuracy — does the reply match the tool data? No invented facts, prices, dates, or Bible verses?
2. Length — appropriate for WhatsApp? Concise unless the user clearly asked for detail.
3. Relevance — does it actually answer what was asked?

If all three pass, reply with exactly the word: PASS
If there is any issue, reply with the corrected response only — plain text, no explanation, no preamble.`

  try {
    const res = await getOpenRouter().chat.completions.create({
      model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 600,
    })
    const result = res.choices[0]?.message?.content?.trim() ?? ''
    if (!result || result === 'PASS' || result.startsWith('PASS')) return draft
    return result
  } catch (err) {
    console.error('verifyResponse error — using original draft:', err)
    return draft
  }
}

/**
 * Agentic chat loop. Runs up to 3 tool-call rounds, then optionally runs a
 * verify pass against the collected tool results before returning.
 *
 * @param phone        WhatsApp phone number — passed to tools that need it (e.g. remember_user_fact)
 * @param userProfile  Per-user facts loaded from user_profiles table
 */
export async function chat(
  history: HistoryMessage[],
  userText: string,
  summary: string | null = null,
  phone?: string,
  userProfile?: string[],
  imageBase64?: string,
  imageMimeType?: string
): Promise<string> {
  const messages: OpenAI.ChatCompletionMessageParam[] = [
    { role: 'system', content: ZOE_SYSTEM_PROMPT },
  ]

  // Inject per-user memory so ZOE knows who she's talking to
  if (userProfile && userProfile.length > 0) {
    messages.push({
      role: 'system',
      content: `What you already know about this specific user:\n${userProfile.map((f) => `• ${f}`).join('\n')}\nUse this context naturally — don't repeat it back unless it's relevant to what they just asked.`,
    })
  }

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

  if (imageBase64) {
    messages.push({
      role: 'user',
      content: [
        { type: 'text', text: userText || 'Please look at this image carefully.' },
        {
          type: 'image_url',
          image_url: { url: `data:${imageMimeType ?? 'image/jpeg'};base64,${imageBase64}` },
        },
      ],
    })
  } else {
    messages.push({ role: 'user', content: userText })
  }

  const model = process.env.OPENROUTER_MODEL ?? 'openai/gpt-4o-mini'

  // Collect results from info tools for the verify pass
  const collectedToolResults: string[] = []
  let infoToolUsed = false
  let finalDraft = ''

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
      finalDraft = msg.content ?? ''
      break
    }

    // Filter to function calls only — type predicate ensures .function is accessible
    const fnCalls = msg.tool_calls.filter(
      (tc): tc is OpenAI.ChatCompletionMessageFunctionToolCall => tc.type === 'function'
    )

    messages.push({
      role: 'assistant',
      content: msg.content ?? null,
      tool_calls: fnCalls,
    })

    for (const toolCall of fnCalls) {
      console.log(`Tool: ${toolCall.function.name}(${toolCall.function.arguments})`)
      let result: string
      try {
        result = await executeToolCall(
          toolCall.function.name,
          JSON.parse(toolCall.function.arguments),
          { phone }
        )
      } catch (err) {
        result = `Tool execution error: ${err}`
      }

      if (INFO_TOOLS.has(toolCall.function.name)) {
        collectedToolResults.push(`[${toolCall.function.name}] ${result}`)
        infoToolUsed = true
      }

      messages.push({
        role: 'tool',
        tool_call_id: toolCall.id,
        content: result,
      })
    }
  }

  // Max rounds reached without a clean final reply — force one
  if (!finalDraft) {
    const fallback = await getOpenRouter().chat.completions.create({ model, messages })
    finalDraft = fallback.choices[0]?.message?.content ?? ''
  }

  // Verify pass: second model checks the draft against what the tools actually returned
  if (infoToolUsed && collectedToolResults.length > 0) {
    return verifyResponse(userText, collectedToolResults, finalDraft, model)
  }

  return finalDraft
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
