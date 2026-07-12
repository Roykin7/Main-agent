-- Experience library: stores ZOE interaction quality signals for pattern analysis.
-- Lets us see which domains/topics produce corrections, empty results, or timeouts.
create table if not exists interaction_feedback (
  id         bigserial    primary key,
  domain     text         not null check (domain in ('coffee', 'phaneroo', 'general')),
  question_summary   text,
  had_empty_results  boolean not null default false,
  verify_corrected   boolean not null default false,
  max_rounds_reached boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists interaction_feedback_domain_idx on interaction_feedback (domain, created_at);

-- Case-based diagnosis memory: stores confirmed plant disease/pest diagnoses.
-- Searched by symptom description so similar past cases can inform new diagnoses.
create table if not exists diagnosis_cases (
  id                   bigserial    primary key,
  symptom_description  text         not null,
  affected_part        text,
  diagnosis            text         not null,
  treatment            text         not null,
  crop_type            text         not null default 'arabica',
  region               text,
  embedding            vector(512),
  created_at           timestamptz  not null default now()
);
create index if not exists diagnosis_cases_embedding_idx
  on diagnosis_cases using ivfflat (embedding vector_cosine_ops)
  with (lists = 10);

-- New converts registered via ZOE WhatsApp.
-- Phone is the WhatsApp number (already known from the conversation).
-- phaneroo_notified tracks whether the info@phaneroo.org email was sent.
create table if not exists new_converts (
  id                  bigserial    primary key,
  phone               text         not null,
  first_name          text         not null,
  last_name           text         not null,
  gender              text         not null check (gender in ('Male', 'Female')),
  city                text,
  country             text         not null default 'Uganda',
  email               text,
  watching_from       text         not null check (watching_from in ('online', 'physical')),
  consent             boolean      not null default true,
  phaneroo_notified   boolean      not null default false,
  created_at          timestamptz  not null default now()
);
create index if not exists new_converts_phone_idx on new_converts (phone);
create index if not exists new_converts_created_at_idx on new_converts (created_at);

-- RPC: top-k most similar past diagnoses for a symptom embedding.
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
  where embedding is not null
  order by embedding <=> query_embedding
  limit match_count;
$$;
