import OpenAI from 'openai'
import { searchKnowledge, searchDiagnosisCases, getDevotion, getCuratedDiseaseImage, type KnowledgeChunk, type DiagnosisCase } from './knowledge'
import { detectScriptureRequest, getVerse, type BibleTranslation } from './bible'
import { embed } from './embeddings'
import { getSupabase } from './supabase'
import { saveUserFact } from './user-profile'
import { sendNewConvertEmail, sendEscalationEmail, type NewConvertData } from './email'
import { sendImage, sendSlotList, sendConfirmButtons } from './whatsapp'
import { BOOKING_CONFIG, type BookingDomain } from './booking-config'
import {
  getAvailableSlots,
  findUpcomingAppointments,
  getAppointmentById,
  formatAppointmentTime,
} from './booking'
import {
  getPendingBooking,
  upsertPendingBooking,
  patchPendingBooking,
  clearPendingBooking,
} from './pending-booking'

function degreesToCompass(deg: number): string {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
  return dirs[Math.round(deg / 45) % 8]
}

async function apiNinjas(path: string): Promise<any> {
  const res = await fetch(`https://api.api-ninjas.com/v1/${path}`, {
    headers: { 'X-Api-Key': process.env.API_NINJAS_KEY! },
  })
  if (!res.ok) throw new Error(`API Ninjas ${res.status}`)
  return res.json()
}

// Uganda is UTC+3
function ugandaDate(offsetDays = 0): string {
  const ms = Date.now() + 3 * 3600_000 + offsetDays * 86400_000
  return new Date(ms).toISOString().split('T')[0]
}

// 0=Sunday..6=Saturday, in Africa/Kampala terms — matches ugandaDate's own offset.
function currentUgandaWeekday(): number {
  const ms = Date.now() + 3 * 3600_000
  return new Date(ms).getUTCDay()
}

const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

/**
 * Resolves common relative-date phrases deterministically in code instead
 * of trusting the model's own date arithmetic — confirmed via real-world
 * testing that even a grounded, correct "today's date" isn't enough for the
 * model to reliably compute something like "next week Sunday" (it resolved
 * to a Thursday). Anything not matched here falls through assuming the
 * caller already gives "YYYY-MM-DD".
 */
function resolveDate(dateStr: string): string {
  const d = dateStr.toLowerCase().trim()
  if (d === 'today') return ugandaDate(0)
  if (d === 'yesterday') return ugandaDate(-1)
  if (d === 'tomorrow') return ugandaDate(1)

  const todayWeekday = currentUgandaWeekday()

  // "next week <weekday>" — the target weekday within next week's Mon-Sun block
  const nextWeekMatch = d.match(/^next week (\w+)$/)
  if (nextWeekMatch) {
    const target = WEEKDAYS.indexOf(nextWeekMatch[1])
    if (target !== -1) {
      const daysUntilNextMonday = ((1 - todayWeekday + 7) % 7) || 7
      const fromMondayToTarget = (target - 1 + 7) % 7
      return ugandaDate(daysUntilNextMonday + fromMondayToTarget)
    }
  }

  // "next <weekday>" — skip the immediate upcoming occurrence, use the one a week later
  const nextMatch = d.match(/^next (\w+)$/)
  if (nextMatch) {
    const target = WEEKDAYS.indexOf(nextMatch[1])
    if (target !== -1) {
      const daysUntil = ((target - todayWeekday + 7) % 7) || 7
      return ugandaDate(daysUntil + 7)
    }
  }

  // "this <weekday>" — the nearest upcoming occurrence (today counts)
  const thisMatch = d.match(/^this (\w+)$/)
  if (thisMatch) {
    const target = WEEKDAYS.indexOf(thisMatch[1])
    if (target !== -1) return ugandaDate((target - todayWeekday + 7) % 7)
  }

  // bare "<weekday>" — nearest upcoming occurrence, not today
  const bareIndex = WEEKDAYS.indexOf(d)
  if (bareIndex !== -1) {
    return ugandaDate(((bareIndex - todayWeekday + 7) % 7) || 7)
  }

  if (d === 'next week') return ugandaDate(7)

  const inDaysMatch = d.match(/^in (\d+) days?$/)
  if (inDaysMatch) return ugandaDate(Number(inDaysMatch[1]))

  return dateStr // assume already "YYYY-MM-DD"
}

export const ZOE_TOOLS: OpenAI.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'search_knowledge',
      description:
        'Search the knowledge base for facts about coffee farming, agronomy, the coffee value chain, or Phaneroo Ministries teachings and social posts. For plant disease symptoms call this AND search_diagnosis_cases in the same round — they search different databases. For devotions by date, call get_devotion first; only fall back here if get_devotion returns NO_DEVOTION_IN_DB.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: "The user's question or the key concept to search for",
          },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_devotion',
      description:
        "Get the Phaneroo daily devotion for a specific date. ALWAYS call this first — before search_knowledge — when a specific devotion date is mentioned. Only fall back to search_knowledge if this returns NO_DEVOTION_IN_DB.",
      parameters: {
        type: 'object',
        properties: {
          date: {
            type: 'string',
            description:
              'The date to fetch. Use "today", "yesterday", "tomorrow", or a specific date in YYYY-MM-DD format.',
          },
        },
        required: ['date'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_bible_verse',
      description:
        'Fetch the exact text of a Bible verse or passage. Call when the user mentions a specific Bible reference like "John 3:16" or asks to look up a verse.',
      parameters: {
        type: 'object',
        properties: {
          reference: {
            type: 'string',
            description:
              'The Bible reference, e.g. "John 3:16", "Psalm 23:1-3", "1 Corinthians 13:4-7"',
          },
          translation: {
            type: 'string',
            enum: ['KJV', 'NKJV', 'AMP', 'MSG'],
            description: 'Bible translation. Defaults to KJV if the user did not specify one.',
          },
        },
        required: ['reference'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_weather',
      description:
        'Get current weather conditions for a city or town. Call this whenever weather is relevant to farming advice — before recommending spraying, harvesting, drying coffee, or assessing disease risk.',
      parameters: {
        type: 'object',
        properties: {
          city: {
            type: 'string',
            description: 'City or town name, e.g. "Kampala", "Mbale", "Mbarara", "Fort Portal"',
          },
        },
        required: ['city'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_commodity_price',
      description:
        'Get the latest international market price for an agricultural commodity. Use for coffee price context (Arabica or Robusta futures) or other commodities relevant to the farmer.',
      parameters: {
        type: 'object',
        properties: {
          commodity: {
            type: 'string',
            description:
              'Commodity name. Use "coffee" for Arabica Coffee C futures, "robusta coffee" for Robusta, "sugar" for sugar, etc.',
          },
        },
        required: ['commodity'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'web_search',
      description:
        'Search the web for current information not available in the knowledge base — breaking news about Uganda coffee markets, recent UCDA or MAAIF announcements, current disease outbreak alerts, live prices at Kampala markets, or any topic that needs up-to-date information. Use this when the knowledge base returns nothing useful or the question is clearly about recent/current events.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description:
              'Specific search query with context, e.g. "Uganda Arabica coffee farmgate price July 2026" or "Coffee Berry Disease outbreak Mt Elgon 2026" — not just a single keyword.',
          },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'remember_user_fact',
      description:
        'Remember a personal fact about THIS specific user only — their farm, location, crop type, cooperative, challenges, or anything personal they share. NOT for general knowledge. For facts useful to all users, use store_knowledge instead. Call this immediately when a user shares something about themselves or asks you to remember something.',
      parameters: {
        type: 'object',
        properties: {
          fact: {
            type: 'string',
            description:
              'The fact to remember about this user, as a clear third-person statement. E.g. "Grows Arabica coffee in Mbale at 1600m elevation" or "Member of Bugisu Cooperative Union" or "Has a 2-acre farm and struggles with CBD".',
          },
        },
        required: ['fact'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'register_new_convert',
      description:
        "Register someone who has just given their life to Christ. Call this after collecting their details conversationally — do NOT call it mid-conversation before you have the required fields. Saves their record to our database and sends a notification email to Phaneroo so they can follow up.",
      parameters: {
        type: 'object',
        properties: {
          first_name: {
            type: 'string',
            description: "Person's first name",
          },
          last_name: {
            type: 'string',
            description: "Person's last name / surname",
          },
          gender: {
            type: 'string',
            enum: ['Male', 'Female'],
            description: "Person's gender",
          },
          watching_from: {
            type: 'string',
            enum: ['online', 'physical'],
            description:
              'Where they received salvation — "online" for YouTube/Facebook, "physical" for attending a Phaneroo service in person',
          },
          city: {
            type: 'string',
            description: 'City or town they are in, e.g. "Kampala", "Mbale", "Mbarara"',
          },
          email: {
            type: 'string',
            description: "Person's email address (optional — only include if they provided it)",
          },
        },
        required: ['first_name', 'last_name', 'gender', 'watching_from'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_diagnosis_cases',
      description:
        'Search past confirmed plant diagnoses by symptom similarity. Call this ALONGSIDE search_knowledge in the same round for any plant problem — not instead of it. They search different databases and complement each other. Returns cases sorted by symptom match.',
      parameters: {
        type: 'object',
        properties: {
          symptoms: {
            type: 'string',
            description:
              'Description of what the farmer is seeing — which part of the plant is affected, what the symptoms look like (colour, pattern, spread), and how fast it is progressing.',
          },
        },
        required: ['symptoms'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'send_diagnosis_image',
      description:
        'Send the farmer a reference photo of a specific plant disease or pest, for visual comparison against what they are seeing. ONLY use this during an active diagnosis, after search_knowledge/search_diagnosis_cases — never for illustration, decoration, or general conversation, and never for Phaneroo/devotion content. Checks a curated, vetted photo library first; only falls back to a live web image search if nothing curated matches, and that fallback is clearly unverified. Call at most once per diagnosis, for the single most likely disease/pest.',
      parameters: {
        type: 'object',
        properties: {
          disease_or_pest: {
            type: 'string',
            description:
              'The specific disease or pest name to illustrate, e.g. "Coffee Berry Disease", "Coffee Leaf Rust", "Antestia bug", "Black Coffee Twig Borer".',
          },
        },
        required: ['disease_or_pest'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'store_diagnosis_case',
      description:
        "Save a confirmed plant diagnosis to the case memory. Call this after giving a confident diagnosis based on the farmer's description and search results. Only call when you are certain of the diagnosis — not when you are listing possibilities. This builds real-world case knowledge that helps future farmers with similar problems.",
      parameters: {
        type: 'object',
        properties: {
          symptom_description: {
            type: 'string',
            description: "What the farmer described — the exact symptoms they reported in their own words",
          },
          affected_part: {
            type: 'string',
            description: 'Which part of the plant: leaves, stem, berries, roots, or whole tree',
          },
          diagnosis: {
            type: 'string',
            description: 'The confirmed disease or pest, e.g. "Coffee Berry Disease (CBD)" or "Antestia bug infestation"',
          },
          treatment: {
            type: 'string',
            description: 'The recommended treatment — specific product, application rate, and timing if available',
          },
          crop_type: {
            type: 'string',
            enum: ['arabica', 'robusta'],
            description: 'Coffee type. Default arabica if unknown.',
          },
          region: {
            type: 'string',
            description: 'Farm region if the farmer mentioned it, e.g. "Mt Elgon", "Bugisu", "Western Uganda", "Rwenzori"',
          },
        },
        required: ['symptom_description', 'diagnosis', 'treatment'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'store_knowledge',
      description:
        'Save a verified fact to the shared knowledge base — useful to all users, not just this person. For personal user info (their farm, location), use remember_user_fact instead. Only store clear factual statements — not questions, opinions, instructions, or unverified claims. Content must relate to coffee agronomy or Phaneroo Ministries.',
      parameters: {
        type: 'object',
        properties: {
          topic: {
            type: 'string',
            enum: ['coffee', 'phaneroo'],
            description: 'Which domain this knowledge belongs to',
          },
          title: {
            type: 'string',
            description: 'A short descriptive title for this fact (5–10 words)',
          },
          content: {
            type: 'string',
            description:
              'The factual content as a clear, third-person statement. Strip any personal details (names, phone numbers, locations).',
          },
        },
        required: ['topic', 'title', 'content'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'escalate_to_human',
      description:
        "Flag this conversation for a real person to follow up — logs it durably and sends a notification email. Use for explicit requests to speak with a person, pastoral crises (grief, safety, self-harm, abuse — not just a hard question or sadness), or high-stakes/uncertain coffee emergencies (fast-spreading disease outbreak, suspected quarantine pest). Do NOT use for routine hand-offs like 'check with your cooperative' or 'see phaneroo.com for event times' — for those, just say so in your reply, no tool call needed. Always give your own best answer in the same reply; this complements your help, it doesn't replace it.",
      parameters: {
        type: 'object',
        properties: {
          reason: {
            type: 'string',
            enum: ['pastoral_crisis', 'coffee_emergency', 'human_handoff_request'],
            description: 'Why this needs a human',
          },
          summary: {
            type: 'string',
            description:
              'A short, third-person description of what is happening and why it needs a person — not a raw copy of the user message.',
          },
        },
        required: ['reason', 'summary'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'check_availability',
      description:
        "Sends the user a tappable list of open appointment slots for a service on a given date — ALWAYS call this before proposing any date/time, never invent availability. This SENDS the picker directly; do not also list the slots yourself in your reply, just tell the user you've sent some options and wait for their tap (they can also just type a time instead — handle that normally if they do). If the requested date has nothing open, this automatically finds and offers the next available date instead — the tool result tells you which date was actually used.",
      parameters: {
        type: 'object',
        properties: {
          domain: {
            type: 'string',
            enum: ['coffee', 'phaneroo'],
            description: 'Which kind of appointment',
          },
          service_name: {
            type: 'string',
            description: 'Exact service name from that domain\'s service list',
          },
          date: {
            type: 'string',
            description:
              'The day the user asked for, in their own words where possible — "today", "tomorrow", "sunday", "next monday", "this friday", "next week sunday", "in 3 days", or an exact "YYYY-MM-DD". Do NOT compute the calendar date yourself for relative phrases like "next week X" — pass the phrase through as-is; it is resolved deterministically in code, which is more reliable than your own date arithmetic.',
          },
        },
        required: ['domain', 'service_name', 'date'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'set_booking_details',
      description:
        "Records details for the booking currently in progress (there must be a picked slot first — from check_availability's picker or the user typing a time). Call this once per piece of information as you collect it conversationally, one thing at a time — do not ask for name, reason, and location all in one message. Once everything required is collected, this automatically sends the user a Confirm/Change card — do NOT tell the user the booking is confirmed yourself, only the confirmation card (and the user tapping it) does that.",
      parameters: {
        type: 'object',
        properties: {
          attendee_name: { type: 'string', description: "The person's full name" },
          reason: {
            type: 'string',
            description:
              'Why they need this appointment — for coffee, the problem/symptoms so the agronomist can prepare; for Phaneroo, the general topic if they choose to share (never pressure this).',
          },
          location: {
            type: 'string',
            description: 'Where the appointment happens — for coffee, the farm address/location. Not needed for Phaneroo.',
          },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'reschedule_appointment',
      description:
        "Starts rescheduling one of the user's upcoming appointments. Look up which appointment first via cancel_appointment's lookup behavior if the id isn't already known from context. After calling this, call check_availability next for the date the user wants — it sends a real slot picker for the reschedule (do not ask the user for a raw date/time yourself). Tapping a slot there sends its own Confirm/Change card — do not tell the user it's rescheduled yourself, only that card (and their tap) does that.",
      parameters: {
        type: 'object',
        properties: {
          appointment_id: { type: 'number', description: 'The appointment to reschedule' },
        },
        required: ['appointment_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'cancel_appointment',
      description:
        "Looks up and starts cancelling one of the user's upcoming appointments. Call with no appointment_id first to look up what they have — if there's more than one, ask which before cancelling. Once an id is given, sends a Yes/Keep it confirmation card — do not tell the user it's cancelled yourself, only the card (and their tap) does that. Never ask for their name or phone number — the system looks them up automatically from the conversation.",
      parameters: {
        type: 'object',
        properties: {
          appointment_id: {
            type: 'number',
            description:
              'The specific appointment id to cancel, once known. Omit on the first call to just look up existing appointments.',
          },
        },
        required: [],
      },
    },
  },
]

export async function executeToolCall(
  name: string,
  args: Record<string, any>,
  context?: { phone?: string }
): Promise<string> {
  switch (name) {
    case 'search_knowledge': {
      let chunks: KnowledgeChunk[]
      try {
        chunks = await searchKnowledge(args.query as string)
      } catch (err) {
        console.error('search_knowledge tool error:', err)
        return 'Knowledge base search failed — answer from general knowledge if you can, and be transparent about uncertainty.'
      }
      if (chunks.length === 0) {
        return `NO_KNOWLEDGE_RESULTS: No matching content found for "${args.query as string}". Try calling search_knowledge again with different keywords, or use web_search for current information.`
      }
      const quality = chunks.length >= 4 ? 'strong' : chunks.length >= 2 ? 'moderate' : 'limited'
      const header = `[Found: ${chunks.length} result${chunks.length === 1 ? '' : 's'}, ${quality} match]`
      return (
        header +
        '\n\n' +
        chunks.map((c) => (c.title ? `${c.title}: ${c.content}` : c.content)).join('\n---\n')
      )
    }

    case 'get_devotion': {
      const date = resolveDate(args.date as string)
      let devotion
      try {
        devotion = await getDevotion(date)
      } catch (err) {
        console.error('get_devotion tool error:', err)
        return `Could not fetch devotion for ${date}.`
      }
      if (!devotion) {
        return `NO_DEVOTION_IN_DB:${date} — not found in the structured devotions table. Try searching the knowledge base with search_knowledge for "Phaneroo devotion ${date}" or the topic the user mentioned — it may have come in via Facebook or other social posts.`
      }
      const [y, m, d] = date.split('-').map(Number)
      const displayDate = new Date(y, m - 1, d).toLocaleDateString('en-UG', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
      const header = [
        `Phaneroo Daily Devotion — ${displayDate}`,
        devotion.title ? `"${devotion.title}"` : null,
        devotion.scriptureRef ? `(${devotion.scriptureRef})` : null,
      ]
        .filter(Boolean)
        .join(' ')
      return `${header}\n\n${devotion.content}`
    }

    case 'get_bible_verse': {
      const reference = args.reference as string
      const translation = (args.translation ?? 'KJV') as BibleTranslation
      const parsed = detectScriptureRequest(reference)
      if (!parsed) {
        return `Could not parse the reference "${reference}". Try a format like "John 3:16" or "Psalm 23:1-3".`
      }
      let verse: string | null
      try {
        verse = await getVerse(parsed.passageId, translation)
      } catch (err) {
        console.error('get_bible_verse tool error:', err)
        return `Could not fetch ${reference}.`
      }
      if (!verse) {
        return `Could not fetch ${reference} in ${translation}. The Bible API may not be configured for this translation.`
      }
      return `${reference} (${translation}): ${verse}`
    }

    case 'get_weather': {
      const city = args.city as string
      let data: any
      try {
        data = await apiNinjas(`weather?city=${encodeURIComponent(city)}`)
      } catch {
        return `Could not get weather for ${city} right now.`
      }
      const wind = degreesToCompass(data.wind_degrees)
      const rainHint =
        data.cloud_pct > 70
          ? ' Heavy cloud cover — rain possible.'
          : data.cloud_pct > 40
          ? ' Partly cloudy.'
          : ' Clear skies.'
      return (
        `Current weather in ${city}: ${data.temp}°C (feels like ${data.feels_like}°C). ` +
        `Humidity ${data.humidity}%. Wind ${data.wind_speed} m/s ${wind}.` +
        `${rainHint} Today's range: ${data.min_temp}–${data.max_temp}°C.`
      )
    }

    case 'get_commodity_price': {
      const commodity = args.commodity as string
      let data: any
      try {
        data = await apiNinjas(`commodityprice?name=${encodeURIComponent(commodity)}`)
      } catch {
        return `Could not get price for ${commodity} right now.`
      }
      if (!data?.price) return `No price data found for "${commodity}".`
      const updated = new Date(data.updated * 1000).toLocaleDateString('en-UG', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
      return `${data.name}: ${data.price} ${data.currency} on ${data.exchange} (updated ${updated})`
    }

    case 'web_search': {
      const query = args.query as string
      const apiKey = process.env.TAVILY_API_KEY
      if (!apiKey) return 'Web search is not configured (missing TAVILY_API_KEY).'

      try {
        const res = await fetch('https://api.tavily.com/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            api_key: apiKey,
            query,
            search_depth: 'basic',
            max_results: 4,
            include_answer: false,
          }),
        })
        if (!res.ok) throw new Error(`Tavily ${res.status}`)
        const data = await res.json()
        const results: Array<{ title: string; content: string; url: string }> =
          data.results ?? []
        if (results.length === 0) return 'No web results found for that query.'
        return results
          .slice(0, 4)
          .map((r) => `${r.title}\n${r.content}`)
          .join('\n---\n')
      } catch (err) {
        console.error('web_search error:', err)
        return `Web search failed — answer from knowledge base instead.`
      }
    }

    case 'remember_user_fact': {
      const fact = (args.fact as string)?.trim()
      if (!fact || fact.length < 10) return 'Noted.'
      if (!context?.phone) return 'Noted.'

      // Block prompt injection attempts hidden as "facts to remember"
      const lowerFact = fact.toLowerCase()
      const injectionSignals = [
        'ignore previous', 'ignore your', 'system prompt', 'new instruction',
        'forget everything', 'act as', 'pretend to be', 'jailbreak', 'override',
        'disregard', 'you are now', 'from now on you',
      ]
      if (injectionSignals.some((s) => lowerFact.includes(s))) {
        console.warn(`remember_user_fact: injection attempt blocked [${context.phone}]: "${fact.slice(0, 80)}"`)
        return 'Noted.'
      }

      try {
        await saveUserFact(context.phone, fact)
        console.log(`User fact saved [${context.phone}]: "${fact}"`)
        return `Remembered: ${fact}`
      } catch (err) {
        console.error('remember_user_fact error:', err)
        return 'Noted.'
      }
    }

    case 'register_new_convert': {
      const firstName = (args.first_name as string)?.trim()
      const lastName = (args.last_name as string)?.trim()
      const gender = args.gender as 'Male' | 'Female'
      const watchingFrom = args.watching_from as 'online' | 'physical'
      const city = (args.city as string | undefined)?.trim() ?? ''
      const email = (args.email as string | undefined)?.trim()
      const phone = context?.phone ?? 'unknown'

      if (!firstName || !lastName || !gender || !watchingFrom) {
        return 'Missing required details — need first name, last name, gender, and where they were watching from.'
      }

      // Save to Supabase — select the id back so we can update phaneroo_notified by exact row
      const { data: insertData, error: dbError } = await getSupabase()
        .from('new_converts')
        .insert({
          phone,
          first_name: firstName,
          last_name: lastName,
          gender,
          city: city || null,
          email: email || null,
          watching_from: watchingFrom,
          consent: true,
          phaneroo_notified: false,
        })
        .select('id')
        .single()

      if (dbError) {
        console.error('register_new_convert db error:', dbError)
        return 'Could not save registration — please try again.'
      }

      // Send email to Phaneroo
      const convertData: NewConvertData = {
        firstName,
        lastName,
        phone,
        gender,
        city,
        email,
        watchingFrom,
        consent: true,
      }
      const emailSent = await sendNewConvertEmail(convertData)

      // Update phaneroo_notified by exact row id — safe even if same name registered twice
      if (emailSent && insertData?.id) {
        await getSupabase()
          .from('new_converts')
          .update({ phaneroo_notified: true })
          .eq('id', insertData.id)
      }

      console.log(`New convert registered: ${firstName} ${lastName} [${phone}] email_sent=${emailSent}`)
      return `Registered: ${firstName} ${lastName} saved to database and Phaneroo notified by email.`
    }

    case 'search_diagnosis_cases': {
      const symptoms = (args.symptoms as string)?.trim()
      if (!symptoms) return 'No symptoms provided.'
      let cases: DiagnosisCase[]
      try {
        cases = await searchDiagnosisCases(symptoms)
      } catch (err) {
        console.error('search_diagnosis_cases error:', err)
        return 'Could not search past diagnosis cases — continue with knowledge base results.'
      }
      if (cases.length === 0) {
        return 'No similar past cases found. Proceed with knowledge base results and your own assessment.'
      }
      return (
        `[${cases.length} similar past case(s) found]\n\n` +
        cases
          .map(
            (c, i) =>
              `Case ${i + 1}: ${c.diagnosis}${c.region ? ` — ${c.region}` : ''}` +
              `\nSymptoms: ${c.symptomDescription}` +
              (c.affectedPart ? `\nAffected: ${c.affectedPart}` : '') +
              `\nTreatment: ${c.treatment}`
          )
          .join('\n---\n')
      )
    }

    case 'send_diagnosis_image': {
      const query = (args.disease_or_pest as string)?.trim()
      if (!query) return 'No disease/pest name given — cannot look up a reference image.'
      if (!context?.phone) return 'Cannot send an image outside of a WhatsApp conversation.'

      // 1. Curated library first — vetted, accurate, no caveat needed.
      let curated: Awaited<ReturnType<typeof getCuratedDiseaseImage>> = null
      try {
        curated = await getCuratedDiseaseImage(query)
      } catch (err) {
        console.error('send_diagnosis_image curated lookup error:', err)
      }

      if (curated) {
        try {
          await sendImage(
            context.phone,
            curated.imageUrl,
            curated.caption ?? `${curated.diseaseName} — reference photo`
          )
        } catch (err) {
          console.error('send_diagnosis_image sendImage (curated) error:', err)
          return `Could not send the reference image for "${query}" — continue with a text description instead.`
        }
        return `Reference image sent (curated, source: ${curated.source ?? 'internal library'}): ${curated.diseaseName}. Do not describe it further — the farmer can see it.`
      }

      // 2. No vetted match — fall back to a live web image search, clearly caveated.
      const apiKey = process.env.TAVILY_API_KEY
      if (!apiKey) {
        return `No curated reference image available for "${query}", and web image search is not configured — continue with a text description only.`
      }

      try {
        const res = await fetch('https://api.tavily.com/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            api_key: apiKey,
            query: `${query} coffee plant disease symptoms photo`,
            search_depth: 'basic',
            max_results: 3,
            include_answer: false,
            include_images: true,
          }),
        })
        if (!res.ok) throw new Error(`Tavily ${res.status}`)
        const data = await res.json()
        const rawImages: any[] = data.images ?? []
        const imageUrl: string | undefined = rawImages
          .map((img) => (typeof img === 'string' ? img : img?.url))
          .find((url) => typeof url === 'string' && url.length > 0)

        if (!imageUrl) {
          return `No reference image found for "${query}" (curated library and web search both came up empty) — continue with a text description only.`
        }

        await sendImage(context.phone, imageUrl, `${query} — reference photo (unverified, from the web)`)
        return `Reference image sent (WEB-SOURCED, UNVERIFIED — not from our vetted library): ${query}. You must tell the farmer this photo is from the web and to confirm it matches what they're actually seeing before treating based on it.`
      } catch (err) {
        console.error('send_diagnosis_image web fallback error:', err)
        return `Could not find or send a reference image for "${query}" — continue with a text description only.`
      }
    }

    case 'store_diagnosis_case': {
      const symptomDescription = (args.symptom_description as string)?.trim()
      const diagnosis = (args.diagnosis as string)?.trim()
      const treatment = (args.treatment as string)?.trim()

      if (!symptomDescription || !diagnosis || !treatment) return 'Noted.'

      // Quality bar: vague entries teach future farmers wrong things
      if (symptomDescription.length < 20) {
        return 'Not stored — symptom description too brief. Include what the plant looks like and which part is affected.'
      }
      if (treatment.length < 15) {
        return 'Not stored — treatment too vague. Include a specific product, action, or application rate.'
      }

      const affectedPart = args.affected_part as string | undefined
      const cropType = (args.crop_type as string) ?? 'arabica'
      const region = args.region as string | undefined

      let embedding: number[]
      try {
        embedding = await embed(symptomDescription)
      } catch (err) {
        console.error('store_diagnosis_case embed error:', err)
        return 'Noted.'
      }

      // Skip if a very similar case already exists
      const { data: similar } = await getSupabase().rpc('match_diagnosis_cases', {
        query_embedding: embedding,
        match_count: 1,
      })
      if (similar?.[0]?.similarity > 0.90) {
        return 'Similar case already on record.'
      }

      const { error } = await getSupabase().from('diagnosis_cases').insert({
        symptom_description: symptomDescription,
        affected_part: affectedPart ?? null,
        diagnosis,
        treatment,
        crop_type: cropType,
        region: region ?? null,
        embedding,
        approved: false, // held for human review before it can surface as a "past case" for other farmers
      })

      if (error) {
        console.error('store_diagnosis_case error:', error)
        return 'Noted.'
      }

      console.log(`Diagnosis case stored (pending review): ${diagnosis}`)
      return `Case saved: ${diagnosis}. It's queued for review before it's used to help other farmers — do not tell the farmer this case is now confirmed KB or reference material for others.`
    }

    case 'store_knowledge': {
      const topic = args.topic as 'coffee' | 'phaneroo'
      const title = (args.title as string).trim()
      const content = (args.content as string).trim()

      if (content.length < 20) return 'Noted.'

      // Reject questions — only factual statements belong in the KB
      const lowerContent = content.toLowerCase()
      const firstWord = lowerContent.split(/\s+/)[0]
      if (
        content.endsWith('?') ||
        ['how', 'what', 'why', 'when', 'where', 'who', 'is', 'can', 'does', 'do', 'will', 'should'].includes(firstWord)
      ) {
        return 'Not stored — this looks like a question or instruction. Only verified factual statements are saved to the knowledge base.'
      }

      // Domain alignment: content must match the declared topic
      const coffeeSignals = ['coffee', 'arabica', 'robusta', 'farm', 'harvest', 'cherry', 'bean', 'cooperative', 'cbd', 'cwd', 'fertili', 'pruning', 'soil', 'shade', 'processing', 'export', 'ucda', 'crop', 'plant', 'pest', 'disease', 'spray', 'yield']
      const phanerooSignals = ['phaneroo', 'god', 'jesus', 'christ', 'holy', 'spirit', 'faith', 'grace', 'scripture', 'bible', 'verse', 'sermon', 'devotion', 'church', 'worship', 'prayer', 'salvation', 'gospel', 'apostle', 'healing', 'kingdom', 'lubega']

      if (topic === 'coffee' && !coffeeSignals.some((s) => lowerContent.includes(s))) {
        return 'Not stored — this content does not appear to be about coffee farming or the value chain.'
      }
      if (topic === 'phaneroo' && !phanerooSignals.some((s) => lowerContent.includes(s))) {
        return 'Not stored — this content does not appear to be about Phaneroo Ministries or the Bible.'
      }

      // Semantic duplicate check: skip if very similar content already exists
      let embedding: number[]
      try {
        embedding = await embed(content)
      } catch (err) {
        console.error('store_knowledge embed error:', err)
        // Don't surface embedding failures to the model — just acknowledge
        return 'Noted.'
      }

      const { data: similar } = await getSupabase().rpc('match_knowledge_chunks', {
        query_embedding: embedding,
        match_count: 1,
        filter_topic: topic,
      })

      if (similar?.[0]?.similarity > 0.92) {
        return 'Already have that in the knowledge base.'
      }

      const { error } = await getSupabase().from('knowledge_chunks').insert({
        topic,
        title,
        content,
        embedding,
        source: 'user-contributed',
        approved: false, // held for human review before it's served to other users via search_knowledge
      })

      if (error) {
        console.error('store_knowledge insert error:', error)
        return 'Noted.'
      }

      console.log(`Learned (pending review): [${topic}] "${title}"`)
      return `Stored "${title}" under ${topic} knowledge — queued for review before it's used to answer other users. Do not tell the user this is now confirmed, published knowledge.`
    }

    case 'escalate_to_human': {
      const reason = args.reason as 'pastoral_crisis' | 'coffee_emergency' | 'human_handoff_request'
      const summary = (args.summary as string)?.trim()
      const phone = context?.phone ?? 'unknown'

      if (!reason || !summary) return 'Missing reason or summary — cannot escalate.'

      const { data: insertData, error: dbError } = await getSupabase()
        .from('escalations')
        .insert({ phone, reason, summary, notified: false })
        .select('id')
        .single()

      if (dbError) {
        console.error('escalate_to_human db error:', dbError)
        return "Could not log the escalation due to a system error — apologize, give the direct hand-off info yourself (extension officer / chapter pastor), and suggest the user try again shortly. Do not claim a person has been notified."
      }

      const notified = await sendEscalationEmail({ phone, reason, summary })

      if (notified && insertData?.id) {
        await getSupabase().from('escalations').update({ notified: true }).eq('id', insertData.id)
      }

      console.log(`Escalation logged: ${reason} [${phone}] notified=${notified}`)

      if (notified) {
        return 'Escalated: logged and a person has been notified. Reassure the user that someone will follow up with them, after giving your own best answer first.'
      }
      return "Escalated: logged, but the notification email failed to send — do NOT tell the user a person has been notified. Apologize, give the direct hand-off info yourself (extension officer / chapter pastor), and suggest they try again shortly."
    }

    case 'check_availability': {
      const domain = args.domain as BookingDomain
      const serviceName = (args.service_name as string)?.trim()
      const dateStr = resolveDate(args.date as string)
      const phone = context?.phone

      if (!phone) return 'Cannot check availability outside of a WhatsApp conversation.'
      if (!domain || !BOOKING_CONFIG[domain]) return 'Invalid domain — must be "coffee" or "phaneroo".'

      const service = BOOKING_CONFIG[domain].services.find((s) => s.name === serviceName)
      if (!service) {
        const names = BOOKING_CONFIG[domain].services.map((s) => s.name).join(', ')
        return `Unknown service "${serviceName}" for ${domain}. Valid services: ${names}.`
      }

      // If there's an in-progress reschedule for this exact appointment/
      // service, this call is "pick a new time for it" — tag the generated
      // slot ids accordingly (see handleInteractive's slot: branch) so a
      // tap can never be misattributed to the wrong booking/reschedule, and
      // exclude the appointment's own current slot from counting as busy
      // against itself.
      const pending = await getPendingBooking(phone)
      const isReschedulePick =
        pending?.kind === 'reschedule' && pending.domain === domain && pending.serviceName === serviceName

      let excludeBookingUid: string | undefined
      if (isReschedulePick && pending!.targetAppointmentId) {
        const target = await getAppointmentById(pending!.targetAppointmentId, phone)
        excludeBookingUid = target?.calendarEventId ?? undefined
      }

      let slots, dateUsed
      try {
        ;({ slots, dateUsed } = await getAvailableSlots(domain, serviceName, dateStr, { excludeBookingUid }))
      } catch (err) {
        console.error('check_availability error:', err)
        return 'Could not check availability right now — try again in a moment.'
      }

      if (slots.length === 0) {
        return `No open slots for ${serviceName} in the next two weeks. Let the user know and suggest they check back later.`
      }

      // "|" as the field separator, not ":" — startsAt is an ISO timestamp
      // and would collide with a ":"-delimited split. The id's first segment
      // (before the first "|") is "book" or "reschedule:<appointmentId>" —
      // set here, deterministically, by whichever tool generated the picker.
      const idPrefix = isReschedulePick ? `reschedule:${pending!.targetAppointmentId}` : 'book'
      const rows = slots.map((s) => ({
        id: `slot:${idPrefix}|${domain}|${serviceName}|${s.startsAt.toISOString()}`,
        title: s.label,
      }))

      try {
        await sendSlotList(phone, `Available times for ${serviceName}:`, rows)
      } catch (err) {
        console.error('check_availability sendSlotList error:', err)
        return (
          `Available slots for ${serviceName} on ${dateUsed}:\n` +
          slots.map((s) => `- ${s.label}`).join('\n') +
          '\n(Could not send an interactive picker — list these to the user as text instead, this one time.)'
        )
      }

      const dateNote =
        dateUsed === dateStr ? '' : ` (nothing was open on ${dateStr} — these are for the next available date, ${dateUsed})`
      return `Sent an interactive slot picker with ${slots.length} option(s)${dateNote} — do not list the slots yourself, just briefly tell the user you've sent some options. They may tap one or just type a time; either way, wait for their reply.`
    }

    case 'set_booking_details': {
      const phone = context?.phone
      if (!phone) return 'Cannot manage a booking outside of a WhatsApp conversation.'

      const pending = await getPendingBooking(phone)
      if (!pending) return 'No booking in progress — the user needs to pick a slot first via check_availability.'

      const attendeeName = (args.attendee_name as string | undefined)?.trim()
      const reason = (args.reason as string | undefined)?.trim()
      const location = (args.location as string | undefined)?.trim()

      await patchPendingBooking(phone, {
        ...(attendeeName ? { attendeeName } : {}),
        ...(reason ? { reason } : {}),
        ...(location ? { location } : {}),
      })

      const merged = {
        attendeeName: attendeeName || pending.attendeeName,
        reason: reason || pending.reason,
        location: location || pending.location,
      }

      const config = BOOKING_CONFIG[pending.domain]
      const missing: string[] = []
      if (!merged.attendeeName) missing.push('their full name')
      if (config.reasonRequired && !merged.reason) missing.push('the reason for the visit')
      if (config.requiresLocation && !merged.location) missing.push('the farm location')

      if (missing.length > 0) {
        return `Saved. Still need: ${missing[0]}. Ask for just that one thing next — never ask for more than one at a time.`
      }

      const recapLines = [
        'Confirm this booking?',
        config.label,
        pending.serviceName,
        formatAppointmentTime(pending.startsAt),
        `Name: ${merged.attendeeName}`,
      ]
      if (merged.location) recapLines.push(`Location: ${merged.location}`)
      if (merged.reason) recapLines.push(`Reason: ${merged.reason}`)

      try {
        await sendConfirmButtons(phone, recapLines.join('\n'), [
          { id: 'confirm_booking', title: 'Confirm' },
          { id: 'change_booking', title: 'Change' },
        ])
      } catch (err) {
        console.error('set_booking_details sendConfirmButtons error:', err)
        return 'Everything is collected, but the confirmation card could not be sent — tell the user to try again shortly.'
      }

      return 'All details collected — sent a Confirm/Change card. Do NOT say the booking is confirmed yourself; only the user tapping Confirm does that.'
    }

    case 'reschedule_appointment': {
      const phone = context?.phone
      if (!phone) return 'Cannot manage appointments outside of a WhatsApp conversation.'

      const appointmentId = args.appointment_id as number
      if (!appointmentId) return 'Missing appointment_id — look it up first if not already known.'

      const existing = await getAppointmentById(appointmentId, phone)
      if (!existing) return 'That appointment was not found for this number.'

      // Stages the reschedule with its OWN current time as a placeholder —
      // check_availability's slot: tap will overwrite starts_at/ends_at with
      // the real new time once the user picks one. Carries forward name/
      // reason/location so nothing needs re-asking.
      await upsertPendingBooking({
        phone,
        kind: 'reschedule',
        targetAppointmentId: appointmentId,
        domain: existing.domain,
        serviceName: existing.serviceName,
        startsAt: new Date(existing.startsAt),
        endsAt: new Date(existing.endsAt),
        attendeeName: existing.attendeeName,
        reason: existing.reason,
        location: existing.location,
      })

      return `Found appointment #${existing.id} — ${existing.serviceName} on ${formatAppointmentTime(existing.startsAt)}. Now call check_availability for the new date the user wants — it will offer real slots for this reschedule (this appointment's own current time won't count as busy against itself). Do NOT ask for date/time yourself first; let check_availability's picker handle it.`
    }

    case 'cancel_appointment': {
      const phone = context?.phone
      if (!phone) return 'Cannot manage appointments outside of a WhatsApp conversation.'

      const appointmentId = args.appointment_id as number | undefined

      if (!appointmentId) {
        let upcoming
        try {
          upcoming = await findUpcomingAppointments(phone)
        } catch (err) {
          console.error('cancel_appointment lookup error:', err)
          return 'Could not look up appointments right now — try again in a moment.'
        }
        if (upcoming.length === 0) return 'No upcoming appointments found for this number.'
        if (upcoming.length === 1) {
          const a = upcoming[0]
          return `One upcoming appointment: #${a.id} — ${a.serviceName} on ${formatAppointmentTime(a.startsAt)}. Confirm with the user this is the one before cancelling, then call cancel_appointment again with this appointment_id.`
        }
        return (
          'Multiple upcoming appointments:\n' +
          upcoming.map((a) => `#${a.id} — ${a.serviceName} on ${formatAppointmentTime(a.startsAt)}`).join('\n') +
          '\nAsk the user which one to cancel, then call cancel_appointment again with that appointment_id.'
        )
      }

      const existing = await getAppointmentById(appointmentId, phone)
      if (!existing) return 'That appointment was not found for this number, or was already cancelled.'

      try {
        await sendConfirmButtons(
          phone,
          `Cancel this appointment?\n${existing.serviceName} on ${formatAppointmentTime(existing.startsAt)}`,
          [
            { id: `confirm_cancel:${existing.id}`, title: 'Yes, cancel' },
            { id: 'keep_appointment', title: 'Keep it' },
          ]
        )
      } catch (err) {
        console.error('cancel_appointment sendConfirmButtons error:', err)
        return 'Could not send the confirmation card — tell the user to try again shortly.'
      }

      return 'Sent a Yes/Keep-it card. Do NOT say it is cancelled yourself; only the user tapping Yes does that.'
    }

    default:
      return `Unknown tool: ${name}`
  }
}
