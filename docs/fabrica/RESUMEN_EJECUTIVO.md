# RESUMEN EJECUTIVO — Diagnóstico Fábrica *(plantilla)*

> Se completa con las respuestas del [Formulario](./FORMULARIO_FABRICA.md) y la [Matriz](./MATRIZ_ANALISIS.md). Documento para decidir la adaptación. Reemplazar `[...]`.

**Fábrica:** `[nombre]` · **Fecha:** `[fecha]` · **Respondió:** `[nombre/cargo]`

## 1. Perfil de la fábrica
- **Fabrica:** `[tipo de alimentos]` · **Plantas:** `[n]` · **Trabajadores:** `[n]` · **SKU:** `[n]`
- **Sistemas hoy:** `[ERP/Excel/WhatsApp/…]`
- **Maneja:** lotes `[sí/no]` · reparto propio `[sí/no]` · turnos `[…]`

## 2. Top 5 dolores
| # | Dolor | Área | Frec. | Impacto | Prioridad |
|---|---|---|---|---|---|
| 1 | `[…]` | | | | |
| 2–5 | `[…]` | | | | |

## 3. Principales pérdidas ECONÓMICAS
- `[merma sin control / máquina detenida / compras en exceso / margen mal calculado]`
> Fuente: k_dinero, m_dinero, mt_perdida, cs_margen.

## 4. Principales pérdidas de TIEMPO
- `[proceso manual — ~h/semana]`
> Fuente: k_tiempo, op_tiempos, i_saben, co_que.

## 5. Cuellos de botella
- `[línea/equipo/proceso que limita la producción]`
> Fuente: pp_capacidad, op_tiempos, mt_perdida.

## 6. Problemas de trazabilidad
- `[tiempo para rastrear un lote: lt_tiempo]` · `[lotes sí/no]`
> Crítico para inocuidad/retiros de producto.

## 7. Procesos manuales críticos
- `[lo que hoy es papel/WhatsApp/Excel y debería ser sistema]`

## 8. Quick Wins *(alto impacto, ya existe en NOMMA → activar)*
| Quick Win | Módulo |
|---|---|
| `[…]` | `[Portal Operario / Recetas / Mantención / Finanzas / Picking-Despacho]` |

## 9. Necesidades estructurales *(alto impacto, requieren desarrollo)*
| Necesidad | Módulo | Esfuerzo |
|---|---|---|
| `[…]` | `[Capacidad / Trazabilidad / Reorden / Calidad / Costeo completo]` | Alto |

## 10. Módulos SaaS aplicables
- [ ] Producción · [ ] Portal Operario · [ ] Recetas · [ ] Inventario · [ ] Lotes/Trazabilidad
- [ ] Compras/Proveedores · [ ] Calidad · [ ] Limpieza · [ ] Mantención
- [ ] Pedidos · [ ] Picking · [ ] Despacho/Chofer · [ ] Costos · [ ] Finanzas
- [ ] Dashboard Gerencial · [ ] Alertas · [ ] Integraciones

## 11. Funcionalidades que YA posee NOMMA (KEEP)
- `[Portal Operario con foto + tiempos + tiempo real]`
- `[Recetas + tandas → escalado de ingredientes]`
- `[Picker con login + Chofer por usuario]`
- `[Limpieza / Mantención / Finanzas]`

## 12. Funcionalidades que requieren ADAPTACIÓN (REFACTOR)
- `[Inventario: estados de stock + reserva]`
- `[Costeo completo del producto (envase, MO, merma, energía)]`
- `[Trazabilidad hacia adelante (lote → clientes)]`
- `[Multi-tenant: aislar la fábrica como nuevo tenant]`

## 13. Funcionalidades NUEVAS necesarias (NEW)
- `[Capacidad productiva (horas disp. vs plan vs real, cuellos)]`
- `[Motor de reorden de compras]`
- `[Módulo de Calidad (checklists, liberación, no conformidades)]`
- `[Costeo de merma en $]`
- `[Integración con ERP/POS/contable de la fábrica]`

## 14. Gap Analysis
| Necesidad | ¿NOMMA la cubre? | Estado | Acción |
|---|---|---|---|
| `[…]` | Sí / Parcial / No | KEEP / REFACTOR / NEW | `[activar / adaptar / construir]` |

**Cobertura estimada:** `[X]%` existente · `[Y]%` adaptando · `[Z]%` nuevo.

## 15. Recomendación
- **Encaje del producto:** `[alto/medio/bajo]`.
- **Piloto sugerido:** `[dolor #1 / Quick Wins]`.
- **Métricas base antes de mejorar:** `[quiebres/sem, % merma $, tiempo rastreo de lote, h para saber capacidad, cumplimiento de producción]`.
- **Decisión de dirección:** `[avanzar a diseño de adaptación / más diagnóstico]`.

---
Orden: `DIAGNOSTICAR → DOLORES → PRIORIZAR → MAPEAR vs SaaS → GAPS → DISEÑAR ADAPTACIÓN → IMPLEMENTAR`. Este documento cierra las etapas 1–5.
