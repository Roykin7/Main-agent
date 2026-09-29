import crypto from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { sendDueReminders } from '@/lib/booking'

export const maxDuration = 30

/**
 * Called by Vercel Cron (see vercel.json) every 15 minutes. Vercel
 * automatically attaches "Authorization: Bearer $CRON_SECRET" to its own
 * cron requests once CRON_SECRET is set as an env var — no custom
 * secret-passing needed beyond checking it matches here, timing-safely
 * (same convention as verifySignature in lib/whatsapp.ts).
 */
function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false

  const expected = Buffer.from(`Bearer ${secret}`)
  const received = Buffer.from(req.headers.get('authorization') ?? '')
  if (expected.length !== received.length) return false
  return crypto.timingSafeEqual(expected, received)
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const sent = await sendDueReminders()
  return NextResponse.json({ sent })
}
