import { neon } from "@neondatabase/serverless";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  // Throw at first usage rather than module load to keep build working
  console.warn("[db] DATABASE_URL is not set");
}

export const sql = neon(databaseUrl ?? "");

let initPromise: Promise<void> | null = null;

export function ensureSchema(): Promise<void> {
  if (initPromise) return initPromise;
  initPromise = (async () => {
    await sql`
      CREATE TABLE IF NOT EXISTS api_keys (
        id INTEGER PRIMARY KEY DEFAULT 1,
        gemini_key TEXT,
        firecrawl_key TEXT,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT api_keys_singleton CHECK (id = 1)
      )
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS user_preferences (
        id INTEGER PRIMARY KEY DEFAULT 1,
        model_id TEXT,
        indexnow_state JSONB,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT user_preferences_singleton CHECK (id = 1)
      )
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS company_research_runs (
        id TEXT PRIMARY KEY,
        run_data JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS analysis_cache (
        url TEXT PRIMARY KEY,
        entry_data JSONB NOT NULL,
        timestamp BIGINT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS tool_history (
        id TEXT PRIMARY KEY,
        tool TEXT NOT NULL,
        label TEXT NOT NULL,
        payload JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS tool_history_tool_idx
      ON tool_history (tool, updated_at DESC)
    `;
    // Add google_sa_json column if it was created before this migration
    await sql`
      ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS google_sa_json TEXT
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS shared_reports (
        share_key TEXT PRIMARY KEY,
        tool TEXT NOT NULL,
        label TEXT NOT NULL,
        payload JSONB NOT NULL,
        view_count INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        payload JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS connected_sites (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        domain TEXT NOT NULL,
        token TEXT UNIQUE NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS crawl_logs (
        id BIGSERIAL PRIMARY KEY,
        site_id TEXT NOT NULL,
        path TEXT NOT NULL,
        user_agent TEXT,
        bot_name TEXT,
        bot_company TEXT,
        is_ai_bot BOOLEAN NOT NULL DEFAULT FALSE,
        ts TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS crawl_logs_site_ts_idx
      ON crawl_logs (site_id, ts DESC)
    `;
  })().catch((err) => {
    initPromise = null;
    throw err;
  });
  return initPromise;
}
