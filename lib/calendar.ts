import { BOOKING_CONFIG, type BookingDomain } from './booking-config'

const CAL_API_BASE = 'https://api.cal.com/v2'
const CAL_API_VERSION = '2026-02-25'
const TIMEZONE = 'Africa/Kampala'

function calHeaders(): HeadersInit {
  const apiKey = process.env.CAL_API_KEY
  if (!apiKey) throw new Error('CAL_API_KEY not set')
  return {
    Authorization: `Bearer ${apiKey}`,
    'cal-api-version': CAL_API_VERSION,
    'Content-Type': 'application/json',
  }
}

/**
 * Cal.com requires an attendee email; WhatsApp users don't have one to give.
 * This synthetic address is never meant to be reachable — .invalid is
 * reserved by RFC 2606 specifically so addresses like this bounce harmlessly
 * instead of risking delivery to a real stranger who happens to own the domain.
 */
function syntheticAttendeeEmail(phone: string): string {
  return `${phone.replace(/[^0-9]/g, '')}@wa.zoe-agent.invalid`
}

/**
 * Creates a Cal.com booking. Returns the booking uid (needed later to
 * cancel), or null on any failure (logged, never throws) — by the time this
 * runs, the appointment's local DB row is already the source of truth, so a
 * Cal.com failure shouldn't fail the booking itself.
 */
export async function createCalendarEvent(input: {
  domain: BookingDomain
  serviceName: string
  attendeeName: string
  phone: string
  startsAt: Date
  endsAt: Date
}): Promise<string | null> {
  const username = process.env.CAL_USERNAME
  if (!username) {
    console.error('createCalendarEvent: CAL_USERNAME not set')
    return null
  }

  const eventTypeSlug = BOOKING_CONFIG[input.domain].calEventTypeSlug

  try {
    const res = await fetch(`${CAL_API_BASE}/bookings`, {
      method: 'POST',
      headers: calHeaders(),
      body: JSON.stringify({
        start: input.startsAt.toISOString(),
        eventTypeSlug,
        username,
        attendee: {
          name: input.attendeeName,
          email: syntheticAttendeeEmail(input.phone),
          timeZone: TIMEZONE,
          phoneNumber: input.phone,
        },
        metadata: {
          phone: input.phone,
          service: input.serviceName,
          source: 'zoe-whatsapp',
        },
      }),
    })

    if (!res.ok) {
      console.error(`createCalendarEvent failed (${res.status}):`, await res.text())
      return null
    }

    const body = await res.json()
    // Cal.com v2 wraps responses in a `data` envelope in most cases — fall
    // back to a bare `uid` in case a given endpoint doesn't.
    const uid = body?.data?.uid ?? body?.uid ?? null
    if (!uid) console.error('createCalendarEvent: no booking uid in response', body)
    return uid
  } catch (err) {
    console.error('createCalendarEvent error:', err)
    return null
  }
}

/** Best-effort cancel — swallows errors, never throws. */
export async function deleteCalendarEvent(bookingUid: string): Promise<void> {
  try {
    const res = await fetch(`${CAL_API_BASE}/bookings/${bookingUid}/cancel`, {
      method: 'POST',
      headers: calHeaders(),
      body: JSON.stringify({ cancellationReason: 'Cancelled via ZOE (WhatsApp)' }),
    })
    if (!res.ok) {
      console.error(`deleteCalendarEvent failed (${res.status}):`, await res.text())
    }
  } catch (err) {
    console.error('deleteCalendarEvent error:', err)
  }
}
