-- Curated reference photos for plant disease/pest diagnosis.
-- Populated manually (vetted sources only — UCDA/MAAIF/your own field photos).
-- ZOE checks this table first before ever falling back to a live web image
-- search, so the default case is a known-accurate, known-appropriate photo.
create table if not exists disease_images (
  id            bigserial    primary key,
  disease_name  text         not null,
  image_url     text         not null,
  caption       text,
  source        text,                       -- e.g. "UCDA", "MAAIF", "field photo"
  crop_type     text         default 'arabica',
  embedding     vector(512),
  created_at    timestamptz  not null default now()
);
create index if not exists disease_images_embedding_idx
  on disease_images using ivfflat (embedding vector_cosine_ops)
  with (lists = 5);

-- RPC: best-matching curated reference image for a disease/pest name or description.
create or replace function match_disease_images(
  query_embedding vector(512),
  match_count     int default 1
)
returns table (
  id           bigint,
  disease_name text,
  image_url    text,
  caption      text,
  source       text,
  similarity   float
)
language sql stable
as $$
  select
    id,
    disease_name,
    image_url,
    caption,
    source,
    1 - (embedding <=> query_embedding) as similarity
  from disease_images
  where embedding is not null
  order by embedding <=> query_embedding
  limit match_count;
$$;
