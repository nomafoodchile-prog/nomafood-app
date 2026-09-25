# INTEGRATIONS — Integraciones y servicios externos

> Verificado buscando llamadas `fetch` reales a dominios externos y variables de entorno. "Real" = hay código que llama a la API. "Configurada sin código" = existe env/tabla pero no se encontró llamada.

## 1. Integraciones REALES (con código verificado)

| Servicio | Uso | Dónde (verificado) | Estado |
|---|---|---|---|
| **Resend** (correo) | Correos transaccionales (pedido recibido / en ruta), acceso a portales, campañas | `https://api.resend.com/emails` y `/emails/batch` en `lib/pedido-emails.ts`, `lib/solicitud-emails.ts`, `lib/marketing.ts`, `lib/access-request-email.ts` | ACTIVO |
| **MercadoPago** (pago) | Checkout mayorista y verificación de pago | `https://api.mercadopago.com/checkout/preferences`, `/v1/payments/`, `/v1/payments/search` | ACTIVO |
| **WhatsApp Cloud API (Meta)** | Notificaciones por WhatsApp | `https://graph.facebook.com/v20.0/` (marketing/notify) | CONFIGURADO (requiere token real; env `WHATSAPP_ACCESS_TOKEN`) |
| **WooCommerce (entrante)** | Recibe pedidos minoristas de la tienda WordPress | Webhook **entrante** `POST /api/minorista/pedido` (upsert por `wc_order_id`) | ACTIVO (depende de config en WooCommerce, externa al repo) |

## 2. Configuradas SIN código encontrado (planificadas / stub)

| Servicio | Señal | Estado |
|---|---|---|
| **Webpay / Transbank** | env `WEBPAY_COMMERCE_CODE`, `WEBPAY_API_KEY`; **sin llamada** encontrada | PLANIFICADO / `NO VERIFICADO` |
| **GeoVictoria** (asistencia) | tabla `geovictoria_config`; **sin llamada** encontrada | PLANIFICADO |
| **Google Maps** | env `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`, endpoint `/api/geocode`; mapas del portal usan **Leaflet** (OpenStreetMap) | PARCIAL — geocodificación `REQUIERE CONFIRMACIÓN` |
| **Google Analytics 4** | `NEXT_PUBLIC_GA_MEASUREMENT_ID` (script cliente) | ACTIVO en cliente (según env); medición server-side propia en `web_visits` |

## 3. Automatización / CRON

- **`/api/cron/campanas`** — dispara envíos de campañas programadas. Protegido con `CRON_SECRET` (header `Authorization: Bearer` **o** query `?secret=`).
  - ⚠️ **Riesgo:** si `CRON_SECRET` **no está seteada**, el endpoint queda **sin protección** (el chequeo es condicional). Ver [`KNOWN_ISSUES.md`](./KNOWN_ISSUES.md).
  - El disparador (Vercel Cron vs Supabase pg_cron) **no está declarado en el repo** (`vercel.json` ausente; sin `cron.schedule` en los `.sql`) → `REQUIERE CONFIRMACIÓN`.

## 4. Webhooks

| Webhook | Dirección | Endpoint | Notas |
|---|---|---|---|
| MercadoPago pago | entrante | `/api/portal/mayoristas/webhook`, `/verificar-pago` | actualiza estado a `pagado` y dispara correo |
| WooCommerce pedido | entrante | `/api/minorista/pedido` | copia estado de WC (riesgo "cancelado falso", ver KNOWN_ISSUES) |
| Marketing (Resend) | entrante | `/api/marketing/webhook`, `/marketing/baja` | eventos de entrega / baja |
| Pagos genérico | — | `payment_webhook_events` (tabla) | registro de eventos |

## 5. Acoplamiento a cuentas actuales
- Remitentes y correos apuntan a dominios de las empresas (`@nommafood.cl`, `brotesladera@gmail.com`).
- Datos bancarios de **transferencia hardcodeados** en `lib/transferencia.ts` (titular/RUT/cuenta de Alma Libre Grupo SpA).
- Para SaaS: **todas** estas credenciales y remitentes deben pasar a **config por empresa** (ver [`SAAS_MIGRATION_PLAN.md`](./SAAS_MIGRATION_PLAN.md)).
