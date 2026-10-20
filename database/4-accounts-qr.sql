-- Run AFTER 1, 2, 3. Supabase > SQL Editor.
-- Adds: customer accounts (Gmail only), bookings tied to the account, QR-ready refs.

alter table public.appointments add column if not exists user_id uuid references auth.users on delete set null;
alter table public.appointments add column if not exists email text;

-- Only real-format Gmail addresses can register (plus the default staff login)
create or replace function public.gmail_only() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.email is null or not (lower(new.email) ~ '^[a-z0-9._%+-]+@gmail\.com$'
                               or lower(new.email) = 'admin@cebudentalcare.com') then
    raise exception 'gmail_only';
  end if;
  return new;
end $$;
drop trigger if exists gmail_only_trg on auth.users;
create trigger gmail_only_trg before insert on auth.users
  for each row execute function public.gmail_only();

-- Customers can read only their own bookings
drop policy if exists "own read" on public.appointments;
create policy "own read" on public.appointments for select to authenticated using (user_id = auth.uid());

-- Booking now requires a logged-in account; the receipt email goes to the account email
create or replace function public.book_appointment(
  p_service text, p_date date, p_time text, p_name text, p_phone text, p_notes text)
returns text language plpgsql security definer set search_path = public as $$
declare code text; uid uuid := auth.uid(); mail text := auth.jwt()->>'email';
begin
  if uid is null then raise exception 'login_required'; end if;
  if p_date <= current_date then raise exception 'bad_date'; end if;
  if extract(dow from p_date) = 0 then raise exception 'closed_sunday'; end if;
  insert into appointments (service, appt_date, appt_time, patient_name, phone, notes, user_id, email)
  values (left(p_service,100), p_date, left(p_time,20), left(trim(p_name),100), left(trim(p_phone),30), left(p_notes,500), uid, mail)
  returning ref_code into code;
  return code;
exception when unique_violation then raise exception 'slot_taken';
end $$;

create or replace function public.cancel_my_appointment(p_id uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare n int;
begin
  update appointments set status = 'cancelled'
   where id = p_id and user_id = auth.uid()
     and status in ('pending','confirmed') and appt_date >= current_date;
  get diagnostics n = row_count;
  return n > 0;
end $$;

revoke execute on function public.book_appointment(text,date,text,text,text,text) from public, anon;
grant  execute on function public.book_appointment(text,date,text,text,text,text) to authenticated;
revoke execute on function public.lookup_appointment(text,text), public.cancel_appointment(text,text) from public, anon;
grant  execute on function public.cancel_my_appointment(uuid) to authenticated;
