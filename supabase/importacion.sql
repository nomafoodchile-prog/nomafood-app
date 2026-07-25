-- ══════════════════════════════════════════════════════════
--  Canal de importación desde China — solicitudes de interés
--  Captura leads desde la landing (sección "Importa desde China").
--  Se ven en Comercial › Importaciones.
-- ══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS import_requests (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero            TEXT UNIQUE DEFAULT 'IMP-' || to_char(NOW(), 'YYYYMMDD') || '-' || floor(random()*9000+1000)::TEXT,
  tipo              TEXT,          -- 'Maquinaria' | 'Productos' | 'Ambos'
  rubro             TEXT,          -- rubro / categoría
  descripcion       TEXT,          -- qué busca importar
  cantidad_estimada TEXT,
  presupuesto       TEXT,
  nombre            TEXT NOT NULL,
  empresa           TEXT,
  telefono          TEXT,
  email             TEXT,
  comentario        TEXT,
  estado            TEXT DEFAULT 'nueva',   -- nueva | en_proceso | cotizada | cerrada | descartada
  origen            TEXT DEFAULT 'landing',
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_import_requests_estado  ON import_requests(estado);
CREATE INDEX IF NOT EXISTS idx_import_requests_created ON import_requests(created_at DESC);

-- Acceso solo por service role (API pública de registro + lectura de la Central).
ALTER TABLE import_requests ENABLE ROW LEVEL SECURITY;
