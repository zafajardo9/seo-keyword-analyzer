/**
 * Force-creates all DB tables and lists what's in the public schema.
 * Run with: npx tsx scripts/init-db.ts
 *
 * Reads DATABASE_URL from .env.local (loaded by tsx via dotenv flag).
 */
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });
loadEnv(); // also try .env

import { neon } from "@neondatabase/serverless";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("ERROR: DATABASE_URL is not set in .env.local or .env");
  process.exit(1);
}

const sql = neon(databaseUrl);
const safeUrl: string = databaseUrl;

async function main() {
  console.log("Connected to:", safeUrl.replace(/:[^:@]+@/, ":***@"));
  console.log("");

  console.log("Creating tables…");

  await sql`
    CREATE TABLE IF NOT EXISTS api_keys (
      id INTEGER PRIMARY KEY DEFAULT 1,
      gemini_key TEXT,
      firecrawl_key TEXT,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT api_keys_singleton CHECK (id = 1)
    )
  `;
  console.log("  api_keys                ✓");

  await sql`
    CREATE TABLE IF NOT EXISTS user_preferences (
      id INTEGER PRIMARY KEY DEFAULT 1,
      model_id TEXT,
      indexnow_state JSONB,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT user_preferences_singleton CHECK (id = 1)
    )
  `;
  console.log("  user_preferences        ✓");

  await sql`
    CREATE TABLE IF NOT EXISTS company_research_runs (
      id TEXT PRIMARY KEY,
      run_data JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  console.log("  company_research_runs   ✓");

  await sql`
    CREATE TABLE IF NOT EXISTS analysis_cache (
      url TEXT PRIMARY KEY,
      entry_data JSONB NOT NULL,
      timestamp BIGINT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  console.log("  analysis_cache          ✓");

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
  console.log("  tool_history            ✓");

  await sql`
    CREATE INDEX IF NOT EXISTS tool_history_tool_idx
    ON tool_history (tool, updated_at DESC)
  `;
  console.log("  tool_history_tool_idx   ✓");

  console.log("");
  console.log("Tables present in public schema:");
  const tables = await sql`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
    ORDER BY table_name
  `;
  for (const t of tables) {
    const counts = await sql.query(
      `SELECT COUNT(*)::int AS n FROM "${t.table_name}"`,
    );
    console.log(`  ${t.table_name.padEnd(24)} ${counts[0]?.n ?? 0} rows`);
  }
  console.log("");
  console.log("Done.");
}

main().catch((err) => {
  console.error("FAILED:", err);
  process.exit(1);
});
