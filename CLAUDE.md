# CLAUDE.md — Instrucciones obligatorias de inicio

> Plataforma de operaciones multi-negocio ("Central") en producción real, en proceso de
> productización a **SaaS multiempresa**. Chile. Este archivo es breve a propósito (§5.4):
> no cargar todos los docs en cada sesión; usar carga selectiva por módulo.

## 1. Al iniciar CADA sesión (en este orden)
1. Leer este `CLAUDE.md`.
2. Leer `docs/system/SYSTEM_MASTER.md` (contexto maestro) — solo si falta contexto.
3. Leer `project/ACTIVE_TASK.md` (la tarea activa principal y sus criterios).
4. Leer `project/SESSION_HANDOFF.md` (dónde quedó la sesión anterior).
5. Leer `project/BLOCKERS.md` (bloqueos y decisiones humanas pendientes).
6. Revisar Git: `git log --oneline -8`, `git status -sb`, rama actual.
7. Comprobar que la tarea activa sigue siendo válida contra el código/pruebas.
8. Continuar desde el último punto seguro y verificable. NO iniciar features nuevas
   por iniciativa propia si hay una tarea activa prioritaria sin terminar.

## 2. Fuente de la verdad (canónica)
- **Rama canónica = `feature/portal-chofer`.** Es la que despliega a **nommafood.cl** vía Vercel
  (GitHub → repo `nomafoodchile-prog/nomafood-app`). Contiene TODO: código más nuevo + 64 docs + 55 migraciones.
- `origin/main` está **MUERTA** (~328 commits atrás). NO usarla.
- Copias locales `~/Downloads/nomafood-central-fresh` y otras están **desactualizadas** (semanas atrás). NO trabajar ahí.
- Detalle de la comparación de ramas: `project/SESSION_HANDOFF.md`.

## 3. Seguridad (no negociable)
- **NO tocar producción** (merge a la rama de deploy, SQL en Supabase prod, cambios destructivos) **sin autorización explícita** de la dueña.
- **Aislamiento multiempresa = P0 y AÚN NO implementado** (no hay `tenant_id` en tablas núcleo; las APIs usan service-role que ignora RLS). → **NO** poner data real de un segundo cliente externo sobre la infra compartida hasta validar aislamiento (ver `docs/security/TENANT_ISOLATION.md`).
- No guardar secretos en el repo ni en docs. Sin datos personales en logs/commits.
- La IA nunca tiene SQL irrestricto en producción; acciones sensibles pasan por herramientas tipadas + autorización.
- P0 abiertos a cerrar: secreto de webhook hardcodeado y cron sin secret (ver `docs/security/SECURITY_AUDIT.md` SEC-02/SEC-03 y `project/BLOCKERS.md`).

## 4. Procedimiento de desarrollo
- Trabajar en la rama `feature/portal-chofer` (es la de trabajo+deploy actual). Cambios no destructivos.
- Verificar SIEMPRE antes de pushear: `npx tsc --noEmit` y, si aplica, `npx next build`.
- Commit con evidencia. Tras cada entrega relevante, actualizar: `project/CURRENT` (ACTIVE_TASK, COMPLETED, SESSION_HANDOFF, BLOCKERS).
- No reconstruir desde cero lo que funciona. **No duplicar** los 64 docs ya existentes — enlazarlos.

## 5. Dónde vive la documentación (índice)
- `docs/system/` (17): SYSTEM_MASTER, ARCHITECTURE, DATABASE_SCHEMA, MODULES, PORTALS, ROLES_PERMISSIONS, INTEGRATIONS, DECISIONS, TECH_DEBT, KNOWN_ISSUES, DEPLOYMENT, ENVIRONMENT, BUSINESS_RULES, AGENT_CONTEXT, REPLICATION_PLAYBOOK, SAAS_MIGRATION_PLAN, CHANGELOG_SYSTEM.
- `docs/security/` (11): SECURITY_AUDIT, TENANT_ISOLATION, THREAT_MODEL, PRIVACY_ARCHITECTURE, AI_SECURITY, IP_PROTECTION, DATA_MAP, INCIDENT_RESPONSE, BACKUP_RECOVERY, THIRD_PARTY_LICENSES, SECURITY_ARCHITECTURE.
- `docs/saas/` (19): SAAS_MASTER_PLAN, SAAS_ARCHITECTURE, ROADMAP, MIGRATION_PLAN, TENANT_MODEL, PRODUCT_MODEL, PILOT_PLAN, AI_AGENT_ARCHITECTURE, BILLING_INTEGRATION, INTEGRATION_HUB, DATA_ARCHITECTURE, MODULE_ARCHITECTURE, CONFIGURATION_ENGINE, ONBOARDING, OBSERVABILITY, INVENTORY_ARCHITECTURE, entre otros.
- `docs/fabrica/`, `docs/restaurante/`: verticales.
- `docs/*.md`: ESTADO-DEL-SISTEMA, AUDITORIA-INTEGRAL-SISTEMA-NOMMA, GUIA-REANUDAR-PROYECTO, CHECKLIST-MAESTRO-NOMMA, PLAN-BORRADO-DEMO, etc.

## 6. Identidad / marca (transición controlada)
- Marca de alimentos/fábrica: **Brotes Asiáticos**. Locales físicos futuros: **Brotes Asian Street**.
- Restaurante piloto externo: **Chinoburger** (tenant independiente).
- Plataforma SaaS: **nombre pendiente de definir** (no inventar; ver `project/BLOCKERS.md`).
- No usar "NOMMA FOOD" como identidad comercial futura. No eliminar precipitadamente nombres antiguos en código/dominios/BD que aún sean necesarios.
