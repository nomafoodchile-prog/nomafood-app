# BACKLOG — priorizado

_Actualizado: 2026-11-20._ Criterio: preservar producción, continuidad, beta segura. No destructivo salvo autorización.

## Entregable E — Arquitectura propuesta para la BETA 30-nov (demo/showcase seguro)
Objetivo: mostrar y vender SIN exponer data real de terceros ni el esquema single-tenant.
- **Landing SaaS pública** (marca placeholder hasta D2) con propuesta de valor + planes preliminares (START/PRO/SCALE, ver `docs/saas/PRODUCT_MODEL.md`).
- **Registro de interesados (waitlist)**: formulario → tabla propia `saas_leads` (aislada) + correo (Resend ya existe).
- **Instancia de demostración aislada**: entorno con **datos sintéticos** (no clientes reales), mostrando los módulos ya funcionales. Evaluar: proyecto Supabase separado "demo" o un tenant demo marcado, nunca sobre la BD de producción real sin aislamiento.
- **Reutilizar** módulos existentes que ya funcionan (Dashboard real, Caja, Pedidos, Comercial) como recorrido de demo.
- **Fuera de alcance para el 30-nov**: multi-tenant real con clientes externos, orquestador IA, WhatsApp multi-depto, voz. Esos son post-beta por fases (ver `docs/saas/ROADMAP.md`).

## Entregable G — Backlog 20 → 30 de noviembre (beta controlada)
Orden por dependencia y seguridad. [A]=requiere tu autorización.

### Prioridad 0 — Fundación de memoria y seguridad
- [x] B0. Comparación de ramas + fuente canónica (A/B). — HECHO
- [x] B1. Capa de memoria: CLAUDE.md + project/*. — HECHO
- [ ] B2. [A] Cerrar P0 seguridad: quitar default del secreto webhook (SEC-02) + exigir `CRON_SECRET` (SEC-03). Toca prod → tu OK (D4).
- [ ] B3. Crear tag de respaldo `pre-saas-2026MMDD` sobre feature/portal-chofer (reversibilidad).

### Prioridad 1 — Beta comercial (showcase)
- [ ] B4. Landing SaaS (página pública + planes preliminares). No destructivo.
- [ ] B5. Waitlist: tabla `saas_leads` aislada + endpoint + correo de confirmación (Resend).
- [ ] B6. Guion de demo con datos sintéticos sobre los módulos que pasan prueba.
- [ ] B7. [A] Decidir dónde vive la demo (proyecto Supabase "demo" separado vs tenant demo). Depende de D3.

### Prioridad 2 — Preparación multi-tenant (NO para clientes externos aún)
- [ ] B8. Diseñar la migración `tenant_id` (expand→backfill→NOT NULL) según `docs/saas/MIGRATION_PLAN.md`. Solo diseño + revisión; NO ejecutar sin D3+D4 y tests.
- [ ] B9. Esqueleto de suite de tests de aislamiento cross-tenant (hoy inexistente, TD-12).

### Continuidad del roadmap anterior (no se descarta)
- [ ] Facturación (#1): integración DTE (OpenFactura/LibreDTE) — depende de D6.
- [ ] Agente IA administrativo (#2): requiere API key de Claude (D5) + fases de `docs/saas/AI_AGENT_ARCHITECTURE.md`.
- [ ] Campañas WhatsApp (#7), Analítica GA4 Brotes (#8).

## Entregable I — Estimación de costos recurrentes (rangos, requieren confirmación)
Para la **beta showcase** los costos son bajos (casi todo ya contratado):
| Servicio | Uso en beta | Costo aprox. mensual |
|---|---|---|
| Vercel | Hosting (ya en uso) | USD 0–20 (plan actual) |
| Supabase | BD/Auth/Storage (ya en uso) + posible proyecto demo | USD 0–25 por proyecto |
| Dominio | nommafood.cl + 1 dominio SaaS | ~USD 1–3 / mes prorrateado |
| Resend | Correos waitlist/transaccional | USD 0–20 |
| DTE (OpenFactura/LibreDTE) | Facturación (post-beta) | por cotizar (CLP) |
| **Claude API (agentes)** | Solo si se encienden | **variable por uso** — poner presupuesto duro (D5) |
| WhatsApp Business / Voz | Post-beta | variable por conversación/minuto |
➡️ Beta showcase: **estimado USD ~30–90/mes**. El gasto grande (IA, WhatsApp, voz) es **post-beta y variable**, con límites duros por tenant (ver `docs/saas/ROADMAP.md` control de costos).
