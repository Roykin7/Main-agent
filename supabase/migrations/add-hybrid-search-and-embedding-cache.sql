-- ── 1. Full-text search column on knowledge_chunks ─────────────────────────
-- Generated stored column: Postgres computes and maintains it automatically
-- whenever title or content changes. No trigger needed.
alter table knowledge_chunks
  add column if not exists search_vector tsvector
    generated always as (
      to_tsvector('english',
        coalesce(title, '') || ' ' || coalesce(content, ''))
    ) stored;

-- GIN index for fast full-text lookups
create index if not exists knowledge_chunks_fts_idx
  on knowledge_chunks using gin(search_vector);

-- ── 2. Hybrid search RPC (vector + keyword merged via Reciprocal Rank Fusion) ─
-- RRF score = 1/(k+rank_vector) + 1/(k+rank_keyword), k=60 is the standard.
-- This combines both signals without needing to tune similarity weights.
-- When query_text is null or blank, falls back to pure vector search.
create or replace function match_knowledge_chunks(
  query_embedding  vector(512),
  query_text       text    default null,
  match_count      int     default 8,
  filter_topic     text    default null
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
  with
  vector_results as (
    select
      id,
      row_number() over (order by embedding <=> query_embedding) as rank,
      (1 - (embedding <=> query_embedding))::float               as similarity
    from knowledge_chunks
    where
      (filter_topic is null or topic = filter_topic)
      and (1 - (embedding <=> query_embedding)) > 0.20
  ),
  keyword_results as (
    select
      id,
      row_number() over (
        order by ts_rank(search_vector,
          websearch_to_tsquery('english', query_text)) desc
      ) as rank
    from knowledge_chunks
    where
      (filter_topic is null or topic = filter_topic)
      and query_text is not null
      and length(trim(query_text)) > 0
      and search_vector @@ websearch_to_tsquery('english', query_text)
  ),
  rrf as (
    select
      coalesce(v.id, k.id)                              as id,
      coalesce(1.0 / (60 + v.rank), 0.0)
        + coalesce(1.0 / (60 + k.rank), 0.0)           as rrf_score,
      coalesce(v.similarity, 0.0)                       as similarity
    from       vector_results v
    full outer join keyword_results k on v.id = k.id
  )
  select
    kc.id,
    kc.topic,
    kc.title,
    kc.content,
    kc.source,
    r.similarity
  from rrf r
  join knowledge_chunks kc on kc.id = r.id
  order by r.rrf_score desc
  limit match_count;
$$;

-- ── 3. Embedding cache ──────────────────────────────────────────────────────
-- Stores Voyage AI embeddings keyed by MD5(normalized query text).
-- Cache hit = skip the Voyage API call entirely. Entries never expire —
-- voyage-3-lite embeddings are deterministic, so cached values stay valid.
create table if not exists embedding_cache (
  query_hash  text        primary key,
  embedding   vector(512) not null,
  created_at  timestamptz not null default now()
);
