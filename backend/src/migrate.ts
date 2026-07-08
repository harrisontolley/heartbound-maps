import { existsSync, readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { Pool, neonConfig } from "@neondatabase/serverless";

// Tiny SQL migration runner. Numbered .sql files in ../migrations are applied in
// order, each in its own transaction, and recorded in the `_migrations` table so
// they run exactly once. No-ops cleanly when DATABASE_URL is unset (CI / hermetic
// tests) so it can run unconditionally. Run with: pnpm --filter @heartbound/backend migrate
//
// The HTTP neon() client only runs one statement at a time; multi-statement .sql
// files need the WebSocket Pool. Node 20.10+ ships a global WebSocket we point at.

// Dev only — on Vercel env vars are injected, there is no .env file.
if (existsSync(".env")) process.loadEnvFile(".env");

const migrationsDir = fileURLToPath(new URL("../migrations/", import.meta.url));

async function main(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.log("[migrate] DATABASE_URL unset — skipping (nothing to apply).");
    return;
  }

  if (!neonConfig.webSocketConstructor && globalThis.WebSocket) {
    neonConfig.webSocketConstructor = globalThis.WebSocket as never;
  }

  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  const pool = new Pool({ connectionString: url });
  try {
    await pool.query(
      `create table if not exists _migrations (
         name text primary key,
         applied_at timestamptz not null default now()
       )`,
    );
    const applied = new Set(
      (await pool.query<{ name: string }>("select name from _migrations")).rows.map(
        (r) => r.name,
      ),
    );

    let count = 0;
    for (const file of files) {
      if (applied.has(file)) continue;
      const sql = readFileSync(new URL(file, `file://${migrationsDir}`), "utf8");
      // One transaction per file: the schema lands atomically, and the tracker
      // row is written in the same tx so a mid-file failure leaves no trace.
      await pool.query(
        `begin;\n${sql}\n;insert into _migrations (name) values ('${file}');\ncommit;`,
      );
      console.log(`[migrate] applied ${file}`);
      count += 1;
    }
    console.log(
      count === 0 ? "[migrate] up to date." : `[migrate] done — ${count} applied.`,
    );
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error("[migrate] failed:", err);
  process.exit(1);
});
