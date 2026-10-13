Cebu Dental Care Center - appointment website
=============================================
Files
  index.html              Patient website
  admin.html              Staff dashboard (open at /admin.html)
  database/1-...sql       Initial table (skip if already run)
  database/2-...sql       Schema, staff roles, booking functions
  database/3-...sql       Creates the DEFAULT admin login

Default admin login
  Email:    admin@cebudentalcare.com
  Password: CebuDental#Admin2026
  Sign in at /admin.html, then click "Change password" immediately.

Setup
  1. Supabase > SQL Editor: run database/1 (skip if done), then 2, then 3.
  2. Authentication settings: turn OFF public sign-ups.
  3. Upload index.html and admin.html to the same host
     (Netlify, Vercel, GitHub Pages).

Security
  - Reset your Supabase database password; never put it in any web file.
  - Only the publishable key is in the HTML (meant to be public).
  - Assumed hours: Mon-Sat 9AM-6PM, 1-hour slots (edit "times" in index.html).
