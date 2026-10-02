-- ════════════════════════════════════════════════════════════════════
--  COMUNICACIÓN CON EL CLIENTE (WhatsApp) — FASE 1 (manual, gratis wa.me)
--  Registro de mensajes enviados por pedido (timeline + evitar duplicados)
--  y plantillas configurables por marca. Aditivo e idempotente.
-- ════════════════════════════════════════════════════════════════════

-- Registro de comunicaciones por pedido minorista
create table if not exists public.minorista_comunicaciones (
  id                  uuid primary key default gen_random_uuid(),
  minorista_pedido_id uuid references public.minorista_pedidos(id) on delete cascade,
  tipo                text not null,                 -- recibido|programado|salio|cerca|entregado|incidencia|personalizado
  canal               text not null default 'whatsapp',
  marca               text,
  destino             text,                          -- teléfono al que se envió
  texto               text,
  estado              text not null default 'enviado', -- enviado|pendiente|error
  enviado_por         uuid references auth.users(id),
  created_at          timestamptz default now()
);
create index if not exists idx_min_comms_pedido on public.minorista_comunicaciones(minorista_pedido_id);
create index if not exists idx_min_comms_tipo on public.minorista_comunicaciones(minorista_pedido_id, tipo);

-- Plantillas de mensaje por marca y tipo (editables sin re-deploy)
create table if not exists public.wa_plantillas (
  marca       text not null,
  tipo        text not null,
  texto       text not null,
  updated_at  timestamptz default now(),
  primary key (marca, tipo)
);

-- Semillas por defecto (solo si no existen). Variables: {primer_nombre} {nombre}
-- {pedido} {marca} {ETA} {X} {fecha_despacho} {chofer}
insert into public.wa_plantillas (marca, tipo, texto)
select v.marca, v.tipo, v.texto from (values
  ('Brotes Asiáticos','recibido','Hola {primer_nombre} 👋 Soy Naty de Brotes Asiáticos. Recibimos tu pedido #{pedido} correctamente 💚. Te avisaremos apenas salga a ruta para que puedas estar pendiente de tu entrega. ¡Que tengas un hermoso día!'),
  ('Brotes Asiáticos','programado','Hola {primer_nombre} 👋 Tu pedido #{pedido} de Brotes Asiáticos ya quedó programado para despacho 🚚. Te avisaremos cuando el conductor comience la ruta.'),
  ('Brotes Asiáticos','salio','¡Hola {primer_nombre}! 🚚 Tu pedido de Brotes Asiáticos ya salió a ruta. La llegada estimada es alrededor de las {ETA}. Te avisaremos si hay algún cambio.'),
  ('Brotes Asiáticos','cerca','¡Hola {primer_nombre}! 👋 Tu pedido de Brotes Asiáticos ya está cerca. Nuestro conductor debería llegar en unos {X} minutos 🚚.'),
  ('Brotes Asiáticos','entregado','¡Pedido entregado! 💚 Gracias por comprar en Brotes Asiáticos, {primer_nombre}. ¡Esperamos que lo disfrutes muchísimo!'),
  ('Brotes Asiáticos','incidencia','Hola {primer_nombre} 👋 Tuvimos un inconveniente para entregar tu pedido #{pedido} de Brotes Asiáticos. Queremos coordinar contigo la entrega. ¿Nos confirmas tu dirección y un horario?'),
  ('NOMMA FOOD','recibido','Hola {primer_nombre} 👋 Soy Naty de NOMMA FOOD. Recibimos tu pedido #{pedido} correctamente. Te avisaremos apenas salga a ruta para que puedas estar pendiente de tu entrega. ¡Que tengas un hermoso día!'),
  ('NOMMA FOOD','programado','Hola {primer_nombre} 👋 Tu pedido #{pedido} de NOMMA FOOD ya quedó programado para despacho 🚚. Te avisaremos cuando el conductor comience la ruta.'),
  ('NOMMA FOOD','salio','¡Hola {primer_nombre}! 🚚 Tu pedido de NOMMA FOOD ya salió a ruta. La llegada estimada es alrededor de las {ETA}. Te avisaremos si hay algún cambio.'),
  ('NOMMA FOOD','cerca','¡Hola {primer_nombre}! 👋 Tu pedido de NOMMA FOOD ya está cerca. Nuestro conductor debería llegar en unos {X} minutos 🚚.'),
  ('NOMMA FOOD','entregado','¡Pedido entregado! Gracias por comprar en NOMMA FOOD, {primer_nombre}. ¡Esperamos que lo disfrutes muchísimo!'),
  ('NOMMA FOOD','incidencia','Hola {primer_nombre} 👋 Tuvimos un inconveniente para entregar tu pedido #{pedido} de NOMMA FOOD. Queremos coordinar contigo la entrega. ¿Nos confirmas tu dirección y un horario?')
) as v(marca, tipo, texto)
where not exists (select 1 from public.wa_plantillas p where p.marca = v.marca and p.tipo = v.tipo);

-- RLS: solo la Central (service-role en el servidor igual bypassa)
alter table public.minorista_comunicaciones enable row level security;
alter table public.wa_plantillas enable row level security;
drop policy if exists comms_admin_all on public.minorista_comunicaciones;
create policy comms_admin_all on public.minorista_comunicaciones for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists wa_plantillas_admin_all on public.wa_plantillas;
create policy wa_plantillas_admin_all on public.wa_plantillas for all using (public.is_admin()) with check (public.is_admin());

-- FIN. Esperado: "Success. No rows returned".
