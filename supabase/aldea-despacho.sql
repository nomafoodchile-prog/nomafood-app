-- ============================================================================
-- ALDEA VEGETAL · Sub-fase E — Despacho (chofer asignado + hora estimada)
-- Aditivo sobre aldea_solicitudes.
-- ============================================================================
alter table public.aldea_solicitudes add column if not exists chofer_nombre   text;
alter table public.aldea_solicitudes add column if not exists chofer_telefono text;
alter table public.aldea_solicitudes add column if not exists hora_estimada   text;
-- Nota: el mapa con ubicación EN VIVO se conecta a futuro con el chofer real
-- (tabla drivers/driver_positions del Portal Chofer), solo mientras el pedido
-- está 'en_ruta'. Por ahora la interfaz de seguimiento ya queda lista.
