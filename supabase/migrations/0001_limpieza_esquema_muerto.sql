-- ============================================================================
-- MIGRACIÓN 0001 — Limpieza de esquema muerto, Parte 1 (Fase 0 · SaaS)
-- ============================================================================
-- Elimina 24 tablas del esquema en INGLÉS que quedaron sin uso cuando el sistema
-- migró a tablas en español. Verificado en producción (2026-10-26):
--   • Las 24 tablas tienen 0 filas (sin datos).
--   • Las 24 tablas NO se usan en el código (0 referencias).
-- Su definición queda en el repo (supabase/*.sql) por si se necesitara recrear.
--
-- NOTA: otras 4 tablas muertas (operators, adt_tasks, picking_tasks,
-- task_reports) se eliminarán en la migración 0002, DESPUÉS de retirar el código
-- de los portales viejos por token que todavía las menciona.
--
-- Ejecutar UNA vez. Idempotente (IF EXISTS). CASCADE solo elimina enlaces
-- residuales hacia estas tablas vacías; no toca ninguna tabla viva ni sus datos.
-- Recomendado: correr primero en la copia de prueba, luego en producción.
-- ============================================================================

begin;

-- Recetas (vive: recetas / receta_ingredientes / receta_pasos / receta_versiones)
drop table if exists public.recipe_ingredients cascade;
drop table if exists public.recipe_steps       cascade;
drop table if exists public.recipes            cascade;

-- Pedidos (vive: mayorista_pedidos / mayorista_pedido_items)
drop table if exists public.order_lines        cascade;
drop table if exists public.orders             cascade;

-- Proveedores (vive: proveedores / proveedor_productos / proveedor_precio_historial)
drop table if exists public.supplier_price_history cascade;
drop table if exists public.supplier_products      cascade;

-- Inventario (vive: inventario_lotes / inventario_movimientos / bodegas)
drop table if exists public.inventory_movements     cascade;
drop table if exists public.inventory_catalog_items cascade;
drop table if exists public.stock_reservations      cascade;
drop table if exists public.warehouse_locations     cascade;

-- Compras (vive: solicitudes_compra / solicitud_compra_items / recepciones)
drop table if exists public.purchase_receipts  cascade;
drop table if exists public.purchase_requests  cascade;
drop table if exists public.purchase_orders    cascade;

-- Producción (vive: op_tareas / op_produccion_pasos)
drop table if exists public.production_items   cascade;
drop table if exists public.production_orders  cascade;

-- Clientes / Marketing (vive: mayoristas / mkt_campanas / mkt_envios / mkt_plantillas)
drop table if exists public.campaign_deliveries cascade;
drop table if exists public.campaign_templates  cascade;
drop table if exists public.marketing_customers cascade;
drop table if exists public.marketing_campaigns cascade;
drop table if exists public.customers           cascade;

-- Finanzas (vive: fin_movimientos / fin_cierres_caja / fin_cartolas / payments→no)
drop table if exists public.cash_entries cascade;
drop table if exists public.payments     cascade;

-- Tareas (vive: op_tareas / op_tarea_cierre / op_tarea_eventos)
drop table if exists public.task_validations cascade;

commit;

-- Listo: 24 tablas muertas eliminadas. Pendiente migración 0002 para las 4
-- restantes tras limpiar los portales viejos por token.
