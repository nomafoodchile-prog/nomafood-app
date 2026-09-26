# SAAS_MASTER_PLAN — Índice maestro de la transformación SaaS

> **Propósito:** puerta de entrada al diseño de la **arquitectura objetivo** para convertir la Central (hoy single-tenant) en una **plataforma SaaS multiempresa** con un solo código base.
> **Fecha:** 2026-09-26 · **Estado:** DISEÑO (no implementado). **No** se ha tocado código, BD ni producción.
> **Fuente de verdad:** [`/docs/system/`](../system/SYSTEM_MASTER.md) (qué existe) y [`/docs/security/`](../security/SECURITY_AUDIT.md) (riesgos). Este diseño **no repite** las auditorías; las consume.

## Principio rector
> **UN producto · UN código base · MÚLTIPLES empresas (tenants) · MÓDULOS configurables · DATOS totalmente aislados.**
> Nunca una copia del sistema por cliente. Incorporar una empresa nueva = **datos + configuración**, no código.

## Documentos de este diseño

| # | Documento | Tema |
|---|---|---|
| 1 | [`SAAS_ARCHITECTURE.md`](./SAAS_ARCHITECTURE.md) | Arquitectura general objetivo (capas, principios, enforcement) |
| 2 | [`TENANT_MODEL.md`](./TENANT_MODEL.md) | Modelo multi-tenant: Tenant/Company/Branch/Location/Warehouse/User |
| 3 | [`RBAC_MODEL.md`](./RBAC_MODEL.md) | Identidad, roles y permisos `modulo.accion` con scope |
| 4 | [`MODULE_ARCHITECTURE.md`](./MODULE_ARCHITECTURE.md) | Módulos CORE / OPTIONAL / ENTERPRISE y dependencias |
| 5 | [`CONFIGURATION_ENGINE.md`](./CONFIGURATION_ENGINE.md) | Qué es configuración vs. desarrollo |
| 6 | [`INVENTORY_ARCHITECTURE.md`](./INVENTORY_ARCHITECTURE.md) | Estados de stock, reservas, anti-overselling |
| 7 | [`ORDER_FLOW.md`](./ORDER_FLOW.md) | Flujo pedido → reserva → picking → despacho → factura → cobranza |
| 8 | [`INTEGRATION_HUB.md`](./INTEGRATION_HUB.md) | Capa de integraciones con adaptadores por tenant |
| 9 | [`BILLING_INTEGRATION.md`](./BILLING_INTEGRATION.md) | Facturación electrónica (DTE) desacoplada por proveedor |
| 10 | [`DATA_ARCHITECTURE.md`](./DATA_ARCHITECTURE.md) | Estrategia de datos (A/B/C/D) y recomendación |
| 11 | [`STORAGE_ARCHITECTURE.md`](./STORAGE_ARCHITECTURE.md) | Archivos por tenant, sin rutas adivinables |
| 12 | [`OBSERVABILITY.md`](./OBSERVABILITY.md) | Logs, métricas, alertas, health checks |
| 13 | [`ONBOARDING.md`](./ONBOARDING.md) | Alta de empresa nueva sin tocar código |
| 14 | [`MIGRATION_PLAN.md`](./MIGRATION_PLAN.md) | Matriz KEEP/REFACTOR/REPLACE/REMOVE/NEW + migración progresiva |
| 15 | [`PILOT_PLAN.md`](./PILOT_PLAN.md) | Pilotos y métricas de línea base (ROI) |
| 16 | [`ROADMAP.md`](./ROADMAP.md) | Roadmap Phase 0–9 con criterios de aceptación |
| — | [`AI_AGENT_ARCHITECTURE.md`](./AI_AGENT_ARCHITECTURE.md) | Agente IA multi-tenant (concepto; ver también security/AI_SECURITY) |

## Decisiones de arquitectura ya tomadas en este diseño (resumen)

| Decisión | Elección | Detalle en |
|---|---|---|
| Raíz de aislamiento | **Tenant** (no la marca ni la organización) | TENANT_MODEL |
| Estrategia de datos | **A: BD compartida + `tenant_id` + RLS** (híbrida a futuro para enterprise) | DATA_ARCHITECTURE |
| Origen del `tenant_id` | **JWT (app_metadata)**, nunca del frontend | SAAS_ARCHITECTURE |
| Permisos | **`modulo.accion`** + roles por tenant + scope sucursal/bodega | RBAC_MODEL |
| Módulos | CORE / OPTIONAL / ENTERPRISE con feature flags por tenant | MODULE_ARCHITECTURE |
| Integraciones | **Adapter pattern**, credenciales por tenant, idempotencia | INTEGRATION_HUB |
| Facturación | **Interfaz `InvoiceProvider`** desacoplada, config tributaria por tenant | BILLING_INTEGRATION |
| Inventario | Estados de stock + **reservas atómicas** anti-overselling | INVENTORY_ARCHITECTURE |

## Bloqueadores (P0) — estado
- **SEC-01 (aislamiento multiempresa):** es el objetivo de este diseño. No bloquea diseñar; **bloquea incorporar clientes externos** hasta implementarse (Phase 1).
- **SEC-02 (secreto webhook hardcodeado) / SEC-03 (cron sin secret):** correcciones rápidas de **Phase 0**; no bloquean el diseño.
- **Conclusión:** el diseño puede entregarse ahora; la implementación se ordena en [`ROADMAP.md`](./ROADMAP.md).

## Qué NO hace este entregable
No implementa, no migra datos, no cambia producción ni arquitectura crítica. Es diseño + plan. **Espera aprobación** para iniciar Phase 0.
