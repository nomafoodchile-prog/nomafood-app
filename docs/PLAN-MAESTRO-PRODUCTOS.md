# Plan — Maestro de Productos (NOMMA FOOD)

_Fecha: 2026-07-06 · Etapa: **SOLO ANÁLISIS Y PLAN** (no se implementó ningún cambio). Espera aprobación de Nataly._

> Objetivo: convertir **Comercial → Productos** de una lista de precios a la **fuente única de verdad** de cada producto, preparado para conectar con Inventario, Recetas, Preelaboraciones, Producción, Picking, Calidad, Despacho, Costos y Portal Mayorista.

---

## 1. Tablas, campos y relaciones actuales del módulo Productos

### Tabla `products` (REAL, aplicada, ~15 columnas)
| Campo | Tipo | Notas |
|---|---|---|
| id | uuid | PK |
| sku | text | código |
| nombre | text | nombre comercial |
| categoria | text | texto libre |
| descripcion | text | descripción |
| unidad | text | **texto libre** (un, etc.) |
| precio | numeric | **precio único** (mayorista) |
| stock_actual | numeric | stock (hoy manual, sin movimientos reales) |
| imagen_url | text | foto |
| activo | boolean | activo comercial |
| destacado | boolean | para landing |
| foto_url | text | foto pública |
| descripcion_publica | text | landing |
| created_at / updated_at | timestamptz | |

### Relaciones detectadas
- **`mayorista_pedido_items.producto_id` → `products(id)` (FK real).** Además guarda copia (`producto_nombre`, `producto_sku`) → **los pedidos históricos NO se rompen** si cambia el producto (tienen snapshot). Pero la FK existe: no se puede borrar un producto usado en pedidos.
- **RLS:** `products_authenticated_read` (lectura) + `products_admin_write` (escritura) — declaradas en `rls-policies.sql` **[VERIFICAR si aplicadas]**.

### Quién usa `products` hoy
| Consumidor | Columnas | Estado |
|---|---|---|
| Portal Mayorista catálogo (API token) | nombre, sku, precio, unidad, categoria, stock_actual, imagen_url, descripcion | ✅ Real, funciona |
| **Central → Productos** (recién hecho) | id, sku, nombre, categoria, unidad, precio, stock_actual, activo | ✅ Real (editar precio) |
| API `/api/central/productos` | update/create precio, activo | ✅ Real (admin) |
| **Landing `/mayoristas`** (destacados) | `name, category, descripcion_publica, foto_url` | 🔴 **BUG**: usa `name`/`category` (inglés) que **NO existen** (la tabla tiene `nombre`/`categoria`) → los destacados salen sin nombre |

---

## 2. Qué es real, parcial, demo o hardcodeado

- 🟢 **Real:** la tabla `products` (10–15 productos reales, ej. "Ciabatta lomito seitan"), el precio, el catálogo del portal, la edición de precio recién construida, la FK con pedidos.
- 🟡 **Parcial:** `stock_actual` existe pero **no se mueve solo** (no hay movimientos de inventario reales); `categoria`/`unidad` son **texto libre** (sin lista controlada); `destacado`/`descripcion_publica`/`foto_url` existen pero la landing los lee mal.
- 🔴 **Roto:** la consulta de destacados de la **landing** (`name`/`category`).
- ⚪ **No existe (solo en `schema.sql`, NO aplicado):** `recipes`, `recipe_ingredients`, `recipe_steps`, `production_orders`, `production_items`, `inventory_movements`, `stock_reservations`, `warehouse_locations`, `picking_tasks`, costos. **Nada de Producción/Inventario/Recetas/Costos tiene backend real todavía.**

---

## 3. Qué campos faltan para el objetivo

La ficha pedida necesita **muchos campos nuevos** (todos como columnas **nuevas y opcionales**, sin renombrar las actuales) + **tablas nuevas**:

**GENERAL:** `subcategoria`, `tipo_producto` (lista: terminado_fabricado · preelaboracion · materia_prima · envase_insumo · reventa · kit).
**VENTA:** `unidad_venta` (lista: unidad, bandeja, caja, bolsa, pack, kilo), `cantidad_por_unidad_venta`, `unidad_inventario` (lista), `factor_conversion` (1 caja = N unidades), `pedido_minimo`, `visible_catalogo`. → El **precio base** ya existe (`precio`).
**PRODUCCIÓN:** `receta_id` (FK futura), `rendimiento_lote`, `tiempo_produccion_min`, `merma_esperada_pct`, `modalidad_produccion` (stock/contra_pedido), `producible` (con candado), `area_responsable`.
**INVENTARIO/CALIDAD:** `stock_min`, `stock_max`, `punto_reposicion`, `ubicacion`, `condicion_almacenamiento` (ambiente/refrigerado/congelado), `vida_util_dias`, `maneja_lote`, `dias_min_despacho`, `estado_calidad` (disponible/retenido/bloqueado).
**PICKING/DESPACHO:** `ubicacion_picking`, `tipo_embalaje`, `peso_aprox_kg`, `bultos_estimados`, `instrucciones_manipulacion`, `requiere_fechado`, `requiere_etiqueta`, `codigo_barras`.
**COSTOS:** `costo_envase`, `costo_mano_obra`, `costo_receta` (calc), `costo_total` (calc), `margen_bruto` (calc).

**Tablas nuevas necesarias:**
- `product_price_history` — historial de precios con vigencia (precio, vigente_desde, vigente_hasta, usuario) → regla "no sobrescribir precio sin dejar registro".
- `product_audit_log` — trazabilidad (producto, campo, valor_anterior, valor_nuevo, usuario, fecha).
- (Fase factory) `recipes` + `recipe_ingredients` + `recipe_steps`, `inventory` + `inventory_movements` + `stock_reservations`, etc. — el **núcleo de fábrica** que decidiste construir limpio.

---

## 4. Datos actuales a migrar / normalizar

- **`unidad` (texto libre) → `unidad_venta`/`unidad_inventario` (listas).** Migración: crear columnas nuevas, mapear los valores actuales ("un" → unidad, etc.), **mantener `unidad` viejo** hasta que el portal lea las nuevas. No romper el catálogo.
- **`categoria` texto libre → normalizar** a un set controlado (o tabla de categorías) — opcional, gradual.
- **Bug landing:** alinear a `nombre`/`categoria` (o agregar columnas espejo). Es corrección, no migración destructiva.
- **`tipo_producto`:** los 10 productos actuales son "producto terminado fabricado" → poner ese valor por defecto y ajustar los que sean materia prima/envase.
- **Precio actual → primera fila de `product_price_history`** (vigente desde hoy).

---

## 5. Riesgos de afectar pedidos / inventario / producción

| Riesgo | Mitigación |
|---|---|
| Romper el **catálogo del portal** al tocar `unidad`/`nombre`/`precio` | **Solo AGREGAR columnas, nunca renombrar/borrar.** El portal sigue leyendo las actuales. |
| FK `mayorista_pedido_items.producto_id` | **No borrar productos**; usar `activo=false`. Los pedidos históricos tienen snapshot, no se rompen. |
| Confundir "activo comercial" con "disponible/producible/bloqueado" | Estados **separados** (campos distintos), no un solo `activo`. |
| Descuentos incorrectos por unidad (caja vs unidad) | El `factor_conversion` debe existir **antes** de conectar inventario; hasta entonces, no automatizar descuento de stock. |
| Tocar tablas ERP inexistentes | No hay nada aplicado de `schema.sql`; se construye **nuevo y limpio**, sin migrar ese esquema. |
| Cambios sin trazabilidad | Toda edición pasa por API con `product_audit_log` (usuario/fecha/antes/después). |

**Conclusión de riesgo:** si respetamos la regla **"agregar, no renombrar/borrar"**, el riesgo sobre pedidos/portal es **bajo**. Producción/Inventario no existen aún, así que no hay qué romper ahí — se construye.

---

## 6. Plan de implementación seguro por fases

- **P1 — Ficha base + Venta + Historial + Trazabilidad (Recomendado primero).**
  Agregar columnas GENERAL + VENTA (tipo_producto, unidades controladas, conversión, pedido_mínimo, visible_catálogo). Crear `product_price_history` y `product_audit_log`. Convertir la pantalla actual en **ficha con pestañas** (General, Venta) con listas controladas y guardado con trazabilidad. **Corregir el bug de la landing.** _Bajo riesgo, additive, valor inmediato._
- **P2 — Inventario y Calidad (campos).** Agregar stock_min/max, punto_reposición, ubicación, condición de almacenamiento, vida útil, estado_calidad. Pestaña Inventario/Calidad. (Los **movimientos** reales de stock vienen con el módulo Inventario.)
- **P3 — Picking y Despacho (campos).** Ubicación de picking, embalaje, peso, bultos, fechado/etiqueta, campo código de barras. Pestaña Picking.
- **P4 — Producción + Costos (núcleo de fábrica).** Crear `recipes`/ingredientes/pasos, vincular receta al producto, candado "producible" (exige receta+rendimiento+unidades+proceso), cálculo de costo desde receta y margen. Aquí se habilita: pedido aprobado → revisar stock PT → calcular producción faltante.
- **P5 — Automatizaciones.** Reserva/descuento de stock por conversión de unidad, cálculo automático de producción, conexión con Picking/Calidad/Despacho.

---

## 7. Recomendación: qué construir primero

**Empezar por P1.** Razones:
1. Es la **fundación** (fuente única de verdad); todo lo demás (inventario, recetas, producción) se cuelga del producto.
2. Es **additive y de bajo riesgo** (no rompe portal ni pedidos).
3. Da **valor inmediato**: ficha ordenada, tipo de producto, unidades controladas con conversión (evita el error caja/unidad), **historial de precios con vigencia** y **trazabilidad** (usuario/fecha/antes-después) — justo tus reglas de negocio.
4. De paso **corrige el bug de la landing**.

La automatización pesada (revisar stock, calcular producción) depende de tener Inventario + Recetas reales (P4), que es parte del **núcleo de fábrica limpio** que ya aprobaste.

---

## Preguntas para Nataly antes de implementar P1
1. **Tipos de producto:** ¿la lista propuesta (terminado_fabricado, preelaboración, materia_prima, envase_insumo, reventa, kit) está completa?
2. **Unidades controladas:** ¿unidad, bandeja, caja, bolsa, pack, kilo cubre todo? ¿Agregas alguna (ej. litro, docena)?
3. **Precio por cliente/segmento:** hoy el precio del cliente es `precio` × `descuento_pct` del mayorista. ¿Mantenemos ese modelo (descuento por cliente) o quieres **listas de precio por segmento** (otra tabla)? _(Recomiendo mantener descuento por cliente en P1 y evaluar segmentos en P4.)_
4. **¿Apruebas empezar por P1** (ficha con pestañas General+Venta + historial + trazabilidad + fix landing), sin tocar producción/inventario todavía?

> **No implemento nada hasta tu aprobación.**
