# SESSION_HANDOFF — retomar el proyecto

_Última actualización: 2026-11-20._

## Entregable A — Comparación de repos/ramas (read-only, verificada)
`git worktree list` mostró 4 copias del mismo repo (`nomafoodchile-prog/nomafood-app`):

| Copia / rama | Último commit | Estado |
|---|---|---|
| `feature/portal-chofer` (origin = local) | `28b4f40` · **2026-11-17** | **Desplegada a nommafood.cl (Vercel). Código más nuevo.** |
| `~/Downloads/nomafood-central-fresh` @ `feat/tracking-chofer-vivo` | `324cf17` · 2026-10-02 | **0 adelante / 44 atrás** vs feature/portal-chofer → obsoleta |
| `~/Downloads/nomafood-upload/nomafood-app` @ `main` | `4fa5c63` | `main` muerta (~328 atrás) |
| `~/Downloads/nomafood-PROD-actual` @ `brotes-merge-tmp` | `15df420` | rama temporal de merge |

**Contenido por rama (ls-tree, no working dir):**
- `feature/portal-chofer`: **64 docs**, **55 migraciones** `.sql`, ~94 endpoints.
- `feat/tracking-chofer-vivo`: 64 docs, 53 migraciones (2 menos, más viejas).

## Entregable B — Fuente canónica recomendada
➡️ **`feature/portal-chofer` es la fuente canónica.** Es la desplegada, la más nueva, y es **superconjunto** de la copia "fresh" (0 commits únicos en fresh; feature/portal-chofer la contiene entera + 44 commits más + 2 migraciones más). **No se pierde nada** adoptándola.

**Estrategia de consolidación segura (sin ejecutar sin autorización):**
1. Declarar `feature/portal-chofer` como canónica. No se requiere merge: ya lo tiene todo.
2. Las copias `~/Downloads/*` quedan como **respaldo de solo lectura** (no trabajar ahí). Renombrarlas con sufijo `-OBSOLETO-backup` para evitar confusión (acción manual sugerida; reversible).
3. `main` muerta: dejarla, no borrar (puede haber referencias históricas).
4. Backup previo a cualquier cambio futuro: tag `pre-saas-YYYYMMDD` sobre feature/portal-chofer antes de tocar esquema.

## Estado de despliegue actual
- Rama de deploy: `feature/portal-chofer` → Vercel → **nommafood.cl**. Supabase proyecto `nomafood-produccion` (ref `fufmwauofcqnlrfhcenq`).
- Trabajo recién hecho en esta rama (sesión 2026-11-15→20): ver `project/COMPLETED.md`.

## Próxima acción autorizada
Construir la capa de memoria (HECHO) y entregar los puntos C–J a la dueña para sus decisiones (ver `project/BLOCKERS.md`). **No** iniciar cambios de esquema/tenant ni consolidación de carpetas sin su OK.
