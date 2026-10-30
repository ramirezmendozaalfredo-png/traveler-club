CREATE TABLE IF NOT EXISTS leads (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  nombre TEXT NOT NULL,
  whatsapp TEXT NOT NULL,
  email TEXT NOT NULL,
  destino TEXT NOT NULL,
  viajeros TEXT NOT NULL,
  fecha_inicio TEXT NOT NULL,
  fecha_fin TEXT NOT NULL,
  mensaje TEXT DEFAULT '',
  privacy_consent INTEGER NOT NULL DEFAULT 0,
  whatsapp_consent INTEGER NOT NULL DEFAULT 0,
  preferred_contact_time TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'Nuevo prospecto',
  email_status TEXT NOT NULL DEFAULT 'pendiente',
  whatsapp_status TEXT NOT NULL DEFAULT 'no configurado',
  source TEXT NOT NULL DEFAULT 'web-cotizar',
  internal_notes TEXT DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);
