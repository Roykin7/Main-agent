import { NextRequest, NextResponse } from 'next/server'
import {
  verifySignature,
  parseIncomingMessage,
  downloadMedia,
  sendLongText,
  sendReadReceipt,
} from '@/lib/whatsapp'
import { chat } from '@/lib/gemini'
import {
  getConversationContext,
  saveMessage,
  maybeUpdateSummary,
  isMessageAlreadyProcessed,
} from '@/lib/messages'
import { loadUserProfile } from '@/lib/user-profile'

// Replies sent for unsupported message types — keeps ZOE human and warm.
const UNSUPPORTED_REPLIES: Record<string, string> = {
  audio: "I can't listen to voice notes yet — could you type your question? I'm right here to help!",
  video: "I can't watch videos yet — type your question and I'll help you right away.",
  document: "I can't read documents yet — copy and paste the key info as text and I'll work with it.",
  sticker: '',   // silently ignore stickers
  unsupported: '', // silently ignore unknown types
}

const FALLBACK_REPLY = "Sorry, something went wrong on my end — please try again in a moment."

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 })
  }

  return new NextResponse('Forbidden', { status: 403 })
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  const signature = req.headers.get('x-hub-signature-256')

  if (!verifySignature(rawBody, signature)) {
    return new NextResponse('Invalid signature', { status: 401 })
  }

  const payload = JSON.parse(rawBody)
  const incoming = parseIncomingMessage(payload)

  // Non-message events (delivery receipts, read receipts from user side, etc.)
  if (!incoming) {
    return NextResponse.json({ ok: true })
  }

  const { from, text, mediaId, messageId, type } = incoming

  // Handle unsupported types with a warm reply — don't run them through the AI
  const unsupportedReply = UNSUPPORTED_REPLIES[type]
  if (unsupportedReply !== undefined) {
    if (unsupportedReply) await sendLongText(from, unsupportedReply).catch(() => {})
    return NextResponse.json({ ok: true })
  }

  // Deduplicate: WhatsApp sometimes delivers the same webhook twice
  if (messageId && await isMessageAlreadyProcessed(messageId)) {
    console.log('Duplicate webhook ignored:', messageId)
    return NextResponse.json({ ok: true })
  }

  // Send read receipt immediately so user sees blue ticks while ZOE thinks
  if (messageId) sendReadReceipt(messageId).catch(() => {})

  try {
    console.log('Step 1: fetching context for', from)
    const [{ summary, messages: history, totalCount }, userProfile] = await Promise.all([
      getConversationContext(from),
      loadUserProfile(from),
    ])
    console.log('Step 2: history', history.length, 'msgs, summary', !!summary, 'profile facts', userProfile.length)

    let imageBase64: string | undefined
    let imageMimeType: string | undefined
    if (mediaId) {
      console.log('Step 2b: downloading image', mediaId)
      const media = await downloadMedia(mediaId)
      if (media) {
        imageBase64 = media.base64
        imageMimeType = media.mimeType
        console.log('Step 2b: image downloaded', imageMimeType, imageBase64.length, 'bytes b64')
      }
    }

    const messageText = text || (imageBase64 ? '[image]' : '')
    await saveMessage(from, 'user', messageText, messageId)
    console.log('Step 3: saved user message')

    const reply = await chat(history, text, summary, from, userProfile, imageBase64, imageMimeType)
    console.log('Step 4: got reply:', reply?.slice(0, 80))

    // Guard: never send an empty message to WhatsApp
    const safeReply = reply?.trim() || FALLBACK_REPLY

    await sendLongText(from, safeReply)
    console.log('Step 5: sent reply to', from)

    await saveMessage(from, 'model', safeReply)
    console.log('Step 6: saved model reply')

    await maybeUpdateSummary(from, totalCount)
    console.log('Step 7: done')
  } catch (err) {
    console.error('ZOE error:', err)
    // Attempt to notify the user something went wrong — best-effort
    sendLongText(from, FALLBACK_REPLY).catch(() => {})
  }

  return NextResponse.json({ ok: true })
}
