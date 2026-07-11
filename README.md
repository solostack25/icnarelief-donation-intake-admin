# Donation Admin (donation-intake-admin)

Admin dashboard for the [donation-intake](../donation-intake) app — same
Supabase backend (ICNA Relief - In-kind Donation System project), separate
Next.js app, meant to live at `admin.icnareliefhouston.org`.

## Views

- **Today** (`/`) — every completed donation today, category totals, a table
  with donor info and a Push to Salesforce button per row.
- **Weekly** (`/weekly`) — last 7 days, small bar chart by day, same table.
- **Monthly** (`/monthly`) — current calendar month, bar chart by day, same
  table.

All three pull from the same `sessions` / `donations` / `donors` tables the
intake app writes to. Only `status = 'completed'` sessions show up.

## Auth

Gated by Supabase Auth (email/password) via `middleware.ts` — every route
redirects to `/login` unless there's a session. There's no self-signup flow
on purpose. To create your first admin login:

1. Supabase dashboard → Authentication → Users → **Add user**
2. Set an email + password
3. Sign in at `/login` with those

Add more admins the same way.

## Users page — creating admin logins from the dashboard

`/users` lets a signed-in admin create new logins and see who already has
access, instead of adding people in the Supabase dashboard by hand.

This needs the **service role key** (not the anon/publishable key) since
creating users is an elevated action. Get it from:

Supabase dashboard → Settings → API → reveal the `service_role` secret

Add it as `SUPABASE_SERVICE_ROLE_KEY` in `.env.local` and in Vercel.
**Server-only** — it's read inside API routes (`lib/supabaseAdmin.ts`) and
never sent to the browser. Don't prefix it with `NEXT_PUBLIC_` or it'll leak
into client bundles.

Heads up: this app doesn't have roles — anyone who can sign in has full
access, including creating more logins. Fine for a small trusted team; if
you ever want a "read-only" tier, that's a bigger change (a `roles` table +
checks on each page), just flag it.

## Salesforce push — flow is built, just needs your credentials

Click "Push to Salesforce" on any row and it calls `/api/salesforce/push`,
which:

1. Loads the session + donor + donation line items from Supabase
2. Maps them onto Salesforce fields via `lib/salesforceMapping.ts`
3. Creates one header record + one child line-item record per category with
   qty > 0, via Salesforce's REST API
4. Marks the session `synced_to_salesforce = true` in Supabase on success

**Until you have real values, the button will show "Salesforce isn't
configured yet"** — it fails clearly instead of pretending to succeed.

### To turn it on once you have access:

1. **`lib/salesforceMapping.ts`** — replace every `TODO_REPLACE__...` with
   the real object/field API names from Salesforce (Setup → Object Manager
   → find your In-Kind Gift Inventory object → Fields & Relationships). This
   is the only file that should need edits for field-name changes.
2. **Env vars** — add to `.env.local` (and Vercel):
   ```
   SALESFORCE_INSTANCE_URL=https://yourorg.my.salesforce.com
   SALESFORCE_ACCESS_TOKEN=your-access-token
   ```
3. That's it — the push button will start working.

**Heads up on the access token:** this is wired up with a static token for
now, which is the fastest way to get it working but Salesforce tokens
expire. Once this is running for real (not just testing), it's worth
switching to a proper OAuth flow (JWT bearer grant with a Connected App is
the usual approach for server-to-server integrations like this) so it
doesn't quietly stop working. Flag it and I can wire that up when you're
ready.

## Setup

1. `npm install`
2. `.env.local` already has the Supabase URL/key filled in (same project as
   the intake app). Leave Salesforce vars blank for now.
3. `npm run dev`
4. Create your admin login (see Auth above)
5. Deploy to Vercel, point `admin.icnareliefhouston.org` at it (same CNAME
   approach as the intake app's subdomain)

## Notes

- Category totals cards and labels come from `lib/categories.ts` — copied
  from the intake app so labels always match. If you add/rename categories
  there, copy the change here too.
- Queries are written as separate calls merged in JS rather than relational
  joins, since the newer `sb_publishable_` key format can fail silently on
  joins.
- The weekly/monthly bar charts are plain CSS (no chart library) — simple
  and dependency-free. Fine to swap for `recharts` later if you want
  something fancier.
