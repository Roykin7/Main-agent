import OpenAI from 'openai'
import { ZOE_SYSTEM_PROMPT } from './zoe-prompt'
import { ZOE_TOOLS, executeToolCall } from './tools'
import { getSupabase } from './supabase'

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

// Cap each tool call at 12 seconds. Prevents a slow Voyage AI or Supabase
// response from hanging the entire webhook until Vercel times it out.
const TOOL_TIMEOUT_MS = 12_000

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ])
}

// Tools that return factual information — their results are verified before sending.
const INFO_TOOLS = new Set([
  'search_knowledge',
  'search_diagnosis_cases',
  'get_devotion',
  'get_bible_verse',
  'get_weather',
  'get_commodity_price',
  'web_search',
])

// Writes a row to interaction_feedback for later pattern analysis.
// Non-blocking — failures are logged but do not affect the response.
async function logInteractionFeedback(opts: {
  domain: 'coffee' | 'phaneroo' | 'general'
  questionSummary: string
  hadEmptyResults: boolean
  verifyCorrected: boolean
  maxRoundsReached: boolean
}): Promise<void> {
  const { error } = await getSupabase().from('interaction_feedback').insert({
    domain: opts.domain,
    question_summary: opts.questionSummary.slice(0, 200),
    had_empty_results: opts.hadEmptyResults,
    verify_corrected: opts.verifyCorrected,
    max_rounds_reached: opts.maxRoundsReached,
  })
  if (error) console.error('logInteractionFeedback error:', error)
}

// Infer the domain from the question and tool results so the verify pass can
// apply domain-specific quality criteria rather than a generic accuracy check.
function inferDomain(
  userText: string,
  toolResults: string[]
): 'coffee' | 'phaneroo' | 'general' {
  const text = (userText + ' ' + toolResults.join(' ')).toLowerCase()
  const coffeeTerms = [
    'coffee', 'arabica', 'robusta', 'farm', 'plant', 'crop', 'disease', 'pest',
    'harvest', 'price', 'cooperative', 'pruning', 'nursery', 'soil', 'fertili',
    'spray', 'berry', 'cherry', 'pulp', 'dry', 'processing', 'yield', 'ugx',
    'farmgate', 'cbd', 'cwd', 'antestia', 'wilt', 'borer', 'mite', 'shade',
  ]
  const phanerooTerms = [
    'phaneroo', 'devotion', 'sermon', 'apostle', 'grace', 'bible', 'scripture',
    'faith', 'healing', 'holy spirit', 'lubega', 'kingdom', 'salvation',
    'born again', 'righteousness', 'gospel', 'prayer', 'verse', 'testimony',
    'worship', 'ministry', 'church', 'service', 'teaching',
  ]

  const coffeeScore = coffeeTerms.filter((t) => text.includes(t)).length
  const phanerooScore = phanerooTerms.filter((t) => text.includes(t)).length

  if (coffeeScore > phanerooScore && coffeeScore >= 1) return 'coffee'
  if (phanerooScore > coffeeScore && phanerooScore >= 1) return 'phaneroo'
  return 'general'
}

// Domain-specific verify prompts catch errors a generic reviewer misses:
// coffee checks Uganda agronomy standards; Phaneroo checks doctrinal alignment
// and prevents invented Apostle Grace quotes.
function buildVerifyPrompt(
  question: string,
  toolContext: string,
  draft: string,
  domain: 'coffee' | 'phaneroo' | 'general'
): string {
  const ctx = `User asked: ${question}\n\nInformation ZOE retrieved from tools:\n${toolContext}\n\nZOE's draft reply:\n${draft}`

  if (domain === 'coffee') {
    return `You are an expert coffee agronomy reviewer for ZOE, a WhatsApp assistant serving Ugandan farmers.

${ctx}

Review silently on five points:
1. Accuracy — every fact, quantity, and recommendation is supported by the retrieved data. No invented diseases, chemicals, spray rates, or prices.
2. Uganda context — advice is appropriate for Uganda: local varieties (SL28, SL34, RUIRU11, Robusta), altitude zones, UCDA/MAAIF guidance, farmgate vs international futures prices distinguished where relevant.
3. Actionability — the farmer knows what to do, when, and with what. Vague advice with no specifics wastes their money.
4. Confidence calibration — if retrieved info is thin or absent, the draft hedges ("from what I found" / "confirm with your extension officer") rather than inventing details to fill the gap.
5. Format — plain text, concise, no markdown, no bullet lists.

If all five pass: reply with exactly the word PASS
If any fail: reply with the corrected response only — plain text, no explanation, no preamble.`
  }

  if (domain === 'phaneroo') {
    return `You are a Phaneroo Ministries teaching reviewer for ZOE, a WhatsApp assistant for Phaneroo followers.

${ctx}

Review silently on five points:
1. Scripture grounding — every doctrinal claim is anchored in a Bible verse that was actually retrieved, not paraphrased from memory.
2. No invented quotes — the draft does NOT put specific words in Apostle Grace Lubega's mouth unless the retrieved knowledge contains that exact quote.
3. Phaneroo framework alignment — the answer is consistent with core Phaneroo doctrine: ZOE life, identity in Christ, Word as final authority, Holy Spirit as a person, healing as covenant inheritance.
4. Devotion accuracy — if a devotion was retrieved, the reply is faithful to the retrieved text: correct title, date, scripture reference, and content.
5. Format — warm, concise, plain text, no markdown.

If all five pass: reply with exactly the word PASS
If any fail: reply with the corrected response only — plain text, no explanation, no preamble.`
  }

  return `You are a quality reviewer for ZOE, a WhatsApp assistant for coffee farmers and Phaneroo Ministries.

${ctx}

Review silently on three points:
1. Accuracy — the reply matches the retrieved data. No invented facts, prices, dates, or Bible verses.
2. Length — appropriate for WhatsApp. Concise unless the user clearly asked for detail.
3. Relevance — it actually answers what was asked.

If all three pass: reply with exactly the word PASS
If any issue: reply with the corrected response only — plain text, no explanation, no preamble.`
}

/**
 * Domain-aware verify pass. Applies coffee or Phaneroo-specific quality criteria
 * rather than a single generic check. Logs corrections as experience data —
 * reviewable in Vercel logs to identify recurring patterns.
 * Fails open — always returns something even if the review call errors.
 */
async function verifyResponse(
  question: string,
  toolResults: string[],
  draft: string,
  model: string,
  domain: 'coffee' | 'phaneroo' | 'general'
): Promise<string> {
  const toolContext = toolResults.map((r) => r.slice(0, 600)).join('\n---\n')
  const prompt = buildVerifyPrompt(question, toolContext, draft, domain)

  try {
    const res = await getOpenRouter().chat.completions.create({
      model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 600,
    })
    const result = res.choices[0]?.message?.content?.trim() ?? ''
    if (!result || result === 'PASS' || result.startsWith('PASS')) return draft
    console.log(
      JSON.stringify({
        event: 'zoe_verify_correction',
        domain,
        question: question.slice(0, 100),
        draft_len: draft.length,
        corrected_len: result.length,
      })
    )
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

  const collectedToolResults: string[] = []
  let infoToolUsed = false
  let finalDraft = ''
  let maxRoundsReached = false

  for (let round = 0; round < 5; round++) {
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
        result = await withTimeout(
          executeToolCall(
            toolCall.function.name,
            JSON.parse(toolCall.function.arguments),
            { phone }
          ),
          TOOL_TIMEOUT_MS,
          `Tool ${toolCall.function.name} timed out — answer from your general knowledge and be transparent about the uncertainty.`
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

  if (!finalDraft) {
    maxRoundsReached = true
    const fallback = await getOpenRouter().chat.completions.create({ model, messages })
    finalDraft = fallback.choices[0]?.message?.content ?? ''
  }

  if (infoToolUsed && collectedToolResults.length > 0) {
    const domain = inferDomain(userText, collectedToolResults)
    const hasEmptyResults = collectedToolResults.some(
      (r) =>
        r.includes('NO_KNOWLEDGE_RESULTS') ||
        r.includes('NO_DEVOTION_IN_DB') ||
        r.includes('No relevant information')
    )

    const verified = await verifyResponse(userText, collectedToolResults, finalDraft, model, domain)
    const wasCorrected = verified !== finalDraft

    // Persist quality signal to experience library for pattern analysis
    logInteractionFeedback({
      domain,
      questionSummary: userText,
      hadEmptyResults: hasEmptyResults,
      verifyCorrected: wasCorrected,
      maxRoundsReached,
    }).catch(() => {})

    return verified
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
