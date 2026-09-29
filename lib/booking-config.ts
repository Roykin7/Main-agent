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
  businessHours: {
    start: string // "HH:MM", 24-hour, Africa/Kampala
    end: string   // "HH:MM", 24-hour, Africa/Kampala
    days: number[] // 0=Sunday .. 6=Saturday
  }
  // Cal.com Event Type slug this domain books against (from the event type's
  // URL, e.g. cal.com/<CAL_USERNAME>/<slug>). Its configured duration in Cal.com
  // must match durationMinutes below — ZOE's own availability math assumes it does.
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
    businessHours: { start: '08:00', end: '17:00', days: [1, 2, 3, 4, 5] }, // Mon–Fri
    calEventTypeSlug: 'farm-visit-consultation', // placeholder — verify against your Cal.com event type
    reasonRequired: true,
    requiresLocation: true,
  },
  phaneroo: {
    label: 'Phaneroo pastoral appointment',
    services: [{ name: 'Pastoral counseling session', durationMinutes: 30 }],
    businessHours: { start: '14:00', end: '18:00', days: [2, 4] }, // Tue/Thu — placeholder
    calEventTypeSlug: 'pastoral-counseling-session', // placeholder — verify against your Cal.com event type
    reasonRequired: false,
    requiresLocation: false,
  },
}
