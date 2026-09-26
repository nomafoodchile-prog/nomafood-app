# PRIVACY_ARCHITECTURE — Protección de datos (Chile / SaaS B2B)

> ⚖️ **No es asesoría jurídica.** Marca lo que **requiere revisión de un abogado especialista** en protección de datos. Basado en el estado técnico verificado.

## 1. Marco aplicable (contexto, a confirmar con abogado)
- **Chile:** Ley 19.628 sobre protección de la vida privada y su **reforma (Ley 21.719, 2024)** que crea la Agencia de Protección de Datos y endurece obligaciones (consentimiento, derechos ARCO+, seguridad, notificación de brechas). **⚖️ REVISIÓN LEGAL** sobre alcance y plazos.
- Si se atienden clientes o titulares en la UE → **GDPR**. **⚖️ REVISIÓN LEGAL**.
- Como **SaaS B2B**, la plataforma será normalmente **encargado/procesador** de los datos de cada empresa cliente (que es la responsable). Esto exige **DPA** (acuerdos de tratamiento). **⚖️ REVISIÓN LEGAL**.

## 2. Principios y estado técnico

| Principio | Estado hoy | Brecha |
|---|---|---|
| **Minimización** | se recolecta lo operativo | falta revisar campos realmente necesarios |
| **Consentimiento** | formularios de landing/leads | falta base de licitud documentada + textos legales (⚖️) |
| **Seguridad** | RLS parcial, TLS/cifrado Supabase | SEC-01/04/06 abiertos |
| **Aislamiento (confidencialidad)** | ❌ single-tenant | crítico para B2B (ver TENANT_ISOLATION) |
| **Derechos del titular (acceso/rectif./supresión/portabilidad)** | ❌ no hay flujo | implementar export/borrado por titular |
| **Retención/eliminación** | ❌ sin política; solo soft-delete | definir plazos y purga |
| **Registro de tratamientos** | parcial (audit escaso) | RAT/ROPA por implementar (⚖️) |
| **Notificación de brechas** | ❌ sin proceso | ver [`INCIDENT_RESPONSE.md`](./INCIDENT_RESPONSE.md) |
| **Transferencia internacional** | Supabase/Vercel (región `NO VERIFICADO`) | confirmar región de datos + salvaguardas (⚖️) |

## 3. Datos sensibles a cuidar especialmente
- **Laborales** (asistencia, jornada, remuneraciones de trabajadores del cliente).
- **Financieros** del cliente (ventas, caja, cobranza).
- **Secreto industrial**: **recetas/formulaciones y costos** — para un cliente son su activo más sensible; el aislamiento multi-tenant es también protección de secreto comercial.
- **Geolocalización** de reparto.

## 4. Recomendaciones técnicas (no ejecutar aún)
1. **Aislar por tenant** (prerrequisito de todo lo demás).
2. **Residencia de datos**: confirmar y fijar región (Supabase/Vercel); documentar transferencias.
3. **Flujos de derechos**: exportación y borrado/anonimización por titular, con scope de tenant.
4. **Política de retención** por categoría + purga automática.
5. **Registro de tratamientos** y **DPA** con subprocesadores (Supabase, Vercel, Resend, MercadoPago, Meta, Google). ⚖️
6. **Aviso de privacidad** y gestión de consentimiento en landing/portales. ⚖️
7. **Cifrado adicional** de campos ultra-sensibles si aplica (remuneraciones).

## 5. Requiere revisión jurídica (marcar para abogado) ⚖️
- Alcance de Ley 21.719 y rol procesador/responsable.
- Textos de consentimiento, aviso de privacidad y DPA.
- Transferencia internacional y residencia de datos.
- Obligación y plazos de notificación de brechas.
- Tratamiento de datos laborales de trabajadores de terceros.
