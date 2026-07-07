-- ZOE database schema
-- Run this once against your Supabase project (SQL Editor or `supabase db push`).
-- Embeddings use Voyage AI voyage-3 (1024 dimensions).

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

-- Unified knowledge base: seeded content, social media posts, and user-contributed facts.
-- source values: 'manual', 'twitter', 'facebook', 'user-contributed'
-- source_id: used to deduplicate social posts (stores tweet/post ID)
create table if not exists knowledge_chunks (
  id bigserial primary key,
  topic text not null check (topic in ('coffee', 'phaneroo')),
  title text,
  content text not null,
  embedding vector(512),
  source text,
  source_id text,
  created_at timestamptz not null default now()
);
create index if not exists knowledge_chunks_embedding_idx
  on knowledge_chunks using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);
-- Prevents duplicate social posts from being inserted
create unique index if not exists knowledge_chunks_source_id_idx
  on knowledge_chunks (source, source_id)
  where source_id is not null;

-- Daily devotions, keyed by date.
create table if not exists devotions (
  id bigserial primary key,
  devo_date date unique not null,
  title text,
  scripture_ref text,
  content text not null,
  source_url text
);
create index if not exists devotions_devo_date_idx on devotions (devo_date);

-- Rolling summaries for long conversations.
create table if not exists conversation_summaries (
  phone text primary key,
  summary text not null,
  updated_at timestamptz not null default now()
);

-- RPC: top-k most relevant knowledge chunks for a query embedding.
create or replace function match_knowledge_chunks(
  query_embedding vector(512),
  match_count int default 8,
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
