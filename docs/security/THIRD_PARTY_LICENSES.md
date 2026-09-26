# THIRD_PARTY_LICENSES — Licencias de terceros

> Licencias **leídas de `node_modules/*/package.json`** (verificado 2026-09-26). Para un inventario legal formal, correr un escáner (p.ej. `license-checker`) sobre el árbol completo de dependencias transitivas. Aquí van las **dependencias directas** de `package.json`.

## 1. Dependencias de producción

| Paquete | Licencia | Tipo | Apto SaaS comercial |
|---|---|---|---|
| next | MIT | permisiva | ✅ |
| react | MIT | permisiva | ✅ |
| react-dom | MIT | permisiva | ✅ |
| @supabase/supabase-js | MIT | permisiva | ✅ |
| @supabase/ssr | MIT | permisiva | ✅ |
| lucide-react | ISC | permisiva | ✅ |
| recharts | MIT | permisiva | ✅ |
| leaflet | BSD-2-Clause | permisiva | ✅ |
| **react-leaflet** | **Hippocratic-2.1** | **ética / no-OSI con restricciones** | ⚠️ **REVISIÓN LEGAL** |
| next-intl | MIT | permisiva | ✅ |
| resend | MIT | permisiva | ✅ |
| zod | MIT | permisiva | ✅ |
| react-hook-form | MIT | permisiva | ✅ |

## 2. Dependencias de desarrollo (no se distribuyen al cliente)
| Paquete | Licencia |
|---|---|
| typescript | Apache-2.0 |
| tailwindcss | MIT |
| eslint / eslint-config-next | MIT |
| autoprefixer, postcss | MIT |
| @types/* | MIT |

## 3. ⚠️ Hallazgo: `react-leaflet` = Hippocratic-2.1
- La **Hippocratic License** **no** es una licencia open source aprobada por la OSI: **añade restricciones de uso** (cláusulas éticas / de derechos humanos). Algunos equipos legales la consideran incompatible o riesgosa para productos comerciales por su ambigüedad e imponer condiciones a los usuarios del software.
- **Uso en el sistema:** mapas del **portal de choferes** (react-leaflet). Es una superficie acotada.
- **Opciones:** (a) **revisión legal** de si sus cláusulas afectan el modelo SaaS; (b) **reemplazar** por `leaflet` puro (BSD-2, ya presente) usándolo directamente sin el wrapper React; (c) otra librería de mapas MIT.
- **Severidad:** MEDIA para comercializar. **⚖️ Requiere confirmación legal.**

## 4. Servicios externos (SaaS de terceros — términos comerciales, no licencias de código)
Supabase, Vercel, Resend, MercadoPago, Meta (WhatsApp), Google (Analytics/Maps), OpenStreetMap/Nominatim. Revisar **términos de uso comercial**, límites y **acuerdos de tratamiento de datos (DPA)** de cada uno (ver [`PRIVACY_ARCHITECTURE.md`](./PRIVACY_ARCHITECTURE.md)). **Nominatim** tiene una **política de uso** estricta (límite de peticiones, atribución) — hoy se usa como proxy público sin control (SEC-11).

## 5. Recomendaciones
1. **Resolver `react-leaflet`** (revisión legal o reemplazo).
2. Correr **`license-checker`** sobre dependencias transitivas y versionar el reporte.
3. Añadir un **check de licencias en CI** para bloquear licencias no permitidas a futuro.
4. Mantener este archivo actualizado al agregar dependencias.
