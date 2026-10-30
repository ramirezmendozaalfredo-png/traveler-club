const HEADERS = [
  "ID", "Fecha de registro", "Nombre", "WhatsApp", "Correo electrónico",
  "Destino", "Viajeros", "Fecha de inicio", "Fecha de regreso", "Mensaje",
  "Acepta privacidad", "Acepta WhatsApp", "Horario preferido",
  "Estado", "Estado correo", "Estado WhatsApp", "Fuente", "Notas internas"
];

function doPost(e) {
  const expected = PropertiesService.getScriptProperties().getProperty("TRAVELER_SECRET");
  const supplied = e && e.parameter ? e.parameter.token : "";
  if (!expected || !supplied || supplied !== expected) {
    return output({ ok: false, error: "No autorizado" });
  }

  let lead;
  try { lead = JSON.parse(e.postData.contents); }
  catch (_) { return output({ ok: false, error: "JSON inválido" }); }

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName("Prospectos");
    if (!sheet) sheet = ss.insertSheet("Prospectos");
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(HEADERS);
      sheet.setFrozenRows(1);
      sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight("bold");
      sheet.autoResizeColumns(1, HEADERS.length);
    }
    sheet.appendRow([
      lead.id || "", lead.created_at || "", lead.nombre || "", lead.whatsapp || "",
      lead.email || "", lead.destino || "", lead.viajeros || "", lead.fecha_inicio || "",
      lead.fecha_fin || "", lead.mensaje || "", lead.privacy_consent ? "Sí" : "No",
      lead.whatsapp_consent ? "Sí" : "No", lead.preferred_contact_time || "",
      lead.status || "Nuevo prospecto", lead.email_status || "pendiente",
      lead.whatsapp_status || "no configurado", lead.source || "web-cotizar", ""
    ]);
    return output({ ok: true });
  } finally {
    lock.releaseLock();
  }
}

function output(value) {
  return ContentService.createTextOutput(JSON.stringify(value))
    .setMimeType(ContentService.MimeType.JSON);
}
