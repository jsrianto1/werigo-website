/* Database setup doctor.

   Reads .env.local (or the ambient environment) and reports exactly
   what is still missing between "fresh clone" and "customer database
   working": variables, connection, key type, tables, functions and the
   admin allowlist. Nothing is written to the database.

     node scripts/db-setup.mjs          # check the setup
     node scripts/db-setup.mjs --sql    # print all migrations in order,
                                        # ready to paste into the
                                        # Supabase SQL editor

   See SUPABASE-SETUP.md for the full walkthrough.
*/
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const MIGRATIONS_DIR = "supabase/migrations";
const REQUIRED_TABLES = [
  "bookings",
  "booking_events",
  "customers",
  "form_submissions",
];
// Probed over PostgREST, which resolves an RPC by the *names* of the keys
// in the body — so an empty `{}` would look for a zero-argument overload
// and report "missing" for a function that is perfectly there. Each
// payload below therefore names the required parameters, and is chosen so
// the function raises before it writes anything.
const REQUIRED_FUNCTIONS = [
  { name: "capture_submission", payload: { p: {} } },
  {
    name: "upsert_customer",
    payload: { p_full_name: "", p_email: "", p_whatsapp: "" },
  },
];

/* ---------- --sql: one pasteable script ---------- */

function migrationFiles() {
  return readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();
}

if (process.argv.includes("--sql")) {
  const parts = migrationFiles().map(
    (f) =>
      `-- ===== ${f} =====\n${readFileSync(join(MIGRATIONS_DIR, f), "utf8")}`
  );
  process.stdout.write(parts.join("\n\n"));
  process.exit(0);
}

/* ---------- Environment ---------- */

// Minimal .env parser: no dependency, no interpolation, quotes stripped.
function loadEnvFile(path) {
  if (!existsSync(path)) return null;
  const out = {};
  for (const raw of readFileSync(path, "utf8").split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

const fileEnv = loadEnvFile(".env.local");
const env = { ...(fileEnv ?? {}), ...process.env };
const pick = (...names) => {
  for (const n of names) {
    const v = env[n]?.trim();
    if (v) return v;
  }
  return "";
};

// A trailing slash copied from the browser address bar is harmless; strip
// it so the check passes and the probe URLs stay clean.
const url = pick("SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL").replace(/\/+$/, "");
const secretKey = pick("SUPABASE_SECRET_KEY", "SUPABASE_SERVICE_ROLE_KEY");
const publishableKey = pick(
  "SUPABASE_PUBLISHABLE_KEY",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"
);
const adminEmails = pick("ADMIN_EMAILS");
const whatsapp = pick("NEXT_PUBLIC_WHATSAPP_NUMBER");

/** Mirrors isPublishableKey() in src/lib/supabaseServer.ts. */
function isPublishableKey(key) {
  if (key.startsWith("sb_publishable_")) return true;
  const parts = key.split(".");
  if (parts.length === 3) {
    try {
      const payload = JSON.parse(
        Buffer.from(parts[1], "base64url").toString("utf8")
      );
      return payload.role === "anon";
    } catch {
      /* not a JWT */
    }
  }
  return false;
}

/* ---------- Reporting ---------- */

const checks = [];
const add = (ok, label, hint) => checks.push({ ok, label, hint });

add(
  Boolean(fileEnv),
  ".env.local exists",
  "Copy .env.example to .env.local and fill it in."
);
add(
  /^https:\/\/[a-z0-9-]+\.supabase\.(co|in)$/.test(url),
  `Supabase URL is set${url ? ` (${url})` : ""}`,
  "Supabase dashboard → Project Settings → Data API → Project URL."
);
add(
  Boolean(secretKey),
  "Server key is set",
  "Project Settings → API Keys → secret key. Put it in SUPABASE_SECRET_KEY."
);
// Only meaningful once a key is present; an empty key is already
// reported by the check above.
if (secretKey) {
  add(
    !isPublishableKey(secretKey),
    "Server key is a secret key, not a publishable one",
    "SUPABASE_SECRET_KEY holds an anon/publishable key. The server refuses to touch the database with it."
  );
}
add(
  Boolean(publishableKey),
  "Publishable key is set",
  "Needed for admin sign-in. Project Settings → API Keys → publishable key."
);
if (publishableKey) {
  add(
    isPublishableKey(publishableKey),
    "Publishable key is the anon key, not a secret one",
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY reaches the browser. A secret key here would leak full database access."
  );
}
add(
  adminEmails.split(",").filter((e) => e.includes("@")).length > 0,
  `Admin allowlist is set${adminEmails ? ` (${adminEmails})` : ""}`,
  "ADMIN_EMAILS must list the staff emails allowed into /admin, comma separated."
);
add(
  Boolean(whatsapp) && whatsapp !== "620000000000",
  "Business WhatsApp number is real",
  "NEXT_PUBLIC_WHATSAPP_NUMBER is still the 620000000000 placeholder, so booking requests go nowhere."
);

/* ---------- Live database probes ---------- */

const canProbe = Boolean(url) && Boolean(secretKey) && !isPublishableKey(secretKey);

async function rest(path, init = {}) {
  return fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: secretKey,
      Authorization: `Bearer ${secretKey}`,
      ...(init.headers ?? {}),
    },
  });
}

let missingTables = [];
if (canProbe) {
  let reachable = false;
  let authOk = false;
  try {
    const res = await rest("bookings?select=id&limit=1");
    reachable = true;
    authOk = res.status !== 401 && res.status !== 403;
  } catch (err) {
    add(false, "Supabase is reachable", `Network error: ${err.message}`);
  }
  if (reachable) {
    add(true, "Supabase is reachable", "");
    add(
      authOk,
      "Server key is accepted",
      "Supabase answered 401/403. The key is wrong, revoked, or from another project."
    );

    if (authOk) {
      for (const table of REQUIRED_TABLES) {
        const res = await rest(`${table}?select=*&limit=0`);
        const ok = res.ok;
        if (!ok) missingTables.push(table);
        add(
          ok,
          `Table ${table} exists`,
          "Run the migrations: node scripts/db-setup.mjs --sql, then paste into the Supabase SQL editor."
        );
      }
      for (const fn of REQUIRED_FUNCTIONS) {
        // The function raises on this payload before writing anything,
        // so any answer other than "not in the schema cache" proves it
        // exists.
        const res = await rest(`rpc/${fn.name}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(fn.payload),
        });
        const body = await res.text();
        const missing = res.status === 404 || body.includes("PGRST202");
        add(
          !missing,
          `Function ${fn.name}() exists`,
          "The customers migration has not been applied yet."
        );
      }
    }
  }
} else {
  add(
    false,
    "Supabase probes",
    "Skipped: fill in the URL and the secret key first, then run this again."
  );
}

/* ---------- Output ---------- */

const pad = (s, n) => s + " ".repeat(Math.max(0, n - s.length));
console.log("\nWerigo database setup\n");
for (const c of checks) {
  console.log(`  ${c.ok ? "OK  " : "TODO"}  ${pad(c.label, 52)}`);
  if (!c.ok && c.hint) console.log(`        ${c.hint}`);
}

const failed = checks.filter((c) => !c.ok);
console.log("");
if (failed.length === 0) {
  console.log("Everything is in place. Start the site with: npm run dev");
  console.log("Then sign in at http://localhost:3000/admin/customers\n");
} else {
  console.log(
    `${failed.length} item${failed.length === 1 ? "" : "s"} left. See SUPABASE-SETUP.md for the step by step.\n`
  );
}
process.exit(failed.length === 0 ? 0 : 1);
