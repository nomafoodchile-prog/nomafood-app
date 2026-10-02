-- ════════════════════════════════════════════════════════════════════
--  RUTAS DE DESPACHO · FASE 3 — Rutas MIXTAS (minorista + mayorista)
--  Permite incluir pedidos mayoristas como paradas de una ruta de despacho.
--  SEGURO y aditivo: solo agrega una columna. Idempotente.
-- ════════════════════════════════════════════════════════════════════

alter table public.delivery_route_stops
  add column if not exists mayorista_pedido_id uuid references public.mayorista_pedidos(id);

create index if not exists idx_route_stops_mayorista
  on public.delivery_route_stops(mayorista_pedido_id);

-- FIN. Esperado: "Success. No rows returned".
