# FORMULARIO DE DIAGNÓSTICO — Fábrica de Alimentos

> Etapa previa a adaptar el SaaS a una fábrica. **Diseño, no implementación.** ~35 preguntas efectivas, 15–20 min, con lógica condicional.
> **Versión web navegable ya publicada** (link que se envía al cliente; recoge respuestas por WhatsApp). Esta tabla es la ficha para portar a Google Forms/Typeform.
> **Tipos:** `OM` opción múltiple · `SM` selección múltiple · `SN` Sí/No · `E5` escala 1–5 · `NUM` numérico · `TXT` texto corto · `LONG` texto largo.
> **Variables de ramificación:** `multi_planta` (plantas>1) · `lotes` (maneja lotes = Sí) · `delivery` (reparto propio = Sí).

| Sección | ID | Pregunta | Tipo | Opciones | Lógica |
|---|---|---|---|---|---|
| 1 Perfil | tipo | ¿Qué tipo de alimentos fabrica? | TXT | — | |
| 1 | sucursales | ¿Cuántas plantas / instalaciones tiene? | NUM | — | |
| 1 | trabajadores | Cantidad de trabajadores | NUM | — | |
| 1 | sku | ¿Cuántos SKU fabrican, aprox.? | NUM | — | |
| 1 | sistemas | ¿Qué sistemas usan hoy? | SM | ERP · Inventario · Contable · Excel · Sheets · WhatsApp · Asistencia · Ninguno | |
| 2 Planif. | pp_que | ¿Cómo saben qué producir cada día? | OM | Pedidos · Proyección · Stock mínimo · Experiencia · Sin método | |
| 2 | pp_real | ¿Comparan lo planificado vs lo producido? | OM | No · A veces · Sí | |
| 2 | pp_capacidad | ¿Pueden saber si tienen capacidad para fabricar mañana todo lo pedido? | OM | No · Cálculo manual · Sí, fácil | |
| 3 Operarios | op_saben | ¿Cómo sabe cada operario qué hacer? | OM | Memoria · De palabra · Papel · WhatsApp · Sistema | |
| 3 | op_tiempos | ¿Registran inicio/término y comparan con tiempo estándar? | OM | No · A veces · Sí, y se compara | |
| 3 | op_vivo | ¿La jefatura ve qué hace cada operario en tiempo real? | SN | — | |
| 3 | op_portal | Portal Operario (tareas, receta, tiempos, incidencias, foto) — utilidad | E5 | 1–5 | |
| 4 Recetas | rec_estand | ¿Recetas/fichas estandarizadas (gramaje, rendimiento, merma)? | OM | No · Algunas · Sí | |
| 4 | rec_auto | ¿El sistema calcula solo la MP necesaria según lo a producir? | OM | No · A veces · Sí | |
| 5 Inventario | i_saben | ¿Cómo saben cuánto stock tienen (MP y terminados)? | OM | No preciso · Visual · Papel/Excel · Sistema | |
| 5 | i_quiebre | ¿Quiebres de MP/insumos? | OM | Nunca · Ocasional · Semanal · Varias/sem · Diario | |
| 5 | i_minimo | ¿Stock mínimo por producto? | SN | — | |
| 5 | i_transf | ¿Transferencias entre plantas? | SN | — | **multi_planta** |
| 6 Lotes | lotes | ¿Manejan lotes (MP y/o producción)? | SN | — | |
| 6 | lt_tiempo | ¿Cuánto tarda en saber qué clientes recibieron un lote? | OM | Minutos · Horas · Días · No lo puedo saber | **lotes** |
| 7 Compras/Cal. | co_que | ¿Cómo saben qué comprar y cuánto? | OM | Visual · Experiencia · Papel/Excel · Stock mín. · Sistema | |
| 7 | co_flujo | Flujo "stock bajo → sugerencia → aprueba" — utilidad | E5 | 1–5 | |
| 7 | cal_control | ¿Controles de calidad en producción (pesos, temp., checklist)? | OM | No · Informal · Sí, con registros | |
| 7 | cal_papel | ¿Registros sanitarios en papel? | OM | Todo papel · Mixto · Digital | |
| 8 Merma/Mant. | m_registra | ¿Cómo registran las mermas? | OM | No · Papel · Excel · Sistema | |
| 8 | m_dinero | ¿Saben cuánto $ pierden al mes por merma? | OM | No · Estimado · Sí, con datos | |
| 8 | mt_perdida | ¿Saben cuánta producción/$ se pierde por máquina detenida? | SN | — | |
| 9 Pedidos/Desp. | v_canales | ¿Cómo ingresan los pedidos? | SM | WhatsApp · Correo · Vendedores · Web · Teléfono · Sistema | |
| 9 | v_errores | ¿Frecuencia de errores en pedidos? | OM | Nunca · Ocasional · Frecuente | |
| 9 | delivery | ¿Tienen reparto propio? | SN | — | |
| 9 | de_evidencia | En el despacho, ¿queda evidencia (foto/firma)? | OM | No · A veces · Sí | **delivery** |
| 10 Costos/Fin. | cs_real | ¿Conocen el costo real por producto (MP+envase+MO+merma)? | OM | No · Aproximado · Sí | |
| 10 | cs_margen | Si sube una MP, ¿saben al tiro qué productos pierden margen? | SN | — | |
| 10 | f_gana | ¿Cuánto tardan en saber si ganaron o perdieron el mes? | OM | Semanas · Cierre contable · Días · Casi en vivo | |
| 10 | f_producto | ¿Ven utilidad por producto/cliente? | OM | No · Con esfuerzo · Sí | |
| 11 Gerencia | vi_semana | Si no estuviera 1 semana, ¿qué necesitaría ver desde el teléfono? | LONG | — | |
| 11 | vi_ver | ¿Qué le gustaría ver en tiempo real? | SM | Producción · Tareas · Operarios/atrasos · Stock · Quiebres · Compras · Pedidos · Despachos · Merma · Fallas · Costos · Ventas · Caja · Alertas | |
| 12 Dolores | do_1 / do_1i | Dolor #1 + impacto (1–5) | TXT / E5 | — | |
| 12 | do_2, do_3 | Dolor #2 y #3 | TXT | — | |
| 13 Clave | k_tres | 3 problemas a eliminar mañana | LONG | — | |
| 13 | k_dinero | ¿Dónde pierde más dinero? | LONG | — | |
| 13 | k_tiempo | ¿Dónde pierde más tiempo? | LONG | — | |
| 13 | k_persona | ¿Qué parte depende demasiado de una persona? | LONG | — | |
| 13 | z_piloto | ¿Dispuesto a un piloto? | OM | Sí · Tal vez · No | |

> Preguntas efectivas ≈ 35 (menos si la fábrica tiene 1 planta / sin lotes / sin reparto propio). Cada pregunta se incluyó solo si puede **cambiar una decisión de producto**; las meramente descriptivas se dejaron fuera.
