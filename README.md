# ZOE

ZOE is a WhatsApp assistant that talks about two things: **coffee** and **Phaneroo Ministries International**. It answers from a knowledge base stored in Supabase, which can be updated at any time without redeploying the app.

This is the MVP described in the project plan: receive a WhatsApp message, retrieve relevant knowledge, reply naturally, stay on topic, and admit when it doesn't know something.

## Stack

- Next.js 14 (App Router) + TypeScript, deployed on Vercel
- Supabase (Postgres + `pgvector`) for conversation history and the knowledge base
- Gemini API (`gemini-2.0-flash` for chat, `text-embedding-004` for embeddings)
- WhatsApp Cloud API (Meta)

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Copy `.env.local.example` to `.env.local` and fill in your credentials:

```bash
cp .env.local.example .env.local
```

| Variable | Where to get it |
| --- | --- |
| `WHATSAPP_PHONE_NUMBER_ID` | Meta App > WhatsApp > API Setup |
| `WHATSAPP_ACCESS_TOKEN` | Meta App > WhatsApp > API Setup (use a permanent token for production) |
| `WHATSAPP_APP_SECRET` | Meta App > Settings > Basic |
| `WHATSAPP_VERIFY_TOKEN` | Any string you choose - used during webhook setup below |
| `GEMINI_API_KEY` | Google AI Studio |
| `SUPABASE_URL` | Supabase project > Settings > API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase project > Settings > API (service role, server-side only - never expose to a client) |
| `BIBLE_API_KEY` | (Optional) Sign up at [scripture.api.bible](https://scripture.api.bible) for a free key - lets ZOE quote real Bible verses |
| `BIBLE_ID_KJV`, `BIBLE_ID_NKJV`, `BIBLE_ID_AMP`, `BIBLE_ID_MSG` | (Optional) Bible IDs from the same API for each translation - see "Bible verse lookups" below |

### 3. Set up the database

In the Supabase SQL Editor, run [`supabase/schema.sql`](supabase/schema.sql). This enables `pgvector` and creates:

- `messages` - conversation history per phone number
- `knowledge_chunks` - knowledge base entries with embeddings, searched via the `match_knowledge_chunks` function
- `devotions` - daily devotions keyed by date (empty for now, populated in a later phase)

### 4. Seed a starter knowledge base

```bash
npm run seed
```

This embeds and inserts a small set of general coffee facts, Phaneroo Ministries entries, and Bible word studies (see [`scripts/seed-knowledge.ts`](scripts/seed-knowledge.ts)) so you can test ZOE end-to-end. The Phaneroo entries cover general public info (founding, leadership, service times, website resources) - add specific sermons, devotions, and event details over time (see "Updating the knowledge base" below).

### 4b. (Optional) Load this year's devotions

```bash
npm run ingest-devotions
```

Pulls Phaneroo's daily devotions for the current year from phaneroo.org into the `devotions` table and `knowledge_chunks` (see [`scripts/ingest-devotions.ts`](scripts/ingest-devotions.ts)). Safe to re-run - it only adds new devotions. Pass a year to backfill a different one, e.g. `npm run ingest-devotions -- 2025`.

### 5. Run locally and expose the webhook

```bash
npm run dev
```

Use a tunnel (e.g. `ngrok http 3000`) to get a public HTTPS URL for `/api/webhook`.

### 6. Configure the WhatsApp webhook

In your Meta App > WhatsApp > Configuration:

- Callback URL: `https://<your-tunnel-or-vercel-url>/api/webhook`
- Verify token: the value you set for `WHATSAPP_VERIFY_TOKEN`
- Subscribe to the `messages` field

Meta will call the webhook's `GET` endpoint to verify it, then send incoming messages to the `POST` endpoint.

### 7. Deploy

Deploy to Vercel and set the same environment variables in the Vercel project settings. Update the webhook callback URL in Meta to your production URL.

## Bible verse lookups

If `BIBLE_API_KEY` and the `BIBLE_ID_*` variables are set, ZOE can quote real verses in KJV, NKJV, AMP, or MSG when a message contains a reference like "John 3:16" or "Psalm 23:1-3 in MSG" (see [`lib/bible.ts`](lib/bible.ts)). To set this up:

1. Sign up for a free account at [scripture.api.bible](https://scripture.api.bible) and create an application to get an API key. Set it as `BIBLE_API_KEY`.
2. Call `GET https://api.scripture.api.bible/v1/bibles` with header `api-key: <your key>` (or use their API explorer) to find the Bible IDs available to your key for KJV, NKJV, AMP, and MSG, and set `BIBLE_ID_KJV`, `BIBLE_ID_NKJV`, `BIBLE_ID_AMP`, `BIBLE_ID_MSG` accordingly.
3. NKJV, AMP, and MSG availability depends on your API.Bible plan/account approval - if a translation isn't available, leave that variable blank and ZOE will skip it (KJV is public domain and always available).

If these variables are left blank, ZOE simply won't quote verse text - everything else still works.

## Updating the knowledge base

Knowledge lives in the `knowledge_chunks` table (one row per fact/topic, with an embedding for retrieval). To add or update entries:

- **Quick edits**: insert/update rows directly in the Supabase Table Editor or SQL Editor. New/changed rows need an embedding - the easiest way is to add the entry to `scripts/seed-knowledge.ts` and re-run `npm run seed` (it's safe to re-run; each run inserts new rows, so remove or update outdated rows manually if replacing content).
- **Devotions**: run `npm run ingest-devotions` (see step 4b above) to pull devotions from phaneroo.org into the `devotions` table and `knowledge_chunks`, keyed by `devo_date` (YYYY-MM-DD). ZOE can also look these up directly via `getDevotion()` in [`lib/knowledge.ts`](lib/knowledge.ts) - this is wired up but not yet connected to the chat flow (planned for a later phase, e.g. "what's today's devotion?").

## Project structure

```
app/api/webhook/route.ts   # WhatsApp webhook (GET verify, POST handle messages)
lib/whatsapp.ts             # WhatsApp Cloud API helpers
lib/gemini.ts               # Gemini chat + embeddings
lib/zoe-prompt.ts           # ZOE's persona/system prompt
lib/knowledge.ts            # Knowledge base retrieval + devotion lookup
lib/bible.ts                # Bible verse lookups (KJV/NKJV/AMP/MSG)
lib/messages.ts             # Conversation history helpers
lib/supabase.ts             # Supabase client
supabase/schema.sql         # Database schema
scripts/seed-knowledge.ts   # Starter knowledge base seed (coffee, Phaneroo, word studies)
scripts/ingest-devotions.ts # Pulls daily devotions from phaneroo.org
```

## Roadmap (future phases)

- Ingest coffee PDFs into `knowledge_chunks` (topic='coffee')
- Expand Phaneroo entries with specific sermons, events, and beliefs from public sources, calibrated to Apostle Grace Lubega's preaching tone
- Bulk-import devotions since 2013 (run `npm run ingest-devotions -- <year>` for each year) and connect `getDevotion()` to the chat flow (so ZOE can answer "what's the devotion for [date]?")
- Transcribe and ingest sermon audio, with metadata (date, scripture references) so ZOE can point users to relevant sermons
- Conversation memory/summarization for long chats, simple admin UI for knowledge base updates, multi-language support
