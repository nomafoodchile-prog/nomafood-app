-- ════════════════════════════════════════════════════════════════════
--  MAYORISTAS — Datos de despacho en la ficha del cliente
--  Agrega dirección / comuna / giro al cliente mayorista y RELLENA los
--  existentes desde su solicitud (access_requests). Aditivo e idempotente.
--  Objetivo: que los pedidos hereden la dirección y no asignarla a mano.
-- ════════════════════════════════════════════════════════════════════

alter table public.mayoristas add column if not exists direccion text;
alter table public.mayoristas add column if not exists comuna text;
alter table public.mayoristas add column if not exists giro text;

-- Backfill desde la solicitud vinculada (solo donde el mayorista aún no tiene el dato)
update public.mayoristas m
set direccion = coalesce(m.direccion, ar.direccion),
    comuna    = coalesce(m.comuna, ar.comuna),
    giro      = coalesce(m.giro, ar.giro)
from public.access_requests ar
where ar.mayorista_id = m.id
  and (m.direccion is null or m.comuna is null or m.giro is null);

-- FIN. Esperado: "Success" (puede actualizar algunas filas en el backfill).
