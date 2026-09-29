// Static config, same spirit as lib/zoe-prompt.ts — no admin panel exists,
// content/config changes are made in code (see scripts/seed-*.ts convention).
// Placeholder hours/services — fill in real values before shipping.

export type BookingDomain = 'coffee' | 'phaneroo'

export type BookingService = {
  name: string
  durationMinutes: number
}

export type DomainBookingConfig = {
  label: string
  services: BookingService[]
  // Cal.com Event Type slug this domain books against (from the event type's
  // URL, e.g. cal.com/<CAL_USERNAME>/<slug>). Availability (hours, days) is
  // read live from this event type's own Cal.com schedule via getCalSlots —
  // there's deliberately no local businessHours config to drift out of sync
  // with it. Its configured duration in Cal.com must match durationMinutes
  // below — the local `appointments` row/exclusion-constraint still needs it.
  calEventTypeSlug: string
  // Whether set_booking_details must collect these before showing the
  // confirm card. Coffee needs both (an agronomist can't prepare or find
  // the farm without them); Phaneroo asks but doesn't force either —
  // a pastoral reason can be sensitive.
  reasonRequired: boolean
  requiresLocation: boolean
}

export const BOOKING_CONFIG: Record<BookingDomain, DomainBookingConfig> = {
  coffee: {
    label: 'Coffee farm-visit consultation',
    services: [{ name: 'Farm visit consultation', durationMinutes: 60 }],
    calEventTypeSlug: 'farm-visit-consultations', // matches cal.com/arthur-roykin/farm-visit-consultations
    reasonRequired: true,
    requiresLocation: true,
  },
  phaneroo: {
    label: 'Phaneroo pastoral appointment',
    services: [{ name: 'Pastoral counseling session', durationMinutes: 30 }],
    calEventTypeSlug: 'pastor-counselling', // matches cal.com/arthur-roykin/pastor-counselling
    reasonRequired: false,
    requiresLocation: false,
  },
}
