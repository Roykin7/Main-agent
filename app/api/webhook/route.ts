import { NextRequest, NextResponse } from 'next/server'
import { verifySignature, parseIncomingText, sendText } from '@/lib/whatsapp'
import { chat } from '@/lib/gemini'
import { retrieveContext } from '@/lib/knowledge'
import { getRecentHistory, saveMessage } from '@/lib/messages'

// Meta calls this once when you configure the webhook URL, to confirm
// you control the endpoint.
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

// Handles incoming WhatsApp messages.
export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  const signature = req.headers.get('x-hub-signature-256')

  if (!verifySignature(rawBody, signature)) {
    return new NextResponse('Invalid signature', { status: 401 })
  }

  const payload = JSON.parse(rawBody)
  console.log('WA payload:', JSON.stringify(payload, null, 2))

  const incoming = parseIncomingText(payload)
  console.log('WA parsed:', incoming)

  // Ignore non-text messages (audio/image/status updates) for the MVP.
  if (!incoming) {
    return NextResponse.json({ ok: true })
  }

  const { from, text } = incoming

  try {
    console.log('Step 1: fetching history + context for', from)
    const [history, contextChunks] = await Promise.all([
      getRecentHistory(from),
      retrieveContext(text),
    ])
    console.log('Step 2: history', history.length, 'chunks', contextChunks.length)

    await saveMessage(from, 'user', text)
    console.log('Step 3: saved user message')

    const reply = await chat(history, text, contextChunks)
    console.log('Step 4: got reply:', reply?.slice(0, 80))

    await sendText(from, reply)
    console.log('Step 5: sent reply to', from)

    await saveMessage(from, 'model', reply)
    console.log('Step 6: done')
  } catch (err) {
    console.error('ZOE error:', err)
  }

  // Always return 200 so Meta doesn't retry and flood the endpoint.
  return NextResponse.json({ ok: true })
}
