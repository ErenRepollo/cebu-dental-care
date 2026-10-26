-- Run AFTER 1, 2, 3, 4-accounts-qr. Supabase > SQL Editor. Safe to re-run.
-- Trigger only: it does NOT touch book_appointment, so "login required" stays in place.
-- Replace CHANGE_ME with the SAME value you set as WEBHOOK_SECRET.
create extension if not exists pg_net with schema extensions;

create or replace function public.notify_appointment() returns trigger
language plpgsql security definer set search_path = public, extensions as $$
begin
  begin
    perform net.http_post(
      url     := 'https://ircukhvpmbvrprqiqauk.supabase.co/functions/v1/notify',
      headers := jsonb_build_object('Content-Type','application/json','x-webhook-secret','CHANGE_ME'),
      body    := jsonb_build_object('type', TG_OP, 'record', to_jsonb(NEW),
                   'old_record', case when TG_OP = 'UPDATE' then to_jsonb(OLD) else null end)
    );
  exception when others then
    null;  -- an email problem must never block a booking
  end;
  return NEW;
end $$;

drop trigger if exists notify_appointments on public.appointments;
create trigger notify_appointments
after insert or update of status on public.appointments
for each row execute function public.notify_appointment();
