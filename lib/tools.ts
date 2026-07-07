import OpenAI from 'openai'
import { searchKnowledge, getDevotion, type KnowledgeChunk } from './knowledge'
import { detectScriptureRequest, getVerse, type BibleTranslation } from './bible'

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
]

export async function executeToolCall(
  name: string,
  args: Record<string, any>
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
        return 'No relevant information found in the knowledge base for this question.'
      }
      return chunks
        .map((c) => (c.title ? `${c.title}: ${c.content}` : c.content))
        .join('\n---\n')
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
        return `No devotion found for ${date}. Let the user know and suggest they check phaneroo.org.`
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

    default:
      return `Unknown tool: ${name}`
  }
}
