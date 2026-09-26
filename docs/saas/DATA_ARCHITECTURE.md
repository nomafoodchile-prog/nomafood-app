# DATA_ARCHITECTURE — Estrategia de datos multi-tenant

> Compara las opciones y recomienda. **No modifica la BD** (solo diseño).

## 1. Opciones

| Opción | Descripción |
|---|---|
| **A. BD compartida + `tenant_id` + RLS** | Una BD, cada fila con `tenant_id`, RLS fuerza el filtro por tenant del JWT |
| **B. Schema por tenant** | Un schema Postgres por empresa dentro de la misma BD |
| **C. BD/proyecto por tenant** | Un proyecto Supabase (o BD) por empresa |
| **D. Híbrida** | A por defecto; B o C para clientes enterprise/regulados |

## 2. Comparación

| Criterio | A (compartida+RLS) | B (schema) | C (BD separada) |
|---|---|---|---|
| **Seguridad/aislamiento** | Buena si RLS correcta (riesgo si falla una política) | Muy buena | Máxima |
| **Costo** | Bajo (una BD) | Medio | Alto (N proyectos) |
| **Complejidad** | Baja-media | Media (migraciones × schema) | Alta (operar N BD) |
| **Escalabilidad (muchos tenants pequeños)** | ✅ Excelente | Media (límite de schemas) | ❌ Pobre |
| **Backups** | Global simple; por-tenant requiere export lógico | Por schema | Por BD (natural) |
| **Restauración de 1 tenant** | Compleja (extraer filas por tenant) | Media (restaurar schema) | ✅ Simple |
| **Mantenimiento/migraciones** | ✅ Una vez para todos | × por schema | × por BD |
| **Riesgo operativo** | Un incidente afecta a todos; RLS = punto único | Aislamiento mayor | Blast radius mínimo |

## 3. Recomendación: **D — Híbrida, empezando por A**

- **Por qué A como base:** el sistema **ya usa RLS en 68 tablas**; es el camino de menor costo y mayor velocidad para el volumen esperado (muchas PYMEs). Un solo despliegue y una sola migración por cambio.
- **Por qué híbrida:** dejar la puerta abierta a **C (proyecto dedicado)** para un cliente enterprise que exija aislamiento físico o residencia de datos propia, sin cambiar el código (el mismo código apunta a otra BD por config).
- **Condición innegociable:** A solo es seguro con **RLS auditada + tests de aislamiento automatizados** (ver security/TENANT_ISOLATION y ROADMAP Phase 1). Sin eso, no se incorpora cliente externo.

## 4. Evolución del esquema actual (alto nivel)
1. **Prerrequisito:** adoptar **migraciones versionadas** (Supabase CLI) — hoy no existen (system/TECH_DEBT TD-3). Congelar baseline.
2. **Limpieza previa:** deprecar esquema muerto en inglés y unificar `operarios`/`operators` (system/TECH_DEBT TD-1/TD-2) **antes** de agregar `tenant_id` (menos tablas que tocar).
3. **Añadir `tenant_id`** a todas las tablas de negocio + backfill al tenant NOMMA + índices `(tenant_id, …)`.
4. **RLS por tenant** en todas las tablas; `WITH CHECK` en INSERT.
5. **JWT con `tenant_id`** (app_metadata) vía hook de Supabase Auth.
6. Reemplazar filtros por `marca`/config hardcodeada por lectura de `tenant_settings`.

## 5. Integridad y borrado
- **Integridad referencial** dentro del tenant (FKs con `tenant_id` en la clave compuesta donde aplique).
- **Soft-delete** estándar (`estado`/`deleted_at`) para documentos de negocio; borrado físico solo por proceso de retención/baja de tenant.
- **Unicidad por tenant** (p.ej. SKU único **por tenant**, no global).

## 6. Reglas para el equipo (guardarraíles)
- Prohibido `service-role` sin scope de tenant explícito; preferir sesión de usuario + RLS.
- Todo `INSERT` setea `tenant_id` desde el contexto server, nunca desde el input.
- Migraciones nuevas: toda tabla nace con `tenant_id` + RLS (checklist en revisión de código).
