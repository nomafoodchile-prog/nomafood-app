# KNOWN_ISSUES — Problemas conocidos y trampas

> Mezcla de bugs resueltos (documentados como aprendizaje) y riesgos abiertos. Fuente: código + historial de incidencias del proyecto.

## Trampas de PostgREST / Supabase (reincidentes)

### KI-1 · Embed ambiguo → lista vacía (RESUELTO, patrón a evitar)
- **Síntoma:** una lista sale en 0 aunque los datos existen.
- **Causa:** una tabla con **más de una FK** hacia otra (`recetas`→`products`) y un embed sin desambiguar: `producto:products(nombre)` **falla** ("Could not embed because more than one relationship was found") y **toda** la consulta devuelve `null`.
- **Fix:** especificar la relación por columna: `producto:products!product_id(nombre)` / `receta_ingredientes → products!producto_id`.
- **Regla:** ante lista vacía inexplicable, revisar embeds antes que RLS.

### KI-2 · Columna inexistente → lista vacía en silencio
- **Causa:** un `select` que pide una columna que no existe hace que PostgREST devuelva **lista vacía** sin error visible.
- **Fix:** verificar columnas contra `information_schema` antes de asumir.

### KI-3 · Cliente navegador (anon+RLS) vs servidor (service-role)
- Lecturas desde el navegador respetan RLS (pueden salir vacías); escrituras críticas van por servidor. No asumir que "el servidor lo creó" ⇒ "el navegador lo ve".

## Seguridad

### KI-4 · `/api/cron/campanas` sin protección si falta `CRON_SECRET`
- El chequeo es `if (secret) {...}`. Sin la variable, **cualquiera** puede dispararlo. **Acción:** exigir `CRON_SECRET` siempre (fallar si no está).

### KI-5 · Correctitud de políticas RLS no auditada
- RLS activo en ~68 tablas, pero muchas escrituras van por service-role. `REQUIERE CONFIRMACIÓN` de que las políticas de lectura de cliente son correctas y no filtran datos entre marcas.

## Integraciones / datos

### KI-6 · "Cancelado falso" en pedidos minoristas
- **Síntoma:** un pedido pagado aparece "cancelado" en la Central.
- **Causa:** la Central **espeja el estado de WooCommerce** (`/api/minorista/pedido` copia `estado` verbatim). WooCommerce puede auto-cancelar por "Hold Stock" mientras MercadoPago confirma el pago.
- **Estado:** mitigado reactivando manualmente; **fix definitivo requiere ajustar WooCommerce (Hold Stock) + webhook de MP** en la tienda (externo al repo). PENDIENTE con la agencia.

### KI-7 · Borrado duro que perdía pedidos (RESUELTO)
- "Modificar pedido" en el portal mayorista llamaba a un `DELETE` físico. Se cambió a **soft-cancel** (`estado='cancelado'`). Regla: **nunca** DELETE físico de documentos de negocio.

## Despliegue

### KI-8 · Dominio queda desactualizado si el build falla
- Vercel mantiene el último build "Ready"; un push que rompe el build **no actualiza** el sitio y no avisa claramente. **Regla:** `tsc --noEmit` (0 errores) antes de pushear.

## Producto

### KI-9 · No hay aislamiento entre empresas
- Al no existir `tenant_id`, **hoy no se puede** dar acceso a una segunda empresa sin que vea datos de la primera. Bloqueante para vender. Ver [`SAAS_MIGRATION_PLAN.md`](./SAAS_MIGRATION_PLAN.md).
