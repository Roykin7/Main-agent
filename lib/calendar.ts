import { BOOKING_CONFIG, type BookingDomain } from './booking-config'

const CAL_API_BASE = 'https://api.cal.com/v2'
// Cal.com versions its API per endpoint group, not globally — these two are
// genuinely different values, not a typo. Confirmed against their docs for
// /v2/slots vs /v2/bookings separately.
const SLOTS_API_VERSION = '2024-09-04'
const BOOKINGS_API_VERSION = '2026-02-25'
const TIMEZONE = 'Africa/Kampala'

type CalApiResult = { ok: true; body: any } | { ok: false }

/** Shared transport: auth/version headers, error logging, try/catch — every Cal.com call goes through this. */
async function callCalApi(path: string, init: RequestInit, apiVersion: string): Promise<CalApiResult> {
  try {
    const res = await fetch(`${CAL_API_BASE}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${process.env.CAL_API_KEY ?? ''}`,
        'cal-api-version': apiVersion,
        'Content-Type': 'application/json',
      },
    })

    if (!res.ok) {
      console.error(`Cal.com ${path} failed (${res.status}):`, await res.text())
      return { ok: false }
    }

    return { ok: true, body: await res.json() }
  } catch (err) {
    console.error(`Cal.com ${path} error:`, err)
    return { ok: false }
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
 * Real availability, straight from Cal.com's own booking-page engine —
 * accounts for the event type's configured hours, existing Cal.com bookings,
 * and (when connected) external calendar conflicts, not just what ZOE itself
 * has booked. Returns { "YYYY-MM-DD": [{start: ISO}, ...], ... }, empty on
 * any failure (never invents availability).
 *
 * Pass excludeBookingUid when finding a new time for an existing booking
 * (reschedule) so that booking's own current slot doesn't count as busy
 * against itself.
 */
export async function getCalSlots(
  domain: BookingDomain,
  serviceName: string,
  fromDate: string, // YYYY-MM-DD
  toDateExclusive: string, // YYYY-MM-DD
  opts?: { excludeBookingUid?: string }
): Promise<Record<string, { start: string }[]>> {
  const username = process.env.CAL_USERNAME
  if (!username) {
    console.error('getCalSlots: CAL_USERNAME not set')
    return {}
  }

  const params = new URLSearchParams({
    eventTypeSlug: BOOKING_CONFIG[domain].calEventTypeSlug,
    username,
    start: fromDate,
    end: toDateExclusive,
    timeZone: TIMEZONE,
  })
  if (opts?.excludeBookingUid) params.set('bookingUidToReschedule', opts.excludeBookingUid)

  const result = await callCalApi(`/slots?${params.toString()}`, { method: 'GET' }, SLOTS_API_VERSION)
  if (!result.ok) return {}
  return result.body?.data ?? {}
}

/** Checks whether one specific instant still shows up in Cal.com's real availability. */
async function isSlotStillFree(domain: BookingDomain, serviceName: string, startsAt: Date): Promise<boolean> {
  const dateStr = startsAt.toISOString().slice(0, 10)
  const nextDay = new Date(startsAt.getTime() + 86_400_000).toISOString().slice(0, 10)
  const slots = await getCalSlots(domain, serviceName, dateStr, nextDay)
  const daySlots = slots[dateStr] ?? []
  return daySlots.some((s) => new Date(s.start).getTime() === startsAt.getTime())
}

export type CalWriteOutcome =
  | { ok: true; bookingUid: string }
  | { ok: false; reason: 'slot_taken' | 'error' }

/**
 * Creates a Cal.com booking. This is the AUTHORITATIVE availability check —
 * Cal.com's own booking-creation endpoint validates the slot is still real
 * at write time. Cal.com's exact error shape for "slot no longer available"
 * isn't documented, so rather than guess at a status code, any failure
 * triggers a fresh getCalSlots check: if the slot's genuinely gone, that's
 * 'slot_taken'; if Cal.com is just erroring while the slot still shows free,
 * that's 'error' (caller falls back to a local-only booking).
 */
export async function createCalendarEvent(input: {
  domain: BookingDomain
  serviceName: string
  attendeeName: string
  phone: string
  startsAt: Date
  endsAt: Date
  reason?: string | null
  location?: string | null
}): Promise<CalWriteOutcome> {
  const username = process.env.CAL_USERNAME
  if (!username) {
    console.error('createCalendarEvent: CAL_USERNAME not set')
    return { ok: false, reason: 'error' }
  }

  const result = await callCalApi(
    '/bookings',
    {
      method: 'POST',
      body: JSON.stringify({
        start: input.startsAt.toISOString(),
        eventTypeSlug: BOOKING_CONFIG[input.domain].calEventTypeSlug,
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
          ...(input.reason ? { reason: input.reason } : {}),
          ...(input.location ? { location: input.location } : {}),
        },
      }),
    },
    BOOKINGS_API_VERSION
  )

  if (!result.ok) {
    const stillFree = await isSlotStillFree(input.domain, input.serviceName, input.startsAt)
    return { ok: false, reason: stillFree ? 'error' : 'slot_taken' }
  }

  const uid = result.body?.data?.uid ?? result.body?.uid ?? null
  if (!uid) {
    console.error('createCalendarEvent: no booking uid in response', result.body)
    return { ok: false, reason: 'error' }
  }
  return { ok: true, bookingUid: uid }
}

/**
 * Reschedules a Cal.com booking to a new start time — also the authoritative
 * availability check for reschedule, same reasoning as createCalendarEvent.
 * Cal.com mints a NEW booking uid on reschedule (the old uid's
 * `rescheduledToUid` points to it) — callers must overwrite their stored
 * calendar_event_id with the returned value, not assume it stays the same.
 */
export async function rescheduleCalendarEvent(
  bookingUid: string,
  domain: BookingDomain,
  serviceName: string,
  newStartsAt: Date
): Promise<CalWriteOutcome> {
  const result = await callCalApi(
    `/bookings/${bookingUid}/reschedule`,
    { method: 'POST', body: JSON.stringify({ start: newStartsAt.toISOString() }) },
    BOOKINGS_API_VERSION
  )

  if (!result.ok) {
    const stillFree = await isSlotStillFree(domain, serviceName, newStartsAt)
    return { ok: false, reason: stillFree ? 'error' : 'slot_taken' }
  }

  const uid = result.body?.data?.uid ?? result.body?.uid ?? null
  if (!uid) {
    console.error('rescheduleCalendarEvent: no booking uid in response', result.body)
    return { ok: false, reason: 'error' }
  }
  return { ok: true, bookingUid: uid }
}

/** Best-effort cancel — swallows errors, never throws (callCalApi already logs). */
export async function deleteCalendarEvent(bookingUid: string): Promise<void> {
  await callCalApi(
    `/bookings/${bookingUid}/cancel`,
    { method: 'POST', body: JSON.stringify({ cancellationReason: 'Cancelled via ZOE (WhatsApp)' }) },
    BOOKINGS_API_VERSION
  )
}
