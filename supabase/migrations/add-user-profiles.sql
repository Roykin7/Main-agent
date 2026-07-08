-- Per-user memory: stores facts ZOE learns about individual users (keyed by WhatsApp phone number).
-- Each row holds an array of plain-text fact strings, e.g. "Grows Arabica in Mbale at 1600m".
-- Max 20 facts per user — oldest are dropped when the limit is hit (handled in app code).

CREATE TABLE IF NOT EXISTS user_profiles (
  phone       text        PRIMARY KEY,
  facts       text[]      NOT NULL DEFAULT '{}',
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Index so the webhook lookup (by phone) is fast even with many users.
CREATE INDEX IF NOT EXISTS user_profiles_phone_idx ON user_profiles (phone);
