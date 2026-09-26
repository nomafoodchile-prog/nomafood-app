# AI_SECURITY — Seguridad del futuro agente de IA (AI System Architect)

> Principios obligatorios para el futuro agente de IA que operará dentro de la plataforma multiempresa. **Aún no existe**; este documento fija sus reglas antes de construirlo.

## 1. Principios innegociables
1. **Tenant isolation absoluto:** un agente que trabaja para Empresa A **jamás** accede a datos de Empresa B — ni BD, ni archivos, ni memoria, ni embeddings/vectores, ni conversaciones, ni configuraciones, ni prompts específicos de otro cliente.
2. **Least privilege:** el agente recibe solo los permisos del **rol y tenant** del usuario que lo invoca. Nunca usa service-role global.
3. **Data minimization:** solo se le entrega el contexto mínimo necesario para la tarea.
4. **Auditoría:** toda acción del agente se registra (usuario, tenant, acción, datos tocados, resultado).
5. **Human-in-the-loop** para acciones críticas (finanzas, borrados, cambios de config, envíos externos).

## 2. Cómo imponer el aislamiento (RAG multi-tenant seguro)

```
Usuario (tenant A, rol X)
   │  (JWT con tenant_id)
   ▼
Orquestador del agente  ──►  SIEMPRE inyecta tenant_id + rol en cada consulta
   │
   ├─ Recuperación (RAG):
   │    - Vector store PARTICIONADO por tenant (namespace/colección por tenant_id,
   │      idealmente instancia lógica separada). Todo query filtra por tenant_id.
   │    - Nunca un índice global compartido entre empresas.
   │
   ├─ Acceso a BD: vía las MISMAS RLS por tenant (no service-role).
   │
   └─ Herramientas/acciones: cada tool valida tenant + permiso antes de ejecutar.
```

**Reglas del vector store / embeddings:**
- Cada documento vectorizado lleva `tenant_id` como metadato **obligatorio**; toda búsqueda aplica el filtro. Preferible **namespace físico por tenant**.
- Los embeddings de una empresa **no** se mezclan en el mismo índice sin partición dura.
- Al desactivar un tenant, sus vectores/documentos se **purgan**.

**Memoria del agente:**
- Memoria conversacional y de largo plazo **por (tenant, usuario)**. Nunca memoria global que cruce empresas.

## 3. Qué puede y qué NO puede salir a proveedores externos de IA

| Puede enviarse (con cuidado) | NO debe enviarse a un LLM externo |
|---|---|
| Texto de la tarea del usuario | Secretos/credenciales (claves, tokens) |
| Datos mínimos del **propio** tenant necesarios para la tarea | Datos de **otro** tenant (siempre) |
| Metadatos no sensibles | **Recetas/formulaciones y costos** salvo consentimiento explícito del cliente |
| | Datos personales/financieros sin base legal y minimización |
| | PII de trabajadores/clientes sin necesidad real |

**Decisiones de diseño:**
- Preferir **procesamiento server-side** y, para datos ultra-sensibles, **modelos con acuerdo de no-retención** o despliegue privado.
- **Redacción/masking** de PII y secretos antes de enviar contexto a un proveedor.
- Registrar qué se envió a qué proveedor (trazabilidad).
- Contrato con el proveedor: **no entrenamiento con los datos**, retención mínima, residencia. ⚖️ (revisión legal).

## 4. Amenazas específicas de IA
- **Prompt injection** desde datos del cliente (un pedido/nota malicioso que instruye al agente): tratar todo dato de BD/usuario como **no confiable**; el agente no obedece instrucciones embebidas en datos.
- **Exfiltración cross-tenant** por herramienta mal filtrada: cada tool valida tenant.
- **Fuga por logs/telemetría**: no loguear PII/secretos en claro.

## 5. Requisito de aceptación
> Antes de conectar el agente a datos reales: **tests de aislamiento del agente** (A no puede recuperar nada de B por ningún canal: BD, RAG, memoria, archivos) + revisión de qué sale a proveedores externos. Sin esto, el agente no se habilita.
