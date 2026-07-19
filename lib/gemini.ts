import OpenAI from 'openai'
import { createHash } from 'crypto'
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

// Cap each tool call at 12 seconds — prevents a slow Voyage AI or Supabase
// call from hanging the entire webhook until Vercel times it out.
const TOOL_TIMEOUT_MS = 12_000

// Cap tool result characters injected into the context per round.
// Prevents one large KB search from crowding out reasoning in later rounds
// (context drift anti-pattern). Full result still goes to the verify pass.
const TOOL_OUTPUT_CAP = 1_500

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ])
}

function hashPhone(phone: string): string {
  return createHash('sha256').update(phone).digest('hex').slice(0, 16)
}

// Tools that return factual information — results collected for the verify pass.
const INFO_TOOLS = new Set([
  'search_knowledge',
  'search_diagnosis_cases',
  'get_devotion',
  'get_bible_verse',
  'get_weather',
  'get_commodity_price',
  'web_search',
])

// Quality signal — logged when info tools are used, for domain-level analysis.
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

// Execution trace — logged for EVERY request, not just those using info tools.
// Captures full tool chain with timing so individual failures can be traced.
async function logAgentTrace(opts: {
  traceId: string
  phoneHash: string
  inputType: string
  roundsUsed: number
  toolsCalled: Array<{ name: string; round: number; durationMs: number; resultChars: number; timedOut: boolean }>
  verifyCorrect: boolean
  hadEmptyResults: boolean
  finalReplyChars: number
  totalDurationMs: number
}): Promise<void> {
  const { error } = await getSupabase().from('agent_traces').insert({
    trace_id:          opts.traceId,
    phone_hash:        opts.phoneHash,
    input_type:        opts.inputType,
    rounds_used:       opts.roundsUsed,
    tools_called:      opts.toolsCalled,
    verify_corrected:  opts.verifyCorrect,
    had_empty_results: opts.hadEmptyResults,
    timed_out_tools:   opts.toolsCalled.filter((t) => t.timedOut).length,
    final_reply_chars: opts.finalReplyChars,
    total_duration_ms: opts.totalDurationMs,
  })
  if (error) console.error('logAgentTrace error:', error)
}

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
    console.log(JSON.stringify({
      event: 'zoe_verify_correction',
      domain,
      question: question.slice(0, 100),
      draft_len: draft.length,
      corrected_len: result.length,
    }))
    return result
  } catch (err) {
    console.error('verifyResponse error — using original draft:', err)
    return draft
  }
}

/**
 * Main agentic chat function.
 *
 * @param inputType  Original message type hint ('text'|'audio'|'image'|'location')
 *                   used in traces — does not change behaviour, only logging.
 */
export async function chat(
  history: HistoryMessage[],
  userText: string,
  summary: string | null = null,
  phone?: string,
  userProfile?: string[],
  imageBase64?: string,
  imageMimeType?: string,
  inputType?: string,
): Promise<string> {
  const traceStart = Date.now()
  const traceId = `${(phone ?? 'anon').slice(-4)}_${traceStart}`
  const traceTools: Array<{ name: string; round: number; durationMs: number; resultChars: number; timedOut: boolean }> = []

  const messages: OpenAI.ChatCompletionMessageParam[] = [
    { role: 'system', content: ZOE_SYSTEM_PROMPT },
  ]

  if (userProfile && userProfile.length > 0) {
    messages.push({
      role: 'system',
      content: `What you already know about this specific user:\n${userProfile.map((f) => `• ${f}`).join('\n')}\nUse this context naturally — don't repeat it back unless it's relevant. Facts are listed oldest first; if two facts contradict, the later one is current. If unclear which is correct, ask the user once then update with remember_user_fact.`,
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
        { type: 'image_url', image_url: { url: `data:${imageMimeType ?? 'image/jpeg'};base64,${imageBase64}` } },
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
  let roundsUsed = 0

  for (let round = 0; round < 5; round++) {
    roundsUsed = round + 1

    const response = await getOpenRouter().chat.completions.create({
      model,
      messages,
      tools: ZOE_TOOLS,
      tool_choice: 'auto',
    })

    const msg = response.choices[0].message

    if (!msg.tool_calls || msg.tool_calls.length === 0) {
      finalDraft = msg.content ?? ''
      break
    }

    const fnCalls = msg.tool_calls.filter(
      (tc): tc is OpenAI.ChatCompletionMessageFunctionToolCall => tc.type === 'function'
    )

    messages.push({
      role: 'assistant',
      content: msg.content ?? null,
      tool_calls: fnCalls,
    })

    for (const toolCall of fnCalls) {
      const toolStart = Date.now()
      console.log(`[r${round}] Tool: ${toolCall.function.name}(${toolCall.function.arguments.slice(0, 120)})`)

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

      const durationMs = Date.now() - toolStart
      const timedOut = result.includes('timed out')

      traceTools.push({ name: toolCall.function.name, round, durationMs, resultChars: result.length, timedOut })

      // Collect full result for verify pass (verify already caps at 600 chars internally)
      if (INFO_TOOLS.has(toolCall.function.name)) {
        collectedToolResults.push(`[${toolCall.function.name}] ${result}`)
        infoToolUsed = true
      }

      // Cap result injected into context — prevents context drift across rounds.
      // The full result is in collectedToolResults for the verify pass.
      const contextResult = result.length > TOOL_OUTPUT_CAP
        ? result.slice(0, TOOL_OUTPUT_CAP) + `\n[...${result.length - TOOL_OUTPUT_CAP} chars omitted to keep context focused]`
        : result

      messages.push({
        role: 'tool',
        tool_call_id: toolCall.id,
        content: contextResult,
      })
    }
  }

  if (!finalDraft) {
    maxRoundsReached = true
    const fallback = await getOpenRouter().chat.completions.create({ model, messages })
    finalDraft = fallback.choices[0]?.message?.content ?? ''
  }

  let wasCorrected = false
  let hasEmptyResults = false
  let verifiedReply = finalDraft

  if (infoToolUsed && collectedToolResults.length > 0) {
    const domain = inferDomain(userText, collectedToolResults)
    hasEmptyResults = collectedToolResults.some(
      (r) =>
        r.includes('NO_KNOWLEDGE_RESULTS') ||
        r.includes('NO_DEVOTION_IN_DB') ||
        r.includes('No relevant information')
    )

    const verified = await verifyResponse(userText, collectedToolResults, finalDraft, model, domain)
    wasCorrected = verified !== finalDraft
    verifiedReply = verified

    // Domain-level quality signal (used by check-feedback-patterns.ts)
    logInteractionFeedback({
      domain,
      questionSummary: userText,
      hadEmptyResults: hasEmptyResults,
      verifyCorrected: wasCorrected,
      maxRoundsReached,
    }).catch(() => {})
  }

  // Full execution trace — every request, regardless of tools used
  logAgentTrace({
    traceId,
    phoneHash: phone ? hashPhone(phone) : 'anon',
    inputType: inputType ?? (imageBase64 ? 'image' : 'text'),
    roundsUsed,
    toolsCalled: traceTools,
    verifyCorrect: wasCorrected,
    hadEmptyResults: hasEmptyResults,
    finalReplyChars: verifiedReply.length,
    totalDurationMs: Date.now() - traceStart,
  }).catch(() => {})

  return verifiedReply
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
