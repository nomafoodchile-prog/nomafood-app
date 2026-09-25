# MODULES — Inventario maestro de módulos (Central / Backoffice)

> Verificado por enumeración de `app/(central)/**/page.tsx` y `app/api/central/**`.
> **Estado** = presencia de código verificada. `IMPLEMENTADA` significa que existe página + endpoint(s); la corrección funcional en producción **no fue probada exhaustivamente** salvo donde se indica.

Grupos del menú (verificados en `app/(central)/`): **dashboard, operaciones, comercial, compras, finanzas, personas, gerencia, aldea**.

---

## DASHBOARD
- **Ruta:** `/dashboard` · **API:** `/api/central/analitica`, `/api/central/alertas`
- **Tablas:** `balance_snapshots`, `orders`/`mayorista_pedidos`, `web_visits`, varias (KPIs) · **Estado:** IMPLEMENTADA
- **Obs:** KPIs con tendencias (snapshots). Depende de datos de otros módulos.

## OPERACIONES
Submódulos (rutas verificadas):

| Submódulo | Ruta | API principal | Tablas | Estado |
|---|---|---|---|---|
| Pedidos | `/operaciones/pedidos` | `/api/central/pedidos/[id]` | `orders`,`order_lines`,`mayorista_pedidos` | IMPLEMENTADA |
| Monitoreo en vivo | `/operaciones/monitoreo` | (realtime) | `dispatches`,`op_jornadas` | IMPLEMENTADA |
| Incidencias | `/operaciones/incidencias` | `/api/central/alertas` | `notificaciones`,`op_tarea_eventos` | IMPLEMENTADA |
| Despachos | `/operaciones/despachos` | `portal/chofer/*` | `dispatches`,`stops` | IMPLEMENTADA |
| Mensajes a choferes | `/operaciones/mensajes` | `/api/central/...` | `op_mensajes` | IMPLEMENTADA |
| Inventario | `/operaciones/inventario` | `/api/central/inventario` | `inventario_lotes`,`inventario_movimientos`,`bodegas` | IMPLEMENTADA |
| Limpieza | `/operaciones/limpieza` | `/api/central/limpieza` | `op_checklist_templates`,`cleaning_reports` | IMPLEMENTADA (editar/borrar tareas añadido) |
| Mantención | `/operaciones/mantencion` | `/api/central/mantencion` | `maintenance_events`,`machine_failures` | IMPLEMENTADA |
| **Operarios** | `/operaciones/operarios` | `/api/central/operarios/crear`, `/asignar-tarea` | `operarios`,`op_tareas`,`op_jornadas` | IMPLEMENTADA (crear operario + asignar tarea con receta+tandas) |
| Producción | `/operaciones/produccion` | — | `production_orders`,`production_items` | IMPLEMENTADA |
| **Recetas y formulaciones** | `/operaciones/produccion/recetas` | `/api/central/recetas`, `/recetas/demo` | `recetas`,`receta_versiones`,`receta_ingredientes`,`receta_pasos` | IMPLEMENTADA |
| Tareas | `/operaciones/tareas` | `/api/central/operarios/asignar-tarea` | `op_tareas`,`adt_tasks` | IMPLEMENTADA |

> **Producción inteligente (visión):** recetas + tandas → escalado de ingredientes → (futuro) auto-asignación por stock vs ventas. Etapa 1 y 2 IMPLEMENTADAS; Etapa 3 (motor automático) **PLANIFICADA**.

## COMERCIAL
| Submódulo | Ruta | API | Tablas | Estado |
|---|---|---|---|---|
| Productos | `/comercial/productos` | `/api/central/productos` | `products`,`product_price_history`,`product_audit_log` | IMPLEMENTADA |
| Clientes | `/comercial/clientes` | `/api/central/clientes`, `/clientes/password` | `customers`,`mayoristas`,`mayorista_usuarios` | IMPLEMENTADA |
| Direcciones | `/comercial/direcciones` | `/api/central/direcciones` | `mayorista_direcciones` | IMPLEMENTADA |
| Solicitudes (leads) | `/comercial/solicitudes` | `/api/central/...`, `/api/importacion/solicitud` | `access_requests`,`access_request_events` | IMPLEMENTADA |
| Pedidos minorista | `/comercial/pedidos-minorista` | `/api/central/pedidos-minorista`, `/api/minorista/pedido` | `minorista_pedidos`,`minorista_pedido_items` | IMPLEMENTADA (OC imprimible) |
| Campañas (marketing) | `/comercial/campanas` | `/api/central/marketing`, `/api/cron/campanas` | `mkt_campanas`,`mkt_envios`,`mkt_plantillas`,`mkt_cupones` | IMPLEMENTADA |
| Analítica | `/comercial/analitica` | `/api/central/analitica` | `web_visits`,`marketing_campaigns` | IMPLEMENTADA |
| Importaciones | `/comercial/importaciones` | `/api/central/importaciones` | `import_requests` | PARCIAL (`REQUIERE CONFIRMACIÓN`) |

## COMPRAS (Abastecimiento)
| Submódulo | Ruta | API | Tablas | Estado |
|---|---|---|---|---|
| Proveedores | `/compras/proveedores` | `/api/central/proveedores` | `proveedores`,`proveedor_productos`,`proveedor_precio_historial` | IMPLEMENTADA |
| Solicitudes de compra | `/compras/solicitudes` | `/api/central/solicitudes-compra` | `solicitudes_compra`,`solicitud_compra_items` | IMPLEMENTADA |
| En curso (OC) | `/compras/en-curso` | `/api/central/...` | `purchase_orders`,`purchase_requests` | IMPLEMENTADA |
| Recepción | `/compras/recepcion` | `/api/central/recepciones` | `recepciones`,`recepcion_items`,`purchase_receipts` | IMPLEMENTADA |

> ⚠️ **Duplicación:** coexisten `proveedores/*` (español) y `supplier_products`/`supplier_price_history` (inglés), y `purchase_*` vs `solicitudes_compra/*`. Ver [`TECH_DEBT.md`](./TECH_DEBT.md).

## FINANZAS
| Submódulo | Ruta | API | Tablas | Estado |
|---|---|---|---|---|
| Caja | `/finanzas/caja` | `/api/central/finanzas` | `fin_cierres_caja`,`cash_entries` | IMPLEMENTADA |
| Estado de resultados | `/finanzas/estado-resultados` | `/api/central/finanzas` | `fin_movimientos` | IMPLEMENTADA |
| Balance | `/finanzas/balance` | `/api/central/finanzas` | `balance_snapshots` | IMPLEMENTADA |
| Cartolas / conciliación | `/finanzas/cartolas` | `/api/central/finanzas` | `fin_cartolas`,`fin_cartola_movimientos` | IMPLEMENTADA |
| Cobranza | `/finanzas/cobranza` | `/api/central/finanzas` | `customer_receivables`,`customer_credit_limits`,`credit_rules` | IMPLEMENTADA |
| Costos | `/finanzas/costos` | `/api/central/finanzas` | `recetas`+`products`+precios | IMPLEMENTADA (`REQUIERE CONFIRMACIÓN` de cálculo) |
| Remuneraciones | `/finanzas/remuneraciones` | `/api/central/finanzas` | (export a contador) | IMPLEMENTADA |

## PERSONAS
| Submódulo | Ruta | API | Tablas | Estado |
|---|---|---|---|---|
| Usuarios | `/personas/usuarios` | `/api/central/...` | `profiles` | IMPLEMENTADA |
| Accesos | `/personas/accesos` | `/api/central/...` | `profiles`,`operarios` | IMPLEMENTADA |

## GERENCIA
| Submódulo | Ruta | API | Tablas | Estado |
|---|---|---|---|---|
| Marcha blanca (switch de compras) | `/gerencia/marcha-blanca` | `/api/central/config` | `business_settings`/`app_config` | IMPLEMENTADA |

## ALDEA (cliente corporativo interno)
- **Ruta:** `/aldea` · **API:** `/api/central/aldea/*` (catalogo, facturas, incidencias, reserva, resumen, solicitudes, usuarios)
- **Tablas:** `organizaciones`,`aldea_catalogo`,`aldea_facturas`,`aldea_incidencias`,`aldea_reserva`,`aldea_solicitudes`,`aldea_solicitud_items`,`aldea_stock`
- **Estado:** IMPLEMENTADA (fundación). **Es específico de un cliente** (Aldea Vegetal, 3 cafeterías) — ver [`SAAS_MIGRATION_PLAN.md`](./SAAS_MIGRATION_PLAN.md).

---

## Clasificación transversal
- **PLANIFICADA:** motor de auto-producción (stock vs ventas); integración GeoVictoria (asistencia); Webpay como medio de pago.
- **LEGACY / duplicada (posible no usada):** esquema en inglés `recipes/recipe_*`, `operators`, `supplier_*`, `inventory_*`, `adt_tasks`, `production_orders/items`, `picking_tasks`, `orders/order_lines` frente a sus equivalentes en español. **`REQUIERE CONFIRMACIÓN`** de cuáles están vivas (ver [`TECH_DEBT.md`](./TECH_DEBT.md)).
