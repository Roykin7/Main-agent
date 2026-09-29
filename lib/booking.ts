import { getSupabase } from './supabase'
import { BOOKING_CONFIG, type BookingDomain } from './booking-config'
import { createCalendarEvent, deleteCalendarEvent } from './calendar'
import { buildAppointmentConfirmationPdf } from './pdf'
import { uploadMedia, sendDocument } from './whatsapp'

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

/**
 * Computes open slots for a service on a given date: business-hours slots
 * minus anything already confirmed in `appointments`. Never invents
 * availability — an empty/errored result just means "no slots to offer."
 */
export async function getAvailableSlots(
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
    console.error('getAvailableSlots error:', error)
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
    })
    .select('id, domain, service_name, phone, attendee_name, starts_at, ends_at, status')
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

export async function findUpcomingAppointments(phone: string): Promise<Appointment[]> {
  const { data, error } = await getSupabase()
    .from('appointments')
    .select('id, domain, service_name, phone, attendee_name, starts_at, ends_at, calendar_event_id, status')
    .eq('phone', phone)
    .eq('status', 'confirmed')
    .gt('starts_at', new Date().toISOString())
    .order('starts_at', { ascending: true })

  if (error) {
    console.error('findUpcomingAppointments error:', error)
    return []
  }

  return (data ?? []).map((r) => ({
    id: r.id,
    domain: r.domain,
    serviceName: r.service_name,
    phone: r.phone,
    attendeeName: r.attendee_name,
    startsAt: r.starts_at,
    endsAt: r.ends_at,
    calendarEventId: r.calendar_event_id,
    status: r.status,
  }))
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
