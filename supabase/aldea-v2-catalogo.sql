-- ============================================================================
-- ALDEA VEGETAL v2 · Catálogo comercial + cajas/unidades + totales
-- Aditivo. No toca products, ni mayoristas, ni el flujo existente.
-- ============================================================================

-- Campos comerciales del catálogo autorizado por sucursal
alter table public.aldea_catalogo add column if not exists disponible      boolean not null default true;
alter table public.aldea_catalogo add column if not exists precio_especial numeric;      -- precio Aldea por SKU (si null → precio mayorista)
alter table public.aldea_catalogo add column if not exists pedido_minimo   numeric;
alter table public.aldea_catalogo add column if not exists cantidad_maxima numeric;
alter table public.aldea_catalogo add column if not exists prioridad_aldea integer not null default 0;  -- mayor = aparece primero

-- Ítems de solicitud: snapshot de presentación y precio al momento del pedido
alter table public.aldea_solicitud_items add column if not exists unidad_venta      text;
alter table public.aldea_solicitud_items add column if not exists unidades_por_caja numeric;
alter table public.aldea_solicitud_items add column if not exists precio_unitario   numeric;   -- precio por caja (unidad de venta)
alter table public.aldea_solicitud_items add column if not exists subtotal          numeric;

-- Totales estimados del pedido (se confirman cuando NOMMA aprueba)
alter table public.aldea_solicitudes add column if not exists neto     numeric;
alter table public.aldea_solicitudes add column if not exists iva      numeric;
alter table public.aldea_solicitudes add column if not exists despacho numeric;
alter table public.aldea_solicitudes add column if not exists total    numeric;
