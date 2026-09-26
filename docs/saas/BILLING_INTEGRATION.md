# BILLING_INTEGRATION — Facturación electrónica (DTE)

> Diseño desacoplado del proveedor. **No** convierte a la plataforma en software contable certificado (ver FINANZAS en system y §10 del pedido).

## 1. Flujo objetivo

```
PEDIDO (despachado / listo para facturar)
  → botón "Emitir factura"
  → InvoiceProvider (adaptador del proveedor DTE del tenant)
  → proveedor emite ante el SII
  → resultado (folio, track_id, estado)
  → guarda PDF + XML + registro (documents / invoices)
  → refleja en Finanzas (CxC) y en el pedido
```

## 2. Abstracción `InvoiceProvider`
```ts
interface InvoiceProvider {
  emit(doc: DteDraft, ctx: TenantCtx): Promise<DteResult>   // factura/boleta/NC
  status(trackId: string, ctx: TenantCtx): Promise<DteStatus>
  void(ref: string, motivo: string, ctx: TenantCtx): Promise<DteResult> // nota de crédito
  pdf(ref: string, ctx: TenantCtx): Promise<Blob>
  xml(ref: string, ctx: TenantCtx): Promise<string>
}
```
- Un adaptador por proveedor (p.ej. proveedor DTE chileno X, o Lioren/Bsale/otros). **Reemplazable** sin tocar el dominio.
- La primera versión usa **un proveedor externo** (no implementar SII directo).

## 3. Configuración tributaria POR TENANT / COMPANY (aislamiento estricto)
| Dato | Alcance |
|---|---|
| Razón social, **RUT** | por `company` (un tenant puede tener varias) |
| Actividad económica, dirección | por company |
| **Folios / CAF** | por company |
| **Certificado digital** (si el proveedor lo requiere) | por company, en **bóveda cifrada** |
| Credenciales del proveedor DTE | por company/tenant, en bóveda |
| Tipos de documento habilitados | por company |

> 🔒 **Regla innegociable:** **jamás** compartir credenciales/certificados/folios tributarios entre tenants. Cada emisión usa la identidad tributaria del tenant que la origina. Esto es también parte del aislamiento (security/TENANT_ISOLATION).

## 4. Estados y trazabilidad
- Estados del documento: `borrador → emitido → aceptado_sii → rechazado → anulado`.
- Guardar **PDF + XML** en Storage particionado por tenant (STORAGE_ARCHITECTURE).
- Registro inmutable + **auditoría** (quién emitió/anuló, cuándo, resultado).
- Reintentos e idempotencia (no emitir dos veces el mismo pedido) vía Integration Hub.

## 5. Relación con Finanzas
- La factura genera **CxC**; el pago la concilia.
- La plataforma hace **gestión financiera operacional**, no reemplaza al **software contable formal** del cliente: se diseña un **export/integración** hacia el contador (ya existe el export de remuneraciones como patrón).

## 6. Alcance de la primera versión
- Un proveedor DTE integrado por adaptador; emisión de factura/boleta y nota de crédito; PDF/XML; registro y CxC.
- Multi-company y multi-proveedor quedan soportados por diseño (ENTERPRISE), activables por tenant.
