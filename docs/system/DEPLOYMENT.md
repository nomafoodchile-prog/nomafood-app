# DEPLOYMENT — Despliegue

> Parte verificado en repo, parte inferido del contexto operativo. Marcado en cada punto.

## 1. Estado actual (según contexto del proyecto)

| Aspecto | Valor | Verificación |
|---|---|---|
| Hosting | **Vercel** | Inferido (contexto de despliegue). **No hay `vercel.json`** en el repo → `REQUIERE CONFIRMACIÓN` de configuración |
| Dominio producción | **nommafood.cl** | Verificado (el sitio responde en producción) |
| Dominio portal Brotes | **mayoristas.brotesasiaticos.cl** | Declarado en `lib/marca-portal.ts` (`NO VERIFICADO` que esté activo) |
| Rama de deploy | `feature/portal-chofer` (auto-deploy) | Según flujo de trabajo actual (`REQUIERE CONFIRMACIÓN` de rama de Producción) |
| Base de datos | **Supabase** (proyecto gestionado) | Verificado por uso en código |
| Build | `next build` (script `build`) | Verificado en `package.json` |

## 2. Cómo se despliega hoy (flujo observado)
1. Se hace push a la rama conectada a Vercel.
2. Vercel construye (`next build`) y publica; si el build falla, **Vercel mantiene el último build “Ready”** (riesgo: el dominio queda desactualizado sin aviso).
3. **Migraciones de BD:** se corren **a mano** en el SQL editor de Supabase (los `.sql` del repo son la referencia, no una automatización).

> ✅ **Regla operativa aprendida:** correr `tsc --noEmit` local (0 errores) **antes** de pushear, porque un build roto deja el dominio viejo. Ver [`KNOWN_ISSUES.md`](./KNOWN_ISSUES.md).

## 3. Requisitos de entorno
- Node compatible con Next 14 (18/20). Variables: ver [`ENVIRONMENT.md`](./ENVIRONMENT.md).
- Proyecto Supabase con el esquema aplicado (los 48 `.sql`, **en orden de dependencias** — no están numerados, hay que resolver el orden a mano).

## 4. Brechas para producto/SaaS
- **Sin IaC / sin `vercel.json`**: la config de cron y dominios no está versionada.
- **Sin migraciones versionadas**: no se puede reproducir la BD de forma determinista → bloqueante para instalar clientes nuevos. Ver [`REPLICATION_PLAYBOOK.md`](./REPLICATION_PLAYBOOK.md).
- **Sin CI/CD** declarado en el repo (no hay `.github/workflows`) → `REQUIERE CONFIRMACIÓN`.
- **Sin ambientes separados** (dev/staging/prod) declarados.
- **Sin estrategia de backups** documentada (Supabase ofrece backups gestionados; `NO VERIFICADO` el plan).

## 5. Objetivo
- Versionar migraciones (Supabase CLI o Prisma) → BD reproducible.
- `vercel.json` con crons y headers.
- Pipeline CI: typecheck + lint + build + (a futuro) tests.
- Provisión de tenant automatizada (ver [`SAAS_MIGRATION_PLAN.md`](./SAAS_MIGRATION_PLAN.md)).
