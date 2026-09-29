import { getSupabase } from './supabase'
import { BOOKING_CONFIG, type BookingDomain } from './booking-config'
import { createCalendarEvent, deleteCalendarEvent, rescheduleCalendarEvent } from './calendar'
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

/** Combines a "YYYY-MM-DD" date and "HH:MM" time (both Kampala-local) into an absolute instant. */
export function combineKampalaDateTime(dateStr: string, time: string): Date {
  const [h, m] = time.split(':').map(Number)
  return new Date(`${dateStr}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00${KAMPALA_OFFSET}`)
}

function dayOfWeek(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay()
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

export type AvailableSlot = { startsAt: Date; label: string }

function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d + days))
  return dt.toISOString().slice(0, 10)
}

/** Slots for exactly one date — no forward-scanning. Used internally by getAvailableSlots. */
async function getSlotsForExactDate(
  domain: BookingDomain,
  serviceName: string,
  dateStr: string
): Promise<AvailableSlot[]> {
  const config = BOOKING_CONFIG[domain]
  const service = config.services.find((s) => s.name === serviceName)
  if (!service) return []

  if (!config.businessHours.days.includes(dayOfWeek(dateStr))) return []

  const dayStart = combineKampalaDateTime(dateStr, config.businessHours.start)
  const dayEnd = combineKampalaDateTime(dateStr, config.businessHours.end)

  const { data, error } = await getSupabase()
    .from('appointments')
    .select('starts_at, ends_at')
    .eq('domain', domain)
    .eq('status', 'confirmed')
    .lt('starts_at', dayEnd.toISOString())
    .gt('ends_at', dayStart.toISOString())

  if (error) {
    console.error('getSlotsForExactDate error:', error)
    return []
  }

  const busy = (data ?? []).map((r) => ({
    start: new Date(r.starts_at as string),
    end: new Date(r.ends_at as string),
  }))

  const stepMs = service.durationMinutes * 60_000
  const now = Date.now()
  const slots: AvailableSlot[] = []

  for (let t = dayStart.getTime(); t + stepMs <= dayEnd.getTime(); t += stepMs) {
    const slotStart = new Date(t)
    const slotEnd = new Date(t + stepMs)
    if (slotStart.getTime() <= now) continue
    const overlaps = busy.some((b) => slotStart < b.end && slotEnd > b.start)
    if (!overlaps) slots.push({ startsAt: slotStart, label: formatAppointmentTime(slotStart.toISOString()) })
  }

  return slots.slice(0, 6)
}

const FORWARD_SCAN_DAYS = 14

/**
 * Computes open slots for a service on a given date: business-hours slots
 * minus anything already confirmed in `appointments`. Never invents
 * availability — an empty/errored result just means "no slots to offer."
 *
 * If the requested date has nothing open, scans forward (up to
 * FORWARD_SCAN_DAYS) for the first date that does, so the caller can offer
 * that instead of the model having to guess-and-retry with different dates.
 * `dateUsed` tells the caller which date the returned slots are actually for.
 */
export async function getAvailableSlots(
  domain: BookingDomain,
  serviceName: string,
  dateStr: string
): Promise<{ slots: AvailableSlot[]; dateUsed: string }> {
  const direct = await getSlotsForExactDate(domain, serviceName, dateStr)
  if (direct.length > 0) return { slots: direct, dateUsed: dateStr }

  for (let i = 1; i <= FORWARD_SCAN_DAYS; i++) {
    const candidate = addDays(dateStr, i)
    const slots = await getSlotsForExactDate(domain, serviceName, candidate)
    if (slots.length > 0) return { slots, dateUsed: candidate }
  }

  return { slots: [], dateUsed: dateStr }
}

export type BookAppointmentResult =
  | { ok: true; appointment: Appointment; calendarSynced: boolean; pdfDelivered: boolean }
  | { ok: false; reason: 'slot_taken' | 'invalid' | 'db_error' }

/**
 * Books an appointment. The insert's exclusion constraint (see
 * add-appointments.sql) is the real guard against double-booking — it's
 * enforced atomically by Postgres, so there's no check-then-insert race.
 * Calendar sync and PDF delivery are best-effort after that: the booking
 * itself must not be lost over a delivery hiccup.
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
  if (!service) return { ok: false, reason: 'invalid' }

  const endsAt = new Date(input.startsAt.getTime() + service.durationMinutes * 60_000)

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
    })
    .select('id, domain, service_name, phone, attendee_name, starts_at, ends_at, status, reason, location')
    .single()

  if (error) {
    // 23P01 = exclusion_violation — the slot was taken between check_availability and now
    if (error.code === '23P01') return { ok: false, reason: 'slot_taken' }
    console.error('bookAppointment insert error:', error)
    return { ok: false, reason: 'db_error' }
  }

  const appointment: Appointment = {
    id: data.id,
    domain: data.domain,
    serviceName: data.service_name,
    phone: data.phone,
    attendeeName: data.attendee_name,
    startsAt: data.starts_at,
    endsAt: data.ends_at,
    calendarEventId: null,
    status: data.status,
    reason: data.reason,
    location: data.location,
  }

  let calendarSynced = false
  try {
    const eventId = await createCalendarEvent({
      domain: input.domain,
      serviceName: input.serviceName,
      attendeeName: input.attendeeName,
      phone: input.phone,
      startsAt: input.startsAt,
      endsAt,
      reason: input.reason,
      location: input.location,
    })
    if (eventId) {
      await getSupabase().from('appointments').update({ calendar_event_id: eventId }).eq('id', appointment.id)
      appointment.calendarEventId = eventId
      calendarSynced = true
    }
  } catch (err) {
    console.error('bookAppointment calendar sync error:', err)
  }

  let pdfDelivered = false
  try {
    const pdfBytes = await buildAppointmentConfirmationPdf(appointment)
    const mediaId = await uploadMedia(pdfBytes, 'application/pdf', 'appointment-confirmation.pdf')
    await sendDocument(input.phone, mediaId, 'appointment-confirmation.pdf', `Your confirmation for ${input.serviceName}`)
    pdfDelivered = true
  } catch (err) {
    console.error('bookAppointment pdf delivery error:', err)
  }

  return { ok: true, appointment, calendarSynced, pdfDelivered }
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
  | { ok: true; appointment: Appointment; calendarSynced: boolean }
  | { ok: false; reason: 'not_found' | 'slot_taken' | 'db_error' }

/**
 * Moves an existing appointment to a new time. The exclusion constraint on
 * `appointments` guards UPDATEs the same way it guards INSERTs, so this is
 * just as race-safe as a fresh booking. Cal.com's reschedule endpoint mints
 * a new booking uid — calendar_event_id is overwritten with it.
 */
export async function rescheduleAppointment(
  appointmentId: number,
  phone: string,
  newStartsAt: Date,
  newEndsAt: Date
): Promise<RescheduleAppointmentResult> {
  const existing = await getAppointmentById(appointmentId, phone)
  if (!existing) return { ok: false, reason: 'not_found' }

  const { data, error } = await getSupabase()
    .from('appointments')
    .update({ starts_at: newStartsAt.toISOString(), ends_at: newEndsAt.toISOString() })
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

  let appointment = appointmentFromRow(data)
  let calendarSynced = false

  if (existing.calendarEventId) {
    try {
      const newUid = await rescheduleCalendarEvent(existing.calendarEventId, newStartsAt)
      if (newUid) {
        await getSupabase().from('appointments').update({ calendar_event_id: newUid }).eq('id', appointmentId)
        appointment = { ...appointment, calendarEventId: newUid }
        calendarSynced = true
      }
    } catch (err) {
      console.error('rescheduleAppointment calendar sync error:', err)
    }
  }

  return { ok: true, appointment, calendarSynced }
}

const REMINDER_WINDOW_START_MS = 23 * 3600_000
const REMINDER_WINDOW_END_MS = 25 * 3600_000

/**
 * Sends a WhatsApp reminder for every confirmed appointment starting in the
 * next 23-25h that hasn't already had one sent, and marks each as sent.
 * The 2-hour window (vs. exactly 24h) gives a 15-minute cron cadence room
 * to catch every appointment without double-sending.
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
      `Reminder: your ${appointment.serviceName} is tomorrow at ${formatAppointmentTime(appointment.startsAt)}.`,
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
