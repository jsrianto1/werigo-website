/* Creates or updates a staff account for /admin/bookings.

   Usage:
     node scripts/create-admin.mjs --email ops@werigo.co --name "Ops Team" [--role admin|super_admin]
   The password is asked for interactively (hidden), or taken from the
   ADMIN_PASSWORD environment variable for non-interactive use.

   Reads DATABASE_URL from .env.local (or the environment). If the
   email already exists, its password and role are updated instead
   (useful for password resets). Public sign-up stays disabled, so
   this script is the only way to create staff. */
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes } from "node:crypto";
import pg from "pg";
import { hashPassword } from "better-auth/crypto";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

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

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const email = arg("email")?.trim().toLowerCase();
const name = arg("name")?.trim();
const role = arg("role")?.trim() || "admin";

if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || !name) {
  console.error('Usage: node scripts/create-admin.mjs --email <email> --name "<name>" [--role admin|super_admin]');
  process.exit(2);
}
if (!["admin", "super_admin"].includes(role)) {
  console.error("--role must be admin or super_admin");
  process.exit(2);
}

async function askHidden(question) {
  if (!process.stdin.isTTY) {
    console.error("No terminal for the password prompt: set ADMIN_PASSWORD instead.");
    process.exit(2);
  }
  process.stdout.write(question);
  return new Promise((resolve) => {
    let buf = "";
    const onData = (ch) => {
      const c = ch.toString("utf8");
      if (c === "\n" || c === "\r" || c === "\u0004") {
        process.stdin.setRawMode(false);
        process.stdin.pause();
        process.stdin.removeListener("data", onData);
        process.stdout.write("\n");
        resolve(buf);
      } else if (c === "\u0003") {
        process.stdout.write("\n");
        process.exit(130);
      } else if (c === "\u007f" || c === "\b") {
        buf = buf.slice(0, -1);
      } else {
        buf += c;
      }
    };
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.on("data", onData);
  });
}

let password = process.env.ADMIN_PASSWORD;
if (!password) {
  password = await askHidden("Password (min 10 characters, hidden): ");
  const again = await askHidden("Repeat password: ");
  if (password !== again) {
    console.error("Passwords do not match.");
    process.exit(1);
  }
}
if (password.length < 10) {
  console.error("Password must be at least 10 characters.");
  process.exit(1);
}

const url = process.env.DATABASE_URL?.trim();
if (!url) {
  console.error("DATABASE_URL is not set.");
  process.exit(2);
}
const host = (() => { try { return new URL(url).hostname; } catch { return ""; } })();
const local = ["localhost", "127.0.0.1", "::1", "[::1]"].includes(host);
const pool = new pg.Pool({ connectionString: url, ssl: local ? false : { rejectUnauthorized: true }, max: 1 });

// Same id shape Better Auth uses (32 url-safe random characters).
const newId = () => randomBytes(24).toString("base64url").slice(0, 32);

const client = await pool.connect();
try {
  const hash = await hashPassword(password);
  await client.query("begin");
  const existing = await client.query('select id from "user" where lower(email) = $1', [email]);
  let userId = existing.rows[0]?.id;
  let action;
  if (userId) {
    await client.query(
      'update "user" set name = $2, role = $3, banned = false, "banReason" = null, "banExpires" = null, "updatedAt" = now() where id = $1',
      [userId, name, role]
    );
    const acc = await client.query(
      `update account set password = $2, "updatedAt" = now()
       where "userId" = $1 and "providerId" = 'credential' returning id`,
      [userId, hash]
    );
    if (acc.rowCount === 0) {
      await client.query(
        `insert into account (id, "accountId", "providerId", "userId", password, "createdAt", "updatedAt")
         values ($1, $2, 'credential', $2, $3, now(), now())`,
        [newId(), userId, hash]
      );
    }
    action = "updated";
  } else {
    userId = newId();
    await client.query(
      `insert into "user" (id, name, email, "emailVerified", role, "createdAt", "updatedAt")
       values ($1, $2, $3, true, $4, now(), now())`,
      [userId, name, email, role]
    );
    await client.query(
      `insert into account (id, "accountId", "providerId", "userId", password, "createdAt", "updatedAt")
       values ($1, $2, 'credential', $2, $3, now(), now())`,
      [newId(), userId, hash]
    );
    action = "created";
  }
  // Any old sessions of this user are invalidated on a password reset.
  await client.query('delete from session where "userId" = $1', [userId]);
  await client.query("commit");
  console.log(`Staff account ${action}: ${email} (${role}). Sign in at /admin/bookings.`);
} catch (err) {
  await client.query("rollback").catch(() => {});
  console.error(`Failed: ${err.message}`);
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}
