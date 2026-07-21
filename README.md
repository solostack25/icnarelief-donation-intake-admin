# Donation Admin (donation-intake-admin)

Admin dashboard for the [donation-intake](../donation-intake) app — same
Supabase backend (ICNA Relief - In-kind Donation System project), separate
Next.js app, meant to live at `admin.icnareliefhouston.org`.

## Views

- **Today** (`/`) — every completed donation today, program totals ($ +
  item counts), a table with donor info, invoice download links, and a
  Push to Salesforce button per row.
- **Weekly** (`/weekly`) — last 7 days, small bar chart by day, same table.
- **Monthly** (`/monthly`) — current calendar month, bar chart by day, same
  table.

All three pull from the same `sessions` / `donations` / `donors` tables the
intake app writes to. Only `status = 'completed'` sessions show up.

## Item pricing model

Donations are now real, priced items (212 of them) rather than generic
categories — `data/items.json` / `data/programs.json` are copied from the
intake app (`donation-intake`) and **must be kept in sync** with it; if you
add/reprice an item there, copy `data/items.json` here too. Each
`donations` row carries `item_code`, `item_name`, `condition`
(`new`/`used`/`na`), `program`, `program_code`, `unit_price`, `qty`, and
`is_manual_price` (for the handful of bulk food items priced at intake
instead of from the price list). See the intake app's README for the full
model — this app only reads it.

## Invoices

Every session with an `invoice_id` gets two kinds of generated PDF, built
from its `donations` rows on the fly (nothing is pre-rendered or stored) —
click **Donor** / **Backend** on any row in the sessions table:

- **`/api/invoices/donor?sessionId=...`** — one donor-facing receipt,
  itemized by item name/condition/qty, **no dollar amounts**.
- **`/api/invoices/backend?sessionId=...`** — one invoice **per program**
  touched in that session, each showing only that program's items with $
  amounts and a subtotal, numbered as the session's `invoice_id` + `-` +
  that program's code (e.g. a session that touched Refugee Services and
  Hunger Prevention produces a 2-page PDF: `TXHOU-07202026-001-RCS` and
  `TXHOU-07202026-001-HPS`).

The data-building logic lives in `lib/invoices.ts` (plain functions, easy
to unit test) and the actual PDF layout in `lib/renderInvoicePdf.ts`
(using `pdf-lib` — pure JS, no native deps, safe on Vercel serverless).
Want a "print all today's invoices at once" button, or emailed receipts
instead of/alongside the download links? Say the word.

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
3. Creates one header record + one child line-item record per
   (item, condition) with qty > 0 — each line item now carries its own
   item name, condition, quantity, unit price, line total, and program
   (there's no single session-level "program" anymore, since one session
   can touch multiple programs)
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

- Program totals cards come from `lib/items.ts` + `lib/programs.ts` /
  `data/*.json` — copied from the intake app so labels, prices, and codes
  always match. If you add/reprice items or programs there, copy the
  `data/` folder change here too.
- Queries are written as separate calls merged in JS rather than relational
  joins, since the newer `sb_publishable_` key format can fail silently on
  joins.
- The weekly/monthly bar charts are plain CSS (no chart library) — simple
  and dependency-free. Fine to swap for `recharts` later if you want
  something fancier.
- Invoice PDFs are generated on request, not stored — if you want them
  archived (e.g. to Supabase Storage) so a link survives even if pricing
  data changes later, that's a small addition to the two invoice API
  routes.
