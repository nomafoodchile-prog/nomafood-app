-- ============================================================
-- PICKER (Armado) con login — habilita el flujo de picking real
-- Correr UNA sola vez en Supabase → SQL Editor.
-- Es idempotente y seguro (IF NOT EXISTS): no borra ni cambia datos.
-- ============================================================

-- 1) Asignación de un pedido mayorista a un picker (por su usuario/perfil).
alter table public.mayorista_pedidos
  add column if not exists picker_id uuid references public.profiles(id);

-- Estado de armado del pedido: sin_asignar → asignado → en_armado → armado
alter table public.mayorista_pedidos
  add column if not exists estado_armado text not null default 'sin_asignar';

-- 2) Confirmación de armado por ítem del pedido.
alter table public.mayorista_pedido_items
  add column if not exists pickeado boolean not null default false;

alter table public.mayorista_pedido_items
  add column if not exists cantidad_pickeada numeric;

-- 3) Índice para que el picker encuentre rápido sus pedidos.
create index if not exists idx_mayorista_pedidos_picker
  on public.mayorista_pedidos(picker_id);

-- Listo. El picker se crea desde la Central (rol Armado) y entra en /picker/login.
