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

export type IncomingTextMessage = {
  from: string
  text: string
}

/**
 * Pulls the first text message out of a WhatsApp webhook payload, if any.
 * Returns null for non-text messages (audio, image, status updates, etc.)
 * which the MVP doesn't handle yet.
 */
export function parseIncomingText(payload: any): IncomingTextMessage | null {
  const message = payload?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]
  if (!message || message.type !== 'text') return null

  return {
    from: message.from,
    text: message.text.body,
  }
}
