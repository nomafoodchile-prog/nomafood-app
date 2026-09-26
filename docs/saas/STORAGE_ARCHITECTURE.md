# STORAGE_ARCHITECTURE — Archivos y storage por tenant

> Los archivos deben estar tan aislados como los datos. Corrige el riesgo de rutas públicas adivinables (security/TENANT_ISOLATION).

## 1. Tipos de archivo
Fotos de producto, documentos, **facturas (PDF/XML)**, contratos, evidencia de producción, **firma de clientes**, fotos de entrega, reportes, certificados (incl. tributarios).

## 2. Principios
1. **Partición por tenant**: toda ruta empieza por el tenant.
   `tenant/{tenant_id}/{modulo}/{entidad}/{uuid}.{ext}`
2. **Nada público adivinable**: sin buckets públicos con IDs secuenciales. Acceso vía **URLs firmadas** de corta duración, emitidas tras validar tenant + permiso.
3. **Autorización server-side**: la app verifica `requirePermission` + pertenencia al tenant **antes** de firmar la URL.
4. **Políticas de bucket (RLS de Storage)**: reglas que impiden leer objetos de otro `tenant_id` (defensa en profundidad, aunque se filtre una URL).
5. **Nombres opacos** (UUID), no secuenciales ni con datos personales en la ruta.

## 3. Diseño con Supabase Storage
- Buckets **privados**; convención de path por tenant.
- Políticas de acceso basadas en el `tenant_id` del JWT (igual que RLS de tablas).
- Servir siempre por **signed URL** con expiración corta; nunca exponer el path público.
- Metadatos del archivo en tabla `files(tenant_id, path, modulo, entidad_id, tipo, size, ...)` con RLS.

## 4. Certificados y datos ultra-sensibles
- Certificados DTE / credenciales → **bóveda cifrada**, no en Storage general; acceso mínimo y auditado.
- Firmas de clientes y evidencia legal → retención definida + acceso auditado.

## 5. Ciclo de vida
- **Retención** por tipo (config por tenant/plan).
- **Baja de tenant**: exportar y luego **purgar** todos sus objetos (STORAGE + DB) — clave para portabilidad y derecho de supresión (security/PRIVACY).
- **Backups** de Storage con prueba de restauración (BACKUP en ROADMAP).

## 6. Relación con hoy
Hoy hay fotos en `public/` (estáticas del repo) y evidencias en tablas (`task_evidence_files`) con bucket `NO VERIFICADO`. El diseño mueve **todo archivo de tenant** a Storage privado particionado + signed URLs. Las fotos de catálogo genéricas pueden seguir públicas si no son sensibles.
