-- ════════════════════════════════════════════════════════════════════
--  SEGURIDAD · FASE A · A2 — Endurecer RLS de mayoristas
--  ------------------------------------------------------------------
--  Cierra los huecos `USING(true)` en `mayoristas` y `mayorista_pedido_items`,
--  y agrega la lectura del CLIENTE sobre SUS propios pedidos/ítems
--  (hoy su historial sale vacío por falta de esa política).
--
--  Se preserva:
--   · Admin (is_admin)         → acceso total (lectura y escritura).
--   · Chofer (get_my_driver_id)→ SELECT de sus pedidos/ítems asignados.
--   · Cliente (get_my_mayorista_id) → SELECT de SU ficha/pedidos/ítems.
--   · API server-side (service role) y RPC security-definer → sin cambios.
--
--  Idempotente. Resultado esperado: "Success. No rows returned".
--  La REVERSA está al pie del archivo (comentada).
-- ════════════════════════════════════════════════════════════════════

alter table public.mayoristas             enable row level security;
alter table public.mayorista_pedidos      enable row level security;
alter table public.mayorista_pedido_items enable row level security;

-- ── mayoristas ──────────────────────────────────────────────────────
drop policy if exists admins_mayoristas   on public.mayoristas;  -- quita el hueco (ALL true)

drop policy if exists mayoristas_admin_all on public.mayoristas;
create policy mayoristas_admin_all on public.mayoristas
  for all using (public.is_admin()) with check (public.is_admin());

-- (may_self ya existe: el cliente ve su propia ficha — se conserva)

drop policy if exists mayoristas_chofer_sel on public.mayoristas;
create policy mayoristas_chofer_sel on public.mayoristas
  for select using (
    id in (select mayorista_id from public.mayorista_pedidos
           where chofer_id = public.get_my_driver_id())
  );

-- ── mayorista_pedidos ───────────────────────────────────────────────
-- (pedidos_chofer_sel ya da SELECT a admin/chofer — se conserva)

drop policy if exists pedidos_admin_all on public.mayorista_pedidos;
create policy pedidos_admin_all on public.mayorista_pedidos
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists pedidos_may_sel on public.mayorista_pedidos;
create policy pedidos_may_sel on public.mayorista_pedidos
  for select using (mayorista_id = public.get_my_mayorista_id());

-- ── mayorista_pedido_items ──────────────────────────────────────────
drop policy if exists admins_items on public.mayorista_pedido_items;  -- quita el hueco (ALL true)

drop policy if exists items_admin_all on public.mayorista_pedido_items;
create policy items_admin_all on public.mayorista_pedido_items
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists items_chofer_sel on public.mayorista_pedido_items;
create policy items_chofer_sel on public.mayorista_pedido_items
  for select using (
    pedido_id in (select id from public.mayorista_pedidos
                  where chofer_id = public.get_my_driver_id())
  );

drop policy if exists items_may_sel on public.mayorista_pedido_items;
create policy items_may_sel on public.mayorista_pedido_items
  for select using (
    pedido_id in (select id from public.mayorista_pedidos
                  where mayorista_id = public.get_my_mayorista_id())
  );

-- ════════════════════════════════════════════════════════════════════
--  REVERSA (ejecutar SOLO si algo se rompe — vuelve al estado anterior):
--
--  drop policy if exists mayoristas_admin_all  on public.mayoristas;
--  drop policy if exists mayoristas_chofer_sel on public.mayoristas;
--  create policy admins_mayoristas on public.mayoristas for all to authenticated using (true);
--
--  drop policy if exists pedidos_admin_all on public.mayorista_pedidos;
--  drop policy if exists pedidos_may_sel   on public.mayorista_pedidos;
--
--  drop policy if exists items_admin_all  on public.mayorista_pedido_items;
--  drop policy if exists items_chofer_sel on public.mayorista_pedido_items;
--  drop policy if exists items_may_sel    on public.mayorista_pedido_items;
--  create policy admins_items on public.mayorista_pedido_items for all to authenticated using (true);
-- ════════════════════════════════════════════════════════════════════
