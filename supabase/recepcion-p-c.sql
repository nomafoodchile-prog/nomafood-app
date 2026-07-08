-- ════════════════════════════════════════════════════════════════════
--  RECEPCIÓN · P-C — precio en líneas (para historial de compras/montos)
--  Aditivo.
-- ════════════════════════════════════════════════════════════════════
alter table public.recepcion_items add column if not exists precio_unitario numeric;
