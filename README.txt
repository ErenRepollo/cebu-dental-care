Cebu Dental Care Center - appointment website
=============================================
DEPLOY ONLY index.html AND admin.html. Keep everything else private
(database/, supabase/ and this README must NOT be public).

Default admin (database/3): admin@cebudentalcare.com / CebuDental#Admin2026
  -> sign in at /admin.html and click "Change password" immediately.

Database: run database/1 (skip if done), 2, 3, then 4 in Supabase SQL Editor.

Email (Brevo) setup
  1. Brevo > Senders: verify erenrepollo@gmail.com. Create a NEW API key
     (delete any key that was shared in chat).
  2. Terminal:
       npm i -g supabase
       supabase login
       supabase link --project-ref ircukhvpmbvrprqiqauk
       supabase secrets set BREVO_API_KEY=your-new-key WEBHOOK_SECRET=pick-a-long-random-string
       supabase functions deploy notify --no-verify-jwt
  3. Edit database/4: replace CHANGE_ME with the same WEBHOOK_SECRET, then run it.
  4. Test: make a booking with your own email; check inbox and spam.
