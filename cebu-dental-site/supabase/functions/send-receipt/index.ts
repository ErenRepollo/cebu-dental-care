// Sends the confirmed-appointment receipt (with QR code) through Brevo.
// The Brevo key lives ONLY here, as a secret (never in any HTML file).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
const esc = (v: unknown) =>
  String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const userDb = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });
    const staff = await userDb.rpc("is_staff");
    if (!staff.data) return json({ error: "Staff only" }, 403);

    const { id } = await req.json();
    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: a } = await admin.from("appointments").select("*").eq("id", id).single();
    if (!a) return json({ error: "Appointment not found" }, 404);
    if (a.status !== "confirmed") return json({ error: "Appointment is not confirmed" }, 400);
    if (!a.email) return json({ error: "No email on this booking" }, 400);

    const date = new Date(a.appt_date + "T00:00:00").toLocaleDateString("en-PH", {
      weekday: "long", year: "numeric", month: "long", day: "numeric", timeZone: "Asia/Manila" });
    const qr = "https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=8&data=" +
      encodeURIComponent("CDCC:" + a.ref_code);
    const row = (k: string, v: string) =>
      `<tr><td style="padding:6px 12px 6px 0;color:#4d6a72">${k}</td><td style="padding:6px 0;font-weight:600">${esc(v)}</td></tr>`;

    const html = `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;border:1px solid #c8e0dd;border-radius:16px;overflow:hidden;color:#12303a">
<div style="background:#1f8a89;color:#fff;padding:18px 24px"><h2 style="margin:0">Cebu Dental Care Center</h2><div>Appointment confirmed ✔</div></div>
<div style="padding:24px"><p>Hi ${esc(a.patient_name)}, your appointment is confirmed. Please show this QR code at the clinic.</p>
<table style="border-collapse:collapse;font-size:15px">${row("Reference", a.ref_code)}${row("Service", a.service)}${row("Date", date)}${row("Time", a.appt_time)}${row("Phone", a.phone)}</table>
<p style="text-align:center;margin:20px 0 6px"><img src="${qr}" width="220" height="220" alt="QR code ${esc(a.ref_code)}"></p>
<p style="text-align:center;font-size:22px;letter-spacing:4px;font-weight:700;margin:0">${esc(a.ref_code)}</p>
<p style="color:#4d6a72;font-size:13px">Bring a valid ID and arrive 10 minutes early. To cancel, log in on our website. Unit 13, St. Patrick's Square, R. Aboitiz St, Cebu City · (032) 253 3206</p></div></div>`;

    const r = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "api-key": Deno.env.get("BREVO_API_KEY")!, "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({
        sender: { name: "Cebu Dental Care Center", email: Deno.env.get("SENDER_EMAIL")! },
        to: [{ email: a.email, name: a.patient_name }],
        subject: `Appointment confirmed - ${a.ref_code}`,
        htmlContent: html,
      }),
    });
    if (!r.ok) return json({ error: "Brevo: " + (await r.text()) }, 502);
    return json({ ok: true });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
