# CHANGELOG_SYSTEM — Bitácora del sistema

> Bitácora a nivel de sistema (no de features individuales). Empieza con esta auditoría. Mantener orden cronológico inverso.

## 2026-09-25 — Auditoría técnica integral + documentación maestra
- Se auditó el sistema **contra el código real** (no memoria): stack, estructura, ~75 endpoints, ~40 páginas de Central, 5 portales, ~93 tablas, integraciones, roles, RLS.
- Se creó `docs/system/` con 17 documentos maestros (este incluido).
- **Hallazgos clave:** single-tenant (sin `tenant_id`); duplicación de esquema español/inglés (inglés muerto); duplicación viva `operarios`/`operators`; branding hardcodeado; autorización dispersa; sin migraciones versionadas.
- **No se hizo refactor** (solo auditoría + documentación, por indicación).

## Contexto previo relevante (del historial del proyecto, no verificado línea por línea)
- Módulos construidos en el tiempo: Landing, Comercial (solicitudes/clientes/productos), Compras/Abastecimiento, Operaciones (inventario, limpieza, mantención, operarios, producción/recetas), Finanzas (caja, EERR, cartolas, cobranza, remuneraciones), Marketing (campañas Resend + programación), Portales (mayorista, chofer, operario, picker, Aldea).
- Correos transaccionales (Resend), pago por transferencia y MercadoPago, GA4 activo.
- Producción inteligente: Etapa 1 (asignar tarea con receta+tandas) y Etapa 2 (escalado de ingredientes en portal operario) implementadas; receta demo "Chickent Tutos" creada.

> Nota: las entradas "contexto previo" provienen del historial/documentación del proyecto; su exactitud fina **REQUIERE CONFIRMACIÓN** contra el código en cada caso.
