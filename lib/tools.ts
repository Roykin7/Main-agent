import OpenAI from 'openai'
import { searchKnowledge, searchDiagnosisCases, getDevotion, type KnowledgeChunk, type DiagnosisCase } from './knowledge'
import { detectScriptureRequest, getVerse, type BibleTranslation } from './bible'
import { embed } from './embeddings'
import { getSupabase } from './supabase'
import { saveUserFact } from './user-profile'
import { sendNewConvertEmail, type NewConvertData } from './email'

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

function resolveDate(dateStr: string): string {
  const d = dateStr.toLowerCase().trim()
  if (d === 'today') return ugandaDate(0)
  if (d === 'yesterday') return ugandaDate(-1)
  if (d === 'tomorrow') return ugandaDate(1)
  return dateStr // assume YYYY-MM-DD
}

export const ZOE_TOOLS: OpenAI.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'search_knowledge',
      description:
        'Search the knowledge base for facts about coffee farming, agronomy, the coffee value chain, or Phaneroo Ministries. Also searches recent social media posts from Phaneroo. Call this for any factual question about either topic.',
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
        "Get the Phaneroo daily devotion for a specific date. Call when the user asks for today's devotion, yesterday's devotion, or a devotion for a specific date.",
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
        'Remember a personal fact about THIS specific user — their farm location, crop varieties, farm size, cooperative they belong to, challenges they face, or anything they want ZOE to remember about them personally across conversations. Different from store_knowledge, which stores general facts for everyone. Call this when a user shares something about themselves or explicitly asks you to remember something.',
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
        'Search past confirmed plant disease and pest diagnoses for similar symptom patterns. Call this alongside search_knowledge when a farmer describes plant problems — similar past cases help confirm or speed up diagnosis. Returns cases sorted by symptom similarity.',
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
        'Save a new fact to the knowledge base. Call this when a user shares specific, useful information about coffee farming/agronomy or Phaneroo Ministries that is not already in the knowledge base. Do NOT store questions, greetings, opinions, or personal details like names or phone numbers.',
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

      // Save to Supabase
      const { error: dbError } = await getSupabase().from('new_converts').insert({
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

      // Update phaneroo_notified flag
      if (emailSent) {
        await getSupabase()
          .from('new_converts')
          .update({ phaneroo_notified: true })
          .eq('phone', phone)
          .eq('first_name', firstName)
          .eq('last_name', lastName)
          .order('created_at', { ascending: false })
          .limit(1)
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

    case 'store_diagnosis_case': {
      const symptomDescription = (args.symptom_description as string)?.trim()
      const diagnosis = (args.diagnosis as string)?.trim()
      const treatment = (args.treatment as string)?.trim()

      if (!symptomDescription || !diagnosis || !treatment) return 'Noted.'

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
      })

      if (error) {
        console.error('store_diagnosis_case error:', error)
        return 'Noted.'
      }

      console.log(`Diagnosis case stored: ${diagnosis}`)
      return `Case saved: ${diagnosis}.`
    }

    case 'store_knowledge': {
      const topic = args.topic as 'coffee' | 'phaneroo'
      const title = (args.title as string).trim()
      const content = (args.content as string).trim()

      if (content.length < 20) {
        return 'Noted.'
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
      })

      if (error) {
        console.error('store_knowledge insert error:', error)
        return 'Noted.'
      }

      console.log(`Learned: [${topic}] "${title}"`)
      return `Stored "${title}" under ${topic} knowledge.`
    }

    default:
      return `Unknown tool: ${name}`
  }
}
