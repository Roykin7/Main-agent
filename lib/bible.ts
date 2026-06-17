/**
 * Bible verse lookups via API.Bible (scripture.api.bible).
 *
 * Requires BIBLE_API_KEY plus a bible ID per translation (BIBLE_ID_KJV,
 * BIBLE_ID_NKJV, BIBLE_ID_AMP, BIBLE_ID_MSG) - see README for how to get
 * these. If they're not configured, getVerse() simply returns null and ZOE
 * carries on without quoting a verse.
 */

export type BibleTranslation = 'KJV' | 'NKJV' | 'AMP' | 'MSG'

const BOOK_CODES: Record<string, string> = {
  genesis: 'GEN', gen: 'GEN',
  exodus: 'EXO', exo: 'EXO', ex: 'EXO',
  leviticus: 'LEV', lev: 'LEV',
  numbers: 'NUM', num: 'NUM',
  deuteronomy: 'DEU', deut: 'DEU', deu: 'DEU',
  joshua: 'JOS', josh: 'JOS', jos: 'JOS',
  judges: 'JDG', judg: 'JDG', jdg: 'JDG',
  ruth: 'RUT', rut: 'RUT',
  '1samuel': '1SA', '1sam': '1SA', '1sa': '1SA',
  '2samuel': '2SA', '2sam': '2SA', '2sa': '2SA',
  '1kings': '1KI', '1kgs': '1KI', '1ki': '1KI',
  '2kings': '2KI', '2kgs': '2KI', '2ki': '2KI',
  '1chronicles': '1CH', '1chron': '1CH', '1chr': '1CH', '1ch': '1CH',
  '2chronicles': '2CH', '2chron': '2CH', '2chr': '2CH', '2ch': '2CH',
  ezra: 'EZR', ezr: 'EZR',
  nehemiah: 'NEH', neh: 'NEH',
  esther: 'EST', esth: 'EST', est: 'EST',
  job: 'JOB',
  psalms: 'PSA', psalm: 'PSA', pslm: 'PSA', ps: 'PSA', psa: 'PSA',
  proverbs: 'PRO', prov: 'PRO', pro: 'PRO',
  ecclesiastes: 'ECC', eccles: 'ECC', eccl: 'ECC', ecc: 'ECC',
  songofsolomon: 'SNG', songofsongs: 'SNG', song: 'SNG', sos: 'SNG', canticles: 'SNG',
  isaiah: 'ISA', isa: 'ISA',
  jeremiah: 'JER', jer: 'JER',
  lamentations: 'LAM', lam: 'LAM',
  ezekiel: 'EZK', ezek: 'EZK', eze: 'EZK',
  daniel: 'DAN', dan: 'DAN',
  hosea: 'HOS', hos: 'HOS',
  joel: 'JOL', jol: 'JOL',
  amos: 'AMO', amo: 'AMO',
  obadiah: 'OBA', obad: 'OBA', oba: 'OBA',
  jonah: 'JON', jon: 'JON',
  micah: 'MIC', mic: 'MIC',
  nahum: 'NAM', nah: 'NAM', nam: 'NAM',
  habakkuk: 'HAB', hab: 'HAB',
  zephaniah: 'ZEP', zeph: 'ZEP', zep: 'ZEP',
  haggai: 'HAG', hag: 'HAG',
  zechariah: 'ZEC', zech: 'ZEC', zec: 'ZEC',
  malachi: 'MAL', mal: 'MAL',
  matthew: 'MAT', matt: 'MAT', mat: 'MAT',
  mark: 'MRK', mrk: 'MRK', mar: 'MRK',
  luke: 'LUK', luk: 'LUK',
  john: 'JHN', jhn: 'JHN', jn: 'JHN',
  acts: 'ACT', act: 'ACT',
  romans: 'ROM', rom: 'ROM',
  '1corinthians': '1CO', '1cor': '1CO', '1co': '1CO',
  '2corinthians': '2CO', '2cor': '2CO', '2co': '2CO',
  galatians: 'GAL', gal: 'GAL',
  ephesians: 'EPH', eph: 'EPH',
  philippians: 'PHP', phil: 'PHP', php: 'PHP',
  colossians: 'COL', col: 'COL',
  '1thessalonians': '1TH', '1thess': '1TH', '1th': '1TH',
  '2thessalonians': '2TH', '2thess': '2TH', '2th': '2TH',
  '1timothy': '1TI', '1tim': '1TI', '1ti': '1TI',
  '2timothy': '2TI', '2tim': '2TI', '2ti': '2TI',
  titus: 'TIT', tit: 'TIT',
  philemon: 'PHM', philem: 'PHM', phm: 'PHM',
  hebrews: 'HEB', heb: 'HEB',
  james: 'JAS', jas: 'JAS',
  '1peter': '1PE', '1pet': '1PE', '1pe': '1PE',
  '2peter': '2PE', '2pet': '2PE', '2pe': '2PE',
  '1john': '1JN', '1jn': '1JN', '1jo': '1JN',
  '2john': '2JN', '2jn': '2JN', '2jo': '2JN',
  '3john': '3JN', '3jn': '3JN', '3jo': '3JN',
  jude: 'JUD', jud: 'JUD',
  revelation: 'REV', revelations: 'REV', rev: 'REV',
}

const TRANSLATION_KEYWORDS: Record<string, BibleTranslation> = {
  'new king james': 'NKJV',
  nkjv: 'NKJV',
  amplified: 'AMP',
  amp: 'AMP',
  message: 'MSG',
  msg: 'MSG',
  'king james': 'KJV',
  kjv: 'KJV',
}

const BIBLE_IDS: Record<BibleTranslation, string | undefined> = {
  KJV: process.env.BIBLE_ID_KJV,
  NKJV: process.env.BIBLE_ID_NKJV,
  AMP: process.env.BIBLE_ID_AMP,
  MSG: process.env.BIBLE_ID_MSG,
}

const REFERENCE_PATTERN = /((?:[1-3]\s?)?[A-Za-z]+)\.?\s+(\d{1,3}(?::\d{1,3}(?:[-–]\d{1,3})?)?)/g

/** Converts e.g. "John 3:16" or "1 Cor 13:4-7" into an API.Bible passage ID like "JHN.3.16" or "1CO.13.4-1CO.13.7". */
function toPassageId(book: string, chapter: string, verseStart?: string, verseEnd?: string): string | null {
  const bookCode = BOOK_CODES[book.toLowerCase().replace(/[\s.]/g, '')]
  if (!bookCode) return null
  if (!verseStart) return `${bookCode}.${chapter}`
  if (!verseEnd) return `${bookCode}.${chapter}.${verseStart}`
  return `${bookCode}.${chapter}.${verseStart}-${bookCode}.${chapter}.${verseEnd}`
}

export type ScriptureRequest = { reference: string; passageId: string; translation: BibleTranslation }

/** Looks for a Bible reference (and optionally a translation name) in free text. */
export function detectScriptureRequest(text: string): ScriptureRequest | null {
  for (const match of text.matchAll(REFERENCE_PATTERN)) {
    const [whole, book, rest] = match
    const [chapter, verses] = rest.split(':')
    const [verseStart, verseEnd] = (verses ?? '').split(/[-–]/)
    const passageId = toPassageId(book, chapter, verseStart || undefined, verseEnd || undefined)
    if (!passageId) continue

    let translation: BibleTranslation = 'KJV'
    const lowerText = text.toLowerCase()
    for (const [keyword, t] of Object.entries(TRANSLATION_KEYWORDS)) {
      if (lowerText.includes(keyword)) {
        translation = t
        break
      }
    }

    return { reference: whole.trim(), passageId, translation }
  }
  return null
}

/** Fetches the text of a passage in the given translation. Returns null if not configured or not found. */
export async function getVerse(passageId: string, translation: BibleTranslation): Promise<string | null> {
  const apiKey = process.env.BIBLE_API_KEY
  const bibleId = BIBLE_IDS[translation]
  if (!apiKey || !bibleId) return null

  const url =
    `https://api.scripture.api.bible/v1/bibles/${bibleId}/passages/${passageId}` +
    `?content-type=text&include-notes=false&include-titles=false&include-chapter-numbers=false&include-verse-numbers=true`

  const res = await fetch(url, { headers: { 'api-key': apiKey } })
  if (!res.ok) return null

  const data = await res.json()
  const text = data?.data?.content as string | undefined
  if (!text) return null

  return text.replace(/\s+/g, ' ').trim()
}
