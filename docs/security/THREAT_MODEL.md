# THREAT_MODEL — Modelo de amenazas

> Enfoque STRIDE ligero sobre los activos y actores reales del sistema. Prioriza el escenario SaaS B2B multiempresa.

## 1. Activos a proteger
- **Datos de empresas clientes** (aislamiento) — el más crítico para el producto.
- Datos personales/laborales (trabajadores, clientes, proveedores).
- Datos financieros (ventas, caja, cobranza, remuneraciones).
- Credenciales e integraciones (Resend, MercadoPago, WhatsApp).
- **Propiedad intelectual** (código, esquema, reglas de negocio, prompts del futuro agente).
- Disponibilidad del servicio.

## 2. Actores de amenaza
| Actor | Motivación | Capacidad |
|---|---|---|
| Cliente-empresa curioso/malicioso | ver datos de otra empresa | usuario legítimo con sesión |
| Ex-trabajador | acceso residual | credenciales no revocadas |
| Atacante externo | fraude/robo de datos | endpoints públicos, fuzzing |
| Competidor | copiar el producto | frontend/código expuesto |
| Insider (operador plataforma) | abuso de service-role | acceso privilegiado |
| Bot/spam | abuso de formularios/correo | endpoints sin rate limit |

## 3. Amenazas por categoría (STRIDE)

| STRIDE | Amenaza concreta | Vector | Sev | Mitigación objetivo |
|---|---|---|---|---|
| **S**poofing | Falsificar webhook de pedidos | secreto hardcodeado (SEC-02) | HIGH | Secreto en env + rotación + firma |
| **S**poofing | Enumerar/adivinar usuarios | endpoints de acceso públicos (SEC-07) | MEDIUM | Respuestas uniformes, rate limit |
| **T**ampering | Alterar pedidos/stock ajenos | falta tenant/owner check (multi) | CRITICAL | RLS por tenant + owner checks |
| **R**epudiation | Negar cambios financieros | auditoría escasa (SEC-05) | MEDIUM | Audit log con antes/después, usuario, IP |
| **I**nfo Disclosure | Ver datos de otra empresa | sin `tenant_id` (SEC-01) | CRITICAL | Capa tenant + tests de aislamiento |
| **I**nfo Disclosure | Fuga de token de portal | token en URL (SEC-09) | MEDIUM | Vida corta, no en logs, considerar sesión |
| **D**oS | Saturar correos/geocode/login | sin rate limit (SEC-04) | HIGH | Rate limit + captcha + cuotas |
| **E**levation | Escalar a admin | arrays de rol inconsistentes | MEDIUM | RBAC central `requireRole()` |

## 4. Rutas de ataque priorizadas (kill chains)
1. **Cross-tenant (futuro):** cliente A inicia sesión → llama `orden-compra/[id]` o reportes → sin `tenant_id` obtiene datos de B. → **P0: tenant + RLS + tests**.
2. **Webhook spoofing (hoy):** atacante conoce `brotesmin2026` (está en git) → `POST /api/minorista/pedido` inyecta/edita pedidos. → **P0: quitar default + rotar**.
3. **Cron abuse (hoy, si `CRON_SECRET` vacío):** `POST /api/cron/campanas` → envía campañas masivas (daño reputacional + costo Resend). → **P0: exigir secret**.
4. **Abuso de formularios (hoy):** bots → `crear-cuenta`/`enviar-acceso`/`solicitud` → spam, enumeración, costo correo. → **P1: rate limit + captcha**.

## 5. Suposiciones y límites
- Supabase gestiona correctamente hashing, JWT, TLS y cifrado en reposo (`asumido`, no auditado internamente).
- La correctitud de RLS **no** está verificada (SEC-06); no confiar en RLS como única barrera hasta auditarla.
- Modelo enfocado en la app; **no** cubre seguridad física ni del proveedor cloud.

## 6. Requisito de aceptación para clientes externos
> **Ninguna empresa cliente debe poder leer, modificar, descargar ni inferir datos de otra.** Esto debe demostrarse con **tests de aislamiento** por tabla y endpoint antes del primer cliente externo.
