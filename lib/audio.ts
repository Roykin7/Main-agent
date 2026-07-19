/**
 * Audio transcription via Groq's Whisper API (free tier: 28,800 seconds/day).
 * WhatsApp voice notes arrive as OGG/Opus — Groq Whisper handles them natively.
 *
 * Requires GROQ_API_KEY in environment. If not set, returns null gracefully
 * so the webhook can fall back to a "type your question" reply.
 */
export async function transcribeAudio(
  audioBase64: string,
  mimeType: string
): Promise<string | null> {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    console.warn('GROQ_API_KEY not set — audio transcription unavailable')
    return null
  }

  // Derive a filename extension Groq will accept
  const ext = mimeType.includes('ogg') ? 'ogg'
    : mimeType.includes('mp4') ? 'mp4'
    : mimeType.includes('mpeg') ? 'mp3'
    : mimeType.includes('webm') ? 'webm'
    : mimeType.includes('wav') ? 'wav'
    : 'ogg'  // WhatsApp default is ogg/opus

  const buffer = Buffer.from(audioBase64, 'base64')
  const blob = new Blob([buffer], { type: mimeType })

  const formData = new FormData()
  formData.append('file', blob, `audio.${ext}`)
  formData.append('model', 'whisper-large-v3-turbo')
  formData.append('response_format', 'text')
  // Let Whisper auto-detect language — handles Luganda, Swahili, English etc.

  try {
    const res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: formData,
    })

    if (!res.ok) {
      const body = await res.text()
      console.error(`Groq transcription error ${res.status}:`, body)
      return null
    }

    const text = (await res.text()).trim()
    return text || null
  } catch (err) {
    console.error('transcribeAudio fetch error:', err)
    return null
  }
}
