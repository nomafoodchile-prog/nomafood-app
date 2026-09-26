# ROADMAP — Transformación a SaaS (Phase 0–9)

> Orden de implementación. **Nada se implementa hasta aprobación.** Cada fase tiene criterios de aceptación y tests. Regla transversal: **ningún cliente externo entra antes de Phase 8**, y Phase 8 exige Phase 1–3 con tests de aislamiento verdes.

---

## PHASE 0 — Bloqueadores y seguridad
- **Objetivo:** cerrar los P0 rápidos y crear los cimientos técnicos (sin cambiar comportamiento).
- **Cambios:** quitar secreto webhook hardcodeado y rotarlo (SEC-02); exigir `CRON_SECRET` (SEC-03); adoptar **migraciones versionadas** (Supabase CLI, baseline); limpiar esquema muerto (TD-1) y unificar `operarios/operators` (TD-2) tras confirmar BD; helper `requirePermission` (sin cambiar políticas aún); staging + datos sintéticos.
- **Dependencias:** acceso a Vercel/Supabase; confirmar contenido de tablas en BD viva.
- **Riesgos:** tocar BD sin migraciones (por eso migraciones van primero); romper NOMMA (mitiga staging).
- **Criterios de aceptación:** ningún secreto en el repo; cron protegido; baseline de migraciones reproducible; build/tsc verdes.
- **Tests:** secret-scan en CI; smoke test de webhook/cron con y sin secreto; restore del baseline en staging.
- **Docs afectados:** security/SECURITY_AUDIT, system/TECH_DEBT, DATA_ARCHITECTURE.

## PHASE 1 — Fundación multi-tenant
- **Objetivo:** introducir el tenant como raíz de aislamiento.
- **Cambios:** tablas `tenants/companies/branches/warehouses/tenant_users/tenant_settings/tenant_modules`; `tenant_id` en todas las tablas de negocio (expand→backfill NOMMA→NOT NULL); **RLS por tenant** en todas; `tenant_id` en el JWT (app_metadata); resolver tenant en middleware.
- **Dependencias:** Phase 0 (migraciones + limpieza).
- **Riesgos:** **fuga cross-tenant** si RLS incompleta (el riesgo #1); performance de índices.
- **Criterios de aceptación:** toda tabla de negocio tiene `tenant_id` + RLS; el JWT porta el tenant; NOMMA opera igual como "tenant 0".
- **Tests:** **suite de aislamiento**: por cada tabla/endpoint, un usuario de Tenant B **no** lee/escribe datos de Tenant A (crear un tenant de prueba); tests de que `tenant_id` no es manipulable desde el cliente.
- **Docs afectados:** TENANT_MODEL, DATA_ARCHITECTURE, SAAS_ARCHITECTURE, security/TENANT_ISOLATION.

## PHASE 2 — Usuarios / RBAC
- **Objetivo:** permisos escalables y configurables por tenant.
- **Cambios:** `roles/role_permissions/user_roles`; catálogo `modulo.accion`; `requirePermission` en todos los endpoints (reemplaza arrays); invitación/desactivación/**revocación inmediata**; scope por branch/warehouse; `tenant_modules` + `requireModule`.
- **Dependencias:** Phase 1.
- **Riesgos:** endpoints sin proteger durante la transición; inconsistencia de permisos.
- **Criterios de aceptación:** 0 endpoints con array de rol hardcodeado; desactivar usuario corta acceso al instante; módulos activables por tenant.
- **Tests:** matriz de permisos (cada rol solo hace lo suyo); test de revocación inmediata; test de módulo desactivado → 404/403.
- **Docs afectados:** RBAC_MODEL, MODULE_ARCHITECTURE, security/SECURITY_ARCHITECTURE.

## PHASE 3 — Inventario y pedidos
- **Objetivo:** inventario como fuente de verdad + pedidos sin overselling.
- **Cambios:** formalizar estados de stock; **reserva atómica**; expiración de reservas; libro `stock_movements`; `available` server-side; flujo de pedido con reserva/validación/crédito; estados configurables.
- **Dependencias:** Phase 1–2.
- **Riesgos:** **overselling** por carrera; regresiones en pedidos de NOMMA.
- **Criterios de aceptación:** dos compras simultáneas de la última unidad → solo una gana; catálogo muestra solo `available`; crédito bloquea según regla.
- **Tests:** **test de concurrencia** (N reservas paralelas sobre stock 1); test de expiración/liberación; test de bloqueo por deuda.
- **Docs afectados:** INVENTORY_ARCHITECTURE, ORDER_FLOW.

## PHASE 4 — Portales operacionales
- **Objetivo:** portales multi-tenant compartiendo base.
- **Cambios:** scope por tenant en todos los portales (mayorista/chofer/operario/picker/cliente/comercial); UI compartida + específico por experiencia; branding por tenant (reemplaza `marca-portal.ts`); tokens de portal con vida corta / menos datos en URL (SEC-09).
- **Dependencias:** Phase 1–3.
- **Riesgos:** duplicación de UI; fugas por token.
- **Criterios de aceptación:** cada portal solo muestra datos del tenant/usuario; branding por tenant funciona; sin `if(tenant===)`.
- **Tests:** aislamiento por portal; branding por tenant; expiración de token.
- **Docs afectados:** PORTALS (system), CONFIGURATION_ENGINE, STORAGE_ARCHITECTURE.

## PHASE 5 — Integraciones
- **Objetivo:** Integration Hub con credenciales por tenant.
- **Cambios:** interfaz `Connector`; mover Resend/MP/WhatsApp/WooCommerce/mapas a adaptadores; `tenant_integrations` + bóveda; webhooks con firma+idempotencia+reintentos; logs/métricas.
- **Dependencias:** Phase 1–2.
- **Riesgos:** romper flujos actuales al desacoplar; credenciales mal migradas.
- **Criterios de aceptación:** cada integración usa credenciales del tenant; webhooks idempotentes y firmados; reintentos/DLQ operativos.
- **Tests:** test de idempotencia de webhook; test de credenciales por tenant; simulación de fallo + reintento.
- **Docs afectados:** INTEGRATION_HUB, security/INTEGRATIONS.

## PHASE 6 — Finanzas y facturación (DTE)
- **Objetivo:** gestión financiera multi-tenant + facturación electrónica desacoplada.
- **Cambios:** `tenant_id` en finanzas; **`InvoiceProvider`** + un proveedor DTE; config tributaria por company; PDF/XML en Storage; CxC/CxP; conciliación; separar gestión operacional de contabilidad formal.
- **Dependencias:** Phase 1–3 (+5 para el proveedor DTE).
- **Riesgos:** credenciales tributarias mal aisladas (**nunca compartir**); errores de emisión.
- **Criterios de aceptación:** emisión con la identidad tributaria del tenant; credenciales tributarias jamás compartidas; documentos guardados y auditados.
- **Tests:** aislamiento de credenciales DTE; emisión/anulación en sandbox del proveedor; conciliación.
- **Docs afectados:** BILLING_INTEGRATION, finanzas (system).

## PHASE 7 — Piloto interno (NOMMA)
- **Objetivo:** validar todo con "tenant 0" en producción real.
- **Cambios:** activar módulos por plan; capturar **línea base** de métricas; observabilidad + alertas.
- **Dependencias:** Phase 1–6.
- **Riesgos:** regresiones operativas.
- **Criterios de aceptación:** NOMMA opera sin regresiones; métricas base capturadas; alertas funcionando; **0 incidentes de aislamiento**.
- **Tests:** E2E de operación real; suite de aislamiento en verde; pruebas de restore.
- **Docs afectados:** PILOT_PLAN, OBSERVABILITY, security/BACKUP_RECOVERY.

## PHASE 8 — Primer cliente externo
- **Objetivo:** onboarding de un segundo tenant real **sin tocar código**.
- **Cambios:** panel super-admin de onboarding; asistente de configuración/import; DPA y aviso de privacidad (⚖️).
- **Dependencias:** Phase 1–7 con **tests de aislamiento verdes** (requisito absoluto).
- **Riesgos:** fuga de datos entre el cliente y NOMMA (el escenario que todo esto previene).
- **Criterios de aceptación:** alta 100% por configuración; aislamiento probado con datos reales; backups/restore por tenant demostrados; incident response mínimo operativo.
- **Tests:** aislamiento con datos productivos de 2 tenants; restore de 1 tenant sin afectar al otro; pentest básico de cross-tenant/IDOR.
- **Docs afectados:** ONBOARDING, security/PRIVACY_ARCHITECTURE, security/INCIDENT_RESPONSE.

## PHASE 9 — Escalamiento SaaS
- **Objetivo:** operar como producto con muchos tenants (y habilitar IA).
- **Cambios:** planes/facturación del SaaS; plantillas por industria maduras; self-service onboarding; observabilidad avanzada/SLA; **agente IA multi-tenant** (tras tests de aislamiento del agente); opción de tenant dedicado (Opción C híbrida) para enterprise.
- **Dependencias:** Phase 8 estable.
- **Riesgos:** costos/operación a escala; aislamiento del agente IA.
- **Criterios de aceptación:** onboarding self-service; SLA/monitoreo; agente IA sin fugas cross-tenant.
- **Tests:** carga/escala; aislamiento del agente (A no recupera nada de B por ningún canal).
- **Docs afectados:** PRODUCT_MODEL, AI_AGENT_ARCHITECTURE, security/AI_SECURITY, DATA_ARCHITECTURE.

---

## Regla de puertas (quality gates)
- No se pasa de fase sin **criterios de aceptación + tests verdes**.
- **Puerta dura antes de Phase 8:** suite de aislamiento cross-tenant + restore por tenant + P0/P1 de seguridad cerrados.
