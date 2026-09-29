import { getSupabase } from './supabase'
import type { BookingDomain } from './booking-config'

export type PendingBookingKind = 'book' | 'reschedule'

export type PendingBooking = {
  phone: string
  kind: PendingBookingKind
  targetAppointmentId: number | null
  domain: BookingDomain
  serviceName: string
  startsAt: string // ISO
  endsAt: string // ISO
  attendeeName: string | null
  reason: string | null
  location: string | null
}

function fromRow(r: any): PendingBooking {
  return {
    phone: r.phone,
    kind: r.kind,
    targetAppointmentId: r.target_appointment_id,
    domain: r.domain,
    serviceName: r.service_name,
    startsAt: r.starts_at,
    endsAt: r.ends_at,
    attendeeName: r.attendee_name,
    reason: r.reason,
    location: r.location,
  }
}

/**
 * Replaces any existing draft for this phone (one active draft per phone —
 * `phone` is the table's primary key). Callers that want to preserve
 * already-collected fields (e.g. a slot re-pick mid-conversation) should
 * read the existing draft first and pass its fields back in.
 */
export async function upsertPendingBooking(input: {
  phone: string
  kind: PendingBookingKind
  targetAppointmentId?: number | null
  domain: BookingDomain
  serviceName: string
  startsAt: Date
  endsAt: Date
  attendeeName?: string | null
  reason?: string | null
  location?: string | null
}): Promise<void> {
  const { error } = await getSupabase().from('pending_bookings').upsert(
    {
      phone: input.phone,
      kind: input.kind,
      target_appointment_id: input.targetAppointmentId ?? null,
      domain: input.domain,
      service_name: input.serviceName,
      starts_at: input.startsAt.toISOString(),
      ends_at: input.endsAt.toISOString(),
      attendee_name: input.attendeeName ?? null,
      reason: input.reason ?? null,
      location: input.location ?? null,
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 15 * 60_000).toISOString(),
    },
    { onConflict: 'phone' }
  )
  if (error) console.error('upsertPendingBooking error:', error)
}

/** Returns null if there's no draft, or if it's expired (and deletes it). */
export async function getPendingBooking(phone: string): Promise<PendingBooking | null> {
  const { data, error } = await getSupabase()
    .from('pending_bookings')
    .select('*')
    .eq('phone', phone)
    .maybeSingle()

  if (error) {
    console.error('getPendingBooking error:', error)
    return null
  }
  if (!data) return null

  if (new Date(data.expires_at).getTime() < Date.now()) {
    await clearPendingBooking(phone)
    return null
  }

  return fromRow(data)
}

export async function patchPendingBooking(
  phone: string,
  fields: Partial<{ attendeeName: string; reason: string; location: string }>
): Promise<void> {
  const patch: Record<string, any> = {}
  if (fields.attendeeName !== undefined) patch.attendee_name = fields.attendeeName
  if (fields.reason !== undefined) patch.reason = fields.reason
  if (fields.location !== undefined) patch.location = fields.location
  if (Object.keys(patch).length === 0) return

  // Refresh the TTL on every turn — without this, a slow multi-turn
  // detail-collection conversation (name, then reason, then location, each
  // its own WhatsApp round-trip) can silently expire and discard everything
  // already provided, since the TTL was otherwise only ever set once.
  patch.expires_at = new Date(Date.now() + 15 * 60_000).toISOString()

  const { error } = await getSupabase().from('pending_bookings').update(patch).eq('phone', phone)
  if (error) console.error('patchPendingBooking error:', error)
}

export async function clearPendingBooking(phone: string): Promise<void> {
  const { error } = await getSupabase().from('pending_bookings').delete().eq('phone', phone)
  if (error) console.error('clearPendingBooking error:', error)
}
