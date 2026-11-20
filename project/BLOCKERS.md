# BLOCKERS — bloqueos y decisiones humanas pendientes

_Actualizado: 2026-11-20._

## Entregable H — Decisiones que requieren TU autorización (dueña)
| # | Decisión | Por qué la necesito | Default seguro si no respondes |
|---|---|---|---|
| D1 | **Confirmar `feature/portal-chofer` como fuente canónica** y marcar las copias `~/Downloads/*` como respaldo obsoleto | Evita trabajar sobre copias divergentes (tu regla #12) | Tratar feature/portal-chofer como canónica; no tocar las otras |
| D2 | **Nombre comercial de la plataforma SaaS** | "Pendiente de definir"; no puedo inventar una marca | Usar placeholder "LA PLATAFORMA" en docs hasta que decidas |
| D3 | **Alcance real de la beta 30-nov**: ¿demo/landing + waitlist (datos sintéticos), o además piloto interno NOMMA como "tenant 0"? | Define cuánta ingeniería de tenant se intenta antes del 30 | Demo/landing + waitlist + datos sintéticos aislados (lo seguro) |
| D4 | **Cerrar P0 de seguridad ya** (SEC-02 secreto webhook, SEC-03 cron) | Son riesgos explotables HOY, aun single-tenant | Proponer el fix y esperar tu OK (toca prod) |
| D5 | **Presupuesto mensual** para servicios IA/infra (define qué agentes se encienden) | Costos variables (Claude API, WhatsApp, voz) | No encender nada de pago sin tu OK |
| D6 | **Facturación (#1 del roadmap anterior)**: proveedor DTE | Emites por SII gratis (tienes certificado); falta elegir OpenFactura vs LibreDTE | Recomendado OpenFactura; pendiente tu elección |

## Entregable J — Riesgos que IMPIDEN una beta con datos reales de terceros
Fuente: `docs/security/SECURITY_AUDIT.md`, `docs/security/TENANT_ISOLATION.md`, `docs/system/TECH_DEBT.md`.
1. **SEC-01 — Sin aislamiento multiempresa (P0).** No hay `tenant_id` en tablas núcleo; RLS actual no filtra por empresa y las APIs usan service-role (lo ignora). Poner un 2º cliente real = fuga cross-tenant garantizada por diseño. **Bloqueante absoluto.**
2. **No existen tests de aislamiento cross-tenant** (TD-12: sin tests ni CI). Los propios docs prohíben clientes externos sin esa suite en verde.
3. **SEC-02 (P0)** secreto de webhook hardcodeado (`/api/minorista/pedido`) — permite inyectar pedidos. Riesgo hoy.
4. **SEC-03 (P0)** `/api/cron/campanas` sin protección si falta `CRON_SECRET` — disparo de campañas masivas.
5. **TD-3 — Sin migraciones versionadas** (48–55 `.sql` manuales): no se puede recrear la BD de forma determinista para instalar clientes.
6. **TD-2 — Duplicación viva `operarios` vs `operators`**: datos de personal potencialmente partidos.
7. **Legal (P1 no-técnico):** como SaaS B2B eres encargado de datos → faltan Términos, DPA y aviso de privacidad (todo "requiere abogado"). Bloquea cobrar a terceros.
8. **Credenciales de integración globales** (una cuenta Resend/MP/WhatsApp para todo) y **Storage sin partición por tenant**.

➡️ **Conclusión:** una beta con **datos reales de empresas externas sobre infra compartida NO es publicable** hasta cerrar 1–5. Sí es publicable una **demo/landing + waitlist con datos sintéticos aislados** (ver `BACKLOG.md`).

## Otros bloqueos operativos
- Worktree local previo (`noma-wt`) quedó *prunable*; se recreó limpio en `scratchpad/wt-saas`. Los commits estaban a salvo en origin.
- Pendiente de la dueña: correr SQL de `app_config` para habilitar compras (marcha blanca) — ver roadmap anterior.
