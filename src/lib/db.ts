import { Pool, type PoolClient, type PoolConfig, type QueryResultRow } from "pg";

/**
 * PostgreSQL connection pool (server only).
 *
 * The database lives on the Werigo VPS and is reached over TLS; the
 * only exception is a localhost URL for local development, where TLS
 * is skipped. The pool is cached on globalThis so `next dev` hot
 * reloads do not open a new pool on every change.
 *
 * This module deliberately has no `server-only` import: the Better
 * Auth CLI loads `src/lib/auth.ts` (and therefore this file) outside
 * of Next.js to generate the auth schema.
 */

export function resolveDatabaseUrl(): string | undefined {
  const v = process.env.DATABASE_URL?.trim();
  return v || undefined;
}

export function isDatabaseConfigured(): boolean {
  return Boolean(resolveDatabaseUrl());
}

function sslFor(url: string): PoolConfig["ssl"] {
  let host = "";
  try {
    host = new URL(url).hostname;
  } catch {
    /* pg reports the malformed URL on first query */
  }
  if (host === "localhost" || host === "127.0.0.1" || host === "::1" || host === "[::1]") {
    return false;
  }
  // Public certificate (Let's Encrypt) on the VPS: full verification.
  return { rejectUnauthorized: true };
}

declare global {
  var __werigoPgPool: Pool | undefined;
}

export function getPool(): Pool {
  if (globalThis.__werigoPgPool) return globalThis.__werigoPgPool;
  const url = resolveDatabaseUrl();
  if (!url) {
    // Not configured (e.g. `next build` collecting route data without
    // env, or a deployment missing DATABASE_URL): return a pool whose
    // first query fails instead of throwing at import time. Callers
    // that need a clear answer check isDatabaseConfigured() first.
    console.warn("[db] DATABASE_URL is not set; database features are unavailable.");
    const dead = new Pool({
      host: "database-not-configured.invalid",
      connectionTimeoutMillis: 1_000,
      max: 1,
    });
    dead.on("error", () => {});
    globalThis.__werigoPgPool = dead;
    return dead;
  }
  const pool = new Pool({
    connectionString: url,
    ssl: sslFor(url),
    max: 5,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
    application_name: "werigo-web",
  });
  pool.on("error", (err) => {
    // Idle client dropped (e.g. database restart). The pool replaces it.
    console.error(`[db] idle client error: ${err.message.slice(0, 200)}`);
  });
  globalThis.__werigoPgPool = pool;
  return pool;
}

/** Run one query on the pool. */
export async function query<R extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = []
) {
  return getPool().query<R>(text, params);
}

/** Run `fn` inside a transaction; rolls back on throw. */
export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query("begin");
    const out = await fn(client);
    await client.query("commit");
    return out;
  } catch (err) {
    try {
      await client.query("rollback");
    } catch {
      /* connection already gone */
    }
    throw err;
  } finally {
    client.release();
  }
}
