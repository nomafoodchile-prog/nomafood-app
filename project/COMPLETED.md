# COMPLETED — entregas con evidencia

## 2026-11-20 — Fase Cero SaaS (memoria + auditoría)
- **A/B** Comparación de ramas + fuente canónica (`feature/portal-chofer`). Evidencia: `git worktree list`, `git rev-list` (fresh 0↑/44↓). Detalle en `SESSION_HANDOFF.md`.
- **F** Capa de memoria creada: `CLAUDE.md`, `project/{ACTIVE_TASK,BACKLOG,BLOCKERS,SESSION_HANDOFF,COMPLETED}.md`. Conectada a los 64 docs sin duplicar.
- **C/D/E/G/H/I/J** redactados (en BACKLOG/BLOCKERS/SESSION_HANDOFF), apoyados en los docs maestros existentes (`docs/system`, `docs/security`, `docs/saas`).
- Síntesis de auditoría de los 38 docs (vía subagente Explore) incorporada a estos archivos.

## Sesión 2026-11-15 → 17 (previo a Fase Cero) — mejoras a la Central
Rama `feature/portal-chofer`, verificadas en vivo:
- Proyección de ventas + **detalle de deudas** desglosado (app_config).
- Fix bucket `comprobantes` (estaba privado → público); recuperado comprobante.
- Correo "pago confirmado" correcto al confirmar pago (antes mandaba "pedido recibido").
- Rename visible **"Aldea Vegetal" → "Brotes Asian Street"** (módulo + 3 locales).
- **Caja** alimentada por pedidos minoristas pagados (sincronizar) — 98 pedidos en caja.
- **#9** comprobante de pago del cliente → central (portal cuenta + Central Pedidos).
- **Dashboard real** (reemplazó datos demo) + eliminación de 4 pantallas demo huérfanas + 6 filas demo en BD (3 clientes, 1 receta, 2 pedidos).
- **Alerta de pedidos minorista** (badge+sonido) — colaboración con sesión "Fase A de Brotes": endpoint server-side (conteo) + RLS `minorista_pedidos_admin_all` + realtime (doble capa de seguridad). Verificado en vivo 0→1.
- Commits relevantes hasta `28b4f40` en origin/feature/portal-chofer.
