# MATRIZ DE ANÁLISIS — Diagnóstico Fábrica → SaaS

> Uso interno. Se llena con las respuestas del [Formulario](./FORMULARIO_FABRICA.md). Una fila por dolor. Convierte dolores en decisiones de producto.

## Columnas
`Dolor | Área | Frecuencia | Impacto | Proceso actual | Riesgo/costo | Módulo SaaS | Automatización posible | Prioridad`

| # | Dolor | Área | Frec. | Impacto | Proceso actual | Riesgo/costo | Módulo SaaS | Automatización | Prioridad |
|---|---|---|---|---|---|---|---|---|---|
| 1 | | | | | | | | | |
| 2 | | | | | | | | | |
| 3 | | | | | | | | | |
| … | | | | | | | | | |

## Catálogo de mapeo Área → Módulo SaaS (para llenar rápido)

| Área del dolor | Módulo SaaS | ¿Existe en NOMMA hoy? |
|---|---|---|
| Planificación de producción | **Producción** (plan → asignación → resultado) | ⚠️ Base (recetas+tandas); falta plan formal pedidos+stock→requerimiento |
| Tareas / operarios / evidencia | **Portal Operario** | ✅ Existe (login, tareas, tiempos, **foto obligatoria**, tiempo real) |
| Recetas / fichas / requerimientos | **Recetas** | ✅ Existe (receta+versión+rendimiento+escalado por tandas) |
| Capacidad productiva (horas, cuellos) | **Producción / Capacidad** | ⛔ NUEVO (horas disp. vs plan vs real) |
| Inventario (MP, insumos, terminados, ubicaciones) | **Inventario** | ⚠️ Parcial (falta estados de stock + reserva) |
| Lotes y trazabilidad | **Lotes / Trazabilidad** | ⚠️ Existe `inventario_lotes`; trazabilidad hacia adelante = adaptar/NUEVO |
| Compras / proveedores / reposición | **Compras + Proveedores** | ⚠️ Compras existe; **reorden automático = NUEVO** |
| Recepción de MP (calidad, temp., lotes) | **Compras/Recepción + Calidad** | ⚠️ Recepción existe; controles de calidad = adaptar |
| Calidad / inocuidad / no conformidades | **Calidad** | ⛔ NUEVO (checklists, liberación, reprocesos) |
| BPM / limpieza | **Limpieza** | ✅ Existe (Central + portal operario) |
| Mermas y rendimientos | **Inventario/Merma + Costos** | ⚠️ Registro en cierre; **costeo de merma $ = NUEVO** |
| Mantención de equipos | **Mantención** | ✅ Existe (fichas, plan, historial); costo/producción perdida = adaptar |
| Pedidos / ventas | **Pedidos** | ⚠️ Pedidos B2B existe |
| Picking y despacho | **Picking + Despacho + Portal Chofer** | ✅ Existe (picker con login + chofer por usuario) |
| Costos (por receta/producto, margen) | **Costos** | ⚠️ Costo por receta; costeo completo (envase/MO/merma/energía) = adaptar |
| Finanzas (caja, EERR, utilidad por línea) | **Finanzas** | ✅ Existe (Caja, CxC/CxP, EERR, conciliación) |
| Visibilidad gerencia (tiempo real móvil) | **Dashboard Gerencial + Alertas** | ⚠️ Dashboard existe; vista móvil "bajo control" = adaptar |
| Integraciones (ERP/POS/contable/DTE) | **Integraciones / Facturación** | ⛔ NUEVO (según lo que use la fábrica) |

## Regla de priorización
**Prioridad = (Impacto × Frecuencia) ÷ Esfuerzo.**
- Frecuencia: Diario=5 · Varias/sem=4 · Semanal=3 · Ocasional=2.
- Esfuerzo: KEEP(existe)=1 · REFACTOR(adaptar)=2 · NEW(nuevo)=3.
- **Quick Win** = Impacto ≥4, Frecuencia ≥4, Esfuerzo=1.
- **Estructural** = Impacto ≥4, Esfuerzo=3.

## Ejemplos ilustrativos (borrar al usar con datos reales)
| # | Dolor | Área | Frec. | Impacto | Proceso actual | Módulo | Automatización | Prioridad |
|---|---|---|---|---|---|---|---|---|
| E1 | "No sé si mañana alcanzo a fabricar todo lo pedido" | Planificación/Capacidad | Diario | 5 | Cálculo mental | Producción/Capacidad | Pedidos+recetas+capacidad→plan | Estructural (NEW) |
| E2 | "Rastrear un lote me toma un día" | Trazabilidad | Ocasional | 5 | Papel/Excel | Lotes/Trazabilidad | Lote→clientes en segundos | Alta (adaptar) |
| E3 | "No sé cuánto pierdo por merma" | Merma/Costos | Diario | 4 | No se registra | Merma+Costos | Merma→$ automático | Alta (NEW) |
| E4 | "No sé qué operario hizo cada producción" | Operarios | Diario | 4 | De palabra | Portal Operario | Registro con responsable+tiempos+foto | **Quick Win** (existe) |
