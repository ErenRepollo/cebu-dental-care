// Supabase Edge Function: sends booking emails through Brevo.
// Secrets (never hard-code them): BREVO_API_KEY, WEBHOOK_SECRET
// Optional: SENDER_EMAIL, CLINIC_EMAIL
const BREVO = Deno.env.get("BREVO_API_KEY") ?? "";
const SECRET = Deno.env.get("WEBHOOK_SECRET") ?? "";
const FROM = { name: "Cebu Dental Care Center", email: Deno.env.get("SENDER_EMAIL") ?? "erenrepollo@gmail.com" };
const CLINIC = Deno.env.get("CLINIC_EMAIL") ?? FROM.email;

const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

const nice = (d: string) =>
  new Date(d + "T00:00:00Z").toLocaleDateString("en-PH", { weekday: "long", year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });

function details(r: any) {
  const row = (k: string, v: unknown) =>
    `<tr><td style="padding:4px 14px 4px 0;color:#4d6a72"><b>${k}</b></td><td style="padding:4px 0">${esc(v)}</td></tr>`;
  return `<table style="border-collapse:collapse">${row("Reference", r.ref_code)}${row("Service", r.service)}${row("Date", nice(r.appt_date))}${row("Time", r.appt_time)}${row("Name", r.patient_name)}${row("Phone", r.phone)}${r.email ? row("Email", r.email) : ""}${r.notes ? row("Notes", r.notes) : ""}</table>`;
}

const wrap = (title: string, body: string) =>
  `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;color:#12303a"><h2 style="color:#1f8a89">${title}</h2>${body}<p style="color:#4d6a72;font-size:13px;margin-top:24px">Cebu Dental Care Center, Unit 13, St. Patrick's Square, R. Aboitiz St, Cebu City. Tel (032) 253 3206 / +63 906 242 1519</p></div>`;

async function send(to: string, name: string, subject: string, html: string) {
  const r = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": BREVO, "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({ sender: FROM, to: [{ email: to, name }], subject, htmlContent: html }),
  });
  if (!r.ok) console.error("Brevo error", r.status, await r.text());
}

Deno.serve(async (req) => {
  if (!SECRET || req.headers.get("x-webhook-secret") !== SECRET) return new Response("forbidden", { status: 403 });
  const { type, record, old_record } = await req.json();
  if (!record) return new Response("ok");
  try {
    if (type === "INSERT") {
      await send(CLINIC, "Clinic", `New appointment request: ${record.patient_name}, ${record.appt_time}`,
        wrap("New appointment request", details(record) + "<p>Open the admin page to confirm it.</p>"));
      if (record.email)
        await send(record.email, record.patient_name, "We received your appointment request",
          wrap("Request received", `<p>Hi ${esc(record.patient_name)}, your slot is held. The clinic will contact you to confirm.</p>${details(record)}<p>Keep your reference code to view or cancel your booking on our website.</p>`));
    } else if (type === "UPDATE" && old_record?.status !== record.status && record.email) {
      // "confirmed" email (with QR) is sent by the send-receipt function, so it is skipped here.
      if (record.status === "cancelled")
        await send(record.email, record.patient_name, "Your appointment was cancelled",
          wrap("Appointment cancelled", `<p>Hi ${esc(record.patient_name)}, this appointment was cancelled. Call us or book a new time on our website.</p>${details(record)}`));
    }
  } catch (e) { console.error(e); }
  return new Response("ok");
});
