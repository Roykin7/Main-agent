-- Migration: resize knowledge_chunks embedding from vector(1024) to vector(512)
-- Required because voyage-3-lite outputs 512-dimensional vectors.
-- Run this in the Supabase SQL Editor, then re-run seed scripts.

-- 1. Drop the existing column and index
drop index if exists knowledge_chunks_embedding_idx;
alter table knowledge_chunks drop column if exists embedding;

-- 2. Add the 512-dim column
alter table knowledge_chunks add column embedding vector(512);

-- 3. Recreate the index
create index knowledge_chunks_embedding_idx
  on knowledge_chunks using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- 4. Update the search RPC to use 512 dims
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
