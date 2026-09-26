# INTEGRATION_HUB — Capa de integraciones

> Desacopla los servicios externos del núcleo. Ningún servicio externo debe estar fuertemente acoplado al corazón del sistema.

## 1. Concepto

```
Núcleo (dominio) ──► Integration Hub ──► Adaptador (Connector) ──► Servicio externo
                         │
                         ├─ credenciales POR TENANT (bóveda)
                         ├─ cola + reintentos + idempotencia
                         ├─ logs + métricas + rate limits
                         └─ webhooks entrantes normalizados
```

El núcleo habla con **interfaces**, no con proveedores concretos. Cambiar de proveedor = cambiar el adaptador, no el dominio.

## 2. Interfaz común de conector (contrato)
```ts
interface Connector {
  key: string                       // 'dte.factura', 'pay.mercadopago', 'msg.whatsapp'...
  capabilities: string[]            // qué operaciones soporta
  test(config): Promise<HealthResult>
  execute(action, payload, ctx): Promise<Result>   // ctx incluye tenant_id
  handleWebhook?(req): Promise<NormalizedEvent>     // entrante
}
```
- **`ctx.tenant_id`** siempre presente → toda operación usa las **credenciales del tenant**.
- Resultados normalizados; errores tipados (retryable vs. fatal).

## 3. Categorías de conectores (adaptadores)
| Dominio | Ejemplos |
|---|---|
| Facturación DTE | proveedor DTE / SII (ver BILLING_INTEGRATION) |
| Pagos | MercadoPago, Transbank/Webpay, POS |
| Mensajería | WhatsApp (Meta), Email (Resend), SMS |
| Mapas/rutas | Google Maps, Waze, GPS/telemetría |
| Bancos | cartolas / conciliación |
| Ecommerce | WooCommerce, Shopify |
| Asistencia | GeoVictoria |
| IA | proveedor LLM (ver AI_AGENT_ARCHITECTURE + security/AI_SECURITY) |

## 4. Requisitos transversales
| Requisito | Diseño |
|---|---|
| **Credenciales por tenant** | `tenant_integrations` + referencia a bóveda; nunca compartidas ni hardcodeadas (corrige security/SEC-02) |
| **Idempotencia** | clave idempotente por operación/evento; reprocesar no duplica |
| **Reintentos** | backoff exponencial; cola de reintentos; DLQ (dead-letter) tras N fallos |
| **Errores** | clasificados (retryable/fatal); visibles en Observability; no filtran infraestructura |
| **Logs** | por tenant + conector + operación (auditables) |
| **Rate limits** | respetar límites del proveedor y proteger el propio |
| **Sincronización** | jobs de sync (pull/push) con marca de última sync |
| **Webhooks entrantes** | **firma verificada** + idempotencia + normalización a `NormalizedEvent` |

## 5. Webhooks (entrantes) — patrón seguro
1. Verificar **firma/secreto por tenant** (no un secreto global hardcodeado).
2. Registrar el evento crudo (`webhook_events`) con clave idempotente.
3. Responder 2xx rápido; procesar async (cola).
4. Reintentar en fallo; alertar si supera umbral.

## 6. Relación con hoy
Existen integraciones **acopladas** (Resend/MP/WhatsApp llamados directo desde endpoints, credenciales globales, un webhook con secreto hardcodeado). El Hub las **encapsula** en adaptadores con credenciales por tenant. Migración incremental: envolver una integración a la vez detrás de la interfaz (Phase 5).
