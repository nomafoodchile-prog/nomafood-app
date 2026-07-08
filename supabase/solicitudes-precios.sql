-- ════════════════════════════════════════════════════════════════════
--  SOLICITUDES · precio por línea (para total por proveedor / preparar caja)
--  Aditivo.
-- ════════════════════════════════════════════════════════════════════
alter table public.solicitud_compra_items add column if not exists precio_unitario numeric;
