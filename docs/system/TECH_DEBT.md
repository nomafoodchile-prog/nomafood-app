# TECH_DEBT — Deuda técnica

> Priorizada. Cada ítem indica evidencia verificada y severidad. **No refactorizar antes de confirmar** cada punto contra la BD viva.

## 🔴 Alta

### TD-1 · Doble esquema español/inglés (tablas muertas)
- **Evidencia:** conteo de `from('tabla')` en código → `recipes`=0, `orders`=0, `order_lines`=0, `supplier_products`=0, `inventory_movements`=0, `purchase_requests`=0, `production_orders`=0, `customers`=0, `marketing_campaigns`=0. Sus equivalentes en español sí se usan.
- **Impacto:** confusión para devs/IA, riesgo de escribir en la tabla equivocada, esquema real inflado (~93 tablas, ~30% probablemente muertas).
- **Acción:** confirmar en BD viva que están vacías → deprecar/eliminar en una migración controlada.

### TD-2 · Duplicación VIVA `operarios` vs `operators`
- **Evidencia:** `operarios`=5 y `operators`=10 usos (ambas vivas).
- **Impacto:** datos de personal potencialmente partidos entre dos tablas.
- **Acción:** auditar contenido de ambas, elegir una, migrar y unificar. **Bloqueante** antes de vender.

### TD-3 · Sin migraciones versionadas
- **Evidencia:** 48 `.sql` sueltos, no numerados; `.gitignore` no incluye control de migraciones; sin Supabase CLI/Prisma.
- **Impacto:** la BD real puede diferir del repo; **no se puede recrear la BD** de forma determinista → bloquea instalar clientes nuevos.
- **Acción:** adoptar Supabase migrations (o Prisma). Congelar el esquema actual como baseline.

### TD-4 · Autorización copiada en cada endpoint
- **Evidencia:** arrays `ADMIN_ROLES` repetidos (los 3 roles admin aparecen 50 veces c/u).
- **Impacto:** inconsistencias de seguridad, cambios costosos.
- **Acción:** helper único `requireRole()` + matriz de permisos.

## 🟠 Media

### TD-5 · Configuración de empresa hardcodeada en código
- **Evidencia:** `lib/transferencia.ts` (RUT/cuenta bancaria), `lib/marca-portal.ts` (`includes('brotes')`), filtros por `marca='NOMMA FOOD'`.
- **Acción:** mover a `business_settings`/config por tenant.

### TD-6 · Sin ORM ni capa de acceso a datos
- **Evidencia:** consultas PostgREST directas en páginas y endpoints; embeds ambiguos que fallan en silencio (ver KNOWN_ISSUES).
- **Impacto:** errores silenciosos, lógica de datos dispersa.
- **Acción:** capa `lib/db/*` con funciones tipadas por entidad (o adoptar un ORM en la migración a tenant).

### TD-7 · Datos demo mezclados con producción
- **Evidencia:** scripts `*-demo*.sql` (`limpieza-demo`, `logistica-demo-datos`, `portal-operario-*-demo`), campo `es_demo` en `op_tareas`, doc `PLAN-BORRADO-DEMO.md`.
- **Impacto:** riesgo de mostrar datos demo a un cliente real.
- **Acción:** flag de entorno + limpieza controlada por tenant.

### TD-8 · i18n incompleto
- **Evidencia:** `next-intl` presente y toggle ES/EN en UI, pero mucho texto en español hardcodeado.
- **Acción:** extraer strings; necesario si se vende fuera de Chile.

## 🟡 Baja

- **TD-9 · Landing gigante:** `app/page.tsx` ~50 KB en un archivo → dividir en componentes.
- **TD-10 · BOM en `.env.example`** y posibles mojibake UTF-8 en textos.
- **TD-11 · `tsconfig.tsbuildinfo` versionado** (artefacto de build en git).
- **TD-12 · Sin tests** (no hay carpeta de pruebas ni CI) → riesgo al refactorizar.

## Resumen de severidad
| Nivel | Ítems | Bloquean venta a nuevos clientes |
|---|---|---|
| 🔴 Alta | TD-1..4 | **Sí** |
| 🟠 Media | TD-5..8 | Parcial |
| 🟡 Baja | TD-9..12 | No |
