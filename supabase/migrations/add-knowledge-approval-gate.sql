-- Gates future writes to the shared knowledge base and diagnosis-case memory
-- behind human review, without touching what's already live.
--
-- Both knowledge_chunks (via store_knowledge) and diagnosis_cases (via
-- store_diagnosis_case) can be written to directly by the LLM based on a
-- single WhatsApp conversation, with only keyword-level guardrails in app
-- code. A confidently-worded false claim passes those guardrails easily and
-- becomes permanent, authoritative-looking content served to every other
-- farmer — and for diagnosis_cases specifically, a wrong diagnosis stored as
-- a "confirmed case" gets surfaced as supporting evidence for future similar
-- symptoms, compounding the error.
--
-- Existing rows are grandfathered in as approved=true (this is a guardrail
-- on *future* writes, not a retroactive purge — most existing knowledge_chunks
-- rows are seeded/vetted content, and unapproving all existing diagnosis_cases
-- would silently stop search_diagnosis_cases from returning anything until
-- someone reviews years of backlog). Review pending entries with:
--   npm run review-pending

alter table knowledge_chunks add column if not exists approved boolean not null default true;
alter table diagnosis_cases  add column if not exists approved boolean not null default true;

-- ── Retrieval: only serve approved content ─────────────────────────────────

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
      approved
      and (filter_topic is null or topic = filter_topic)
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
      approved
      and (filter_topic is null or topic = filter_topic)
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

create or replace function match_diagnosis_cases(
  query_embedding vector(512),
  match_count     int default 3
)
returns table (
  id                  bigint,
  symptom_description text,
  affected_part       text,
  diagnosis           text,
  treatment           text,
  crop_type           text,
  region              text,
  similarity          float
)
language sql stable
as $$
  select
    id,
    symptom_description,
    affected_part,
    diagnosis,
    treatment,
    crop_type,
    region,
    1 - (embedding <=> query_embedding) as similarity
  from diagnosis_cases
  where embedding is not null and approved
  order by embedding <=> query_embedding
  limit match_count;
$$;

-- ── Review queue: everything currently awaiting a human decision ──────────

create or replace view pending_knowledge_chunks as
  select id, topic, title, content, source, created_at
  from knowledge_chunks
  where not approved
  order by created_at asc;

create or replace view pending_diagnosis_cases as
  select id, symptom_description, affected_part, diagnosis, treatment, crop_type, region, created_at
  from diagnosis_cases
  where not approved
  order by created_at asc;
