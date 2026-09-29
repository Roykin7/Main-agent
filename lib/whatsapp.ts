import crypto from 'crypto'

const GRAPH_API_VERSION = 'v21.0'
const WHATSAPP_MSG_LIMIT = 4000

function apiUrl(path: string) {
  return `https://graph.facebook.com/${GRAPH_API_VERSION}/${path}`
}

// ─── Sending ────────────────────────────────────────────────────────────────

export async function sendText(to: string, text: string): Promise<void> {
  const url = apiUrl(`${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`)

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body: text },
    }),
  })

  if (!res.ok) {
    const errorBody = await res.text()
    throw new Error(`WhatsApp sendText failed (${res.status}): ${errorBody}`)
  }
}

/**
 * Sends text with up to 2 retries on transient failures (429, 5xx).
 * Waits 1s then 2s before retrying.
 */
export async function sendTextWithRetry(to: string, text: string): Promise<void> {
  const delays = [1000, 2000]
  for (let attempt = 0; attempt <= delays.length; attempt++) {
    try {
      await sendText(to, text)
      return
    } catch (err: any) {
      if (attempt === delays.length) throw err
      await new Promise((r) => setTimeout(r, delays[attempt]))
    }
  }
}

/**
 * Splits a message that exceeds WhatsApp's 4,096-char limit into multiple
 * sends, splitting at paragraph or sentence boundaries where possible.
 */
export async function sendLongText(to: string, text: string): Promise<void> {
  if (text.length <= WHATSAPP_MSG_LIMIT) {
    await sendTextWithRetry(to, text)
    return
  }

  const parts: string[] = []
  let remaining = text.trim()

  while (remaining.length > WHATSAPP_MSG_LIMIT) {
    let cut = remaining.lastIndexOf('\n\n', WHATSAPP_MSG_LIMIT)
    if (cut < WHATSAPP_MSG_LIMIT * 0.5) cut = remaining.lastIndexOf('\n', WHATSAPP_MSG_LIMIT)
    if (cut < WHATSAPP_MSG_LIMIT * 0.5) cut = remaining.lastIndexOf('. ', WHATSAPP_MSG_LIMIT)
    if (cut < 0) cut = WHATSAPP_MSG_LIMIT
    parts.push(remaining.slice(0, cut).trim())
    remaining = remaining.slice(cut).trim()
  }
  if (remaining) parts.push(remaining)

  for (let i = 0; i < parts.length; i++) {
    await sendTextWithRetry(to, parts[i])
    if (i < parts.length - 1) await new Promise((r) => setTimeout(r, 600))
  }
}

/**
 * Shared POST-to-/messages-with-one-retry used by sendImage, sendSlotList,
 * sendConfirmButtons, and sendDocument — they differ only in payload shape.
 * (sendText/sendTextWithRetry wrap a different function with a different
 * retry cadence — a separate, older idiom, left as-is rather than unified
 * here to keep this change scoped.)
 */
async function postMessageWithRetry(payload: object, fnName: string): Promise<void> {
  const url = apiUrl(`${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`)
  const delays = [1500]

  for (let attempt = 0; attempt <= delays.length; attempt++) {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    if (res.ok) return
    if (attempt === delays.length) {
      const errorBody = await res.text()
      throw new Error(`WhatsApp ${fnName} failed (${res.status}): ${errorBody}`)
    }
    await new Promise((r) => setTimeout(r, delays[attempt]))
  }
}

/**
 * Sends an image by public URL, with an optional caption.
 * Retries once on transient failure (429, 5xx) — same policy as sendText.
 */
export async function sendImage(to: string, imageUrl: string, caption?: string): Promise<void> {
  await postMessageWithRetry(
    {
      messaging_product: 'whatsapp',
      to,
      type: 'image',
      image: caption ? { link: imageUrl, caption } : { link: imageUrl },
    },
    'sendImage'
  )
}

export type InteractiveListRow = { id: string; title: string; description?: string }

/**
 * Sends a tappable list of options (e.g. appointment slots) instead of a
 * wall of text the user has to type back. WhatsApp caps this at 10 rows
 * and a 24-char row title, 72-char row description.
 * Same retry policy as sendImage.
 */
export async function sendSlotList(
  to: string,
  bodyText: string,
  rows: InteractiveListRow[]
): Promise<void> {
  await postMessageWithRetry(
    {
      messaging_product: 'whatsapp',
      to,
      type: 'interactive',
      interactive: {
        type: 'list',
        body: { text: bodyText },
        action: {
          button: 'Pick a time',
          sections: [{ title: 'Available slots', rows: rows.slice(0, 10) }],
        },
      },
    },
    'sendSlotList'
  )
}

/**
 * Sends up to 3 tappable buttons (e.g. Confirm/Change) so the recipient's
 * exact choice is unambiguous — no re-parsing a typed "yes". Button titles
 * are capped at 20 chars by WhatsApp. Same retry policy as sendImage.
 */
export async function sendConfirmButtons(
  to: string,
  bodyText: string,
  buttons: { id: string; title: string }[]
): Promise<void> {
  await postMessageWithRetry(
    {
      messaging_product: 'whatsapp',
      to,
      type: 'interactive',
      interactive: {
        type: 'button',
        body: { text: bodyText },
        action: {
          buttons: buttons.slice(0, 3).map((b) => ({ type: 'reply', reply: { id: b.id, title: b.title } })),
        },
      },
    },
    'sendConfirmButtons'
  )
}

/**
 * Uploads a binary file (e.g. a generated PDF) to WhatsApp's media store and
 * returns its media id. Uploading first (instead of hosting the file at a
 * public URL) means the PDF never needs a storage bucket — the id is only
 * valid for a limited time, so it must be used in a sendDocument call soon
 * after uploading.
 */
export async function uploadMedia(
  bytes: Uint8Array,
  mimeType: string,
  filename: string
): Promise<string> {
  const url = apiUrl(`${process.env.WHATSAPP_PHONE_NUMBER_ID}/media`)

  const form = new FormData()
  form.append('messaging_product', 'whatsapp')
  form.append('type', mimeType)
  // Uint8Array's `buffer` type (ArrayBufferLike) doesn't structurally match
  // BlobPart's ArrayBuffer expectation in this TS lib version — a type-only
  // mismatch, not a runtime one, so the cast is safe here.
  form.append('file', new Blob([bytes as BlobPart], { type: mimeType }), filename)

  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}` },
    body: form,
  })

  if (!res.ok) {
    const errorBody = await res.text()
    throw new Error(`WhatsApp uploadMedia failed (${res.status}): ${errorBody}`)
  }

  const data = await res.json()
  return data.id as string
}

/**
 * Sends a previously-uploaded media file as a document message.
 * Retries once on transient failure (429, 5xx) — same policy as sendImage.
 */
export async function sendDocument(
  to: string,
  mediaId: string,
  filename: string,
  caption?: string
): Promise<void> {
  await postMessageWithRetry(
    {
      messaging_product: 'whatsapp',
      to,
      type: 'document',
      document: caption ? { id: mediaId, filename, caption } : { id: mediaId, filename },
    },
    'sendDocument'
  )
}

/**
 * Marks an incoming message as read (sends blue ticks to the user immediately,
 * so they know ZOE received their message while it's thinking).
 * Non-throwing — UX enhancement only.
 */
export async function sendReadReceipt(messageId: string): Promise<void> {
  const url = apiUrl(`${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`)
  try {
    await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        status: 'read',
        message_id: messageId,
      }),
    })
  } catch {
    // Non-critical — don't block the main flow
  }
}

// ─── Signature verification ──────────────────────────────────────────────────

/**
 * Verifies the X-Hub-Signature-256 header Meta sends with each webhook
 * delivery, using the raw request body (must not be JSON.parse'd first).
 */
export function verifySignature(rawBody: string, signature: string | null): boolean {
  if (!signature) return false
  const secret = process.env.WHATSAPP_APP_SECRET
  if (!secret) return false

  const expected =
    'sha256=' +
    crypto.createHmac('sha256', secret).update(rawBody).digest('hex')

  const expectedBuffer = Buffer.from(expected)
  const signatureBuffer = Buffer.from(signature)

  if (expectedBuffer.length !== signatureBuffer.length) return false
  return crypto.timingSafeEqual(expectedBuffer, signatureBuffer)
}

// ─── Parsing ─────────────────────────────────────────────────────────────────

export type MessageType = 'text' | 'image' | 'audio' | 'video' | 'document' | 'sticker' | 'location' | 'unsupported'

export type IncomingMessage = {
  from: string
  text: string
  messageId: string
  type: MessageType
  mediaId?: string
  // Machine-readable id from a tapped interactive list row or button
  // (e.g. "slot:book|coffee|Farm visit consultation|2026-09-30T10:00:00.000Z"
  // or "confirm_booking"). `text` still holds the human-readable title for
  // history/logging — this carries the value code should actually branch on.
  interactiveId?: string
}

/**
 * Pulls the first message out of a WhatsApp webhook payload.
 * Returns null for non-message events (status updates, delivery receipts).
 * Audio/video/document/sticker types are returned so the caller can respond
 * with a helpful fallback instead of silently dropping them.
 */
export function parseIncomingMessage(payload: any): IncomingMessage | null {
  const message = payload?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]
  if (!message) return null

  const from: string = message.from
  const messageId: string = message.id ?? ''

  if (message.type === 'text') {
    return { from, messageId, type: 'text', text: message.text.body }
  }

  if (message.type === 'image') {
    return {
      from,
      messageId,
      type: 'image',
      text: message.image?.caption ?? '',
      mediaId: message.image?.id,
    }
  }

  if (message.type === 'audio' || message.type === 'voice') {
    return {
      from,
      messageId,
      type: 'audio',
      text: '',
      mediaId: message.audio?.id ?? message.voice?.id,
    }
  }

  if (message.type === 'location') {
    const loc = message.location ?? {}
    const label = loc.name ?? loc.address ?? `${loc.latitude}, ${loc.longitude}`
    return {
      from,
      messageId,
      type: 'location',
      text: `User sent their location: ${label}${loc.latitude != null ? ` (lat ${loc.latitude}, lng ${loc.longitude})` : ''}`,
    }
  }

  if (message.type === 'video') {
    return { from, messageId, type: 'video', text: '' }
  }

  if (message.type === 'document') {
    return { from, messageId, type: 'document', text: '' }
  }

  if (message.type === 'sticker') {
    return { from, messageId, type: 'sticker', text: '' }
  }

  // interactive button/list reply — title goes in `text` (history/logging),
  // id goes in `interactiveId` (what code should actually branch on)
  if (message.type === 'interactive') {
    const btnReply = message.interactive?.button_reply
    if (btnReply?.title) {
      return { from, messageId, type: 'text', text: btnReply.title, interactiveId: btnReply.id }
    }
    const listReply = message.interactive?.list_reply
    if (listReply?.title) {
      return { from, messageId, type: 'text', text: listReply.title, interactiveId: listReply.id }
    }
  }

  return { from, messageId, type: 'unsupported', text: '' }
}

// ─── Media download ──────────────────────────────────────────────────────────

/**
 * Downloads a WhatsApp media file and returns it as a base64 string.
 * Step 1: GET /media_id → receives the CDN URL and mime_type.
 * Step 2: GET that URL with the access token → returns raw binary.
 */
export async function downloadMedia(
  mediaId: string
): Promise<{ base64: string; mimeType: string } | null> {
  const token = process.env.WHATSAPP_ACCESS_TOKEN!

  try {
    const metaRes = await fetch(
      `https://graph.facebook.com/${GRAPH_API_VERSION}/${mediaId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    if (!metaRes.ok) return null
    const { url, mime_type } = await metaRes.json()

    const mediaRes = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    if (!mediaRes.ok) return null

    const buffer = await mediaRes.arrayBuffer()
    return { base64: Buffer.from(buffer).toString('base64'), mimeType: mime_type as string }
  } catch {
    return null
  }
}
