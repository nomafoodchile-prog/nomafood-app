# ENVIRONMENT — Variables de entorno

> Verificado en `.env.example`. Los valores del ejemplo son **demo** (no secretos reales).

## 1. Variables declaradas (`.env.example`)

| Variable | Propósito | Sensible | Acoplada a empresa |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase | pública | — |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | clave anónima (cliente, RLS) | pública | — |
| `SUPABASE_SERVICE_ROLE_KEY` | **service-role** (servidor, ignora RLS) | **ALTA** | — |
| `RESEND_API_KEY` | envío de correo | ALTA | cuenta Resend actual |
| `MARKETING_FROM_EMAIL` | remitente marketing | media | `@nomafood.cl` |
| `WHOLESALE_ACCESS_REQUEST_FROM_EMAIL` | remitente accesos portal | media | `@nomafood.cl` |
| `NEXT_PUBLIC_WHOLESALE_PORTAL_URL` | URL portal mayorista | pública | `portal.nomafood.cl` |
| `NEXT_PUBLIC_WHOLESALE_ACCESS_REQUEST_EMAIL` / `WHOLESALE_ACCESS_REQUEST_TO_EMAIL` | destino de solicitudes | media | `brotesladera@gmail.com` |
| `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID` | WhatsApp Cloud API | ALTA | cuenta Meta actual |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | GA4 | pública | propiedad GA actual |
| `NEXT_PUBLIC_PAYMENT_MODE` | `demo`/real | — | — |
| `WHOLESALE_PAYMENT_PROVIDER` | `manual`/proveedor | — | — |
| `NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY`, `MERCADO_PAGO_ACCESS_TOKEN` | MercadoPago | ALTA | cuenta MP actual |
| `WEBPAY_COMMERCE_CODE`, `WEBPAY_API_KEY` | Webpay (sin código aún) | ALTA | — |
| `PAYMENT_WEBHOOK_SECRET` | firma webhooks de pago | ALTA | — |
| `NEXT_PUBLIC_MAPS_PROVIDER`, `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | mapas/geocode | media | — |

## 2. Variables usadas en código pero NO en `.env.example`
(detectadas en el código; agregar al ejemplo)
- `CRON_SECRET` — protege `/api/cron/campanas`.
- `PEDIDOS_FROM_EMAIL` — remitente de correos de pedido (`lib/pedido-emails.ts`).
- `NEXT_PUBLIC_NOMMA_PORTAL_URL`, `NEXT_PUBLIC_BROTES_PORTAL_URL` — override de URLs de marca (`lib/marca-portal.ts`).
- `NEXT_PUBLIC_GA4_ID` — variante de ID de GA (el código acepta ambos nombres).
> `REQUIERE CONFIRMACIÓN`: barrer todo `process.env.*` y consolidar el ejemplo.

## 3. Riesgos
- **Configuración mezclada con lógica:** hay valores de empresa **hardcodeados en código** (no en env), p.ej. datos bancarios en `lib/transferencia.ts` y la lógica de marca en `lib/marca-portal.ts`.
- **BOM UTF-8** al inicio de `.env.example` (carácter invisible) — puede romper parsers estrictos.
- Para SaaS: los secretos hoy son **globales**; deben ser **por empresa** (bóveda de credenciales por tenant).

## 4. Objetivo
- `.env.example` completo y sin BOM.
- Separar **config de plataforma** (Supabase, infra) de **config de empresa** (remitentes, pagos, marca) → esta última en BD por tenant, no en env.
