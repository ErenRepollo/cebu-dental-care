Cebu Dental Care Center - appointment website
=============================================
Folder layout
  index.html                           Patient site + the ONE login for patients and staff
  admin.html                           Staff dashboard (redirects to index.html if not staff)
  images/                              Logo, icons, SVGs
  images/photos/                       Clinic photos (see the README inside)
  database/1..4, 5                     Run in order in Supabase > SQL Editor
  supabase/functions/send-receipt      Emails the receipt + QR (Send receipt button / on confirm)
  supabase/functions/notify            Automatic emails: new request (clinic + patient) and cancelled
  supabase/config.toml                 Makes "notify" callable by the database trigger

How login works
  Patients and admin both use "Log in / Sign up" on index.html.
  Staff accounts are sent to admin.html automatically. Patients stay on the site.
  Default admin: admin@cebudentalcare.com / CebuDental#Admin2026 -> CHANGE IT RIGHT AWAY.

Setup
  1. Supabase > SQL Editor: run database/1, 2, 3, then 4-accounts-qr.sql.
  2. Authentication > Providers > Email: turn ON "Confirm email".
     Authentication > URL Configuration: set Site URL to your live website address.
  3. Brevo > Senders: verify the sender email (check its inbox for Brevo's link).
     Use a Brevo API key (v3, starts with xkeysib-), not an SMTP key.
  4. Deploy both functions (Supabase CLI, from this folder):
       supabase functions deploy send-receipt
       supabase functions deploy notify --no-verify-jwt
       supabase secrets set BREVO_API_KEY=<your key> SENDER_EMAIL=<verified sender> WEBHOOK_SECRET=<random long text> CLINIC_EMAIL=<clinic inbox>
     (or Dashboard > Edge Functions: create "send-receipt" and "notify", paste each index.ts,
      turn OFF "Verify JWT" for notify, then add the secrets)
  5. Open database/5-email-notifications.sql, replace CHANGE_ME with your WEBHOOK_SECRET, run it.
  6. Upload index.html, admin.html and the images folder to your host.
     (Any host works. admin.html calls Supabase directly, so Vercel is not needed.)

Troubleshooting emails
  Receipt not sent: 404  -> send-receipt is not deployed with that exact name.
  Receipt not sent: 401  -> not logged in as staff / session expired; log in again.
  Receipt not sent: 403  -> account is not in the staff table.
  Brevo: ...             -> sender not verified or wrong API key.
  No automatic emails    -> check Edge Functions > notify > Logs; WEBHOOK_SECRET must match the SQL.

Security
  - NEVER put the Brevo key in an HTML file or chat. It lives only as a Supabase secret.
  - Booking QR content is "CDCC:<ref code>".
  - Do not create staff accounts with guessable passwords.
