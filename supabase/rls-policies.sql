-- ============================================================
-- NOMA FOOD — POLÍTICAS RLS (Row Level Security)
-- Ejecutar en Supabase SQL Editor DESPUÉS del schema.sql
-- ============================================================

-- 1. HABILITAR RLS EN TODAS LAS TABLAS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_catalog_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE operators ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE adt_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE picking_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE dispatches ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_receivables ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_credit_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_validations ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_evidence_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouse_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE cleaning_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE machine_failures ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE balance_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_settings ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 2. HELPER: función para obtener el rol del usuario actual
-- ============================================================
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS app_role AS $$
  SELECT role FROM profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- 3. PERFILES — cada uno ve el suyo; admins/gerencia ven todos
-- ============================================================
CREATE POLICY "profiles_own" ON profiles
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "profiles_admin_all" ON profiles
  FOR ALL USING (get_my_role() IN ('administrador', 'gerencia'));

CREATE POLICY "profiles_insert_self" ON profiles
  FOR INSERT WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_update_self" ON profiles
  FOR UPDATE USING (id = auth.uid());

-- ============================================================
-- 4. OPERADORES — token anónimo (portales sin login)
-- ============================================================
-- Los portales de operario/chofer/picker usan service_role en servidor
-- No necesitan RLS para acceder, pero definimos por buenas prácticas

CREATE POLICY "operators_authenticated_read" ON operators
  FOR SELECT USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

CREATE POLICY "operators_admin_write" ON operators
  FOR ALL USING (get_my_role() IN ('administrador', 'gerencia'));

-- ============================================================
-- 5. PRODUCTOS E INVENTARIO
-- ============================================================
CREATE POLICY "products_authenticated_read" ON products
  FOR SELECT USING (auth.role() IN ('authenticated', 'service_role', 'anon'));

CREATE POLICY "products_admin_write" ON products
  FOR ALL USING (get_my_role() IN ('administrador', 'gerencia'));

CREATE POLICY "inventory_authenticated_read" ON inventory_movements
  FOR SELECT USING (auth.role() IN ('authenticated', 'service_role'));

CREATE POLICY "inventory_write_operario" ON inventory_movements
  FOR INSERT WITH CHECK (auth.role() IN ('authenticated', 'service_role'));

CREATE POLICY "inventory_catalog_read" ON inventory_catalog_items
  FOR SELECT USING (auth.role() IN ('authenticated', 'service_role', 'anon'));

CREATE POLICY "inventory_catalog_write" ON inventory_catalog_items
  FOR ALL USING (get_my_role() IN ('administrador', 'gerencia'));

-- ============================================================
-- 6. PEDIDOS Y PRODUCCIÓN
-- ============================================================
CREATE POLICY "orders_authenticated_read" ON orders
  FOR SELECT USING (auth.role() IN ('authenticated', 'service_role'));

CREATE POLICY "orders_write" ON orders
  FOR ALL USING (get_my_role() IN ('administrador', 'gerencia') OR auth.role() = 'service_role');

CREATE POLICY "order_lines_read" ON order_lines
  FOR SELECT USING (auth.role() IN ('authenticated', 'service_role'));

CREATE POLICY "order_lines_write" ON order_lines
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "production_orders_read" ON production_orders
  FOR SELECT USING (auth.role() IN ('authenticated', 'service_role'));

CREATE POLICY "production_orders_write" ON production_orders
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "production_items_read" ON production_items
  FOR SELECT USING (auth.role() IN ('authenticated', 'service_role'));

-- ============================================================
-- 7. TAREAS OPERACIONALES (ADT, PICKING, DESPACHOS)
-- ============================================================
CREATE POLICY "adt_tasks_read" ON adt_tasks
  FOR SELECT USING (auth.role() IN ('authenticated', 'service_role'));

CREATE POLICY "adt_tasks_update" ON adt_tasks
  FOR UPDATE USING (auth.role() IN ('authenticated', 'service_role'));

CREATE POLICY "adt_tasks_insert" ON adt_tasks
  FOR INSERT WITH CHECK (auth.role() IN ('authenticated', 'service_role'));

CREATE POLICY "picking_tasks_read" ON picking_tasks
  FOR SELECT USING (auth.role() IN ('authenticated', 'service_role'));

CREATE POLICY "picking_tasks_update" ON picking_tasks
  FOR UPDATE USING (auth.role() IN ('authenticated', 'service_role'));

CREATE POLICY "dispatches_read" ON dispatches
  FOR SELECT USING (auth.role() IN ('authenticated', 'service_role'));

CREATE POLICY "dispatches_update" ON dispatches
  FOR UPDATE USING (auth.role() IN ('authenticated', 'service_role'));

-- ============================================================
-- 8. FINANZAS — solo administrador y gerencia
-- ============================================================
CREATE POLICY "cash_entries_admin" ON cash_entries
  FOR ALL USING (get_my_role() IN ('administrador', 'gerencia') OR auth.role() = 'service_role');

CREATE POLICY "receivables_admin" ON customer_receivables
  FOR ALL USING (get_my_role() IN ('administrador', 'gerencia') OR auth.role() = 'service_role');

CREATE POLICY "payments_admin" ON payments
  FOR ALL USING (get_my_role() IN ('administrador', 'gerencia') OR auth.role() = 'service_role');

CREATE POLICY "payment_webhooks_service" ON payment_webhook_events
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "balance_snapshots_admin" ON balance_snapshots
  FOR ALL USING (get_my_role() IN ('administrador', 'gerencia') OR auth.role() = 'service_role');

-- ============================================================
-- 9. CLIENTES Y MARKETING
-- ============================================================
CREATE POLICY "customers_read" ON customers
  FOR SELECT USING (auth.role() IN ('authenticated', 'service_role'));

CREATE POLICY "customers_write" ON customers
  FOR ALL USING (get_my_role() IN ('administrador', 'gerencia') OR auth.role() = 'service_role');

-- Clientes mayoristas: anon puede ver su propio registro (para portal)
CREATE POLICY "marketing_customers_own" ON marketing_customers
  FOR SELECT USING (auth.role() IN ('authenticated', 'service_role', 'anon'));

CREATE POLICY "marketing_customers_write" ON marketing_customers
  FOR ALL USING (get_my_role() IN ('administrador', 'gerencia') OR auth.role() = 'service_role');

CREATE POLICY "campaigns_admin" ON marketing_campaigns
  FOR ALL USING (get_my_role() IN ('administrador', 'gerencia') OR auth.role() = 'service_role');

CREATE POLICY "campaign_templates_read" ON campaign_templates
  FOR SELECT USING (auth.role() IN ('authenticated', 'service_role'));

CREATE POLICY "campaign_templates_write" ON campaign_templates
  FOR ALL USING (get_my_role() IN ('administrador', 'gerencia') OR auth.role() = 'service_role');

CREATE POLICY "campaign_deliveries_service" ON campaign_deliveries
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================
-- 10. COMPRAS Y PROVEEDORES
-- ============================================================
CREATE POLICY "supplier_products_read" ON supplier_products
  FOR SELECT USING (auth.role() IN ('authenticated', 'service_role'));

CREATE POLICY "supplier_products_write" ON supplier_products
  FOR ALL USING (get_my_role() IN ('administrador', 'gerencia') OR auth.role() = 'service_role');

CREATE POLICY "supplier_price_history_read" ON supplier_price_history
  FOR SELECT USING (auth.role() IN ('authenticated', 'service_role'));

CREATE POLICY "purchase_requests_read" ON purchase_requests
  FOR SELECT USING (auth.role() IN ('authenticated', 'service_role'));

CREATE POLICY "purchase_requests_write" ON purchase_requests
  FOR ALL USING (auth.role() IN ('authenticated', 'service_role'));

CREATE POLICY "purchase_orders_admin" ON purchase_orders
  FOR ALL USING (get_my_role() IN ('administrador', 'gerencia') OR auth.role() = 'service_role');

CREATE POLICY "purchase_receipts_read" ON purchase_receipts
  FOR SELECT USING (auth.role() IN ('authenticated', 'service_role'));

CREATE POLICY "purchase_receipts_write" ON purchase_receipts
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================
-- 11. REPORTES Y EVIDENCIA
-- ============================================================
CREATE POLICY "task_reports_read" ON task_reports
  FOR SELECT USING (auth.role() IN ('authenticated', 'service_role'));

CREATE POLICY "task_reports_write" ON task_reports
  FOR ALL USING (auth.role() IN ('authenticated', 'service_role'));

CREATE POLICY "task_validations_write" ON task_validations
  FOR ALL USING (auth.role() IN ('authenticated', 'service_role'));

CREATE POLICY "task_evidence_service" ON task_evidence_files
  FOR ALL USING (auth.role() IN ('authenticated', 'service_role'));

-- ============================================================
-- 12. BODEGA Y LIMPIEZA
-- ============================================================
CREATE POLICY "warehouse_locations_read" ON warehouse_locations
  FOR SELECT USING (auth.role() IN ('authenticated', 'service_role', 'anon'));

CREATE POLICY "warehouse_locations_write" ON warehouse_locations
  FOR ALL USING (get_my_role() IN ('administrador', 'gerencia') OR auth.role() = 'service_role');

CREATE POLICY "cleaning_reports_write" ON cleaning_reports
  FOR ALL USING (auth.role() IN ('authenticated', 'service_role'));

-- ============================================================
-- 13. MANTENCIÓN Y MAQUINARIA
-- ============================================================
CREATE POLICY "machine_failures_write" ON machine_failures
  FOR ALL USING (auth.role() IN ('authenticated', 'service_role'));

CREATE POLICY "maintenance_events_read" ON maintenance_events
  FOR SELECT USING (auth.role() IN ('authenticated', 'service_role'));

CREATE POLICY "maintenance_events_write" ON maintenance_events
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================
-- 14. CONFIGURACIÓN Y AUDITORÍA
-- ============================================================
CREATE POLICY "business_settings_admin" ON business_settings
  FOR ALL USING (get_my_role() IN ('administrador', 'gerencia') OR auth.role() = 'service_role');

CREATE POLICY "audit_logs_admin" ON audit_logs
  FOR SELECT USING (get_my_role() IN ('administrador', 'gerencia') OR auth.role() = 'service_role');

CREATE POLICY "audit_logs_insert_service" ON audit_logs
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- ============================================================
-- 15. CRÉDITO Y RESERVAS DE STOCK
-- ============================================================
CREATE POLICY "credit_rules_admin" ON credit_rules
  FOR ALL USING (get_my_role() IN ('administrador', 'gerencia') OR auth.role() = 'service_role');

CREATE POLICY "credit_limits_admin" ON customer_credit_limits
  FOR ALL USING (get_my_role() IN ('administrador', 'gerencia') OR auth.role() = 'service_role');

CREATE POLICY "stock_reservations_service" ON stock_reservations
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================
-- 16. RECETAS
-- ============================================================
CREATE POLICY "recipes_read" ON recipes
  FOR SELECT USING (auth.role() IN ('authenticated', 'service_role'));

CREATE POLICY "recipes_write" ON recipes
  FOR ALL USING (get_my_role() IN ('administrador', 'gerencia') OR auth.role() = 'service_role');

CREATE POLICY "recipe_ingredients_read" ON recipe_ingredients
  FOR SELECT USING (auth.role() IN ('authenticated', 'service_role'));

CREATE POLICY "recipe_steps_read" ON recipe_steps
  FOR SELECT USING (auth.role() IN ('authenticated', 'service_role'));
