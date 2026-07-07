-- ZOE database schema
-- Run this once against your Supabase project (SQL Editor or `supabase db push`).

create extension if not exists vector;

-- Conversation history, keyed by WhatsApp phone number.
create table if not exists messages (
  id bigserial primary key,
  phone text not null,
  role text not null check (role in ('user', 'model')),
  content text not null,
  created_at timestamptz not null default now()
);
create index if not exists messages_phone_created_at_idx on messages (phone, created_at);

-- Knowledge base chunks, retrieved via vector similarity search.
create table if not exists knowledge_chunks (
  id bigserial primary key,
  topic text not null check (topic in ('coffee', 'phaneroo')),
  title text,
  content text not null,
  embedding vector(768),
  source text,
  created_at timestamptz not null default now()
);
create index if not exists knowledge_chunks_embedding_idx
  on knowledge_chunks using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- Daily devotions, keyed by date (Phaneroo has posted these since 2013).
-- Empty/sparse for now; bulk-imported in a later phase.
create table if not exists devotions (
  id bigserial primary key,
  devo_date date unique not null,
  title text,
  scripture_ref text,
  content text not null,
  source_url text
);
create index if not exists devotions_devo_date_idx on devotions (devo_date);

-- Rolling summaries for long conversations. Updated every 10 messages once the
-- raw history window fills, so ZOE remembers context beyond the last 20 messages.
create table if not exists conversation_summaries (
  phone text primary key,
  summary text not null,
  updated_at timestamptz not null default now()
);

-- RPC used by lib/knowledge.ts to find the top-k most relevant chunks
-- for a given query embedding, optionally filtered by topic.
create or replace function match_knowledge_chunks(
  query_embedding vector(768),
  match_count int default 5,
  filter_topic text default null
)
returns table (
  id bigint,
  topic text,
  title text,
  content text,
  source text,
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
  where filter_topic is null or topic = filter_topic
  order by embedding <=> query_embedding
  limit match_count;
$$;
