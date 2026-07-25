-- ══════════════════════════════════════════════════════════
--  Analítica web propia — registro de visitas y su origen
--  Sirve para medir cómo llegan los clientes (fuente, campaña, UTM).
--  Complementa a Google Analytics; se muestra en Comercial › Analítica.
-- ══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS web_visits (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  path         TEXT,
  referrer     TEXT,
  utm_source   TEXT,
  utm_medium   TEXT,
  utm_campaign TEXT,
  visitor_id   TEXT,            -- id anónimo (localStorage) para contar visitantes
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_web_visits_created ON web_visits(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_web_visits_source  ON web_visits(utm_source);

-- Solo el service role (la API de registro y la lectura de la Central) accede.
-- Sin políticas públicas: el navegador no lee ni escribe directo.
ALTER TABLE web_visits ENABLE ROW LEVEL SECURITY;
