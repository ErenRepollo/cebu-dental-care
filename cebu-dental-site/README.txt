Cebu Dental Care Center - appointment website
=============================================
Files
  index.html                         Patient site + the ONE login for patients and staff
  admin.html                         Staff dashboard (no login form; redirects to index.html if not staff)
  database/1..3 *.sql                Run in order (skip ones already run)
  database/4-accounts-qr.sql         NEW: Gmail-only accounts, bookings tied to account
  supabase/functions/send-receipt    NEW: emails the receipt + QR through Brevo

How login works
  Patients and admin both use "Log in / Sign up" on index.html.
  Staff accounts are sent to admin.html automatically. Patients stay on the site.
  Default admin: admin@cebudentalcare.com / CebuDental#Admin2026 (change it right away).

Setup
  1. Supabase > SQL Editor: run database/4-accounts-qr.sql.
  2. Authentication > Providers > Email: turn ON "Confirm email" (this is what proves the Gmail is real).
     Authentication > URL Configuration: set Site URL to your live website address.
  3. Brevo > Senders: verify the sender email you will use (check its inbox for Brevo's link).
  4. Deploy the email function (Supabase CLI):
       supabase functions deploy send-receipt
       supabase secrets set BREVO_API_KEY=<your NEW key> SENDER_EMAIL=<verified sender email>
     (or Dashboard > Edge Functions > send-receipt, paste index.ts, then add the two secrets)
  5. Upload index.html and admin.html to your host.

Security
  - NEVER put the Brevo key in an HTML file or chat. It lives only as a Supabase secret.
  - Booking QR content is "CDCC:<ref code>".
