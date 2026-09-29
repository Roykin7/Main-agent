import { getSupabase } from './supabase'
import { BOOKING_CONFIG, type BookingDomain } from './booking-config'
import { getCalSlots, createCalendarEvent, rescheduleCalendarEvent, deleteCalendarEvent } from './calendar'
import { buildAppointmentConfirmationPdf } from './pdf'
import { uploadMedia, sendDocument, sendLongText } from './whatsapp'

const TIMEZONE = 'Africa/Kampala'
// Africa/Kampala is UTC+3 year-round (no DST) — safe to hardcode the offset
// when building an instant from a Kampala-local date+time.
const KAMPALA_OFFSET = '+03:00'

export type Appointment = {
  id: number
  domain: BookingDomain
  serviceName: string
  phone: string
  attendeeName: string
  startsAt: string // ISO
  endsAt: string // ISO
  calendarEventId: string | null // Cal.com booking uid
  status: 'confirmed' | 'cancelled'
  reason: string | null
  location: string | null
}

const APPOINTMENT_COLUMNS =
  'id, domain, service_name, phone, attendee_name, starts_at, ends_at, calendar_event_id, status, reason, location'

function appointmentFromRow(r: any): Appointment {
  return {
    id: r.id,
    domain: r.domain,
    serviceName: r.service_name,
    phone: r.phone,
    attendeeName: r.attendee_name,
    startsAt: r.starts_at,
    endsAt: r.ends_at,
    calendarEventId: r.calendar_event_id,
    status: r.status,
    reason: r.reason,
    location: r.location,
  }
}

/** Combines a "YYYY-MM-DD" date and "HH:MM" time (both Kampala-local) into an absolute instant. */
export function combineKampalaDateTime(dateStr: string, time: string): Date {
  const [h, m] = time.split(':').map(Number)
  return new Date(`${dateStr}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00${KAMPALA_OFFSET}`)
}

export function formatAppointmentTime(iso: string): string {
  return new Date(iso).toLocaleString('en-UG', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: TIMEZONE,
  })
}

function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10)
}

export type AvailableSlot = { startsAt: Date; label: string }

const FORWARD_SCAN_DAYS = 14
const MAX_SLOTS_SHOWN = 6

/**
 * Real availability, straight from Cal.com (see lib/calendar.ts getCalSlots)
 * — not just ZOE's own appointments table, so a personal event or a booking
 * made directly on Cal.com also blocks a slot here. One API call covers the
 * whole forward-scan window instead of a query per day.
 *
 * If the requested date has nothing open, returns the first later date that
 * does (dateUsed tells the caller which), so the model can offer that
 * instead of guessing-and-retrying with different dates.
 */
export async function getAvailableSlots(
  domain: BookingDomain,
  serviceName: string,
  dateStr: string,
  opts?: { excludeBookingUid?: string }
): Promise<{ slots: AvailableSlot[]; dateUsed: string }> {
  const rangeEnd = addDays(dateStr, FORWARD_SCAN_DAYS)
  const byDate = await getCalSlots(domain, serviceName, dateStr, rangeEnd, opts)

  const now = Date.now()
  for (const candidateDate of Object.keys(byDate).sort()) {
    if (candidateDate < dateStr) continue // defensive — Cal.com's range boundaries are inclusive
    const slots: AvailableSlot[] = (byDate[candidateDate] ?? [])
      .map((s) => new Date(s.start))
      .filter((d) => d.getTime() > now)
      .sort((a, b) => a.getTime() - b.getTime())
      .slice(0, MAX_SLOTS_SHOWN)
      .map((d) => ({ startsAt: d, label: formatAppointmentTime(d.toISOString()) }))
    if (slots.length > 0) return { slots, dateUsed: candidateDate }
  }

  return { slots: [], dateUsed: dateStr }
}

export type BookAppointmentResult =
  | { ok: true; appointment: Appointment; pdfDelivered: boolean }
  | { ok: false; reason: 'slot_taken' | 'invalid' | 'db_error' }

/**
 * Books an appointment. Cal.com is now the authoritative availability check
 * — createCalendarEvent validates the slot is still real at write time, not
 * just at check_availability time. Only once Cal.com confirms does the local
 * `appointments` row get written (audit record + fast phone lookup + a
 * last-line exclusion-constraint against a same-instant double-tap race
 * Cal.com's own check didn't catch in time). If Cal.com is unreachable
 * (not a conflict — see createCalendarEvent's 'error' vs 'slot_taken'),
 * falls back to a local-only booking rather than blocking the farmer over
 * an infra hiccup.
 */
export async function bookAppointment(input: {
  domain: BookingDomain
  serviceName: string
  startsAt: Date
  phone: string
  attendeeName: string
  reason?: string | null
  location?: string | null
}): Promise<BookAppointmentResult> {
  const config = BOOKING_CONFIG[input.domain]
  const service = config.services.find((s) => s.name === input.serviceName)
  if (!service) {
    console.error(`bookAppointment: unknown service "${input.serviceName}" for domain "${input.domain}"`)
    return { ok: false, reason: 'invalid' }
  }

  const endsAt = new Date(input.startsAt.getTime() + service.durationMinutes * 60_000)

  const calResult = await createCalendarEvent({
    domain: input.domain,
    serviceName: input.serviceName,
    attendeeName: input.attendeeName,
    phone: input.phone,
    startsAt: input.startsAt,
    endsAt,
    reason: input.reason,
    location: input.location,
  })

  if (!calResult.ok && calResult.reason === 'slot_taken') {
    return { ok: false, reason: 'slot_taken' }
  }

  const { data, error } = await getSupabase()
    .from('appointments')
    .insert({
      domain: input.domain,
      service_name: input.serviceName,
      phone: input.phone,
      attendee_name: input.attendeeName,
      starts_at: input.startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      reason: input.reason ?? null,
      location: input.location ?? null,
      calendar_event_id: calResult.ok ? calResult.bookingUid : null,
    })
    .select(APPOINTMENT_COLUMNS)
    .single()

  if (error) {
    if (error.code === '23P01') return { ok: false, reason: 'slot_taken' }
    console.error('bookAppointment insert error:', error)
    return { ok: false, reason: 'db_error' }
  }

  const appointment = appointmentFromRow(data)

  let pdfDelivered = false
  try {
    const pdfBytes = await buildAppointmentConfirmationPdf(appointment)
    const mediaId = await uploadMedia(pdfBytes, 'application/pdf', 'appointment-confirmation.pdf')
    await sendDocument(input.phone, mediaId, 'appointment-confirmation.pdf', `Your confirmation for ${input.serviceName}`)
    pdfDelivered = true
  } catch (err) {
    console.error('bookAppointment pdf delivery error:', err)
  }

  return { ok: true, appointment, pdfDelivered }
}

export async function findUpcomingAppointments(phone: string): Promise<Appointment[]> {
  const { data, error } = await getSupabase()
    .from('appointments')
    .select(APPOINTMENT_COLUMNS)
    .eq('phone', phone)
    .eq('status', 'confirmed')
    .gt('starts_at', new Date().toISOString())
    .order('starts_at', { ascending: true })

  if (error) {
    console.error('findUpcomingAppointments error:', error)
    return []
  }

  return (data ?? []).map(appointmentFromRow)
}

export async function getAppointmentById(id: number, phone: string): Promise<Appointment | null> {
  const { data, error } = await getSupabase()
    .from('appointments')
    .select(APPOINTMENT_COLUMNS)
    .eq('id', id)
    .eq('phone', phone)
    .eq('status', 'confirmed')
    .maybeSingle()

  if (error) {
    console.error('getAppointmentById error:', error)
    return null
  }
  return data ? appointmentFromRow(data) : null
}

/**
 * Cancels an appointment. Scoped by phone as well as id so one number can't
 * cancel another user's booking by guessing an id.
 */
export async function cancelAppointmentById(id: number, phone: string): Promise<{ ok: boolean }> {
  const { data, error } = await getSupabase()
    .from('appointments')
    .update({ status: 'cancelled' })
    .eq('id', id)
    .eq('phone', phone)
    .eq('status', 'confirmed')
    .select('calendar_event_id')
    .maybeSingle()

  if (error || !data) {
    if (error) console.error('cancelAppointmentById error:', error)
    return { ok: false }
  }

  if (data.calendar_event_id) {
    await deleteCalendarEvent(data.calendar_event_id)
  }

  return { ok: true }
}

export type RescheduleAppointmentResult =
  | { ok: true; appointment: Appointment }
  | { ok: false; reason: 'not_found' | 'slot_taken' | 'db_error' }

/**
 * Moves an existing appointment to a new time. Cal.com's reschedule
 * endpoint is called first — it's the authoritative check that the new time
 * is actually free (see lib/calendar.ts rescheduleCalendarEvent), same
 * reasoning as bookAppointment. The local exclusion constraint is still a
 * last-line defense on the UPDATE itself.
 */
export async function rescheduleAppointment(
  appointmentId: number,
  phone: string,
  newStartsAt: Date,
  newEndsAt: Date
): Promise<RescheduleAppointmentResult> {
  const existing = await getAppointmentById(appointmentId, phone)
  if (!existing) return { ok: false, reason: 'not_found' }

  let newCalendarEventId: string | null = existing.calendarEventId

  if (existing.calendarEventId) {
    const calResult = await rescheduleCalendarEvent(
      existing.calendarEventId,
      existing.domain,
      existing.serviceName,
      newStartsAt
    )
    if (!calResult.ok) {
      if (calResult.reason === 'slot_taken') return { ok: false, reason: 'slot_taken' }
      // 'error': Cal.com unreachable — still move the local record rather
      // than blocking the reschedule; calendar_event_id keeps pointing at
      // the old (now stale) booking until a future successful sync.
    } else {
      newCalendarEventId = calResult.bookingUid
    }
  }

  const { data, error } = await getSupabase()
    .from('appointments')
    .update({
      starts_at: newStartsAt.toISOString(),
      ends_at: newEndsAt.toISOString(),
      calendar_event_id: newCalendarEventId,
    })
    .eq('id', appointmentId)
    .eq('phone', phone)
    .eq('status', 'confirmed')
    .select(APPOINTMENT_COLUMNS)
    .maybeSingle()

  if (error) {
    if (error.code === '23P01') return { ok: false, reason: 'slot_taken' }
    console.error('rescheduleAppointment update error:', error)
    return { ok: false, reason: 'db_error' }
  }
  if (!data) return { ok: false, reason: 'not_found' }

  return { ok: true, appointment: appointmentFromRow(data) }
}

// Vercel Hobby cron only runs once daily (vercel.json), with up to ±59min
// of its own timing jitter — a tight 23-25h window would miss most
// appointments. 18-42h is wide enough that two consecutive ~24h-apart daily
// runs always overlap (run N covers [+18h,+42h], run N+1 covers roughly
// [+42h,+66h]), so every appointment gets caught by exactly one run — or
// rarely two if a run's timing shifts, which just means an occasional
// duplicate reminder rather than a missed one.
const REMINDER_WINDOW_START_MS = 18 * 3600_000
const REMINDER_WINDOW_END_MS = 42 * 3600_000

/**
 * Sends a WhatsApp reminder for every confirmed appointment starting in the
 * window above that hasn't already had one sent, and marks each as sent.
 *
 * Deliberately marks reminder_sent AFTER a successful send, not before: if
 * the function is killed between the two steps, the worst case is a
 * duplicate reminder next run (mildly annoying) rather than marking an
 * appointment "reminded" when nothing was actually sent (a lost reminder is
 * worse than a duplicate one).
 */
export async function sendDueReminders(): Promise<number> {
  const now = Date.now()
  const windowStart = new Date(now + REMINDER_WINDOW_START_MS).toISOString()
  const windowEnd = new Date(now + REMINDER_WINDOW_END_MS).toISOString()

  const { data, error } = await getSupabase()
    .from('appointments')
    .select(APPOINTMENT_COLUMNS)
    .eq('status', 'confirmed')
    .eq('reminder_sent', false)
    .gte('starts_at', windowStart)
    .lt('starts_at', windowEnd)

  if (error) {
    console.error('sendDueReminders query error:', error)
    return 0
  }

  let sent = 0
  for (const row of data ?? []) {
    const appointment = appointmentFromRow(row)
    const lines = [
      // formatAppointmentTime already includes the weekday/date, so this
      // stays accurate regardless of exact lead time within the window.
      `Reminder: your ${appointment.serviceName} is coming up on ${formatAppointmentTime(appointment.startsAt)}.`,
    ]
    if (appointment.location) lines.push(`Location: ${appointment.location}`)
    lines.push('Message ZOE if you need to cancel or reschedule.')

    try {
      await sendLongText(appointment.phone, lines.join(' '))
      await getSupabase().from('appointments').update({ reminder_sent: true }).eq('id', appointment.id)
      sent++
    } catch (err) {
      console.error(`sendDueReminders send error for appointment ${appointment.id}:`, err)
    }
  }

  return sent
}
