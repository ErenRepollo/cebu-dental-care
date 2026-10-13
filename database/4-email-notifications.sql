-- Run AFTER 1, 2, 3 in Supabase > SQL Editor. Safe to re-run.
-- 1) email column + updated booking function
alter table public.appointments add column if not exists email text check (char_length(email) <= 200);

drop function if exists public.book_appointment(text,date,text,text,text,text);
create or replace function public.book_appointment(
  p_service text, p_date date, p_time text, p_name text, p_phone text, p_notes text, p_email text default null)
returns text language plpgsql security definer set search_path = public as $$
declare code text;
begin
  if p_date <= current_date then raise exception 'bad_date'; end if;
  if extract(dow from p_date) = 0 then raise exception 'closed_sunday'; end if;
  insert into appointments (service, appt_date, appt_time, patient_name, phone, notes, email)
  values (left(p_service,100), p_date, left(p_time,20), left(trim(p_name),100), left(trim(p_phone),30),
          left(p_notes,500), nullif(left(trim(coalesce(p_email,'')),200),''))
  returning ref_code into code;
  return code;
exception when unique_violation then raise exception 'slot_taken';
end $$;
grant execute on function public.book_appointment to anon, authenticated;

-- 2) Email trigger using pg_net (works on every Supabase project)
--    Replace CHANGE_ME below with the SAME value you set as WEBHOOK_SECRET.
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
