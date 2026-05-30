# Channel Sync (iCal) cron

The endpoint `GET|POST /api/cron/ical-sync` pulls every **active** external iCal
feed (`room_ical_feeds` where `is_active` and `url <> ''`), parses the VEVENTs,
and blocks local inventory for those date ranges using the race-safe
`reserve_room_inventory` RPC (decrement-units strategy). It re-syncs cleanly each
run: prior `external:<channel>` rows for a room are released + deleted, then
re-created from the current feed.

It does nothing on its own — a scheduler must trigger it.

## Required env

| Var                   | Purpose                                                                          |
| --------------------- | -------------------------------------------------------------------------------- |
| `CRON_SECRET`         | Required. Auth check; the route returns `503 cron_unconfigured` when unset.      |
| `NEXT_PUBLIC_APP_URL` | Used by the export feed when no request host is available. Not needed by import. |

`CRON_SECRET` is already set in local `.env`. For production (Firebase App
Hosting) add it as a Secret Manager secret referenced from `apphosting.yaml`
(see that file's `env:` block) or set it in the hosting environment.

## Auth

Present `CRON_SECRET` **either** as a header **or** a query param (header wins):

```
x-cron-secret: <CRON_SECRET>          # preferred
# or
/api/cron/ical-sync?secret=<CRON_SECRET>
```

Missing/wrong → `401 unauthorized`. Both GET and POST are accepted.

## Recommended schedule

Every **15–30 minutes**. Channels publish iCal updates on their own cadence
(usually every few minutes to an hour), so 15–30 min keeps inventory fresh
without hammering their endpoints.

## Wiring options

### Supabase `pg_cron` + `pg_net` (recommended — same DB as the data)

This project deploys the Next.js app on Firebase App Hosting and its data lives
in Supabase, so the most reliable scheduler is Supabase's own `pg_cron`. Run the
SQL in `supabase/cron/ical-sync.sql` **once** in the Supabase SQL editor, after
replacing the two placeholders:

- `YOUR_APP_DOMAIN` → your deployed app origin (e.g. `https://tixandtripsegypt.com`)
- `YOUR_CRON_SECRET` → the value of `CRON_SECRET` from `.env`

It enables the `pg_cron` + `pg_net` extensions, stores the secret in a DB
setting, and schedules a job named `ical-sync` every 20 minutes. To change the
cadence, re-run `cron.schedule('ical-sync', '<cron expr>', …)`. To stop it:
`select cron.unschedule('ical-sync');`.

### External scheduler (cron-job.org, Cloudflare Workers, GitHub Actions)

Any HTTP scheduler works. Point it at
`https://YOUR_APP_DOMAIN/api/cron/ical-sync` every 15–30 min and either set the
`x-cron-secret` header or append `?secret=<CRON_SECRET>`.

### Vercel Cron

Not applicable to this deployment (Firebase App Hosting), but if migrated: add a
`vercel.json` `crons` entry hitting `/api/cron/ical-sync?secret=...` (Vercel Cron
can't set custom headers, so use the query-param form).

## Response shape

```json
{ "ok": true, "processed": 2, "imported": 14, "failed": 0, "results": [ ... ] }
```

`processed === 0` is normal when no agency has added import feeds yet.

## Manual trigger

Hotel operators can run a sync on demand from **Admin → Channel Sync → “Sync
now”** (server action, no secret needed — it's gated by agency membership).

## Operational notes

- Imported blocks are stored as `hotel_bookings` rows with
  `source = 'external:<channel-host>'`, `status='confirmed'`, zero price.
- The outbound export feed (`/api/ical/export/<token>`) only includes **direct**
  bookings — external blocks are never re-broadcast, preventing feedback loops.
- If a feed URL 404s or a date is already fully booked locally, that event is
  skipped and counted under `failed`/`skipped`; the run still succeeds.
