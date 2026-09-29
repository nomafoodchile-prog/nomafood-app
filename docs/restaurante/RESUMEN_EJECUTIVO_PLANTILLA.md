# RESUMEN EJECUTIVO — Diagnóstico Restaurante *(plantilla)*

> Se completa **después** de aplicar el [Formulario](./FORMULARIO_DIAGNOSTICO.md) y llenar la [Matriz de Análisis](./MATRIZ_ANALISIS.md). Es el documento que se presenta a la dirección (nuestra y/o del restaurante) para decidir la adaptación. Todo entre `[...]` se reemplaza con datos reales.

**Restaurante:** `[nombre]` · **Fecha:** `[fecha]` · **Levantó:** `[nombre]` · **Respondió:** `[nombre/cargo]`

---

## 1. Perfil del restaurante
- **Tipo:** `[comida rápida / casual / …]`
- **Sucursales:** `[n]` · **Trabajadores:** `[n]` · **Clientes/día:** `[n]`
- **Turnos:** `[n]` · **Horario:** `[…]`
- **Canales:** `[salón / retiro / delivery propio / plataformas]`
- **Administra / decide:** `[quién]`
- **Herramientas hoy:** `[POS X, Excel, WhatsApp, …]`
- **Madurez digital (1–5):** `[n]`

## 2. Top 5 dolores
| # | Dolor | Área | Frec. | Impacto | Prioridad |
|---|---|---|---|---|---|
| 1 | `[…]` | | | | |
| 2 | `[…]` | | | | |
| 3 | `[…]` | | | | |
| 4 | `[…]` | | | | |
| 5 | `[…]` | | | | |

## 3. Principales pérdidas de TIEMPO
- `[proceso]` — `[~h/semana]` — hoy se hace `[cómo]`.
- `[proceso]` — `[~h/semana]`.
> Fuente: P15.5, P16.5, P5.16, P2.8.

## 4. Principales pérdidas ECONÓMICAS
- `[causa: quiebres / merma / compras en exceso / margen mal calculado]` — impacto `[bajo/medio/alto]`.
> Fuente: P16.4, P7.3, P5.13/14, P10.x.

## 5. Procesos manuales críticos
- `[proceso en papel/WhatsApp/Excel que debería ser sistema]`
- `[…]`
> Fuente: P2.x, P4.7, P5.x, P6.4, P11.x, P12.8.

## 6. Quick Wins *(alto impacto, ya existe en NOMMA → activar/configurar)*
| Quick Win | Módulo | Por qué es rápido |
|---|---|---|
| `[…]` | `[Portal Operario / Recetas / Limpieza / Mantención / Finanzas / Portal Chofer]` | Ya está construido; solo configurar |

## 7. Necesidades estructurales *(alto impacto pero requieren desarrollo)*
| Necesidad | Módulo/Área | Esfuerzo |
|---|---|---|
| `[…]` | `[Integración POS / Delivery / Reorden automático / Costeo completo / DTE]` | Alto |

## 8. Módulos SaaS que aplican
Marcar los relevantes para este restaurante:
- [ ] Dashboard gerencial
- [ ] Portal Operario (tareas + foto + tiempos)
- [ ] Recetas y producción
- [ ] Inventario / bodegas / merma
- [ ] Compras y proveedores
- [ ] Ventas / pedidos
- [ ] Delivery / Portal Chofer *(solo si delivery propio)*
- [ ] Costos
- [ ] Finanzas (caja, CxC/CxP, EERR, conciliación)
- [ ] Limpieza
- [ ] Mantención
- [ ] Facturación electrónica (DTE)
- [ ] Integración POS / plataformas de delivery

## 9. Funcionalidades actuales que YA podemos reutilizar (KEEP)
> Lo que NOMMA ya hace y sirve casi tal cual para este restaurante.
- `[Portal Operario con foto obligatoria y tiempo real]`
- `[Recetas + tandas → ingredientes escalados]`
- `[Portal Chofer con entregas por usuario]`
- `[Limpieza / Mantención / Finanzas]`
- `[…]`

## 10. Funcionalidades que requieren ADAPTACIÓN (REFACTOR)
> Existen pero hay que ajustarlas al restaurante.
- `[Costeo de plato: agregar envase, comisión de plataforma, merma, mano de obra]`
- `[Inventario: estados de stock formales + reserva anti-quiebre]`
- `[Dashboard: vista móvil "negocio bajo control"]`
- `[Multi-tenant: aislar los datos del restaurante como nuevo tenant]`
- `[…]`

## 11. Funcionalidades NUEVAS necesarias (NEW)
> No existen y hay que construirlas.
- `[Integración con POS]`
- `[Integración con Uber Eats / PedidosYa / Rappi]`
- `[Motor de reorden: stock bajo → sugerencia de compra → aprobación]`
- `[Costeo de merma en $]`
- `[Facturación electrónica DTE]`
- `[…]`

## 12. Gap Analysis
| Necesidad del restaurante | ¿NOMMA lo cubre? | Estado | Acción |
|---|---|---|---|
| `[…]` | Sí / Parcial / No | KEEP / REFACTOR / NEW | `[activar / adaptar / construir]` |
| `[…]` | | | |

**Cobertura estimada:** `[X]%` con lo existente · `[Y]%` adaptando · `[Z]%` nuevo.

## 13. Recomendación y siguiente paso
- **Encaje del producto:** `[alto / medio / bajo]` para este tipo de restaurante.
- **Piloto sugerido:** empezar por `[el dolor #1 / los Quick Wins]` para mostrar valor rápido.
- **Métricas base a capturar antes de mejorar:** `[quiebres/semana, h administrativas, % merma, tiempo pedido→factura, …]` (ver [`../saas/PILOT_PLAN.md`](../saas/PILOT_PLAN.md)).
- **Decisión pendiente de la dirección:** `[avanzar a diseño de adaptación / no avanzar / más diagnóstico]`.

---

### Orden de trabajo (recordatorio)
`LEVANTAR INFORMACIÓN → IDENTIFICAR DOLORES → PRIORIZAR → MAPEAR CONTRA EL SaaS → DETECTAR GAPS → DISEÑAR ADAPTACIÓN → IMPLEMENTAR`
Este documento cierra las etapas 1–5. La etapa **DISEÑAR ADAPTACIÓN** es el siguiente entregable, **solo tras aprobación**.
