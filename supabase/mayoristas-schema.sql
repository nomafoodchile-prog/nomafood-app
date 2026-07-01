-- ════════════════════════════════════════════════════════════
--   PORTAL MAYORISTAS — Tablas y RLS
--   Ejecutar en Supabase SQL Editor
-- ════════════════════════════════════════════════════════════

-- 1. Tabla de clientes mayoristas
CREATE TABLE IF NOT EXISTS mayoristas (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre          TEXT NOT NULL,
  empresa         TEXT,
  email           TEXT,
  telefono        TEXT,
  rut             TEXT,
  token           TEXT UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  descuento_pct   NUMERIC(5,2) DEFAULT 0,  -- % descuento sobre precio lista
  limite_credito  NUMERIC(12,2) DEFAULT 0,
  activo          BOOLEAN DEFAULT true,
  notas           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabla de pedidos mayoristas
CREATE TABLE IF NOT EXISTS mayorista_pedidos (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mayorista_id        UUID NOT NULL REFERENCES mayoristas(id),
  numero_pedido       TEXT UNIQUE DEFAULT 'MAY-' || to_char(NOW(), 'YYYYMMDD') || '-' || floor(random()*9000+1000)::TEXT,
  estado              TEXT DEFAULT 'borrador',
  -- estados: borrador → confirmado → pagado → en_preparacion → despachado → entregado | cancelado
  subtotal            NUMERIC(12,2) DEFAULT 0,
  descuento_monto     NUMERIC(12,2) DEFAULT 0,
  total               NUMERIC(12,2) DEFAULT 0,
  notas               TEXT,
  fecha_entrega_req   DATE,
  direccion_entrega   TEXT,
  -- Mercado Pago
  mp_preference_id    TEXT,
  mp_payment_id       TEXT,
  mp_status           TEXT,
  mp_init_point       TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Líneas de pedido
CREATE TABLE IF NOT EXISTS mayorista_pedido_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id       UUID NOT NULL REFERENCES mayorista_pedidos(id) ON DELETE CASCADE,
  producto_id     UUID REFERENCES products(id),
  producto_nombre TEXT NOT NULL,
  producto_sku    TEXT,
  unidad          TEXT DEFAULT 'un',
  cantidad        NUMERIC(10,3) NOT NULL,
  precio_lista    NUMERIC(12,2) NOT NULL,
  precio_final    NUMERIC(12,2) NOT NULL,  -- precio_lista * (1 - descuento_pct/100)
  subtotal        NUMERIC(12,2) GENERATED ALWAYS AS (cantidad * precio_final) STORED
);

-- ──────────────────────────────────────────────────────────
--   RLS
-- ──────────────────────────────────────────────────────────
ALTER TABLE mayoristas             ENABLE ROW LEVEL SECURITY;
ALTER TABLE mayorista_pedidos      ENABLE ROW LEVEL SECURITY;
ALTER TABLE mayorista_pedido_items ENABLE ROW LEVEL SECURITY;

-- Las APIs del portal usan service_role (bypasa RLS)
-- Estas políticas son para acceso interno autenticado vía Supabase Auth si se necesita

-- Admins (authenticated) pueden ver todo
CREATE POLICY "admins_mayoristas" ON mayoristas
  FOR ALL TO authenticated USING (true);

CREATE POLICY "admins_pedidos" ON mayorista_pedidos
  FOR ALL TO authenticated USING (true);

CREATE POLICY "admins_items" ON mayorista_pedido_items
  FOR ALL TO authenticated USING (true);

-- ──────────────────────────────────────────────────────────
--   Índices
-- ──────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_mayoristas_token      ON mayoristas(token);
CREATE INDEX IF NOT EXISTS idx_mayoristas_email      ON mayoristas(email);
CREATE INDEX IF NOT EXISTS idx_mayorista_pedidos_mid ON mayorista_pedidos(mayorista_id);
CREATE INDEX IF NOT EXISTS idx_mayorista_items_pid   ON mayorista_pedido_items(pedido_id);
CREATE INDEX IF NOT EXISTS idx_mayorista_pedidos_mp  ON mayorista_pedidos(mp_payment_id);

-- ──────────────────────────────────────────────────────────
--   Trigger: updated_at automático
-- ──────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_mayoristas_upd
  BEFORE UPDATE ON mayoristas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_mayorista_pedidos_upd
  BEFORE UPDATE ON mayorista_pedidos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
