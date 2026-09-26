# MIGRATION_PLAN — Migración desde el sistema actual

> **Crítico:** no reconstruir desde cero. Evolución progresiva **sin paralizar la fábrica actual (NOMMA en producción)**. Fuente: system/ + security/.

## 1. Matriz de decisión por componente

| Componente | Estado actual | Decisión | Motivo | Riesgo | Dependencias |
|---|---|---|---|---|---|
| Stack Next.js + Supabase | En prod | **KEEP** | Sólido y suficiente | Bajo | — |
| RLS (68 tablas) | Parcial, sin auditar | **REFACTOR** | Base del aislamiento; falta `tenant_id` + auditoría | Alto (fuga si mal) | tenant layer |
| Esquema español (recetas, mayorista_pedidos, op_*, proveedor_*, mkt_*) | Vivo | **KEEP + REFACTOR** | Es el esquema real; añadir `tenant_id` | Medio | migraciones |
| Esquema inglés muerto (recipes, orders, supplier_*, inventory_*, purchase_*, customers, marketing_*) | 0 usos | **REMOVE** | Peso muerto; confunde (TD-1) | Bajo (confirmar vacío en BD) | — |
| `operarios` vs `operators` | Ambas vivas | **REFACTOR/UNIFY** | Duplicación viva (TD-2) | Medio (datos partidos) | confirmar BD |
| Autorización (arrays de rol) | Copiada | **REPLACE** | RBAC central `requirePermission` | Medio | RBAC_MODEL |
| `marca-portal.ts` (branding hack) | Hardcodeado | **REPLACE** | Branding por tenant (config) | Bajo | config engine |
| `lib/transferencia.ts` (datos banco) | Hardcodeado | **REPLACE** | Config por tenant | Bajo | config engine |
| Webhook `minorista/pedido` (secreto hardcodeado) | Inseguro | **REFACTOR** | SEC-02: quitar default + rotar | Alto (hoy) | Phase 0 |
| `cron/campanas` (secret condicional) | Inseguro si vacío | **REFACTOR** | SEC-03: exigir secret | Alto (hoy) | Phase 0 |
| Migraciones (48 .sql manuales) | Sin versionar | **REPLACE** | Supabase CLI, baseline (TD-3) | Alto (BD ≠ repo) | previo a todo |
| Módulos de negocio (operaciones, compras, finanzas, comercial…) | Implementados | **KEEP + REFACTOR** | Reutilizables; envolver con tenant+módulo+permiso | Medio | tenant/RBAC |
| Portales (mayorista, chofer, operario, picker, aldea) | Implementados | **KEEP + REFACTOR** | Reutilizables; scope por tenant | Medio | tenant layer |
| Inventario (reserva atómica) | A confirmar | **REFACTOR** | Robustecer anti-overselling | Alto (overselling) | INVENTORY |
| Integraciones (acopladas) | Directas | **REFACTOR** | Mover a Integration Hub, creds por tenant | Medio | HUB |
| Facturación DTE | Inexistente | **NEW** | `InvoiceProvider` | Medio | HUB, company |
| Capa de tenant (tenants, companies, branches, roles…) | Inexistente | **NEW** | Fundación multi-tenant | Alto | todo |
| Feature flags / módulos activables | Inexistente | **NEW** | `tenant_modules` | Bajo | — |
| Panel super-admin (onboarding) | Inexistente | **NEW** | Alta de tenants sin código | Medio | tenant layer |
| Observabilidad / alertas | Inexistente | **NEW** | Operar SaaS | Medio | — |
| CI/CD + tests de aislamiento | Inexistente | **NEW** | Calidad y seguridad | Medio | — |
| `react-leaflet` (Hippocratic-2.1) | En uso | **REPLACE** (o revisar legal) | Licencia no-OSI (THIRD_PARTY_LICENSES) | Bajo | mapas |
| Datos demo mezclados | Presentes | **REMOVE** (controlado) | Evitar mostrar demo a cliente (TD-7) | Bajo | flags |

## 2. Estrategia de migración progresiva (sin detener NOMMA)
1. **Trabajar en NOMMA como "tenant 0".** Todo el trabajo de tenant se hace con NOMMA como primer (y por un tiempo único) tenant → producción sigue operando.
2. **Expand → migrate → contract** por tabla: (a) agregar `tenant_id` nullable + backfill; (b) activar RLS en modo permisivo→estricto; (c) hacer NOT NULL cuando todo esté migrado. Sin downtime.
3. **Feature-flag por módulo**: envolver cada módulo con `requireModule`/`requirePermission` detrás de flags, activados gradualmente.
4. **Rama/entorno de staging** con datos sintéticos para probar aislamiento antes de tocar prod.
5. **Tests de aislamiento** como gate: nada pasa a "listo para cliente externo" sin pruebas verdes.
6. **Congelar** features grandes de NOMMA durante los cambios de esquema sensibles (coordinar).

## 3. Orden macro (detalle en ROADMAP)
Phase 0 (bloqueadores/seguridad) → Phase 1 (fundación tenant) → Phase 2 (RBAC) → Phase 3 (inventario/pedidos) → Phase 4 (portales) → Phase 5 (integraciones) → Phase 6 (finanzas/DTE) → Phase 7 (piloto interno) → Phase 8 (primer cliente externo) → Phase 9 (escalamiento).

## 4. Riesgos de la migración
- **Fuga cross-tenant** por RLS incompleta → mitigación: tests de aislamiento obligatorios.
- **Backfill de `tenant_id`** sobre BD sin migraciones versionadas → hacer Phase 0 primero.
- **Overselling** si la reserva no es atómica → robustecer en Phase 3.
- **Regresiones en NOMMA** → staging + flags + congelamiento parcial.
