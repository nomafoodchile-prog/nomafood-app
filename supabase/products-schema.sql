-- ════════════════════════════════════════════════════════════
--   PRODUCTS — Catálogo del Portal Mayoristas
--   Ejecutar en Supabase SQL Editor (proyecto nomafood-produccion)
--
--   Contexto: la API del portal (app/api/portal/mayoristas/[token]/route.ts)
--   consulta products con estas columnas; la tabla no existía en producción.
--   Los precios son precio LISTA; el portal aplica el descuento_pct
--   de cada mayorista. stock_actual parte en 50 como valor inicial: AJUSTAR.
-- ════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS products (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku          TEXT UNIQUE NOT NULL,
  nombre       TEXT NOT NULL,
  categoria    TEXT NOT NULL,
  descripcion  TEXT,
  unidad       TEXT NOT NULL DEFAULT 'un',
  precio       NUMERIC(12,2) NOT NULL DEFAULT 0,
  stock_actual NUMERIC(10,2) NOT NULL DEFAULT 0,
  imagen_url   TEXT,
  activo       BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- La API del portal usa service_role (bypasa RLS); acceso interno autenticado de solo lectura
DROP POLICY IF EXISTS "products_authenticated_read" ON products;
CREATE POLICY "products_authenticated_read" ON products
  FOR SELECT TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_products_categoria ON products(categoria);
CREATE INDEX IF NOT EXISTS idx_products_activo    ON products(activo);

CREATE OR REPLACE TRIGGER tr_products_upd
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Catálogo mayorista (fuente: lib/wholesale.ts — precio = precio lista)
INSERT INTO products (sku, nombre, categoria, descripcion, unidad, precio, stock_actual, imagen_url, activo) VALUES
  ('may-001', 'Ciabatta lomito seitan',   'Sandwiches', 'Ciabatta artesanal con lomito de seitan, vegetales asados y salsa NOMA. Caja 12 unidades.',          'caja', 3850, 50, '/images/wholesale/ciabatta-lomito-seitan.jpg',   true),
  ('may-002', 'Ciabatta milanesa seitan', 'Sandwiches', 'Milanesa de seitan apanada, hojas verdes, tomate y aderezo vegano. Caja 12 unidades.',               'caja', 3950, 50, '/images/wholesale/ciabatta-milanesa-seitan.jpg', true),
  ('may-003', 'Burrito sabanero',         'Sandwiches', 'Tortilla rellena con porotos, arroz especiado, vegetales y salsa cremosa. Caja 10 unidades.',        'caja', 3200, 50, '/images/wholesale/burrito-sabanero.jpg',         true),
  ('may-004', 'Chicken''t burger',        'Sandwiches', 'Hamburguesa vegetal crispy, pan brioche vegano y salsa de la casa. Caja 10 unidades.',               'caja', 4200, 50, '/images/wholesale/chickent-burger.jpg',          true),
  ('may-005', 'Empanadas',                'Empanadas',  'Mix vegano horneado: pino vegetal, champinon queso vegano y napolitana. Bandeja 20 unidades.',       'bandeja', 1450, 50, '/images/wholesale/empanadas-veganas.jpg',     true),
  ('may-006', 'Pizza cuadrada',           'Pizzas',     'Porcion cuadrada con masa fermentada, salsa de tomate y toppings vegetales. Caja 16 porciones.',     'caja', 2600, 50, '/images/wholesale/pizza-cuadrada.jpg',           true),
  ('may-007', 'Gohan chicken crispy',     'Gohan',      'Bowl con arroz, vegetales frescos, chicken vegetal crispy y salsa oriental. Caja 8 bowls 750 ml.',   'caja', 5200, 50, '/images/wholesale/gohan-chicken-crispy.jpg',     true),
  ('may-008', 'Ensalada falafel',         'Ensaladas',  'Ensalada lista para vitrina con falafel, hummus, hojas verdes y dressing. Caja 8 bowls 750 ml.',     'caja', 4900, 50, '/images/wholesale/ensalada-falafel.jpg',         true),
  ('may-009', 'Sushi vegetariano',        'Sushi',      'Rolls vegetarianos surtidos con palta, vegetales, queso crema vegano y salsas. Caja 12 packs.',      'caja', 5600, 50, '/images/wholesale/sushi-vegetariano.jpg',        true),
  ('may-010', 'Yogurt con granola',       'Pasteleria', 'Postre individual vegetal con yogurt, granola artesanal y fruta de temporada. Caja 12 vasos 250 ml.','caja', 2400, 50, '/images/wholesale/yogurt-granola.jpg',           true)
ON CONFLICT (sku) DO NOTHING;

-- FK de líneas de pedido hacia products (solo si no existe)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'mayorista_pedido_items_producto_id_fkey'
  ) THEN
    ALTER TABLE mayorista_pedido_items
      ADD CONSTRAINT mayorista_pedido_items_producto_id_fkey
      FOREIGN KEY (producto_id) REFERENCES products(id) NOT VALID;
  END IF;
END $$;
