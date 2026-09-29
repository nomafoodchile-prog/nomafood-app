# FORMULARIO DE DIAGNÓSTICO — Restaurante

> **Propósito:** levantar cómo opera realmente un restaurante antes de adaptar el sistema SaaS. **No** es una propuesta ni una demo: es un diagnóstico.
> **Duración estimada:** 20–30 min. **Formato:** listo para portar a Google Forms / Typeform / formulario web propio.
> **Fecha de diseño:** 2026-09-28.

## Cómo leer esta tabla
- **ID:** identificador de la pregunta (para saltos y para la matriz de análisis).
- **Tipo:** `OM` opción múltiple (una) · `SM` selección múltiple · `SN` Sí/No · `E5` escala 1–5 · `NUM` numérico · `CORTA` respuesta corta · `ABIERTA` texto largo · `INFO` texto informativo.
- **Condición:** cuándo se muestra la pregunta (lógica condicional). Vacío = siempre visible.

### Variables de ramificación principales (definen qué se oculta)
- **`multi_local`** = P1.2 > 1 → habilita transferencias entre sucursales y comparación por local.
- **`delivery_propio`** = P1.9 = Sí → habilita la Sección 9 (Delivery y despacho).
- **`usa_produccion`** = P3.9 = Sí (maneja preelaboraciones/producción) → habilita bloques de cocina/producción ampliados.

---

## SECCIÓN 0 · Identificación (contexto)

| ID | Pregunta | Tipo | Opciones | Condición |
|---|---|---|---|---|
| P0.1 | Nombre del restaurante | CORTA | — | |
| P0.2 | Nombre y cargo de quien responde | CORTA | — | |
| P0.3 | Correo y teléfono de contacto | CORTA | — | |
| P0.4 | Fecha del diagnóstico | CORTA | — | |

## SECCIÓN 1 · Perfil del negocio

| ID | Pregunta | Tipo | Opciones | Condición |
|---|---|---|---|---|
| P1.1 | Tipo de restaurante | OM | Comida rápida · Casual · Fine dining · Cafetería · Dark kitchen · Comida por encargo/eventos · Otro | |
| P1.2 | ¿Cuántas sucursales/locales tiene? | NUM | — | |
| P1.3 | Cantidad total de trabajadores | NUM | — | |
| P1.4 | Clientes atendidos por día (aprox.) | NUM | — | |
| P1.5 | Horario de atención | CORTA | — | |
| P1.6 | ¿Cuántos turnos operan al día? | OM | 1 · 2 · 3 · Rotativos | |
| P1.7 | Canales de atención que usa | SM | Salón · Retiro en local · Delivery propio · Plataformas externas (Uber/PedidosYa/Rappi) · Pedidos por WhatsApp · Web propia | |
| P1.8 | ¿Atiende en salón? | SN | — | |
| P1.9 | ¿Tiene delivery propio (repartidores propios)? | SN | — | |
| P1.10 | Plataformas externas que usa | SM | Uber Eats · PedidosYa · Rappi · Otra · Ninguna | |
| P1.11 | ¿Quién administra el negocio? | OM | Dueño/a · Administrador contratado · Gerente · Familiar · Externo | |
| P1.12 | ¿Quién toma las decisiones operativas del día a día? | CORTA | — | |
| P1.13 | Sistemas/herramientas que usa hoy | SM | POS · Excel · Google Sheets · WhatsApp · Software contable · Sistema de inventario · Sistema de asistencia · Plataformas de delivery · Software de compras · Ninguno · Otro | |
| P1.14 | Si marcó "Otro" arriba, ¿cuál(es)? | CORTA | — | P1.13 incluye "Otro" |
| P1.15 | ¿Qué tan conforme está con sus herramientas actuales? | E5 | 1 nada – 5 muy conforme | |

## SECCIÓN 2 · Operación diaria

| ID | Pregunta | Tipo | Opciones | Condición |
|---|---|---|---|---|
| P2.1 | ¿Cómo saben los trabajadores qué hacer en cada turno? | OM | Lo saben de memoria · Alguien les dice verbalmente · Lista en papel · WhatsApp · Sistema/app · Otro | |
| P2.2 | ¿Quién asigna las tareas? | CORTA | — | |
| P2.3 | ¿Las tareas quedan registradas en algún lado? | OM | No se registran · Papel · WhatsApp · Excel/Sheets · Sistema | |
| P2.4 | ¿Cómo saben si las tareas se realizaron? | OM | No se sabe con certeza · Revisión visual · Reporte verbal · Registro escrito · Sistema con evidencia | |
| P2.5 | ¿Existen checklists de apertura y cierre? | OM | No · Sí, en papel · Sí, digital | |
| P2.6 | ¿Hay tareas que frecuentemente quedan pendientes? | SN | — | |
| P2.7 | ¿Cuáles tareas quedan pendientes más seguido? | CORTA | — | P2.6 = Sí |
| P2.8 | ¿Existen tiempos muertos en el turno? | OM | Nunca · A veces · Frecuentes | |
| P2.9 | ¿Cómo se comunican los problemas durante el turno? | SM | Verbal · WhatsApp · Llamada · Papel · Sistema | |
| P2.10 | ¿Qué ocurre cuando falta un trabajador? | ABIERTA | — | |
| P2.11 | Cuando el dueño no está, ¿cómo se entera de lo que pasa? | OM | No se entera hasta llegar · Llamadas/WhatsApp · Reporte al final del día · Ve cámaras · Sistema en tiempo real | |

## SECCIÓN 3 · Cocina

| ID | Pregunta | Tipo | Opciones | Condición |
|---|---|---|---|---|
| P3.1 | ¿Cómo llegan las comandas a la cocina? | OM | Papel · Grito/verbal · Impresora POS · Pantalla (KDS) · WhatsApp · Mixto | |
| P3.2 | ¿Cómo se distribuyen entre estaciones? | OM | Sin distribución formal · Un encargado reparte · Por pantalla/estación | |
| P3.3 | ¿Cómo se priorizan las comandas? | OM | Orden de llegada · Criterio del cocinero · No hay criterio claro · Sistema | |
| P3.4 | ¿Existen recetas estandarizadas? | OM | No · Algunas · Sí, todas | |
| P3.5 | ¿Las recetas incluyen gramajes/porciones exactas? | OM | No · Algunas · Sí | |
| P3.6 | ¿Conocen el tiempo estándar de preparación de cada plato? | SN | — | |
| P3.7 | ¿Miden los tiempos reales de preparación? | SN | — | |
| P3.8 | ¿Cómo saben cuánto preparar cada día? | OM | Experiencia/olfato · Histórico en papel · Datos del POS · Sistema · No se planifica | |
| P3.9 | ¿Manejan preelaboraciones (mise en place / producción previa)? | SN | — | |
| P3.10 | ¿Cómo gestionan las preelaboraciones? | ABIERTA | — | P3.9 = Sí |
| P3.11 | ¿Cómo controlan las porciones? | OM | No se controla · Al ojo · Utensilio medido · Balanza · Sistema | |
| P3.12 | ¿Cómo gestionan un faltante de insumo durante el servicio? | ABIERTA | — | |
| P3.13 | ¿Registran platos devueltos / rehechos / errores de cocina? | OM | No · A veces · Sí, siempre | |
| P3.14 | Marque los problemas de cocina que sufre | SM | Atrasos · Sobreproducción · Falta de preparación · Mala coordinación · Desperdicio · Porcionamiento incorrecto · Falta de estandarización · Ninguno | |
| P3.15 | ¿Cuál de esos problemas le duele más? | CORTA | — | P3.14 ≠ Ninguno |

## SECCIÓN 4 · Personal y operarios

| ID | Pregunta | Tipo | Opciones | Condición |
|---|---|---|---|---|
| P4.1 | ¿Cómo se asignan las tareas al personal? | OM | Verbal · Papel · WhatsApp · Sistema · No se asignan formalmente | |
| P4.2 | ¿Cómo controlan la asistencia? | OM | No se controla · Papel/libro · Reloj control · App/huella · GeoVictoria u otro · Sistema | |
| P4.3 | ¿Cómo controlan atrasos? | OM | No se controlan · Anotación manual · Sistema | |
| P4.4 | ¿Cómo manejan los turnos? | OM | Sin planificación formal · Excel/papel · App/sistema | |
| P4.5 | ¿Cómo saben quién realizó cada tarea? | OM | No se sabe · Por memoria · Registro escrito · Sistema con responsable | |
| P4.6 | ¿Cómo capacitan a una persona nueva? | ABIERTA | — | |
| P4.7 | ¿Dónde están las recetas y procedimientos? | SM | En la cabeza del equipo · Papel/carpeta · Fotos/WhatsApp · Excel/Drive · Sistema · No existen | |
| P4.8 | ¿Cómo controlan el cumplimiento de las tareas? | OM | No se controla · Revisión visual · Registro · Sistema con evidencia | |
| P4.9 | ¿Hay tareas que deberían dejar evidencia (foto/registro)? | SN | — | |
| P4.10 | ¿Usan fotografías para verificar trabajos? | OM | No · A veces (WhatsApp) · Sí, sistemáticamente | |
| P4.11 | ¿Cómo evalúan la productividad del personal? | OM | No se evalúa · Percepción · Indicadores manuales · Sistema | |
| P4.12 | ¿El dueño puede saber qué hace cada trabajador en tiempo real? | SN | — | |
| P4.13 | Un Portal Operario donde el trabajador vea tareas, inicie/termine, vea recetas e instrucciones, registre incidencias y suba fotos, ¿qué tan útil sería? | E5 | 1 nada – 5 crítico | |

## SECCIÓN 5 · Inventario *(sección clave — profundizar)*

| ID | Pregunta | Tipo | Opciones | Condición |
|---|---|---|---|---|
| P5.1 | ¿Cómo saben cuánto stock tienen? | OM | No se sabe con precisión · Revisión visual · Papel/Excel · Sistema | |
| P5.2 | ¿Quién registra las entradas de mercadería? | CORTA | — | |
| P5.3 | ¿Quién registra las salidas/consumos? | CORTA | — | |
| P5.4 | ¿Con qué frecuencia hacen inventario físico? | OM | Nunca · Ocasional · Mensual · Semanal · Diario | |
| P5.5 | ¿El stock del sistema/registro suele coincidir con el real? | OM | No usamos sistema · Casi nunca · A veces · Casi siempre | |
| P5.6 | ¿Cómo controlan vencimientos? | OM | No se controla · Revisión manual · Etiquetas/FIFO · Sistema con alertas | |
| P5.7 | ¿Cómo registran mermas? | OM | No se registran · Papel · Excel · Sistema | |
| P5.8 | ¿Cómo registran productos dañados? | OM | No se registran · Manual · Sistema | |
| P5.9 | ¿Controlan materias primas por separado de productos preparados/preelaboraciones? | SN | — | |
| P5.10 | ¿Tienen distintas ubicaciones (cámaras, bodegas, congelador)? | SN | — | |
| P5.11 | ¿Realizan transferencias de stock entre locales? | SN | — | multi_local |
| P5.12 | ¿Manejan stock mínimo por producto? | SN | — | |
| P5.13 | ¿Sufren quiebres de stock (se quedan sin producto)? | OM | Nunca · Ocasional · Semanal · Varias veces por semana · Diario | |
| P5.14 | ¿Compran en exceso / se les vence producto? | OM | Nunca · Ocasional · Frecuente | |
| P5.15 | ¿Cómo saben qué producto deben reponer? | OM | Al darse cuenta que falta · Revisión periódica · Stock mínimo · Sistema sugiere | |
| P5.16 | ¿Cuánto tiempo a la semana dedican a controlar inventario? | NUM | horas | |

## SECCIÓN 6 · Compras y proveedores

| ID | Pregunta | Tipo | Opciones | Condición |
|---|---|---|---|---|
| P6.1 | ¿Cómo saben qué deben comprar? | OM | Revisión visual · Lista mental · Papel/Excel · Stock mínimo · Sistema | |
| P6.2 | ¿Quién realiza las compras? | CORTA | — | |
| P6.3 | ¿Quién autoriza las compras? | OM | Nadie/automático · Dueño · Administrador · Según monto | |
| P6.4 | ¿Cómo hacen los pedidos a proveedores hoy? | SM | WhatsApp · Correo · Teléfono · Presencial · Sistema del proveedor · Nuestro sistema | |
| P6.5 | ¿Comparan precios entre proveedores? | OM | No · A veces · Siempre | |
| P6.6 | ¿Registran los cambios de precio de los insumos? | SN | — | |
| P6.7 | ¿Tienen proveedores alternativos por producto? | OM | No · Algunos · Sí | |
| P6.8 | ¿Cómo revisan que lo recibido coincida con lo pedido? | OM | No se revisa · Revisión visual · Guía/factura contra pedido · Sistema | |
| P6.9 | ¿Cómo registran diferencias en la recepción? | OM | No se registran · Manual · Sistema | |
| P6.10 | ¿Cómo gestionan las facturas de proveedores? | OM | Papel · Carpeta/foto · Excel · Software contable · Sistema | |
| P6.11 | ¿Cómo controlan los pagos pendientes a proveedores? | OM | No se controla formalmente · Papel/Excel · Sistema | |
| P6.12 | ¿Cómo saben cuándo volver a comprar? | OM | Cuando falta · Rutina fija · Stock mínimo · Sistema sugiere | |
| P6.13 | Un flujo "stock bajo → sugerencia de compra → cantidad y proveedor sugeridos → usted aprueba/paga", ¿qué tan útil sería? | E5 | 1 nada – 5 crítico | |

## SECCIÓN 7 · Mermas y desperdicio

| ID | Pregunta | Tipo | Opciones | Condición |
|---|---|---|---|---|
| P7.1 | ¿Registran las mermas? | OM | No · A veces · Sí, siempre | |
| P7.2 | ¿Registran el motivo de la merma? | SN | — | P7.1 ≠ No |
| P7.3 | ¿Saben cuánto dinero pierden por merma? | OM | No · Estimado grueso · Sí, con datos | |
| P7.4 | ¿Controlan vencimientos como causa de merma? | SN | — | |
| P7.5 | ¿Controlan la sobreproducción? | SN | — | |
| P7.6 | ¿Controlan platos devueltos? | SN | — | |
| P7.7 | ¿Controlan errores de cocina como merma? | SN | — | |
| P7.8 | ¿Saben qué productos generan mayor desperdicio? | OM | No · Intuición · Sí, con datos | |
| P7.9 | ¿Les gustaría ver la merma convertida en pérdida $ automáticamente? | E5 | 1 nada – 5 crítico | |

## SECCIÓN 8 · Ventas y pedidos

| ID | Pregunta | Tipo | Opciones | Condición |
|---|---|---|---|---|
| P8.1 | ¿Qué POS utilizan? | CORTA | (o "Ninguno") | |
| P8.2 | Canales por los que llegan pedidos | SM | Salón · Web propia · WhatsApp · Uber Eats · PedidosYa · Rappi · Teléfono · Otro | |
| P8.3 | ¿Los canales están integrados entre sí? | OM | No · Parcialmente · Sí | |
| P8.4 | ¿Deben ingresar pedidos manualmente en algún sistema? | SN | — | |
| P8.5 | ¿Pueden ver las ventas en tiempo real? | SN | — | |
| P8.6 | ¿Pueden identificar los productos más vendidos? | OM | No · Con esfuerzo · Sí, fácil | |
| P8.7 | ¿Pueden identificar los productos más rentables? | OM | No · Con esfuerzo · Sí, fácil | |
| P8.8 | ¿Pueden comparar ventas entre días / horarios? | SN | — | |
| P8.9 | ¿Pueden comparar ventas entre locales? | SN | — | multi_local |
| P8.10 | ¿Qué información de ventas les cuesta más obtener hoy? | CORTA | — | |

## SECCIÓN 9 · Delivery y despacho *(solo si delivery propio)*

| ID | Pregunta | Tipo | Opciones | Condición |
|---|---|---|---|---|
| P9.1 | ¿Cómo asignan el chofer/repartidor a un pedido? | OM | Verbal · WhatsApp · Turno fijo · Sistema | delivery_propio |
| P9.2 | ¿Cómo controlan las rutas? | OM | No se controlan · Chofer decide · App de mapas · Sistema | delivery_propio |
| P9.3 | ¿Cómo registran la salida del pedido? | OM | No se registra · Manual · Sistema | delivery_propio |
| P9.4 | ¿Cómo registran la entrega? | OM | No se registra · Llamada/WhatsApp · Sistema | delivery_propio |
| P9.5 | ¿Existe evidencia de entrega (foto/firma)? | OM | No · A veces · Sí | delivery_propio |
| P9.6 | ¿Registran incidencias de despacho? | SN | — | delivery_propio |
| P9.7 | ¿Pueden saber dónde está un pedido en ruta? | SN | — | delivery_propio |
| P9.8 | ¿Pueden medir los tiempos de despacho? | SN | — | delivery_propio |

## SECCIÓN 10 · Costos

| ID | Pregunta | Tipo | Opciones | Condición |
|---|---|---|---|---|
| P10.1 | ¿Cada plato tiene su receta costeada? | OM | No · Algunos · Sí, todos | |
| P10.2 | ¿El costo del plato se actualiza solo cuando cambia un ingrediente? | SN | — | |
| P10.3 | ¿Conocen el costo real de cada plato? | OM | No · Aproximado · Sí, exacto | |
| P10.4 | ¿Conocen el margen de cada plato? | OM | No · Aproximado · Sí | |
| P10.5 | Al costear, ¿qué incluyen? | SM | Insumos · Envase · Comisiones de plataforma · Costo de delivery · Merma · Mano de obra · Ninguno de estos | |
| P10.6 | ¿Cómo definen los precios de venta? | OM | Copiando a la competencia · Margen sobre costo · Intuición · Sistema | |
| P10.7 | ¿Cómo detectan que deberían subir un precio? | ABIERTA | — | |

## SECCIÓN 11 · Finanzas

| ID | Pregunta | Tipo | Opciones | Condición |
|---|---|---|---|---|
| P11.1 | ¿Cómo llevan la caja diaria? | OM | No formal · Papel · Excel · POS · Sistema | |
| P11.2 | ¿Registran ingresos y egresos de forma ordenada? | OM | No · Parcial · Sí | |
| P11.3 | ¿Cómo controlan cuentas por pagar (proveedores)? | OM | No formal · Papel/Excel · Software contable · Sistema | |
| P11.4 | ¿Concilian los movimientos bancarios? | OM | No · Manual · Sistema | |
| P11.5 | ¿Cómo gestionan gastos, remuneraciones e impuestos? | ABIERTA | — | |
| P11.6 | ¿Cuánto tardan en saber si el mes fue con ganancia o pérdida? | OM | Semanas después · Al cierre contable · Días · En tiempo casi real | |
| P11.7 | ¿Tienen un estado de resultados actualizado? | OM | No · Mensual con retraso · Sí, al día | |
| P11.8 | ¿Pueden ver la utilidad por sucursal? | SN | — | multi_local |
| P11.9 | ¿Pueden ver la utilidad por producto? | SN | — | |
| P11.10 | ¿Existen diferencias/descuadres de caja? | OM | Nunca · Ocasional · Frecuente | |
| P11.11 | ¿Quién revisa las finanzas? | CORTA | — | |
| P11.12 | ¿Qué información financiera les cuesta más obtener? | CORTA | — | |

## SECCIÓN 12 · Limpieza y control operacional

| ID | Pregunta | Tipo | Opciones | Condición |
|---|---|---|---|---|
| P12.1 | ¿Existen tareas de limpieza programadas? | OM | No · Informalmente · Sí, con calendario | |
| P12.2 | ¿Quién realiza la limpieza? | CORTA | — | |
| P12.3 | ¿Quién verifica que se hizo? | OM | Nadie · Encargado · Sistema con evidencia | |
| P12.4 | ¿Queda evidencia de la limpieza? | OM | No · Papel · Foto/WhatsApp · Sistema | |
| P12.5 | ¿Controlan temperaturas (cámaras/frío)? | OM | No · Manual en papel · Sistema | |
| P12.6 | ¿Existen checklists sanitarios (resolución/inocuidad)? | SN | — | |
| P12.7 | ¿Existen controles formales de apertura y cierre? | SN | — | |
| P12.8 | ¿Qué registros hacen hoy en papel que les gustaría digitalizar? | ABIERTA | — | |

## SECCIÓN 13 · Mantención

| ID | Pregunta | Tipo | Opciones | Condición |
|---|---|---|---|---|
| P13.1 | ¿Cómo reportan un equipo dañado? | OM | Verbal · WhatsApp · Papel · Sistema · No hay proceso | |
| P13.2 | ¿Quién recibe el reporte? | CORTA | — | |
| P13.3 | ¿Se registra la incidencia? | SN | — | |
| P13.4 | ¿Tienen historial de reparaciones por equipo? | SN | — | |
| P13.5 | ¿Saben cuánto cuesta mantener cada equipo? | OM | No · Aproximado · Sí | |
| P13.6 | ¿Realizan mantenciones preventivas? | OM | No · A veces · Sí, programadas | |
| P13.7 | ¿Se les olvidan mantenciones importantes? | OM | Nunca · A veces · Frecuente | |

## SECCIÓN 14 · Visibilidad del dueño

| ID | Pregunta | Tipo | Opciones | Condición |
|---|---|---|---|---|
| P14.1 | **"Si usted no estuviera físicamente en el restaurante durante una semana, ¿qué información necesitaría ver desde su teléfono para sentir que el negocio está bajo control?"** | ABIERTA | — | |
| P14.2 | Marque lo que le gustaría ver en tiempo real desde el teléfono | SM | Ventas · Caja · Trabajadores presentes · Atrasos · Tareas · Cocina · Pedidos · Inventario · Faltantes · Compras · Merma · Costos · Incidencias · Mantención · Resultados financieros | |
| P14.3 | De lo marcado, ¿cuáles son los 3 más importantes para usted? | CORTA | — | |

## SECCIÓN 15 · Dolores principales
> Repetir este bloque para cada dolor que el restaurante identifique (puede duplicarse hasta 5 veces). En Google Forms/Typeform: sección repetible o 5 bloques.

| ID | Pregunta | Tipo | Opciones | Condición |
|---|---|---|---|---|
| P15.1 | Describa el problema/dolor | CORTA | — | |
| P15.2 | Área del problema | OM | Operación · Cocina · Personal · Inventario · Compras · Merma · Ventas · Delivery · Costos · Finanzas · Limpieza · Mantención · Visibilidad | |
| P15.3 | Frecuencia | OM | Nunca · Ocasional · Semanal · Varias veces por semana · Diario | |
| P15.4 | Impacto | E5 | 1 bajo – 5 crítico | |
| P15.5 | Tiempo perdido por semana (horas aprox.) | NUM | horas | |
| P15.6 | Impacto económico | OM | Bajo · Medio · Alto · No lo sé | |
| P15.7 | Prioridad de resolverlo | E5 | 1 baja – 5 máxima | |

## SECCIÓN 16 · Preguntas clave *(obligatorias)*

| ID | Pregunta | Tipo | Opciones | Condición |
|---|---|---|---|---|
| P16.1 | Si pudiera eliminar automáticamente **tres** problemas de su restaurante mañana, ¿cuáles serían? | ABIERTA | — | |
| P16.2 | ¿Qué tarea repetitiva siente que un sistema debería hacer automáticamente por usted? | ABIERTA | — | |
| P16.3 | ¿Qué información necesita hoy y normalmente obtiene demasiado tarde? | ABIERTA | — | |
| P16.4 | ¿Qué problema siente que le hace perder más **dinero**? | ABIERTA | — | |
| P16.5 | ¿Qué problema siente que le hace perder más **tiempo**? | ABIERTA | — | |

## SECCIÓN 17 · Interés en automatizaciones
> Escala para todas: **Nada útil · Poco útil · Útil · Muy útil · Crítico** (`ESC5U`).

| ID | Automatización | Tipo | Condición |
|---|---|---|---|
| P17.1 | Inventario en tiempo real | ESC5U | |
| P17.2 | Alertas de stock | ESC5U | |
| P17.3 | Sugerencias de compra | ESC5U | |
| P17.4 | Compras automatizadas con aprobación humana | ESC5U | |
| P17.5 | Recetas estandarizadas | ESC5U | |
| P17.6 | Costos automáticos por plato | ESC5U | |
| P17.7 | Control de merma | ESC5U | |
| P17.8 | Planificación de cocina (cuánto preparar) | ESC5U | |
| P17.9 | Tareas del personal | ESC5U | |
| P17.10 | Portal Operario | ESC5U | |
| P17.11 | Tiempos estimados vs reales | ESC5U | |
| P17.12 | Evidencia fotográfica | ESC5U | |
| P17.13 | Checklists | ESC5U | |
| P17.14 | Limpieza programada | ESC5U | |
| P17.15 | Mantención | ESC5U | |
| P17.16 | Dashboard gerencial | ESC5U | |
| P17.17 | Caja | ESC5U | |
| P17.18 | Conciliación bancaria | ESC5U | |
| P17.19 | Estado de resultados | ESC5U | |
| P17.20 | Integración con POS | ESC5U | |
| P17.21 | Integración con plataformas de delivery | ESC5U | delivery_propio o P1.10 ≠ Ninguna |
| P17.22 | WhatsApp | ESC5U | |
| P17.23 | Reportes automáticos | ESC5U | |
| P17.24 | Alertas inteligentes | ESC5U | |

## SECCIÓN 18 · Cierre

| ID | Pregunta | Tipo | Opciones | Condición |
|---|---|---|---|---|
| P18.1 | ¿Hay algo que no le preguntamos y que considere importante? | ABIERTA | — | |
| P18.2 | ¿Estaría dispuesto a un piloto/prueba de una solución para su dolor principal? | OM | Sí · Tal vez · No | |

---

### Notas de implementación (para quien lo monte en Forms/Typeform)
- Las columnas del banco de automatizaciones (S17) usan la misma escala → ideal una **matriz/grid**.
- La Sección 15 es **repetible** (hasta 5 dolores) — en Typeform usar lógica de repetición; en Google Forms, 5 bloques idénticos.
- Las condiciones se implementan con **saltos de sección** (Forms) o **logic jumps** (Typeform).
- Mantener los **IDs** como referencia interna (no visibles al encuestado) para cruzar con la [Matriz de Análisis](./MATRIZ_ANALISIS.md).
