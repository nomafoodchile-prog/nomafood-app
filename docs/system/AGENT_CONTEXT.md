# AGENT_CONTEXT — Contexto para IA / nuevos desarrolladores

> Lee esto **antes** de tocar el sistema. Complementa a [`SYSTEM_MASTER.md`](./SYSTEM_MASTER.md). Objetivo: trabajar sin depender de conversaciones históricas.

## 1. Reglas de oro
1. **La fuente de verdad es el código y la BD viva**, no la memoria ni los docs previos. Verifica antes de afirmar.
2. **No hay migraciones versionadas.** Antes de asumir una columna/tabla, confírmala contra la BD (los `.sql` del repo pueden no reflejar la BD real).
3. **No hagas DELETE físico** de documentos de negocio (pedidos, etc.). Usa soft-cancel (`estado`).
4. **Corre `./node_modules/.bin/tsc --noEmit` (0 errores) antes de pushear.** Un build roto deja el dominio viejo sin avisar.
5. **No refactorices esquema muerto sin confirmar** que está vacío en la BD viva (ver `TECH_DEBT.md` TD-1/TD-2).

## 2. Patrones de datos
- **Dos clientes Supabase:** navegador (`lib/supabase/client.ts`, anon+RLS) y servidor (service-role, ignora RLS). Escrituras críticas → servidor.
- **Identificar usuario + rol** en un endpoint: `getServerSupabase()` → `profiles.role` → validar contra el array de roles admin.
- **Embeds PostgREST:** si una tabla tiene >1 FK a otra, **desambigua** (`producto:products!product_id(nombre)`), o la consulta entera vuelve vacía.
- **Lista vacía inexplicable** = casi siempre embed ambiguo o columna inexistente (fallan en silencio), no RLS.

## 3. Dónde está cada cosa
- Backoffice: `app/(central)/<modulo>/...` · APIs: `app/api/central/<modulo>/route.ts`
- Portales: `app/(portales)/<rol>/...` · APIs: `app/api/portal/<rol>/...`
- Lógica/negocio: `lib/` (`pedido-emails.ts`, `marca-portal.ts`, `transferencia.ts`, `ops/`, `aldea/`, `marketing.ts`…)
- Esquema: `supabase/*.sql` (referencia, no automatizado)

## 4. Esquema: usa el vivo, ignora el muerto
- **Vivo (español):** `products`, `recetas`+`receta_*`, `mayorista_pedidos`+`_items`, `minorista_pedidos`, `operarios`, `op_*`, `proveedores`+`proveedor_*`, `solicitudes_compra`+`_items`, `recepciones`, `inventario_*`, `fin_*`, `mkt_*`, `aldea_*`, `organizaciones`, `profiles`, `business_settings`.
- **Muerto (inglés, 0 usos — NO escribir):** `recipes/recipe_*`, `orders/order_lines`, `supplier_*`, `inventory_*`, `purchase_*`, `production_*`, `customers`, `marketing_*`, `campaign_*`.
- **Ambiguo (confirmar):** `operators` (usado en código junto a `operarios`), `adt_tasks`, `picking_tasks`.

## 5. Roles (string en `profiles.role`)
Admin: `SuperAdmin`, `Administracion`, `Gerencia`, `EncargadoProduccion` (a veces `Comercial`/`Contador`). Operativos: `Operario`, `Chofer`, `Despacho`, `Bodega`, `Finanzas`, `Comercial`, `Contador`. Portales externos NO usan `profiles.role` (token o login propio).

## 6. Integraciones reales
Resend (correo), MercadoPago (pago), WhatsApp Graph v20 (config), WooCommerce (webhook entrante `/api/minorista/pedido`). Webpay y GeoVictoria = **sin código** (planificadas).

## 7. El objetivo del negocio
Convertir esta central single-tenant en **SaaS multiempresa**. Antes de agregar features, considera si deberían nacer ya **por tenant** (ver `SAAS_MIGRATION_PLAN.md`). No introduzcas nuevo acoplamiento a NOMMA/Brotes.

## 8. Trampas ya conocidas
Ver [`KNOWN_ISSUES.md`](./KNOWN_ISSUES.md): embed ambiguo, columna inexistente, cron sin secret, "cancelado falso" de WooCommerce, dominio viejo por build roto.
