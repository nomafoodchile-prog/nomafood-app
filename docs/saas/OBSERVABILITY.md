# OBSERVABILITY — Observabilidad

> Hoy no existe monitoreo/alertas (security/SECURITY_ARCHITECTURE). Diseño objetivo, multi-tenant.

## 1. Pilares
| Pilar | Qué |
|---|---|
| **Logs** | estructurados (JSON) con `tenant_id`, `user_id`, `request_id`, módulo, acción, resultado; **sin PII/secretos en claro** |
| **Métricas** | latencia por endpoint, throughput, tasa de error, uso por módulo/tenant, colas de integración |
| **Trazas** | request_id correlacionado app↔integraciones |
| **Health checks** | `/health` (app), checks de BD, Storage y cada conector |
| **Alertas** | reglas sobre métricas/errores → canal (email/WhatsApp/Slack) |
| **Auditoría** | ver AUDIT LOG (documento aparte / §11 del pedido) — separada de logs técnicos |

## 2. Señales críticas a detectar
- **API caída** / 5xx elevado.
- **Integración caída** (DTE, pago, WhatsApp, email, banco) → cola/DLQ creciendo.
- **BD lenta** (latencia de queries, saturación de conexiones).
- **Error masivo** (pico de errores por tenant o global).
- **Fallos de facturación** (DTE rechazado/timeout).
- **Fallos de email/WhatsApp** (rebotes, rate limit).
- **Tareas bloqueadas** (jobs que no avanzan, reservas sin liberar).
- **Aislamiento**: intento de acceso cross-tenant (debe ser 0; cualquier ocurrencia = alerta SEV-1).

## 3. Multi-tenant en observabilidad
- Toda métrica/log lleva `tenant_id` → permite dashboards por cliente y detectar abuso/uso por tenant.
- **Nunca** mezclar datos sensibles de un tenant en dashboards de otro.
- Uso por módulo/tenant alimenta el **modelo de planes** (SAAS product) y el análisis de adopción (PILOT_PLAN).

## 4. Herramientas (sugerencia, a decidir)
- Logs/errores: Vercel + un colector (p.ej. Sentry/Logtail).
- Métricas/uptime: Supabase metrics + un uptime monitor + health endpoint.
- Alertas: reglas → email/WhatsApp (vía el propio Integration Hub).

## 5. Requisito para clientes externos
Antes del primer cliente externo: **logging de auditoría, health checks y alertas básicas** operativos (enlaza con security/INCIDENT_RESPONSE, que depende de esto).
