export async function onRequestPost({ request, env }) {
  const origin = request.headers.get("Origin");
  const host = new URL(request.url).origin;
  if (origin && origin !== host) return json({ error: "Origen no permitido." }, 403);
  if (!env.DB) return json({ error: "El sistema de registro aún no está configurado. Escríbenos a contacto@traveler-club.com." }, 503);

  let body;
  try { body = await request.json(); } catch { return json({ error: "Solicitud inválida." }, 400); }
  if (body.website) return json({ ok: true }); // honeypot anti-spam

  const required = ["nombre", "whatsapp", "email", "destino", "viajeros", "fecha_inicio", "fecha_fin"];
  for (const key of required) {
    if (typeof body[key] !== "string" || !body[key].trim()) return json({ error: "Completa todos los campos obligatorios." }, 400);
  }
  const email = body.email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: "Revisa el correo electrónico." }, 400);
  if (body.fecha_fin < body.fecha_inicio) return json({ error: "La fecha de regreso no puede ser anterior a la fecha de inicio." }, 400);

  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const lead = {
    id, created_at: createdAt,
    nombre: clean(body.nombre, 120), whatsapp: clean(body.whatsapp, 25), email,
    destino: clean(body.destino, 160), viajeros: clean(body.viajeros, 20),
    fecha_inicio: body.fecha_inicio, fecha_fin: body.fecha_fin,
    mensaje: clean(body.mensaje || "", 1500),
    privacy_consent: body.privacy_consent === true ? 1 : 0,
    whatsapp_consent: body.whatsapp_consent === true ? 1 : 0,
    preferred_contact_time: "", status: "Nuevo prospecto",
    email_status: "pendiente", whatsapp_status: "no configurado", source: "web-cotizar"
  };
  if (!lead.privacy_consent) return json({ error: "Necesitamos tu aceptación del aviso de privacidad para atender la solicitud." }, 400);

  try {
    await env.DB.prepare(`INSERT INTO leads
      (id, created_at, nombre, whatsapp, email, destino, viajeros, fecha_inicio, fecha_fin, mensaje, privacy_consent, whatsapp_consent, preferred_contact_time, status, email_status, whatsapp_status, source)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(lead.id, lead.created_at, lead.nombre, lead.whatsapp, lead.email, lead.destino, lead.viajeros,
        lead.fecha_inicio, lead.fecha_fin, lead.mensaje, lead.privacy_consent, lead.whatsapp_consent,
        lead.preferred_contact_time, lead.status, lead.email_status, lead.whatsapp_status, lead.source).run();
  } catch (error) {
    return json({ error: "No pudimos guardar tu solicitud. Inténtalo nuevamente." }, 500);
  }

  // Confirmation email to the traveler and notification to the agency.
  if (env.RESEND_API_KEY && env.EMAIL_FROM) {
    const customer = await sendEmail(env, {
      to: [lead.email], subject: "Recibimos tu solicitud de viaje | Traveler Club",
      html: `<p>Hola ${escapeHtml(lead.nombre)},</p><p>Hemos recibido tu solicitud de cotización para <strong>${escapeHtml(lead.destino)}</strong>.</p><p>Nuestro equipo de Traveler Club revisará los detalles y se pondrá en contacto contigo.</p><p>Gracias por confiar en Traveler Club.<br>Las mejores experiencias de tu vida.</p>`
    });
    lead.email_status = customer ? "enviado" : "error";
    await env.DB.prepare("UPDATE leads SET email_status = ? WHERE id = ?").bind(lead.email_status, id).run();
    await sendEmail(env, {
      to: ["contacto@traveler-club.com"], subject: "Nuevo prospecto web: " + lead.nombre,
      html: `<h2>Nuevo prospecto desde la web</h2><p><b>Nombre:</b> ${escapeHtml(lead.nombre)}</p><p><b>WhatsApp:</b> ${escapeHtml(lead.whatsapp)}</p><p><b>Correo:</b> ${escapeHtml(lead.email)}</p><p><b>Destino:</b> ${escapeHtml(lead.destino)}</p><p><b>Viajeros:</b> ${escapeHtml(lead.viajeros)}</p><p><b>Fechas:</b> ${escapeHtml(lead.fecha_inicio)} al ${escapeHtml(lead.fecha_fin)}</p><p><b>Notas:</b> ${escapeHtml(lead.mensaje)}</p><p><b>Permite WhatsApp:</b> ${lead.whatsapp_consent ? "Sí" : "No"}</p><p><b>ID:</b> ${id}</p>`
    });
  }

  // Optional private Apps Script webhook. It appends one row to Google Sheets.
  if (env.SHEETS_WEBHOOK_URL && env.SHEETS_WEBHOOK_SECRET) {
    try {
      const webhookUrl = new URL(env.SHEETS_WEBHOOK_URL);
      // Apps Script Web Apps expose query parameters through e.parameter.
      webhookUrl.searchParams.set("token", env.SHEETS_WEBHOOK_SECRET);
      await fetch(webhookUrl.toString(), {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(lead)
      });
    } catch (_) { /* D1 remains the source of truth; Sheets can be retried later. */ }
  }

  return json({ ok: true, id, email_status: lead.email_status }, 201);
}

async function sendEmail(env, message) {
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": "Bearer " + env.RESEND_API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ from: env.EMAIL_FROM, ...message })
    });
    return response.ok;
  } catch (_) { return false; }
}
function clean(value, max) { return String(value).replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, max); }
function escapeHtml(value) { return String(value).replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" })[c]); }
function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });
}
