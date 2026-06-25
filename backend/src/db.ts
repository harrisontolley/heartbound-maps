import { neon } from "@neondatabase/serverless";

// Neon is hosted and wired but feature-less for now: the only consumer is the
// /health/db check, which proves connectivity without any schema. Future
// features can build a real data layer (ORM, migrations) on top of this client.

let sqlClient: ReturnType<typeof neon> | null = null;

/** Returns a Neon client, or null when DATABASE_URL is not configured. */
export function getSql() {
  if (sqlClient) return sqlClient;
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  sqlClient = neon(url);
  return sqlClient;
}

/** Liveness check against Neon. Returns false if unconfigured or unreachable. */
export async function pingDb(): Promise<boolean> {
  const sql = getSql();
  if (!sql) return false;
  try {
    const rows = (await sql`select 1 as ok`) as Array<{ ok: number }>;
    return rows[0]?.ok === 1;
  } catch {
    return false;
  }
}
