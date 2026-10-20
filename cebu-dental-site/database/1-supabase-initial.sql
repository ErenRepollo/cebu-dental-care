-- Run in Supabase Dashboard > SQL Editor
create table if not exists public.appointments (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  service      text not null check (char_length(service) <= 100),
  appt_date    date not null check (appt_date > current_date),
  appt_time    text not null check (char_length(appt_time) <= 20),
  patient_name text not null check (char_length(patient_name) between 2 and 100),
  phone        text not null check (char_length(phone) between 7 and 30),
  notes        text check (char_length(notes) <= 500),
  status       text not null default 'pending'
               check (status in ('pending','confirmed','cancelled'))
);

alter table public.appointments enable row level security;

-- Website visitors (anon key) may only ADD requests, never read them.
create policy "anon can create pending requests"
  on public.appointments for insert
  to anon
  with check (status = 'pending');

-- Staff: sign in via Supabase Auth to view and manage requests.
create policy "staff can read" on public.appointments
  for select to authenticated using (true);
create policy "staff can update" on public.appointments
  for update to authenticated using (true) with check (true);
