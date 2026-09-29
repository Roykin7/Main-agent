-- Per-phone mutex so two near-simultaneous webhook deliveries from the same
-- number (e.g. a user re-sending because ZOE hasn't replied yet) don't race
-- two concurrent Vercel invocations through the same conversation history.
-- Follows the same idiom already used for message dedup in this codebase
-- (a Postgres constraint, not application-level locking infra) — see
-- add-message-dedup-and-similarity.sql.
create table if not exists phone_locks (
  phone      text        primary key,
  locked_at  timestamptz not null
);

alter table phone_locks enable row level security;
