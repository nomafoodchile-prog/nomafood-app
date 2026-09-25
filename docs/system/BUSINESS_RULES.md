# BUSINESS_RULES — Reglas de negocio

> Reglas verificadas en código. Marcadas `REQUIERE CONFIRMACIÓN` donde el cálculo no se auditó a fondo.

## Catálogo y visibilidad
- **Landing pública** (`/api/landing/productos`) muestra solo productos con `visible_catalogo = true` **y** `marca = 'NOMMA FOOD'`, excluyendo tipos internos; ordenados por categoría/subcategoría/nombre.
- **Portal mayorista** filtra por `activo`, `marca = <marca del cliente>` y `visible_catalogo = true`.
- **Restricción `chk_visible_solo_vendibles`:** `visible_catalogo = false` **o** `tipo_producto ∈ (terminado_fabricado, reventa, kit)`. → Materia prima / insumos se crean **no visibles** (si no, viola la restricción). El endpoint de creación lo respeta.

## Productos
- `tipo_producto` por defecto `terminado_fabricado`. Solo tipos "vendibles" pueden ir visibles al catálogo.
- `estado_ciclo`: `borrador → en_configuracion → listo_operar → descontinuado`. Los insumos se crean en **`borrador`** (marcar `listo_operar` directo dispara restricciones de configuración completa).
- `unidad_venta` tiene restricción (`chk_unidad_venta`): materias primas se crean con `unidad_venta = null`.
- Cada cambio de precio registra `product_price_history`.

## Recetas y producción (producción inteligente)
- Una **receta** tiene **versiones** (`receta_versiones`) con estado (`aprobada`, etc.) y **rendimiento** (`rendimiento_cantidad`/`rendimiento_unidad`).
- Al **asignar tarea** de producción se elige una receta aprobada + **tandas**; se calcula `cantidad_asignada = rendimiento × tandas` y se enlaza `op_tareas.receta_version_id`.
- El **portal del operario** escala los ingredientes: `ingrediente × tandas` (tandas = `cantidad_asignada / rendimiento`).
- **Visión (no implementada):** motor que evalúa stock vs. más vendidos y **propone/asigna producciones** automáticamente.

## Pedidos y pagos
- **Mayorista:** carrito → pedido → pago **MercadoPago** o **transferencia** (datos en `lib/transferencia.ts`). Al pasar a `pagado` (webhook/confirmación) se dispara correo "recibido con éxito"; al iniciar despacho, correo "en ruta".
- **Guard anti-duplicado de correo:** solo dispara si el estado previo no era ya `pagado`.
- **Minorista:** los pedidos llegan desde WooCommerce (`/api/minorista/pedido`, upsert por `wc_order_id`) y la Central **copia el estado de WooCommerce**. → Origen del "cancelado falso" (ver [`KNOWN_ISSUES.md`](./KNOWN_ISSUES.md)).
- **Cancelación de pedido mayorista:** **soft-cancel** (`estado='cancelado'`), nunca borrado físico.

## Crédito y cobranza
- `credit_rules` base sembrada: crédito mayorista 15 días, límite CLP 500.000, bloqueo si vencido o sobre límite. → `customer_credit_limits`, `customer_receivables`. `REQUIERE CONFIRMACIÓN` de la aplicación efectiva del bloqueo.

## Operarios y jornada
- Un operario (`operarios`: `profile_id`, `area`, `turno_default`, `activo`) inicia **jornada** (`op_jornadas`), ejecuta **tareas** (`op_tareas`) y cierra con `op_tarea_cierre` (registra merma).
- Tareas tienen `tipo` (produccion/preelaboracion/limpieza/orden), `prioridad`, `area`, `estado` (pendiente→…), `es_demo`.

## Marca / multi-marca (acoplamiento actual)
- La "marca" (`products.marca`) actúa como **discriminador** entre NOMMA y Brotes en catálogo y en URLs de portal. **No es un tenant**: comparten la misma BD y tablas. Aldea Vegetal usa `organizaciones` para agrupar sucursales de **un cliente**.

## Marcha blanca
- Interruptor de compras (`gerencia/marcha-blanca` + `business_settings`/`app_config`) habilita/inhabilita compras (control de lanzamiento).
