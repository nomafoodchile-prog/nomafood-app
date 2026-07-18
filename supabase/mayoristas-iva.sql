-- ══════════════════════════════════════════════════════════
--  IVA 19% en pedidos mayoristas
--  A partir de ahora el pedido cobra el BRUTO (neto + IVA 19%).
--  'total' pasa a guardar el BRUTO (lo que cobra Mercado Pago y
--  lo que entra a Caja). Se agrega el desglose neto / iva.
-- ══════════════════════════════════════════════════════════

ALTER TABLE mayorista_pedidos ADD COLUMN IF NOT EXISTS neto NUMERIC(12,2) DEFAULT 0;
ALTER TABLE mayorista_pedidos ADD COLUMN IF NOT EXISTS iva  NUMERIC(12,2) DEFAULT 0;

-- Pedidos existentes se cobraron netos (sin IVA):
--   neto = total (lo que se cobró), iva = 0, total se mantiene.
UPDATE mayorista_pedidos
   SET neto = total, iva = 0
 WHERE neto = 0 AND total > 0;

-- Comentarios de documentación
COMMENT ON COLUMN mayorista_pedidos.neto  IS 'Monto neto (sin IVA), después de descuento';
COMMENT ON COLUMN mayorista_pedidos.iva   IS 'IVA 19% sobre el neto';
COMMENT ON COLUMN mayorista_pedidos.total IS 'Total BRUTO cobrado = neto + iva (lo que paga el cliente)';
