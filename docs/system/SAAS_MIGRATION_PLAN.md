# SAAS_MIGRATION_PLAN — De central interna a producto multiempresa

> Propuesta de arquitectura objetivo. **No ejecutar sin aprobación.** Primero auditar (hecho), documentar (hecho), decidir arquitectura (este doc), luego implementar por fases.

## 1. Diagnóstico: ¿qué tan lejos estamos de SaaS?

| Capacidad SaaS | Estado hoy | Distancia |
|---|---|---|
| **Multi-tenant (aislamiento de datos)** | ❌ single-tenant; sin `tenant_id` en tablas núcleo | **Grande** |
| Configuración por empresa | ⚠️ parcial (`business_settings` global, sin tenant) | Media |
| Branding / white-label | ⚠️ hack 2 marcas (`includes('brotes')`) | Media |
| Roles configurables | ❌ roles fijos, arrays hardcodeados | Media |
| Módulos activables (feature flags) | ❌ no existe | Media |
| Onboarding de empresa | ❌ manual (SQL a mano) | Grande |
| Planes / licenciamiento | ❌ no existe | Media |
| Migraciones reproducibles | ❌ SQL manual | **Grande** |
| Auditoría / logs | ⚠️ `audit_logs`, `*_audit_log` existen | Baja |
| Backups / DR | ❓ gestionado por Supabase, sin plan documentado | Media |

**Conclusión:** el sistema es un **producto funcionalmente rico pero single-tenant**. Convertirlo es viable; el trabajo pesado es (a) capa de tenant + aislamiento, y (b) migraciones reproducibles.

## 2. Modelo objetivo (conceptual)

```
PLATFORM (motor, código compartido)
 └─ TENANT (empresa cliente)  ← nueva entidad raíz
     ├─ configuración (branding, colores, logo, dominio, integraciones, plan)
     ├─ MARCAS (0..n)          ← lo que hoy es products.marca
     ├─ SUCURSALES/BODEGAS     ← generaliza organizaciones/bodegas
     ├─ USUARIOS + ROLES (por tenant)
     ├─ MÓDULOS ACTIVADOS (feature flags)
     └─ DATOS (products, recetas, operarios, proveedores, inventario, finanzas, pedidos…)
          todo con tenant_id
```

- **`organizaciones`** (hoy = cliente Aldea con sucursales) se **reinterpreta** como el nivel **sucursal dentro de un tenant**, no como el tenant.
- **`products.marca`** pasa a ser **entidad `marcas`** con FK a tenant (permite catálogos y white-label por marca).

## 3. Estrategia de aislamiento (elegir una)

| Opción | Descripción | Pro | Contra | Recomendación |
|---|---|---|---|---|
| **A. Tenant por columna (`tenant_id`) + RLS** | Una BD, cada fila con `tenant_id`, RLS fuerza el filtro | Menor costo, un solo deploy, ya hay RLS | Riesgo si una política falla; hay que tocar todas las tablas | ✅ **Recomendada** para empezar |
| B. Schema por tenant | Un schema Postgres por empresa | Aislamiento fuerte | Migraciones × N, complejidad | Para clientes grandes/regulados |
| C. BD/proyecto Supabase por tenant | Un proyecto por empresa | Aislamiento máximo, blast radius mínimo | Costo y operación altos, sin economías de escala | Solo enterprise |

**Recomendación:** **Opción A** (columna + RLS), con posibilidad de "graduar" clientes grandes a B/C. El JWT de Supabase debe portar `tenant_id` (app_metadata) y las políticas RLS filtrar por `auth.jwt() ->> 'tenant_id'`.

## 4. Fases propuestas (incremental, sin romper NOMMA)

### Fase 0 — Cimientos (habilitantes, sin cambiar comportamiento)
1. Adoptar **migraciones versionadas** (Supabase CLI). Congelar baseline actual.
2. Limpiar esquema muerto (TD-1) y resolver `operarios`/`operators` (TD-2) — **tras confirmar en BD viva**.
3. Helper único de autorización `requireRole()` (TD-4).

### Fase 1 — Capa de tenant
4. Crear tablas `tenants`, `tenant_users`, `tenant_settings`, `roles`, `role_permissions`, `feature_flags`.
5. Añadir `tenant_id` a todas las tablas de negocio (backfill = tenant "NOMMA").
6. Poblar `tenant_id` en el JWT (app_metadata) y **RLS por tenant** en todas las tablas.
7. Reemplazar filtros por `marca` / config hardcodeada por lectura de `tenant_settings`.

### Fase 2 — Configurabilidad
8. **Branding por tenant** (logo, colores, dominio) → generaliza `marca-portal.ts`.
9. **Feature flags** por tenant/plan → módulos activables.
10. **Integraciones por tenant** (Resend/MP/WhatsApp con credenciales propias en bóveda).

### Fase 3 — Onboarding y comercialización
11. **Panel de super-admin de plataforma** para crear tenants (reemplaza SQL manual).
12. **Plantillas por industria** (fábrica de alimentos, cafetería, restaurante): set de módulos + roles + catálogos base.
13. **Planes / licenciamiento** y límites por plan.

### Fase 4 — Operación de producto
14. CI/CD, ambientes, backups por tenant, monitoreo, versionado y changelog.

## 5. Riesgos de la migración
- **RLS mal configurada = fuga de datos entre empresas** (riesgo #1). Requiere tests de aislamiento por tenant.
- Backfill de `tenant_id` sobre BD sin migraciones versionadas es delicado → hacer Fase 0 primero.
- No congelar features nuevas de NOMMA durante la migración de esquema.

## 6. Qué YA ayuda (activos reutilizables)
- RLS ya activo en 68 tablas (base para Opción A).
- `business_settings` (key/value) y `organizaciones` (multi-sucursal) como semillas conceptuales.
- Lógica de negocio rica y probada en operación real (NOMMA en producción).
