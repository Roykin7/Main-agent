-- Migration: switch from Gemini (768-dim) to Voyage AI (1024-dim)
-- Run this in the Supabase SQL Editor BEFORE redeploying.
--
-- WARNING: This drops and recreates the embedding column on knowledge_chunks.
-- All existing embeddings will be cleared — you must re-run the seed scripts
-- after this migration to regenerate them with Voyage AI.

-- 1. Drop the old social_posts table (content moves into knowledge_chunks)
drop table if exists social_posts cascade;

-- 2. Recreate embedding column at 1024 dims on knowledge_chunks
alter table knowledge_chunks drop column if exists embedding;
alter table knowledge_chunks add column embedding vector(1024);

-- 3. Add source_id column for social post deduplication
alter table knowledge_chunks add column if not exists source_id text;

-- 4. Recreate the vector index
drop index if exists knowledge_chunks_embedding_idx;
create index knowledge_chunks_embedding_idx
  on knowledge_chunks using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- 5. Unique index to prevent duplicate social posts
create unique index if not exists knowledge_chunks_source_id_idx
  on knowledge_chunks (source, source_id)
  where source_id is not null;

-- 6. Update the RPC to use 1024-dim vectors
create or replace function match_knowledge_chunks(
  query_embedding vector(1024),
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

-- 7. Drop the old match_social_posts RPC (no longer needed)
drop function if exists match_social_posts(vector, int);
