# ACTIVE_TASK — tarea activa principal (una a la vez)

_Actualizado: 2026-11-20._

## Tarea activa
**Fase Cero de la productización SaaS: auditoría, memoria permanente y plan de beta comercial controlada.**

### Objetivo
Entregar a la dueña los puntos A–J (ver abajo), dejar la capa de memoria funcionando, y esperar sus decisiones (`project/BLOCKERS.md`) antes de cualquier cambio de esquema/producción.

### Alcance (SOLO no destructivo, sin autorización para prod)
- Auditar (read-only) ramas, módulos, seguridad, docs existentes. ✔
- Crear capa de memoria (CLAUDE.md + project/*). ✔
- Redactar propuestas (beta, consolidación, costos) SIN ejecutarlas.

### Fuera de alcance (requiere autorización explícita)
- Merges a la rama de deploy, SQL en Supabase prod, cambios de esquema (`tenant_id`), encender servicios de pago, exponer data real de terceros.

### Archivos afectados (esta tarea)
- `CLAUDE.md` (nuevo), `project/*.md` (nuevos). No se tocó código de la app.

### Criterios de aceptación
- [x] Comparación de ramas + fuente canónica documentadas (A/B).
- [x] Memoria persistente creada y conectada a los 64 docs (F).
- [x] Backlog 20–30 nov + decisiones + riesgos documentados (G/H/J).
- [ ] Dueña confirma decisiones D1–D6 (`project/BLOCKERS.md`).
- [ ] Siguiente tarea autorizada definida tras su respuesta.

### Siguiente acción autorizada (tras OK de la dueña)
Según su respuesta: si aprueba B2 → cerrar P0 de seguridad; si aprueba beta showcase → B3/B4/B5. No avanzar a multi-tenant real sin tests de aislamiento.
