# PILOT_PLAN — Estrategia de pilotos y línea base (ROI)

> Validar antes de vender. Capturar métricas **antes** de las mejoras para demostrar ROI después.

## 1. Orden de pilotos
| # | Piloto | Objetivo |
|---|---|---|
| **1** | **Nuestra propia fábrica (NOMMA)** | Validar multi-tenant con "tenant 0" en operación real, sin riesgo comercial |
| **2** | **Empresa cercana / conocida** | Primer tenant externo controlado; feedback de confianza |
| **3** | **Restaurante o cafetería** | Validar perfiles de industria distintos (menos módulos) |
| **4** | **Otra fábrica** | Validar replicabilidad real del caso núcleo |

## 2. Métricas de línea base (medir ANTES de mejorar)
Capturar el estado actual para comparar:

| Métrica | Cómo medir |
|---|---|
| **Horas administrativas** (semana) | registro/estimación por rol |
| **Errores de pedidos** (% pedidos con error) | conteo sobre total |
| **Quiebres de stock** (frecuencia) | eventos de faltante |
| **Exactitud de inventario** (% conteo vs sistema) | conteos cíclicos |
| **Tiempo pedido → factura** | timestamp pedido vs emisión |
| **Tiempo de picking** por pedido | inicio/fin picking |
| **Cumplimiento de producción** (% plan vs real) | tandas planificadas vs producidas |
| **Entregas completas** (% OTIF) | entregas a tiempo y completas |
| **Retrasos** de despacho | prometido vs real |
| **Mermas** (% / valor) | registro de merma |
| **Tiempo gerencial** en reportes | estimación |
| **Uso real por módulo** | Observability (adopción por tenant/módulo) |

## 3. Cómo capturar la línea base
- **Antes** de activar mejoras, registrar 2–4 semanas de operación normal (manual + lo que el sistema ya loguea).
- Definir **cómo se mide cada métrica** y quién la reporta.
- Guardar snapshot inicial → comparar tras cada fase.

## 4. Criterios de éxito por piloto
- **Piloto 1 (NOMMA):** 0 fugas cross-tenant en tests; operación sin regresiones; mejora medible en ≥3 métricas.
- **Piloto 2:** onboarding **sin tocar código**; aislamiento probado; feedback positivo de usabilidad.
- **Piloto 3:** perfil de industria distinto funciona solo con configuración.
- **Piloto 4:** replicación en < X días de onboarding.

## 5. Aprendizaje → producto
Cada piloto alimenta: plantillas de industria, catálogo de configuración, backlog. **Regla:** si un piloto pide algo específico, se resuelve **genérico** (config/módulo), nunca con código a medida (CONFIGURATION_ENGINE §6).
