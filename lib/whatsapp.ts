import crypto from 'crypto'

const GRAPH_API_VERSION = 'v19.0'

function apiUrl(path: string) {
  return `https://graph.facebook.com/${GRAPH_API_VERSION}/${path}`
}

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
 * Verifies the X-Hub-Signature-256 header Meta sends with each webhook
 * delivery, using the raw request body (must not be JSON.parse'd first).
 */
export function verifySignature(rawBody: string, signature: string | null): boolean {
  if (!signature) return false

  const expected =
    'sha256=' +
    crypto
      .createHmac('sha256', process.env.WHATSAPP_APP_SECRET!)
      .update(rawBody)
      .digest('hex')

  const expectedBuffer = Buffer.from(expected)
  const signatureBuffer = Buffer.from(signature)

  if (expectedBuffer.length !== signatureBuffer.length) return false

  return crypto.timingSafeEqual(expectedBuffer, signatureBuffer)
}

export type IncomingMessage = {
  from: string
  text: string
  mediaId?: string   // present for image messages
}

/**
 * Pulls the first text or image message out of a WhatsApp webhook payload.
 * Returns null for unhandled types (audio, video, status updates, etc.)
 */
export function parseIncomingMessage(payload: any): IncomingMessage | null {
  const message = payload?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]
  if (!message) return null

  if (message.type === 'text') {
    return { from: message.from, text: message.text.body }
  }

  if (message.type === 'image') {
    return {
      from: message.from,
      // Use the image caption as the text prompt (often empty)
      text: message.image?.caption ?? '',
      mediaId: message.image?.id,
    }
  }

  return null
}

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
    // Step 1 — resolve media URL
    const metaRes = await fetch(
      `https://graph.facebook.com/${GRAPH_API_VERSION}/${mediaId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    if (!metaRes.ok) return null
    const { url, mime_type } = await metaRes.json()

    // Step 2 — download binary
    const mediaRes = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    if (!mediaRes.ok) return null

    const buffer = await mediaRes.arrayBuffer()
    return { base64: Buffer.from(buffer).toString('base64'), mimeType: mime_type as string }
  } catch {
    return null
  }
}
