-- Durable record of conversations handed off to a human, plus a best-effort
-- email notification. Until now "escalation" was just text ZOE says in a
-- reply (see lib/zoe-prompt.ts ESCALATION section) — nothing was logged and
-- no one was actually notified. This is the durable side of that: a row here
-- is recoverable even if the notification email fails or gets missed.
create table if not exists escalations (
  id         bigserial    primary key,
  phone      text         not null,
  reason     text         not null check (reason in ('pastoral_crisis', 'coffee_emergency', 'human_handoff_request')),
  summary    text         not null,
  notified   boolean      not null default false,
  created_at timestamptz  not null default now()
);
create index if not exists escalations_phone_idx on escalations (phone, created_at);

-- App only ever accesses Postgres with the service_role key (see lib/supabase.ts),
-- which bypasses RLS. Enabling it here from the start closes off anon/authenticated
-- access via PostgREST for this table too.
alter table escalations enable row level security;
