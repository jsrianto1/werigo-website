# Database setup, from nothing

Werigo stores every form submission in Supabase (hosted PostgreSQL,
free tier is enough to start). This is the whole path from an empty
project to a working customer database. About 20 minutes.

At any point, run the doctor to see what is still missing:

```bash
node scripts/db-setup.mjs
```

It checks the variables, the connection, the key types, the tables,
the functions and the admin allowlist, and prints the next step for
each one. It never writes to the database.

---

## 1. Create the Supabase project

1. Sign up at <https://supabase.com> (GitHub or email).
2. **New project**:
   - **Name**: `werigo`
   - **Database password**: generate a strong one and store it in your
     password manager. You do not need it for the website, only for
     direct SQL access and backups.
   - **Region**: **Southeast Asia (Singapore)**. It is the closest to
     Bali, so every page that waits on the database is faster.
   - **Plan**: Free.
3. Wait for provisioning to finish, roughly two minutes.

## 2. Create the tables

Two migrations live in `supabase/migrations/`: the bookings schema and
the customer database. They must run in filename order.

**Option A, no tooling (recommended for the first time)**

```bash
node scripts/db-setup.mjs --sql | pbcopy
```

Supabase dashboard → **SQL Editor** → **New query** → paste → **Run**.
You should see `Success. No rows returned`.

**Option B, Supabase CLI**

```bash
npm i -g supabase
supabase login
supabase link --project-ref <your-project-ref>   # the xxxx in xxxx.supabase.co
supabase db push
```

Either way, check it landed: dashboard → **Table Editor** should list
`bookings`, `booking_events`, `customers` and `form_submissions`.

## 3. Copy the keys into `.env.local`

Dashboard → **Project Settings**:

| Where | Value | Variable in `.env.local` |
|---|---|---|
| Data API → Project URL | `https://xxxx.supabase.co` | `NEXT_PUBLIC_SUPABASE_URL` |
| API Keys → publishable (anon) | `sb_publishable_...` | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` |
| API Keys → secret | `sb_secret_...` | `SUPABASE_SECRET_KEY` |

Rules that matter:

- The **secret key must never** go into a `NEXT_PUBLIC_*` variable. Those
  are compiled into the browser bundle, and that key bypasses every
  security rule in the database.
- `.env.local` is git-ignored. Never commit real keys, and never paste
  them into chat, screenshots or issues. If one leaks, rotate it in
  Project Settings → API Keys.
- On an older project you may see `anon` / `service_role` JWTs instead.
  They work: put the `service_role` one in `SUPABASE_SERVICE_ROLE_KEY`.

## 4. Close public sign-up

Dashboard → **Authentication** → **Sign In / Providers** → Email →
turn **"Allow new users to sign up" OFF**.

Without this, anyone could create themselves an account. It would still
not get them into the admin (the email allowlist in step 5 blocks that),
but there is no reason to leave the door open.

## 5. Create your admin account

1. Dashboard → **Authentication** → **Users** → **Add user** → *Create
   new user*.
2. Enter your staff email and a strong password, and tick **Auto
   confirm user**.
3. Put that same email in `ADMIN_EMAILS` in `.env.local`, comma
   separated if there are several:

   ```
   ADMIN_EMAILS=owner@werigo.co,ops@werigo.co
   ```

Both are required. A Supabase session alone gets you nothing: the
server checks the allowlist on every request, so removing an email from
`ADMIN_EMAILS` revokes access immediately, without touching Supabase.

## 6. Set the real WhatsApp number

`NEXT_PUBLIC_WHATSAPP_NUMBER` is still `620000000000`, a placeholder.
Messages sent to it go nowhere. Replace it with the business number in
international format, digits only, no `+` and no spaces:

```
NEXT_PUBLIC_WHATSAPP_NUMBER=6281234567890
```

## 7. Verify

```bash
node scripts/db-setup.mjs     # every line should read OK
npm run dev
```

Then, in the browser:

1. <http://localhost:3000/contact> — send a test message. WhatsApp Web
   opens; you do not have to send anything there.
2. <http://localhost:3000/admin/customers> — sign in with the account
   from step 5. Your test message is in the list, with the full text and
   the page it came from.
3. <http://localhost:3000/api/health/db> should answer
   `{"configured":true,"reachable":true,"schemaReady":true,"customersReady":true}`.

Delete the test rows afterwards from the Table Editor, or leave them
and mark the submission as `spam`.

## 8. Deploy to Hostinger

hPanel → your Node.js app → **Environment variables**. Add the same
values, with one difference: use the production WhatsApp number and the
production admin emails.

```
NEXT_PUBLIC_BOOKING_MODE=whatsapp
NEXT_PUBLIC_WHATSAPP_NUMBER=...
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
SUPABASE_SECRET_KEY=...
ADMIN_EMAILS=...
```

Then redeploy from `main` (Node 24, `npm ci`, `npm run build`,
`npm run start`). `NEXT_PUBLIC_*` values are baked in at build time, so
changing one always needs a fresh deploy.

Check `https://werigo.co/api/health/db` after the deploy.

---

## Afterwards

**Backups.** Supabase free tier keeps daily backups. For a copy you
control: dashboard → Database → Backups, or

```bash
supabase db dump -f backup.sql --linked
```

Admin → `/admin/customers` → **CSV** also exports whatever the current
filters show, people or submissions, up to 5000 rows.

**Free tier limits.** 500 MB database and a pause after a week with no
activity. A form submission is roughly 1 KB, so the storage is not the
constraint. The pause is: a project nobody touched for seven days stops
answering until you resume it from the dashboard. A live site with real
traffic never gets there, but a staging project might.

**If something breaks.** `node scripts/db-setup.mjs` first, it names
the failing step. Server logs carry typed, redacted storage errors
(`[bookings] ... category=...`); customer data is never logged.

**Data you are now responsible for.** The database holds names, phone
numbers, emails and messages of real people. Keep the secret key out of
anything shared, keep `ADMIN_EMAILS` short, and remember that
`/privacy` still needs the retention period and the deletion process
written down. See the legal checklist at the bottom of the README.
