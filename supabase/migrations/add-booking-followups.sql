-- Booking UX overhaul: capture why/where a booking is for, track reminder
-- delivery, and add short-lived draft state for the slot-pick -> confirm
-- flow (one active draft per phone, same PK-as-mutex idiom as phone_locks).
alter table appointments add column if not exists reason text;
alter table appointments add column if not exists location text;
alter table appointments add column if not exists reminder_sent boolean not null default false;

create table if not exists pending_bookings (
  phone                  text         primary key,
  kind                   text         not null check (kind in ('book', 'reschedule')),
  target_appointment_id  bigint,      -- set when kind = 'reschedule'
  domain                 text         not null check (domain in ('coffee', 'phaneroo')),
  service_name           text         not null,
  starts_at              timestamptz  not null,
  ends_at                timestamptz  not null,
  attendee_name          text,
  reason                 text,
  location               text,
  created_at             timestamptz  not null default now(),
  expires_at             timestamptz  not null default (now() + interval '15 minutes')
);

alter table pending_bookings enable row level security;
