# DATA_MAP — Mapa de datos

> Qué datos guarda el sistema, dónde, quién los ve, para qué, retención, exportación y terceros. Base para privacidad ([`PRIVACY_ARCHITECTURE.md`](./PRIVACY_ARCHITECTURE.md)).

## 1. Categorías de datos

| Categoría | Ejemplos de tablas | Contenido | Sensibilidad |
|---|---|---|---|
| **Autenticación** | `auth.users` (Supabase), `profiles`, `mayoristas.clave_token` | email, hash de clave (Supabase), tokens de acceso | **ALTA** |
| **Datos personales – clientes** | `mayoristas`, `mayorista_usuarios`, `minorista_pedidos` (`cliente_nombre/email/telefono`) | nombre, email, teléfono, RUT, dirección | ALTA (personal) |
| **Datos personales – trabajadores** | `operarios`, `profiles`, `op_asistencia`, `op_jornadas` | nombre, rol, área, jornada, asistencia | ALTA (laboral) |
| **Datos de proveedores** | `proveedores`, `proveedor_productos` | contacto, precios, condiciones | MEDIA (comercial) |
| **Financieros** | `fin_*`, `cash_entries`?, `customer_receivables`, `balance_snapshots`, remuneraciones | ventas, caja, cobranza, sueldos | **ALTA** (confidencial) |
| **Operacionales confidenciales** | `recetas`, `receta_ingredientes`, `products` (costos), `production_*` | **formulaciones/recetas**, costos, márgenes | **ALTA** (secreto industrial del cliente) |
| **Geolocalización** | `dispatches`, direcciones de entrega, `web_visits` | direcciones, rutas de reparto, IP/visitas | MEDIA-ALTA |
| **Pedidos/ventas** | `mayorista_pedidos`, `minorista_pedidos`, `mkt_*` | historial de compra, campañas, contactos | MEDIA |

## 2. Dónde se guarda
- **Todo** en la BD **Supabase (Postgres)** del proyecto.
- **Archivos/evidencias** (fotos de tareas/limpieza): `task_evidence_files` + `NO VERIFICADO` bucket de Supabase Storage.
- **Fotos de catálogo:** estáticas en `public/productos/` (repo).

## 3. Quién puede verla
- **Central:** roles admin (`SuperAdmin/Administracion/Gerencia/EncargadoProduccion`), y roles específicos (`Contador` finanzas, `Comercial`). Autorización por endpoint.
- **Portales:** cada cliente/trabajador ve **lo suyo** (scope por token/`mayorista_id`/`operario_id`).
- **Plataforma (operador):** con service-role, acceso técnico total (riesgo insider).

## 4. Para qué se usa
Operación (producción, inventario, despacho), venta B2B/B2C, cobranza, marketing (campañas), asistencia laboral.

## 5. Retención y eliminación
- **Retención:** no hay política definida (`NO VERIFICADO`). Los datos se conservan indefinidamente.
- **Eliminación:** patrón **soft-delete** (`estado`/`activo`); no hay borrado real ni purga programada. → Para GDPR/Ley chilena habrá que soportar **borrado/anonimización a solicitud**.

## 6. Exportación
- OC imprimibles (`/orden-compra*`), exportes de remuneraciones a contador, reportes de finanzas. **Sin scope de tenant** (riesgo multi-empresa).

## 7. Terceros que reciben datos (procesadores)
| Tercero | Datos que recibe | Propósito |
|---|---|---|
| **Supabase** | todos (BD/Auth/Storage) | infraestructura |
| **Vercel** | tráfico/logs (metadatos, IP) | hosting |
| **Resend** | email + nombre (correos/campañas) | correo |
| **MercadoPago** | datos de pago/pedido | pagos |
| **Meta (WhatsApp)** | teléfono + mensajes | notificaciones |
| **OpenStreetMap/Nominatim** | direcciones (geocode) | geocodificación |
| **Google Analytics** | comportamiento/IP (cliente) | analítica |
| **(futuro) Proveedor de IA** | ver [`AI_SECURITY.md`](./AI_SECURITY.md) | agente |

## 8. Brechas para SaaS
- Sin **`tenant_id`** → los datos personales/financieros de futuros clientes no están particionados (ver [`TENANT_ISOLATION.md`](./TENANT_ISOLATION.md)).
- Sin **política de retención** ni **flujo de borrado/portabilidad** (derechos del titular).
- **DPA (acuerdos de tratamiento)** con cada procesador: pendiente (revisión legal).
