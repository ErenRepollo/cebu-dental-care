// Vercel serverless function: emails the confirmed-appointment receipt (with QR code) via Brevo.
// Uses the Vercel env vars BREVO_API_KEY and SENDER_EMAIL. Only logged-in staff can call it.
const SB_URL = "https://ircukhvpmbvrprqiqauk.supabase.co";
const SB_KEY = "sb_publishable_bVZXbJoPjPGoWfCuQM1BSA_9UXNVysf";

const esc = (v) =>
  String(v == null ? "" : v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  try {
    const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
    if (!token) return res.status(401).json({ error: "Login required" });
    if (!process.env.BREVO_API_KEY || !process.env.SENDER_EMAIL)
      return res.status(500).json({ error: "BREVO_API_KEY / SENDER_EMAIL are not set in Vercel" });

    const h = { apikey: SB_KEY, Authorization: "Bearer " + token, "Content-Type": "application/json" };

    // Staff only (uses the caller's own login, so no service key is needed)
    const staff = await fetch(SB_URL + "/rest/v1/rpc/is_staff", { method: "POST", headers: h, body: "{}" }).then((r) => r.json());
    if (staff !== true) return res.status(403).json({ error: "Staff only" });

    const id = req.body && req.body.id;
    if (!/^[0-9a-f-]{36}$/i.test(String(id))) return res.status(400).json({ error: "Bad id" });

    const rows = await fetch(SB_URL + "/rest/v1/appointments?select=*&id=eq." + id, { headers: h }).then((r) => r.json());
    const a = Array.isArray(rows) && rows[0];
    if (!a) return res.status(404).json({ error: "Appointment not found" });
    if (a.status !== "confirmed") return res.status(400).json({ error: "Appointment is not confirmed" });
    if (!a.email) return res.status(400).json({ error: "No email on this booking" });

    const date = new Date(a.appt_date + "T00:00:00Z").toLocaleDateString("en-PH", {
      weekday: "long", year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });
    const qr = "https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=8&data=" + encodeURIComponent("CDCC:" + a.ref_code);
    const row = (k, v) =>
      `<tr><td style="padding:6px 12px 6px 0;color:#4d6a72">${k}</td><td style="padding:6px 0;font-weight:600">${esc(v)}</td></tr>`;

    const html = `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;border:1px solid #c8e0dd;border-radius:16px;overflow:hidden;color:#12303a">
<div style="background:#1f8a89;color:#fff;padding:18px 24px"><h2 style="margin:0">Cebu Dental Care Center</h2><div>Appointment confirmed &#10004;</div></div>
<div style="padding:24px"><p>Hi ${esc(a.patient_name)}, your appointment is confirmed. Please show this QR code at the clinic.</p>
<table style="border-collapse:collapse;font-size:15px">${row("Reference", a.ref_code)}${row("Service", a.service)}${row("Date", date)}${row("Time", a.appt_time)}${row("Phone", a.phone)}</table>
<p style="text-align:center;margin:20px 0 6px"><img src="${qr}" width="220" height="220" alt="QR code ${esc(a.ref_code)}"></p>
<p style="text-align:center;font-size:22px;letter-spacing:4px;font-weight:700;margin:0">${esc(a.ref_code)}</p>
<p style="color:#4d6a72;font-size:13px">Bring a valid ID and arrive 10 minutes early. To cancel, log in on our website. Unit 13, St. Patrick's Square, R. Aboitiz St, Cebu City &middot; (032) 253 3206</p></div></div>`;

    const r = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "api-key": process.env.BREVO_API_KEY, "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({
        sender: { name: "Cebu Dental Care Center", email: process.env.SENDER_EMAIL },
        to: [{ email: a.email, name: a.patient_name }],
        subject: "Appointment confirmed - " + a.ref_code,
        htmlContent: html,
      }),
    });
    if (!r.ok) return res.status(502).json({ error: "Brevo: " + (await r.text()) });
    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
};
