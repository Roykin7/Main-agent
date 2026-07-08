import { NextRequest, NextResponse } from 'next/server'
import { verifySignature, parseIncomingText, sendText } from '@/lib/whatsapp'
import { chat } from '@/lib/gemini'
import { getConversationContext, saveMessage, maybeUpdateSummary } from '@/lib/messages'
import { loadUserProfile } from '@/lib/user-profile'

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
  const incoming = parseIncomingText(payload)

  if (!incoming) {
    return NextResponse.json({ ok: true })
  }

  const { from, text } = incoming

  try {
    console.log('Step 1: fetching context for', from)
    const [{ summary, messages: history, totalCount }, userProfile] = await Promise.all([
      getConversationContext(from),
      loadUserProfile(from),
    ])
    console.log('Step 2: history', history.length, 'msgs, summary', !!summary, 'profile facts', userProfile.length)

    await saveMessage(from, 'user', text)
    console.log('Step 3: saved user message')

    const reply = await chat(history, text, summary, from, userProfile)
    console.log('Step 4: got reply:', reply?.slice(0, 80))

    await sendText(from, reply)
    console.log('Step 5: sent reply to', from)

    await saveMessage(from, 'model', reply)
    console.log('Step 6: saved model reply')

    await maybeUpdateSummary(from, totalCount)
    console.log('Step 7: done')
  } catch (err) {
    console.error('ZOE error:', err)
  }

  return NextResponse.json({ ok: true })
}
