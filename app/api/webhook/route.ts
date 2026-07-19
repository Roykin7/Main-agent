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

// Types that have no useful content for ZOE to process
const UNSUPPORTED_REPLIES: Record<string, string> = {
  video:    "I can't watch videos yet — type your question and I'll help you right away.",
  document: "I can't read documents yet — copy and paste the key info as text and I'll work with it.",
  sticker:  '',    // silently ignore
  unsupported: '', // silently ignore
}

const FALLBACK_REPLY = "Sorry, something went wrong on my end — please try again in a moment."
const AUDIO_FALLBACK  = "I couldn't make out that voice note — could you type your question? I'm right here!"

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

  try {
    console.log(`[${type}] from ${from}`)
    const [{ summary, messages: history, totalCount }, userProfile] = await Promise.all([
      getConversationContext(from),
      loadUserProfile(from),
    ])

    let userText = text
    let imageBase64: string | undefined
    let imageMimeType: string | undefined

    // ── Audio: transcribe via Groq Whisper ───────────────────────────────────
    if (type === 'audio') {
      if (!mediaId) {
        await sendLongText(from, AUDIO_FALLBACK).catch(() => {})
        return NextResponse.json({ ok: true })
      }
      const media = await downloadMedia(mediaId)
      if (!media) {
        await sendLongText(from, AUDIO_FALLBACK).catch(() => {})
        return NextResponse.json({ ok: true })
      }
      const transcript = await transcribeAudio(media.base64, media.mimeType)
      if (!transcript) {
        await sendLongText(from, AUDIO_FALLBACK).catch(() => {})
        return NextResponse.json({ ok: true })
      }
      userText = transcript
      console.log('Transcribed audio:', transcript.slice(0, 100))
    }

    // ── Image: download for vision model ────────────────────────────────────
    if (type === 'image' && mediaId) {
      const media = await downloadMedia(mediaId)
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

    const reply = await chat(history, userText, summary, from, userProfile, imageBase64, imageMimeType, type)
    console.log('Reply:', reply?.slice(0, 80))

    const safeReply = reply?.trim() || FALLBACK_REPLY
    await sendLongText(from, safeReply)

    await saveMessage(from, 'model', safeReply)
    await maybeUpdateSummary(from, totalCount)
    console.log('Done')
  } catch (err) {
    console.error('ZOE error:', err)
    sendLongText(from, FALLBACK_REPLY).catch(() => {})
  }

  return NextResponse.json({ ok: true })
}
