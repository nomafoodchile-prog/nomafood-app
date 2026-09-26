# INCIDENT_RESPONSE — Respuesta a incidentes

> Estado actual: **no existe un proceso formal.** Este documento propone uno mínimo, adecuado para el paso a SaaS B2B. No implementar aún.

## 1. Estado actual (verificado)
- ❌ Sin plan de respuesta a incidentes documentado.
- ❌ Sin monitoreo/alertas de seguridad.
- ⚠️ Auditoría de acciones **escasa** (SEC-05) → dificulta investigar un incidente.
- ⚠️ Sin proceso de **notificación de brechas** (obligación legal probable — ⚖️ ver PRIVACY_ARCHITECTURE).

## 2. Clasificación de incidentes
| Nivel | Ejemplo | Respuesta |
|---|---|---|
| **SEV-1 Crítico** | Fuga de datos entre empresas; acceso no autorizado a datos de clientes; secreto de producción expuesto | Inmediata, todo el equipo |
| **SEV-2 Alto** | Webhook abusado, spam masivo, DoS, cuenta admin comprometida | < horas |
| **SEV-3 Medio** | Enumeración, endpoint mal configurado sin datos filtrados | < 1 día |
| **SEV-4 Bajo** | Abuso menor, escaneo | seguimiento |

## 3. Proceso propuesto (ciclo)
1. **Detección** — alertas (a implementar), reportes, revisión de logs.
2. **Contención** — revocar tokens/sesiones, rotar secretos, deshabilitar endpoint/cuenta, aislar tenant.
3. **Erradicación** — corregir la causa (código/config), invalidar credenciales.
4. **Recuperación** — restaurar desde backup probado si aplica (ver BACKUP_RECOVERY), validar integridad.
5. **Notificación** — a clientes afectados y a la autoridad si corresponde, en los plazos legales. ⚖️
6. **Post-mortem** — causa raíz, acciones, actualización de este doc y de KNOWN_ISSUES.

## 4. Acciones de contención listas (playbook rápido)
- **Secreto expuesto:** rotar en el proveedor + en Vercel env + redeploy; invalidar el anterior.
- **Token de portal filtrado:** poner `activo=false` / regenerar `token` del mayorista afectado.
- **Cuenta admin comprometida:** revocar sesión en Supabase, resetear clave, revisar `audit_logs`.
- **Cron/webhook abusado:** rotar `CRON_SECRET`/`MINORISTA_SYNC_SECRET`, revisar envíos/pedidos recientes.

## 5. Requisitos previos para que funcione (dependencias)
- **Logs de auditoría** completos (SEC-05) — sin ellos no hay investigación.
- **Monitoreo y alertas** (SECURITY_ARCHITECTURE).
- **Backups probados** (BACKUP_RECOVERY).
- **Contactos y responsables** definidos (RACI) — pendiente.
- **Plantillas de notificación** legal a clientes/autoridad. ⚖️

## 6. Requisito para clientes externos
> Tener, como mínimo: logging de auditoría, alertas básicas, playbook de contención y proceso de notificación. Comprometer estos puntos en el contrato/SLA con el cliente.
