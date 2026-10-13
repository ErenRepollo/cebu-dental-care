-- Run once in Supabase > SQL Editor (safe to run on top of supabase.sql)

-- 1. Table changes
alter table public.appointments add column if not exists ref_code text unique
  default upper(substr(md5(gen_random_uuid()::text),1,6));
alter table public.appointments drop constraint if exists appointments_appt_date_check;
alter table public.appointments drop constraint if exists appointments_status_check;
alter table public.appointments add constraint appointments_status_check
  check (status in ('pending','confirmed','completed','cancelled'));

-- One active booking per time slot (cancelled ones free the slot)
create unique index if not exists uniq_active_slot
  on public.appointments (appt_date, appt_time) where status <> 'cancelled';

-- 2. Staff list: only these users can open the admin page
create table if not exists public.staff (user_id uuid primary key references auth.users on delete cascade);
alter table public.staff enable row level security;

create or replace function public.is_staff() returns boolean
language sql security definer stable set search_path = public as
$$ select exists (select 1 from public.staff where user_id = auth.uid()) $$;

-- 3. Policies: no direct public access; staff only
drop policy if exists "anon can create pending requests" on public.appointments;
drop policy if exists "staff can read" on public.appointments;
drop policy if exists "staff can update" on public.appointments;
create policy "staff read"   on public.appointments for select to authenticated using (public.is_staff());
create policy "staff update" on public.appointments for update to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "staff delete" on public.appointments for delete to authenticated using (public.is_staff());

-- 4. Public functions (the website calls these)
create or replace function public.book_appointment(
  p_service text, p_date date, p_time text, p_name text, p_phone text, p_notes text)
returns text language plpgsql security definer set search_path = public as $$
declare code text;
begin
  if p_date <= current_date then raise exception 'bad_date'; end if;
  if extract(dow from p_date) = 0 then raise exception 'closed_sunday'; end if;
  insert into appointments (service, appt_date, appt_time, patient_name, phone, notes)
  values (left(p_service,100), p_date, left(p_time,20), left(trim(p_name),100), left(trim(p_phone),30), left(p_notes,500))
  returning ref_code into code;
  return code;
exception when unique_violation then raise exception 'slot_taken';
end $$;

create or replace function public.booked_slots(p_date date) returns setof text
language sql security definer stable set search_path = public as
$$ select appt_time from appointments where appt_date = p_date and status <> 'cancelled' $$;

create or replace function public.lookup_appointment(p_code text, p_phone text)
returns table (service text, appt_date date, appt_time text, patient_name text, status text)
language sql security definer stable set search_path = public as
$$ select service, appt_date, appt_time, patient_name, status from appointments
   where ref_code = upper(trim(p_code))
     and regexp_replace(phone,'\D','','g') = regexp_replace(p_phone,'\D','','g') $$;

create or replace function public.cancel_appointment(p_code text, p_phone text)
returns boolean language plpgsql security definer set search_path = public as $$
declare n int;
begin
  update appointments set status = 'cancelled'
   where ref_code = upper(trim(p_code))
     and regexp_replace(phone,'\D','','g') = regexp_replace(p_phone,'\D','','g')
     and status in ('pending','confirmed') and appt_date >= current_date;
  get diagnostics n = row_count;
  return n > 0;
end $$;

grant execute on function public.book_appointment, public.booked_slots,
  public.lookup_appointment, public.cancel_appointment to anon, authenticated;
grant execute on function public.is_staff to authenticated;

-- 5. After creating your staff login in Authentication > Users, add it here:
-- insert into public.staff (user_id) select id from auth.users where email = 'YOUR-STAFF-EMAIL';
