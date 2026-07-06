# Protocolo de limpieza segura de datos — NOMMA FOOD

_Fecha: 2026-07-06 · Estado: **Etapa 1 (respaldo)**. NO se ha ejecutado ningún DELETE/TRUNCATE/UPDATE destructivo ni borrado de Storage._

## Etapa 1 — Respaldo completo

### ✅ Hecho por el asistente (código)
- Rama de respaldo **`backup/pre-limpieza-datos`** (commit `405d9c5`), empujada a GitHub.
- Working tree **limpio** (todo commiteado).
- **16 migraciones** versionadas en `supabase/*.sql`.

### ⚠️ Gap detectado (importante)
El repo **NO versiona todo el esquema**. Faltan en `supabase/`:
- Tablas de **logística fase0** (`drivers`, `routes`, `route_stops`, `entregas`, `incidencias`, `driver_messages`, `compras`, `compra_items`, `driver_positions`).
- `notifications_outbox`.
- Varias **funciones/políticas/triggers** (`is_admin`, `get_my_driver_id`, RPCs de logística, `handle_new_user`, etc.).

→ Por eso un respaldo **completo** (esquema + datos + funciones + triggers + RLS) **requiere un dump real de la base**, no basta con el repo ni con CSV.

### 📦 Buckets de Storage a respaldar
`entregas` (fotos + firmas de entrega), `comprobantes`, `incidencias`, `compras`. Son evidencias operativas — respaldar antes de cualquier limpieza.

### 🔒 Cómo hacer el respaldo COMPLETO (lo hace Nataly, sin exponer secretos)

**Opción A — recomendada (dump completo, un archivo):** Supabase CLI en tu Mac (Terminal):
```
brew install supabase/tap/supabase
supabase login
supabase link --project-ref fufmwauofcqnlrfhcenq
supabase db dump -f backup-esquema.sql              # esquema + funciones + triggers + RLS
supabase db dump --data-only -f backup-datos.sql    # todos los datos
```
Guarda `backup-esquema.sql` y `backup-datos.sql` en un lugar seguro (no en el repo público).

**Opción B — más simple (parcial):** exportar cada tabla como CSV (Supabase → Table Editor → tabla → Export → CSV) **+** el asistente captura funciones/políticas/triggers vía consultas SQL de solo lectura y las guarda en el repo. Cubre datos + esquema, con más pasos manuales.

**Storage:** Supabase → Storage → cada bucket (`entregas`, `comprobantes`, `incidencias`, `compras`) → descargar los archivos.

## Etapa 2 — Inventario total (siguiente, NO destructivo)
Reporte de todas las tablas relevantes, clasificando cada registro candidato:
**CONSERVAR · REVISAR CON NATALY · DEMO CANDIDATO A ELIMINAR**, con identificador, tabla, nombre/descripción, dependencias (FK) y motivo. Heurísticas más allá de `@demo.nomma`: nombres ficticios, empresas test, direcciones falsas, productos mock, rutas de prueba, datos hardcodeados.

## Etapa 3 — Plan de borrado (solo tras inventario)
Lista exacta de registros demo, orden de eliminación por dependencias/FK, riesgo por acción, tablas afectadas, archivos de Storage relacionados, y pruebas post-limpieza.

## Etapa 4 — Ejecución (solo con aprobación expresa de Nataly)
Modo controlado: registrar qué se elimina, mantener log, validar que productos reales, permisos, Portal Mayorista y Central sigan funcionando. **No** borrar Auth users ni Storage hasta confirmar que no tienen dependencias activas.

## Reglas de protección de datos reales
- No borrar **productos reales** de NOMMA FOOD.
- No borrar **pagos/pedidos/clientes reales** sin confirmación explícita.
- El **pedido y pago de Vicente ($1.450)** → clasificar **REVISAR CON NATALY**, nunca eliminar automáticamente.
