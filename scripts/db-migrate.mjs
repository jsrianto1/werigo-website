/* Applies every db/migrations/*.sql file (in filename order) that has
   not been applied yet to the database in DATABASE_URL.

   Usage:  node scripts/db-migrate.mjs            (reads .env.local)
           DATABASE_URL=... node scripts/db-migrate.mjs
   Flags:  --status            list applied/pending without applying
           --dry-run           print pending file names only
           --baseline <file>   record <file> as applied without running it
                               (for a database where it was applied by hand)

   Each file runs inside its own transaction and is recorded in
   schema_migrations, so re-running is always safe. */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dir = path.join(root, "db", "migrations");

// Minimal .env.local loader (no dependency): KEY=VALUE, # comments, optional quotes.
if (!process.env.DATABASE_URL) {
  const envFile = path.join(root, ".env.local");
  if (existsSync(envFile)) {
    for (const line of readFileSync(envFile, "utf8").split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!m || process.env[m[1]]) continue;
      let v = m[2].trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
      process.env[m[1]] = v;
    }
  }
}

const url = process.env.DATABASE_URL?.trim();
if (!url) {
  console.error("DATABASE_URL is not set (put it in .env.local or the environment).");
  process.exit(2);
}
const host = (() => { try { return new URL(url).hostname; } catch { return ""; } })();
const local = ["localhost", "127.0.0.1", "::1", "[::1]"].includes(host);
const pool = new pg.Pool({ connectionString: url, ssl: local ? false : { rejectUnauthorized: true }, max: 1 });

const status = process.argv.includes("--status");
const dryRun = process.argv.includes("--dry-run");
const baselineIdx = process.argv.indexOf("--baseline");
const baseline = baselineIdx >= 0 ? process.argv[baselineIdx + 1] : undefined;

const files = readdirSync(dir).filter((f) => /^\d{4}_.+\.sql$/.test(f)).sort();

try {
  await pool.query(`create table if not exists schema_migrations (
    name text primary key,
    checksum text not null,
    applied_at timestamptz not null default now()
  )`);
  if (baseline) {
    if (!files.includes(baseline)) throw new Error(`unknown migration file: ${baseline}`);
    const sql = readFileSync(path.join(dir, baseline), "utf8");
    const checksum = createHash("sha256").update(sql).digest("hex").slice(0, 16);
    await pool.query(
      "insert into schema_migrations (name, checksum) values ($1, $2) on conflict (name) do nothing",
      [baseline, checksum]
    );
    console.log(`baseline ${baseline} recorded as applied`);
  }
  const { rows } = await pool.query("select name, checksum from schema_migrations");
  const applied = new Map(rows.map((r) => [r.name, r.checksum]));

  let pending = 0;
  for (const f of files) {
    const sql = readFileSync(path.join(dir, f), "utf8");
    const checksum = createHash("sha256").update(sql).digest("hex").slice(0, 16);
    if (applied.has(f)) {
      const same = applied.get(f) === checksum;
      console.log(`${same ? "applied " : "CHANGED "} ${f}${same ? "" : "  (file edited after it was applied — write a new migration instead)"}`);
      continue;
    }
    pending++;
    if (status || dryRun) {
      console.log(`pending  ${f}`);
      continue;
    }
    const client = await pool.connect();
    try {
      await client.query("begin");
      await client.query(sql);
      await client.query("insert into schema_migrations (name, checksum) values ($1, $2)", [f, checksum]);
      await client.query("commit");
      console.log(`applied  ${f}`);
    } catch (err) {
      await client.query("rollback").catch(() => {});
      console.error(`FAILED   ${f}: ${err.message}`);
      process.exitCode = 1;
      break;
    } finally {
      client.release();
    }
  }
  if (pending === 0) console.log("Database is up to date.");
} catch (err) {
  console.error(`Migration run failed: ${err.message}`);
  process.exitCode = 1;
} finally {
  await pool.end();
}
