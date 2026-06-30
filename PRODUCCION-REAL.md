# NOMA FOOD - Paso a produccion real

Esta guia resume lo necesario para usar la web app diariamente con datos reales.

## Usuarios reales

- Usar Supabase Auth para crear usuarios con correo y contrasena.
- Guardar el rol operativo en `profiles`.
- Activar politicas RLS para que cada rol vea solo lo permitido.
- Mantener `Accesos` como panel administrativo para configurar permisos visuales.

Roles recomendados:

- Gerencia
- Administracion
- EncargadoProduccion
- Operario
- Armado
- Chofer

## Pagos portal mayorista

Endpoints base preparados:

```text
POST /api/payments/checkout
POST /api/payments/webhook
```

Variables preparadas:

```env
WHOLESALE_PAYMENT_PROVIDER=manual
NEXT_PUBLIC_PAYMENT_MODE=demo
WEBPAY_COMMERCE_CODE=
WEBPAY_API_KEY=
NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY=
MERCADO_PAGO_ACCESS_TOKEN=
PAYMENT_WEBHOOK_SECRET=
```

Regla para produccion:

```text
Pago aprobado por webhook seguro -> crear ingreso en Caja -> marcar pedido como Pagado -> liberar a Produccion/Despacho
Venta a credito autorizada -> crear Cobranza -> no ingresar dinero en Caja hasta pago real
```

No se deben confirmar pagos solo porque el cliente vuelve al sitio despues de pagar. La confirmacion valida debe venir por webhook.

## Rutas chofer

El modulo de despacho genera accesos directos:

- Abrir Waze.
- Abrir Google Maps.

Variables preparadas:

```env
NEXT_PUBLIC_MAPS_PROVIDER=google
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=
```

Waze puede abrirse con link directo sin API privada. Google Maps puede funcionar con links directos y, si mas adelante se quiere mapa embebido o rutas optimizadas, se conecta con Google Maps Platform.

