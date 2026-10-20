-- Creates a SECOND admin login and marks it as staff.
-- Run AFTER 2 and 4 in Supabase > SQL Editor.
--
--   Email:    admin@gmail.com
--   Password: admin123
--
-- IMPORTANT: sign in at /admin.html and click "Change password" right away.
-- Anyone who has this file knows the default password until you change it.

create extension if not exists pgcrypto;

do $$
declare
  uid uuid := gen_random_uuid();
  mail text := 'admin@gmail.com';
begin
  if not exists (select 1 from auth.users where email = mail) then
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, email_change, email_change_token_new, recovery_token)
    values (
      '00000000-0000-0000-0000-000000000000', uid, 'authenticated', 'authenticated', mail,
      crypt('admin123', gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', '');

    insert into auth.identities (
      id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    values (
      gen_random_uuid(), uid, uid::text,
      jsonb_build_object('sub', uid::text, 'email', mail, 'email_verified', true),
      'email', now(), now(), now());
  end if;

  insert into public.staff (user_id)
  select id from auth.users where email = mail
  on conflict do nothing;
end $$;
