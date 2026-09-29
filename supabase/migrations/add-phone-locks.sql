-- Per-phone mutex so two near-simultaneous webhook deliveries from the same
-- number (e.g. a user re-sending because ZOE hasn't replied yet) don't race
-- two concurrent Vercel invocations through the same conversation history.
-- Uses a Postgres table, in keeping with this codebase's general preference
-- for DB-backed concurrency primitives over application-level locking infra
-- (see also add-message-dedup-and-similarity.sql) — but note this is an
-- active insert-then-steal-if-stale mutex (lib/phone-lock.ts), not the same
-- mechanism as message dedup, which is a plain check-then-act read guarded
-- by a unique index. Different problems, deliberately different solutions.
create table if not exists phone_locks (
  phone      text        primary key,
  locked_at  timestamptz not null
);

alter table phone_locks enable row level security;
