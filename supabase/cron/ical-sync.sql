-- Channel Sync (iCal) scheduler — Supabase pg_cron + pg_net.
--
-- Run this ONCE in the Supabase SQL editor after replacing the two placeholders
-- below. It schedules POSTs to the app's /api/cron/ical-sync endpoint every
-- 20 minutes so external (Booking.com / Airbnb) reservations block local
-- inventory automatically. See docs/cron-ical-sync.md.
--
-- Placeholders to replace:
--   YOUR_APP_DOMAIN  -> deployed app origin, e.g. https://tixandtripsegypt.com
--   YOUR_CRON_SECRET -> value of CRON_SECRET from .env
--
-- Idempotent: safe to re-run (it unschedules any prior job of the same name
-- first). To change cadence, edit the schedule expression and re-run. To stop:
--   select cron.unschedule('ical-sync');

-- 1. Extensions (no-ops if already enabled).
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- 2. Store the cron secret as a database setting so it isn't inlined in the job
--    body. Re-run with a new value to rotate.
alter database postgres set "app.cron_secret" = 'YOUR_CRON_SECRET';

-- 3. (Re)schedule the job. Unschedule first so re-running doesn't duplicate it.
do $$
begin
  perform cron.unschedule('ical-sync');
exception
  when others then null; -- job did not exist yet
end $$;

select cron.schedule(
  'ical-sync',
  '*/20 * * * *',  -- every 20 minutes
  $$
  select net.http_post(
    url := 'YOUR_APP_DOMAIN/api/cron/ical-sync',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', current_setting('app.cron_secret', true)
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Verify:
--   select jobname, schedule, active from cron.job where jobname = 'ical-sync';
--   select * from cron.job_run_details order by start_time desc limit 5;
