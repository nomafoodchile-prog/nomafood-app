# BACKUP_RECOVERY — Respaldo y recuperación

> ⚠️ **Regla:** un backup **no es funcional** hasta que se prueba una **restauración real**. Este documento distingue lo que existe de lo que está **verificado**.

## 1. Estado actual (verificado / no verificado)

| Aspecto | Estado |
|---|---|
| Backups de BD | Gestionados por **Supabase** (según plan del proyecto) — `NO VERIFICADO` frecuencia/retención reales |
| Frecuencia | `NO VERIFICADO` (depende del plan Supabase: diarios / PITR según tier) |
| Retención | `NO VERIFICADO` |
| Redundancia | Gestionada por Supabase/infra — `NO VERIFICADO` |
| **Prueba de restore** | ❌ **Sin evidencia** de que se haya restaurado con éxito alguna vez |
| Disaster Recovery (DR) plan | ❌ no existe documentado |
| Backups de **Storage** (archivos/evidencias) | `NO VERIFICADO` |
| Backup del **código** | ✅ Git (repo) + Vercel |
| **Migraciones versionadas** (para recrear esquema) | ❌ no hay (bloquea recuperación reproducible) |
| Monitoreo/alertas de backup | ❌ no verificado |

## 2. Riesgos
- **No se sabe si se puede recuperar.** Confiar en backups no probados es un riesgo alto para un SaaS que custodia datos de terceros.
- **Sin migraciones versionadas**, reconstruir la BD desde cero (o en otra región/proyecto) es manual y frágil.
- **RPO/RTO indefinidos**: no hay objetivo de cuánta información se puede perder ni en cuánto tiempo se restablece.
- **Storage** (fotos/evidencias) podría no estar respaldado igual que la BD.

## 3. Objetivo (no ejecutar aún)
1. **Confirmar** en Supabase: tipo de backup (diario/PITR), frecuencia, retención, región.
2. **Prueba de restore documentada**: restaurar a un proyecto/entorno aparte y validar integridad. Repetir periódicamente.
3. Definir **RPO/RTO** (p.ej. RPO ≤ 24 h, RTO ≤ 4 h) según compromiso comercial.
4. **Migraciones versionadas** (Supabase CLI) → recreación determinista del esquema.
5. **Backups de Storage** + prueba de restauración.
6. **Backups por tenant / export por empresa** (a futuro, para portabilidad y baja de clientes).
7. Monitoreo y **alertas** de fallo de backup.

## 4. Requisito para clientes externos
> Antes de custodiar datos de una empresa cliente: **frecuencia, retención y un restore probado** documentados, con RPO/RTO comprometidos.
