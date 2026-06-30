# NOMA FOOD Inventario

App web de inventario para la fÃ¡brica NOMA FOOD, creada con Next.js, TypeScript, Tailwind CSS y Supabase.

Incluye:

- Dashboard con stock bajo, agotados, prÃ³ximos a vencer, Ãºltimos movimientos y valor estimado.
- Panel de Operaciones con pedidos confirmados, faltantes, producciÃ³n pendiente y ADT diaria.
- Recetas por tanda con cÃ¡lculo de ingredientes exactos, pasos editables y ficha descargable para imprimir.
- CampaÃ±as y Comunicaciones para segmentar clientes y simular email/WhatsApp Business.
- Caja estilo cartola bancaria para registrar ingresos, egresos, conciliar movimientos y revisar estado de resultado.
- Balance gerencial con graficos de caja, stock, creditos, maquinaria, inversiones, cuentas por cobrar y deudas por pagar.
- Cobranza para controlar clientes con crÃ©dito, facturas pendientes, vencidas y pagos recibidos.
- Proveedores con datos comerciales, productos, precios por proveedor y lista semanal Lo Valledor.
- Costos de recetas comparando ingredientes, precios de proveedor y tiempo de elaboraciÃ³n.
- Calendario de limpieza diaria/mensual con responsables, pasos e insumos por tarea.
- Calendario de mantenciÃ³n de mÃ¡quinas con fechas, responsables y pasos de revisiÃ³n.
- Maestro de productos con cÃ³digo, categorÃ­a, unidad, stock, proveedor, costo, lote, vencimiento y observaciones.
- Registro de entradas, salidas, mermas, vencidos, ajustes y traslados.
- Cerebro editable para categorÃ­as, subcategorÃ­as, proveedores, ubicaciones, unidades y responsables.
- Alertas por stock mÃ­nimo, agotados, vencidos y vencimientos a 30, 15 o 7 dÃ­as.
- Roles visuales: Gerencia, AdministraciÃ³n, Encargado producciÃ³n, Operario, Armado y Chofer.
- Historial de movimientos sin opciÃ³n de borrado.
- PestaÃ±a Accesos para administrar permisos por rol.
- ConfiguraciÃ³n de avisos de movimientos por WhatsApp y correo.
- Base demo central preparada para clientes, recetas, pedidos, Ã³rdenes de producciÃ³n, ADT, armado y despachos.
- Estructura central 2026 para conectar Portal Admin, Portal Mayorista y Portal de Trabajadores contra una misma base de datos.

## Ejecutar localmente

1. Instala dependencias:

```bash
npm install
```

2. Inicia la app:

```bash
npm run dev
```

3. Abre:

```text
http://localhost:3000
```

Si no configuras Supabase, la app funciona en modo demo local con datos de ejemplo y guarda cambios en el navegador.

## Conectar Supabase

1. Crea un proyecto en Supabase.

2. Abre el editor SQL de Supabase y ejecuta el archivo:

```text
supabase/schema.sql
```

Ese script crea:

- `products`
- `inventory_movements`
- `inventory_catalog_items`
- `profiles`
- `operators`
- `customers`
- `production_items`
- `recipes`
- `recipe_ingredients`
- `orders`
- `order_lines`
- `production_orders`
- `adt_tasks`
- `picking_tasks`
- `dispatches`
- `marketing_customers`
- `campaign_templates`
- `marketing_campaigns`
- `campaign_deliveries`
- vista `inventory_alerts`
- disparador para actualizar stock al insertar movimientos
- bloqueo para impedir modificar o borrar movimientos
- datos iniciales de ejemplo

Ademas deja preparada la arquitectura central con:

- `payments` y `payment_webhook_events` para pagos online con idempotencia.
- `credit_rules` y `customer_credit_limits` para ventas a credito.
- `stock_reservations` para reservar stock desde pedidos.
- `supplier_products`, `supplier_price_history`, `purchase_requests`, `purchase_orders` y `purchase_receipts` para compras.
- `task_reports`, `task_validations` y `task_evidence_files` para cumplimiento diario validado por supervisor.
- `warehouse_locations`, `cleaning_reports`, `machine_failures` y `maintenance_events`.
- `audit_logs`, `balance_snapshots` y `business_settings`.

La ruta `/api/core/events` funciona como centro demo de eventos. En produccion debe recibir eventos firmados desde portal mayorista, pasarelas de pago y portal trabajador, guardarlos en Supabase y ejecutar las actualizaciones relacionadas.

3. Copia `.env.example` como `.env.local`:

```bash
cp .env.example .env.local
```

En Windows PowerShell:

```powershell
Copy-Item .env.example .env.local
```

4. Completa las variables:

```env
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key
```

5. Reinicia la app.

## Roles

La app incluye estos roles operativos:

- Gerencia: ve todo.
- AdministraciÃ³n: pedidos, clientes, compras e inventario.
- Encargado producciÃ³n: recetas, stock, Ã³rdenes y ADT.
- Operario: sus tareas y fichas de receta.
- Armado: pedidos, checklist y cestas.
- Chofer: ruta, entregas y comprobantes.

La tabla `profiles` deja preparada la base para una autenticaciÃ³n real por usuario. Para producciÃ³n conviene agregar inicio de sesiÃ³n y polÃ­ticas RLS segÃºn estos roles.

## Flujo operacional

El `Panel de Operaciones` deja modelado el flujo:

```text
Pedido confirmado -> reservar/descontar stock -> calcular faltantes -> crear orden de producciÃ³n -> generar ADT sugerida por Ã¡rea y operario -> registrar producto terminado -> armado por cliente -> despacho
```

Por ahora usa datos demo realistas de NOMA FOOD. La estructura queda separada en entidades para poder conectarla luego a Supabase como base central.

En `Recetas y rendimientos`, cada receta funciona por tanda. El sistema muestra las tandas recomendadas desde producciÃ³n pendiente, permite subir manualmente la cantidad para sobre stock de temporada alta, recalcula materias primas/preelaboraciones/envases, y genera una ficha HTML descargable para imprimir y entregar al operario asignado.

## Accesos y notificaciones

La pestaÃ±a `Accesos` permite activar o bloquear secciones por rol. En modo demo, esos permisos quedan guardados en el navegador.

Las pestaÃ±as `Caja` y `Cobranza` quedan habilitadas por defecto para Gerencia y AdministraciÃ³n. En modo demo permiten
registrar movimientos financieros, revisar resultado, controlar documentos por cobrar y marcar pagos recibidos. Al marcar
una cobranza como pagada, la app genera un ingreso asociado en Caja.

La pestaÃƒÂ±a `Caja` incluye una cartola bancaria demo con movimientos pendientes de conciliaciÃƒÂ³n. Al conciliar un
movimiento de cartola, la app crea automÃƒÂ¡ticamente el ingreso o egreso correspondiente en Caja. TambiÃƒÂ©n permite cargar
un archivo CSV demo con columnas:

```text
fecha,descripcion,monto,cuenta,referencia
```

Los montos positivos se interpretan como ingresos y los negativos como egresos. Para producciÃƒÂ³n, esta entrada puede
conectarse a una carga real de cartola bancaria, integraciÃƒÂ³n con ERP, proveedor financiero o API bancaria cuando el banco
lo permita.

Pendiente priorizado para la versiÃ³n real: conectar el portal mayorista con Caja y Cobranza. La regla serÃ¡:

```text
Pago online aprobado -> ingreso automatico en Caja
Transferencia validada por Administracion -> ingreso en Caja
Cliente con credito -> documento pendiente en Cobranza
Pago parcial -> abono en Caja y saldo pendiente en Cobranza
```

Cuando se registra un movimiento, la app genera una bitÃ¡cora de aviso. Para que el aviso llegue realmente por WhatsApp y correo al usar la app en producciÃ³n, hay que conectar servicios externos, por ejemplo:

- WhatsApp Business API o un proveedor como Twilio.
- Un proveedor de correo transaccional como Resend, SendGrid o similar.

Ese envÃ­o debe configurarse del lado servidor para no exponer claves privadas en el navegador.

## CampaÃ±as y Comunicaciones

El mÃ³dulo `CampaÃ±as` funciona en modo demo. Permite segmentar clientes por tipo de negocio, actividad, Ãºltima compra, comuna, estado de pago, productos comprados y consentimiento de marketing.

Incluye segmentos automÃ¡ticos:

- Clientes sin compra en 30 dÃ­as.
- Clientes activos.
- Clientes con deuda.
- Prospectos sin primera compra.

Las campaÃ±as usan plantillas con variables como `{{nombre_cliente}}`, `{{nombre_negocio}}`, `{{link_portal}}`, `{{productos_destacados}}` y `{{fecha_despacho}}`. Solo se simulan envÃ­os a clientes con consentimiento vigente, canal autorizado y sin desuscripciÃ³n.

Variables preparadas para producciÃ³n:

```env
WHATSAPP_ACCESS_TOKEN
WHATSAPP_PHONE_NUMBER_ID
RESEND_API_KEY
MARKETING_FROM_EMAIL
NEXT_PUBLIC_WHOLESALE_PORTAL_URL
```

El endpoint `/api/marketing/demo-send` estÃ¡ listo como punto de conexiÃ³n servidor, pero no envÃ­a campaÃ±as reales.

## Portal NOMA FOOD Mayoristas

La ruta `/mayoristas` agrega un portal pÃºblico/privado demo para clientes B2B aprobados:

- Landing pÃºblica sin precios, solicitud de acceso y botÃ³n WhatsApp.
- Inicio de sesiÃ³n demo para clientes autorizados.
- Portal privado con prÃ³ximo despacho, pedido mÃ­nimo, estado de cuenta, pedidos recientes y acceso a catÃ¡logo.
- CatÃ¡logo mayorista con productos NOMA FOOD, filtros, cantidades, precios por cliente y carrito.
- Checkout con subtotal, IVA, despacho, direcciÃ³n, fecha disponible, observaciones y pago demo.
- Historial de pedidos con estados, detalle, pago, evidencia y conexiÃ³n visual con operaciones, inventario y ADT.

Credenciales demo para vivir la experiencia como cliente:

```text
Usuario: cliente@nomafood.cl
Contrasena: NomaMayorista2026
```

El formulario `Solicitar acceso mayorista` queda dirigido a `brotesladera@gmail.com`. En local funciona en modo demo
mediante `/api/wholesale/access-request`; para enviar correos reales hay que configurar `RESEND_API_KEY` y mantener:

```env
NEXT_PUBLIC_WHOLESALE_ACCESS_REQUEST_EMAIL=brotesladera@gmail.com
WHOLESALE_ACCESS_REQUEST_TO_EMAIL=brotesladera@gmail.com
WHOLESALE_ACCESS_REQUEST_FROM_EMAIL=NOMA FOOD <portal@nomafood.cl>
```

Puedes revisar un ejemplo visual del correo en:

```text
http://127.0.0.1:3000/api/wholesale/access-request/preview
```

Los pagos reales no estÃ¡n activos. El checkout queda preparado para conectar Mercado Pago Checkout Pro o Webpay Plus usando:

```env
NEXT_PUBLIC_PAYMENT_MODE
NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY
MERCADO_PAGO_ACCESS_TOKEN
WEBPAY_COMMERCE_CODE
WEBPAY_API_KEY
WHOLESALE_PAYMENT_PROVIDER
```

## Movimientos y stock

Los movimientos no se borran ni se editan. En Supabase, el archivo SQL crea un disparador que aplica estos cambios:

- Entrada: suma stock.
- Salida: resta stock.
- Merma: resta stock.
- Vencido: resta stock.
- Ajuste: suma o resta segÃºn el nÃºmero ingresado.
- Traslado: conserva el stock total.

## Desplegar en Vercel

1. Sube el proyecto a un repositorio Git.
2. En Vercel, crea un nuevo proyecto desde ese repositorio.
3. Agrega estas variables en Project Settings > Environment Variables:

```env
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
```

4. Despliega. Vercel detectarÃ¡ Next.js automÃ¡ticamente.

## Seguridad para producciÃ³n

El esquema estÃ¡ pensado para que la app funcione rÃ¡pido con la llave pÃºblica de Supabase. Antes de usar datos reales, activa autenticaciÃ³n y polÃ­ticas RLS estrictas. MantÃ©n siempre el bloqueo de ediciÃ³n/borrado de `inventory_movements` para conservar el historial completo.

