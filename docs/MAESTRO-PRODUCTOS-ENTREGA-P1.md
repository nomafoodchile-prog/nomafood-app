# Maestro de Productos — Entrega (fases P1 + P1.5)

_Fecha: 2026-07-06 · Rama `feature/portal-chofer` · Respaldo previo: rama `backup/pre-maestro-reglas` (commit `e01c92c`)._

## 1. Tablas / campos creados o modificados
- **`products` (modificada, aditivo):** de ~15 a ~59 columnas. Nuevos bloques: General (subcategoria, tipo_producto, marca, foto_oficial_url, maneja_lote, maneja_vencimiento, codigo_tipo, codigo_valor, **estado_ciclo**), Venta (unidad_venta, cantidad_por_unidad_venta, unidad_inventario, factor_conversion, pedido_minimo, visible_catalogo), Producción (**receta_estado, receta_version**, rendimiento_lote, **rendimiento_unidad**, tiempo_produccion_min, merma_esperada_pct, modalidad_produccion, area_responsable, receta_id), Inventario/Calidad (stock_min, stock_max, punto_reposicion, ubicacion, condicion_almacenamiento, vida_util_dias, dias_min_despacho, estado_calidad), Picking (ubicacion_picking, tipo_embalaje, peso_aprox_kg, bultos_estimados, instrucciones_manipulacion, requiere_fechado, requiere_etiqueta), Costos (costo_envase, costo_mano_obra, costo_receta, costo_total, margen_bruto).
- **Listas controladas (CHECK):** tipo_producto, unidad_venta, unidad_inventario, condicion_almacenamiento, estado_calidad, modalidad_produccion, codigo_tipo, estado_ciclo, receta_estado.
- **`product_price_history` (nueva):** historial de precios con vigencia (precio_neto, vigente_desde/hasta, usuario).
- **`product_audit_log` (nueva):** trazabilidad (campo, valor_anterior, valor_nuevo, usuario, fecha/hora).
- **`catalogos` (nueva):** listas internas administrables (categoria, subcategoria, ubicacion, area, condicion_almacenamiento, tipo_embalaje). RLS: todos leen, solo admin edita.
- **No se borró ni renombró nada.** El portal, la landing y los pedidos siguen leyendo sus columnas.

## 2. Reglas ACTIVAS ahora
- Ficha con **6 pestañas dinámicas** según tipo de producto (materia prima/envase/etc. ocultan lo que no aplica).
- **Conversión automática** (factor calculado en la API, de solo lectura).
- **Precio neto (sin IVA)** + **IVA 19%** calculado.
- **Ciclo de vida** (Borrador / En configuración / Listo para operar / Descontinuado) **separado** de "Activo comercial".
- **Estado de calidad NO manual** en el maestro (solo política); el estado real vendrá de lotes.
- **Catálogos internos controlados** + alta inline (solo admin) para categoría/subcategoría/ubicación/área/condición/embalaje.
- **Seguridad alimentaria:** en productos terminados, lote/vencimiento/fechado/etiqueta ON por defecto; **solo SuperAdmin puede desactivarlos** y queda **auditado**.
- **Historial de precios** (al cambiar el neto) + **auditoría** de cada cambio (usuario, fecha/hora, campo, antes, después), colapsable.
- **Estados calculados hoy:** activo comercial (manual), visible en catálogo (manual+activo), disponible para venta (stock real **o** venta contra pedido).
- **API con validación de rol interno** para toda escritura.

## 3. Reglas PREPARADAS (placeholder hasta Recetas e Inventario)
- **Producible (real):** exige **receta aprobada** + rendimiento + unidades + proceso. Hoy el campo `receta_estado` existe y la regla está lista, pero como no hay módulo Recetas, **ningún producto es "producible" real** (badge en rojo "sin receta aprobada"). Botón "Ver receta" deshabilitado.
- **Disponible para picking (real):** exige **lote liberado + stock real + vida útil mínima** (módulo Inventario por lotes). Hoy badge **provisional** "según lotes".
- **Estado de calidad real** (disponible/retenido/bloqueado): vendrá de los **lotes** en Inventario. Hoy el producto define solo la política; badge **provisional**.
- **Stock real, reserva y descuento por conversión de unidad:** módulo Inventario.
- **Costo desde receta y margen automático:** módulos Recetas + Costos.

## 4. Datos actuales a completar / normalizar
- **Hecho por la migración:** productos terminados con lote/vencimiento/fechado/etiqueta ON; productos activos marcados "listo_operar"; categorías sembradas en catálogos desde los productos.
- **Por completar en cada ficha (campos nuevos vacíos):** unidad de venta e inventario, cantidad/conversión, tipo y valor de código, área responsable, ubicación, condición de almacenamiento, vida útil, días mínimos de despacho, embalaje, pesos, costos.
- **Catálogos a enriquecer:** subcategorías y ubicaciones (aún sin valores).
- **Recetas:** todas en `receta_estado = 'no_asignada'` → por eso ningún producto figura como "producible" real todavía.
- **Datos de prueba:** nombres demo (p. ej. "kkkk", "A.V") se limpiarán en la fase de limpieza de datos.

## 5. Próximo (requiere tu confirmación)
No se avanzó a integración automática con Inventario/Producción. Los siguientes módulos que "activan de verdad" estas reglas son: **Recetas** (producible real, costos) e **Inventario por lotes** (stock real, calidad, disponibilidad de picking).
