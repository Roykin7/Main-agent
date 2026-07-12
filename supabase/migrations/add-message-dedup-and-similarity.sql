-- ── Message deduplication ────────────────────────────────────────────────────
-- Stores Meta's message_id so duplicate webhook deliveries can be detected
-- and ignored before running the expensive AI pipeline.
alter table messages
  add column if not exists message_id text;

-- Unique index only on non-null values (model replies have no Meta message_id)
create unique index if not exists messages_message_id_idx
  on messages (message_id)
  where message_id is not null;

-- ── Similarity threshold on knowledge search ─────────────────────────────────
-- The old RPC returned top-k regardless of quality. Adding a 0.3 floor means
-- ZOE only gets chunks that genuinely match — no more hallucinating around
-- low-relevance results when the KB has nothing on the topic.
create or replace function match_knowledge_chunks(
  query_embedding vector(512),
  match_count     int default 8,
  filter_topic    text default null
)
returns table (
  id         bigint,
  topic      text,
  title      text,
  content    text,
  source     text,
  similarity float
)
language sql stable
as $$
  select
    id,
    topic,
    title,
    content,
    source,
    1 - (embedding <=> query_embedding) as similarity
  from knowledge_chunks
  where
    (filter_topic is null or topic = filter_topic)
    and (1 - (embedding <=> query_embedding)) > 0.30
  order by embedding <=> query_embedding
  limit match_count;
$$;

-- ── new_converts: one active registration per phone ───────────────────────────
-- Prevents someone from accidentally being registered multiple times.
-- Uses a partial unique index so the constraint only blocks duplicates
-- where phaneroo_notified is already true (confirmed registrations).
-- A failed first attempt (notified=false) can be retried safely.
create unique index if not exists new_converts_phone_notified_idx
  on new_converts (phone)
  where phaneroo_notified = true;
