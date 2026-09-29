# MATRIZ DE ANÁLISIS — Diagnóstico Restaurante → SaaS

> **Uso interno.** Se completa **con las respuestas** del [Formulario](./FORMULARIO_DIAGNOSTICO.md). Cada fila = un dolor detectado. Objetivo: convertir dolores en decisiones de producto (qué módulo del SaaS aplica, si se automatiza, y con qué prioridad).
> Fuente de módulos: [`../saas/MODULE_ARCHITECTURE.md`](../saas/MODULE_ARCHITECTURE.md) y [`../system/MODULES.md`](../system/MODULES.md).

## 1. Columnas de la matriz

| Columna | Qué se anota |
|---|---|
| **Dolor** | El problema concreto (de S15 o de respuestas puntuales) |
| **Área** | Operación / Cocina / Personal / Inventario / Compras / Merma / Ventas / Delivery / Costos / Finanzas / Limpieza / Mantención / Visibilidad |
| **Frecuencia** | Nunca · Ocasional · Semanal · Varias/semana · Diario (de P15.3) |
| **Impacto** | 1–5 (de P15.4) |
| **Proceso actual** | Cómo lo resuelven hoy (manual/papel/WhatsApp/Excel/sistema) |
| **Tiempo/costo asociado** | Horas/semana (P15.5) y/o pérdida $ (P15.6) |
| **Módulo SaaS relacionado** | Módulo existente/objetivo que lo cubre (ver §3) |
| **Automatización posible** | Qué se puede automatizar (DETECTAR→RECOMENDAR→EJECUTAR→CONTROLAR) |
| **Prioridad** | 1–5 (P15.7), ajustada con esfuerzo (ver §4) |

## 2. Plantilla (vacía para llenar)

| # | Dolor | Área | Frec. | Impacto | Proceso actual | Tiempo/costo | Módulo SaaS | Automatización posible | Prioridad |
|---|---|---|---|---|---|---|---|---|---|
| 1 | | | | | | | | | |
| 2 | | | | | | | | | |
| 3 | | | | | | | | | |
| 4 | | | | | | | | | |
| 5 | | | | | | | | | |
| … | | | | | | | | | |

## 3. Catálogo de mapeo Área → Módulo SaaS (para llenar rápido)

| Área del dolor | Módulo(s) SaaS que aplican | ¿Existe hoy en NOMMA? |
|---|---|---|
| Operación / tareas de turno | **Portal Operario** + Tareas + Dashboard | ✅ Existe (login, tareas, foto, tiempo real) |
| Cocina / producción / preelaboraciones | **Recetas** + **Producción** (tandas/escalado) | ✅ Existe (receta+tandas→ingredientes escalados) |
| Estandarización / recetas / gramajes | **Recetas y formulaciones** | ✅ Existe |
| Personal / asignación / cumplimiento / evidencia | **Portal Operario** + Personas/Asistencia | ✅ Portal operario con foto obligatoria; asistencia parcial |
| Inventario / stock / vencimientos / ubicaciones | **Inventario** (estados de stock, lotes, bodegas) | ⚠️ Parcial — falta estados formales y reserva atómica |
| Compras / proveedores / reposición | **Compras** + Proveedores + (motor de reorden) | ⚠️ Compras existe; **reorden automático = NUEVO** |
| Merma / desperdicio | **Inventario/Merma** + reportes | ⚠️ Registro de merma existe en cierre; **costeo de merma = NUEVO** |
| Ventas / pedidos / canales | **Pedidos** + Comercial + **Integración POS/Delivery** | ⚠️ Pedidos B2B existe; **POS y delivery = NUEVO** |
| Delivery propio / rutas / evidencia | **Portal Chofer** + Despacho | ✅ Existe (login, entregas por chofer, tiempo real) |
| Costos / margen por plato | **Costos** (receta costeada) | ⚠️ Parcial — costo por receta; **costeo con envase/comisión/merma = adaptar** |
| Finanzas / caja / EERR / conciliación | **Finanzas** (Caja, CxC, CxP, EERR, cartolas) | ✅ Existe (módulos F1–F4) |
| Limpieza / sanitario / temperaturas | **Limpieza** + checklists | ✅ Existe (Central + portal operario); **temperaturas = adaptar** |
| Mantención / equipos | **Mantención** (fichas, plan, historial) | ✅ Existe |
| Visibilidad del dueño | **Dashboard gerencial** + tiempo real | ⚠️ Dashboard existe; **vista móvil "negocio bajo control" = adaptar** |
| Facturación electrónica (boleta/factura) | **Facturación DTE** | ⛔ NUEVO (diseñado, no implementado) |

## 4. Regla de priorización (para ordenar el backlog)

**Prioridad efectiva = (Impacto × Frecuencia) ÷ Esfuerzo**, con estos apoyos:
- **Frecuencia numérica:** Diario=5 · Varias/semana=4 · Semanal=3 · Ocasional=2 · Nunca=1.
- **Esfuerzo:** Reutilizable (KEEP)=1 · Adaptar (REFACTOR)=2 · Nuevo (NEW)=3.
- **Quick Win** = Impacto ≥4, Frecuencia ≥4, Esfuerzo =1 (ya existe en NOMMA → activar/configurar).
- **Estructural** = Impacto ≥4 pero Esfuerzo =3 (requiere desarrollo nuevo → planificar).

## 5. Ejemplos ilustrativos (borrar al usar con datos reales)

| # | Dolor | Área | Frec. | Impacto | Proceso actual | Tiempo/costo | Módulo SaaS | Automatización posible | Prioridad |
|---|---|---|---|---|---|---|---|---|---|
| E1 | "Nos quedamos sin insumos en pleno servicio" | Inventario | Varias/sem | 5 | Revisión visual | ~4 h/sem + ventas perdidas | Inventario + Compras | Stock mínimo → alerta → sugerencia de compra | **Alta** (Impacto 5 × Frec 4, adaptar) |
| E2 | "No sé qué está haciendo el equipo cuando no estoy" | Visibilidad | Diario | 4 | Llamadas/WhatsApp | ~1 h/día | Portal Operario + Dashboard | Tareas con inicio/fin + foto → tablero en vivo | **Quick Win** (ya existe) |
| E3 | "No sé el costo real de cada plato" | Costos | — | 4 | Estimación | margen difuso | Costos (receta costeada) | Costo auto al cambiar insumo | Media-Alta (adaptar) |
| E4 | "Tardo semanas en saber si gané o perdí" | Finanzas | Mensual | 5 | Contador externo | decisiones tardías | Finanzas / EERR | Caja + EERR al día | Media (existe, requiere carga de datos) |
| E5 | "Se me olvida mantención de equipos" | Mantención | Ocasional | 3 | Memoria | reparaciones caras | Mantención | Plan preventivo + recordatorios | Media (ya existe) |

> Estos ejemplos NO son afirmaciones sobre un restaurante real — son plantilla. Se reemplazan con los datos del diagnóstico.
