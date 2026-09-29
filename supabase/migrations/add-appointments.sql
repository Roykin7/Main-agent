-- Appointment booking (coffee farm visits + Phaneroo pastoral sessions) against
-- a single shared Google Calendar. The exclusion constraint below is the real
-- guard against double-booking — it's enforced atomically by Postgres on
-- insert, so there's no check-then-insert race window the way a "query
-- freebusy, then create" approach would have under concurrent bookings.
create extension if not exists btree_gist;

create table if not exists appointments (
  id              bigserial    primary key,
  domain          text         not null check (domain in ('coffee', 'phaneroo')),
  service_name    text         not null,
  phone           text         not null,
  attendee_name   text         not null,
  starts_at       timestamptz  not null,
  ends_at         timestamptz  not null,
  google_event_id text,
  status          text         not null default 'confirmed' check (status in ('confirmed', 'cancelled')),
  created_at      timestamptz  not null default now(),
  exclude using gist (tstzrange(starts_at, ends_at) with &&) where (status = 'confirmed')
);
create index if not exists appointments_phone_idx on appointments (phone, starts_at);

alter table appointments enable row level security;
