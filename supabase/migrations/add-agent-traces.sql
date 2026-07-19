-- ── Agent execution traces ───────────────────────────────────────────────────
-- Records every request ZOE processes with timing, tool chain, and outcomes.
-- Unlike interaction_feedback (quality signals only), this captures the full
-- execution fingerprint so specific failures can be traced and debugged.
--
-- No user message text is stored — only metadata. phone_hash is SHA-256
-- of the phone number so conversations can be grouped without storing PII.
create table if not exists agent_traces (
  id                bigserial    primary key,
  trace_id          text         not null,                     -- "{phone_last4}_{epoch_ms}"
  phone_hash        text         not null,                     -- SHA-256 of phone (first 16 hex chars)
  input_type        text         not null default 'text',      -- text | audio | image | location
  rounds_used       int          not null default 1,           -- how many LLM rounds fired
  tools_called      jsonb,                                     -- [{name,round,durationMs,resultChars,timedOut}]
  verify_corrected  bool         not null default false,
  had_empty_results bool         not null default false,
  timed_out_tools   int          not null default 0,           -- how many tools hit the 12s cap
  final_reply_chars int,
  total_duration_ms int,
  created_at        timestamptz  not null default now()
);

-- Fast lookup by user (for per-user conversation debugging)
create index if not exists agent_traces_phone_hash_idx
  on agent_traces (phone_hash, created_at desc);

-- Fast time-range queries for dashboards / check-feedback
create index if not exists agent_traces_created_at_idx
  on agent_traces (created_at desc);
