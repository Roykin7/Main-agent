import { NextRequest, NextResponse } from 'next/server'
import {
  verifySignature,
  parseIncomingMessage,
  downloadMedia,
  sendLongText,
  sendReadReceipt,
} from '@/lib/whatsapp'
import { transcribeAudio } from '@/lib/audio'
import { chat } from '@/lib/gemini'
import {
  getConversationContext,
  saveMessage,
  maybeUpdateSummary,
  isMessageAlreadyProcessed,
} from '@/lib/messages'
import { loadUserProfile } from '@/lib/user-profile'
import { withTimeout } from '@/lib/timeout'
import { checkRateLimit } from '@/lib/rate-limit'
import { acquirePhoneLock, releasePhoneLock } from '@/lib/phone-lock'
import {
  bookAppointment,
  rescheduleAppointment,
  cancelAppointmentById,
  formatAppointmentTime,
} from '@/lib/booking'
import { getPendingBooking, upsertPendingBooking, clearPendingBooking } from '@/lib/pending-booking'
import { BOOKING_CONFIG, type BookingDomain } from '@/lib/booking-config'

// Hard ceiling for this function on Vercel. Keep the internal timeouts below
// comfortably under this so there's always time left to send a reply before
// Vercel kills the function outright (a hard kill means NO reply at all,
// not even the fallback — worse than any of the internal timeouts firing).
export const maxDuration = 60

const MEDIA_DOWNLOAD_TIMEOUT_MS = 10_000
const AUDIO_TRANSCRIBE_TIMEOUT_MS = 15_000
const CHAT_TIMEOUT_MS = 30_000

// Types that have no useful content for ZOE to process
const UNSUPPORTED_REPLIES: Record<string, string> = {
  video:    "I can't watch videos yet — type your question and I'll help you right away.",
  document: "I can't read documents yet — copy and paste the key info as text and I'll work with it.",
  sticker:  '',    // silently ignore
  unsupported: '', // silently ignore
}

const FALLBACK_REPLY = "Sorry, something went wrong on my end — please try again in a moment."
const AUDIO_FALLBACK  = "I couldn't make out that voice note — could you type your question? I'm right here!"
const STILL_PROCESSING_REPLY = "Still replying to your last message — give me a moment."
const RATE_LIMIT_REPLIES = {
  burst: "You're sending messages a bit fast for me to keep up — give me a minute and try again.",
  daily: "You've reached today's message limit with me — please try again tomorrow. For anything urgent, reach out to your local extension officer.",
}

type InteractiveOutcome =
  | { kind: 'direct_reply'; reply: string }
  | { kind: 'continue'; syntheticText: string }
  | { kind: 'passthrough' }

/**
 * Handles a tapped WhatsApp list row / button deterministically — these are
 * the two moments (which slot was picked, whether a booking write actually
 * happens) that must not depend on the model re-parsing free text. Anything
 * unrecognized falls through to the normal AI pipeline unchanged.
 */
async function handleInteractive(interactiveId: string, from: string): Promise<InteractiveOutcome> {
  if (interactiveId.startsWith('slot:')) {
    // "book|domain|service|iso" or "reschedule:<appointmentId>|domain|service|iso"
    // — the kind/target is set deterministically by whichever tool generated
    // this picker (check_availability), never inferred from ambient draft
    // state. This is what stops a stale reschedule draft from silently
    // hijacking an unrelated fresh booking (or vice versa).
    const rest = interactiveId.slice('slot:'.length)
    const firstPipe = rest.indexOf('|')
    if (firstPipe === -1) return { kind: 'passthrough' }
    const kindPart = rest.slice(0, firstPipe)
    const parts = rest.slice(firstPipe + 1).split('|')
    if (parts.length !== 3) return { kind: 'passthrough' }
    const [domain, serviceName, iso] = parts as [BookingDomain, string, string]

    let kind: 'book' | 'reschedule'
    let targetAppointmentId: number | null = null
    if (kindPart === 'book') {
      kind = 'book'
    } else if (kindPart.startsWith('reschedule:')) {
      kind = 'reschedule'
      targetAppointmentId = Number(kindPart.slice('reschedule:'.length))
      if (!Number.isFinite(targetAppointmentId)) return { kind: 'passthrough' }
    } else {
      return { kind: 'passthrough' }
    }

    const startsAt = new Date(iso)
    const config = BOOKING_CONFIG[domain]
    const service = config?.services.find((s) => s.name === serviceName)
    if (!config || !service || isNaN(startsAt.getTime())) return { kind: 'passthrough' }

    const endsAt = new Date(startsAt.getTime() + service.durationMinutes * 60_000)

    // Only carry forward name/reason/location when the existing draft is
    // for the SAME kind/target — this tap's own kind always wins otherwise.
    const existing = await getPendingBooking(from)
    const sameDraft =
      existing?.kind === kind && (kind === 'book' || existing?.targetAppointmentId === targetAppointmentId)

    await upsertPendingBooking({
      phone: from,
      kind,
      targetAppointmentId,
      domain,
      serviceName,
      startsAt,
      endsAt,
      attendeeName: sameDraft ? existing!.attendeeName : null,
      reason: sameDraft ? existing!.reason : null,
      location: sameDraft ? existing!.location : null,
    })

    return {
      kind: 'continue',
      syntheticText: `I'd like the ${formatAppointmentTime(startsAt.toISOString())} slot for ${serviceName}.`,
    }
  }

  if (interactiveId === 'confirm_booking') {
    const pending = await getPendingBooking(from)
    if (!pending) {
      return { kind: 'direct_reply', reply: "That booking isn't pending anymore — let's start again, what would you like to book?" }
    }

    if (pending.kind === 'book') {
      if (!pending.attendeeName) {
        return { kind: 'direct_reply', reply: "I'm still missing your name for this booking — what's your full name?" }
      }
      const result = await bookAppointment({
        domain: pending.domain,
        serviceName: pending.serviceName,
        startsAt: new Date(pending.startsAt),
        phone: from,
        attendeeName: pending.attendeeName,
        reason: pending.reason,
        location: pending.location,
      })
      await clearPendingBooking(from)

      if (!result.ok) {
        if (result.reason === 'slot_taken') {
          return { kind: 'direct_reply', reply: 'Sorry, that slot was just taken by someone else — message me again to pick another time.' }
        }
        return { kind: 'direct_reply', reply: 'Something went wrong saving your booking — please try again shortly.' }
      }
      const pdfNote = result.pdfDelivered ? ' A PDF confirmation is on its way.' : ''
      return {
        kind: 'direct_reply',
        reply: `Booked! ${pending.serviceName} on ${formatAppointmentTime(pending.startsAt)}.${pdfNote}`,
      }
    }

    // kind === 'reschedule'
    if (!pending.targetAppointmentId) {
      await clearPendingBooking(from)
      return { kind: 'direct_reply', reply: "Something's off with this reschedule — let's start again." }
    }
    const result = await rescheduleAppointment(
      pending.targetAppointmentId,
      from,
      new Date(pending.startsAt),
      new Date(pending.endsAt)
    )
    await clearPendingBooking(from)

    if (!result.ok) {
      if (result.reason === 'slot_taken') {
        return { kind: 'direct_reply', reply: 'That new slot was just taken — message me again to pick another time.' }
      }
      if (result.reason === 'not_found') {
        return { kind: 'direct_reply', reply: "Couldn't find that appointment anymore." }
      }
      return { kind: 'direct_reply', reply: 'Something went wrong rescheduling — please try again shortly.' }
    }
    return { kind: 'direct_reply', reply: `Rescheduled to ${formatAppointmentTime(pending.startsAt)}.` }
  }

  if (interactiveId === 'change_booking') {
    await clearPendingBooking(from)
    return { kind: 'direct_reply', reply: 'No problem — what would you like to change?' }
  }

  if (interactiveId.startsWith('confirm_cancel:')) {
    const id = Number(interactiveId.slice('confirm_cancel:'.length))
    if (!Number.isFinite(id)) return { kind: 'passthrough' }
    const result = await cancelAppointmentById(id, from)
    return { kind: 'direct_reply', reply: result.ok ? 'Cancelled.' : "Couldn't cancel that — it may already be cancelled." }
  }

  if (interactiveId === 'keep_appointment') {
    return { kind: 'direct_reply', reply: 'Okay, keeping it.' }
  }

  return { kind: 'passthrough' }
}

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams
  const mode      = searchParams.get('hub.mode')
  const token     = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 })
  }
  return new NextResponse('Forbidden', { status: 403 })
}

export async function POST(req: NextRequest) {
  const rawBody  = await req.text()
  const signature = req.headers.get('x-hub-signature-256')

  if (!verifySignature(rawBody, signature)) {
    return new NextResponse('Invalid signature', { status: 401 })
  }

  const payload  = JSON.parse(rawBody)
  const incoming = parseIncomingMessage(payload)

  // Non-message events (delivery receipts, read acks, etc.)
  if (!incoming) return NextResponse.json({ ok: true })

  const { from, text, mediaId, messageId, type } = incoming

  // Hard-unsupported types: reply warmly or ignore silently
  if (type in UNSUPPORTED_REPLIES) {
    const reply = UNSUPPORTED_REPLIES[type]
    if (reply) await sendLongText(from, reply).catch(() => {})
    return NextResponse.json({ ok: true })
  }

  // Dedup: Meta sometimes delivers the same webhook twice
  if (messageId && await isMessageAlreadyProcessed(messageId)) {
    console.log('Duplicate webhook ignored:', messageId)
    return NextResponse.json({ ok: true })
  }

  // Blue ticks immediately — user sees ZOE received the message while it thinks
  if (messageId) sendReadReceipt(messageId).catch(() => {})

  const rateLimit = await checkRateLimit(from)
  if (rateLimit.limited) {
    console.log(`Rate limited (${rateLimit.reason}):`, from)
    await sendLongText(from, RATE_LIMIT_REPLIES[rateLimit.reason]).catch(() => {})
    return NextResponse.json({ ok: true })
  }

  // Per-phone mutex: stops two near-simultaneous deliveries for the same
  // number (e.g. a user re-sending before ZOE has replied) from racing two
  // concurrent invocations through the same conversation history.
  if (!(await acquirePhoneLock(from))) {
    console.log('Phone locked, still processing a prior message:', from)
    await sendLongText(from, STILL_PROCESSING_REPLY).catch(() => {})
    return NextResponse.json({ ok: true })
  }

  try {
    console.log(`[${type}] from ${from}`)

    let userText = text

    // A tapped list row / button — the two moments (which slot, whether a
    // booking write happens) that must not depend on the model re-parsing
    // free text. See handleInteractive for the full branch.
    if (incoming.interactiveId) {
      const outcome = await handleInteractive(incoming.interactiveId, from)
      if (outcome.kind === 'direct_reply') {
        await saveMessage(from, 'user', text || '[interactive reply]', messageId)
        await sendLongText(from, outcome.reply)
        await saveMessage(from, 'model', outcome.reply)
        console.log('Done (deterministic reply)')
        return NextResponse.json({ ok: true })
      }
      if (outcome.kind === 'continue') {
        userText = outcome.syntheticText
      }
      // 'passthrough' — fall through with the original text unchanged
    }

    const [{ summary, messages: history, totalCount }, userProfile] = await Promise.all([
      getConversationContext(from),
      loadUserProfile(from),
    ])

    let imageBase64: string | undefined
    let imageMimeType: string | undefined

    // ── Audio: transcribe via Groq Whisper ───────────────────────────────────
    if (type === 'audio') {
      if (!mediaId) {
        await sendLongText(from, AUDIO_FALLBACK).catch(() => {})
        return NextResponse.json({ ok: true })
      }
      const media = await withTimeout(downloadMedia(mediaId), MEDIA_DOWNLOAD_TIMEOUT_MS, null)
      if (!media) {
        await sendLongText(from, AUDIO_FALLBACK).catch(() => {})
        return NextResponse.json({ ok: true })
      }
      const transcript = await withTimeout(
        transcribeAudio(media.base64, media.mimeType),
        AUDIO_TRANSCRIBE_TIMEOUT_MS,
        null
      )
      if (!transcript) {
        await sendLongText(from, AUDIO_FALLBACK).catch(() => {})
        return NextResponse.json({ ok: true })
      }
      userText = transcript
      console.log('Transcribed audio:', transcript.slice(0, 100))
    }

    // ── Image: download for vision model ────────────────────────────────────
    if (type === 'image' && mediaId) {
      const media = await withTimeout(downloadMedia(mediaId), MEDIA_DOWNLOAD_TIMEOUT_MS, null)
      if (media) {
        imageBase64  = media.base64
        imageMimeType = media.mimeType
        console.log('Image downloaded:', imageMimeType, imageBase64.length, 'b64 chars')
      }
    }

    // ── Location: text is already set by parseIncomingMessage ───────────────
    // type === 'location' falls through here with userText set to the location string.
    // ZOE's system prompt instructs it to call get_weather when location is relevant.

    const messageText = userText || (imageBase64 ? '[image]' : '[message]')
    await saveMessage(from, 'user', messageText, messageId)
    console.log('Saved user message')

    const reply = await withTimeout(
      chat(history, userText, summary, from, userProfile, imageBase64, imageMimeType, type),
      CHAT_TIMEOUT_MS,
      null
    )
    console.log('Reply:', reply?.slice(0, 80))

    const safeReply = reply?.trim() || FALLBACK_REPLY
    await sendLongText(from, safeReply)

    await saveMessage(from, 'model', safeReply)
    await maybeUpdateSummary(from, totalCount)
    console.log('Done')
  } catch (err) {
    console.error('ZOE error:', err)
    sendLongText(from, FALLBACK_REPLY).catch(() => {})
  } finally {
    await releasePhoneLock(from)
  }

  return NextResponse.json({ ok: true })
}
