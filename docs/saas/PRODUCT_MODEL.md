# PRODUCT_MODEL — Modelo de producto SaaS

> Estructura conceptual del producto y los planes. **Sin precios** (a definir). Enlaza módulos (MODULE_ARCHITECTURE) con comercialización.

## 1. Planes (por capacidades, no por precio)

| Plan | Enfoque | Módulos/capacidades (además de CORE) |
|---|---|---|
| **BASE** | Empezar a ordenar la operación | Productos, Inventario/Bodegas, Compras, Clientes/Pedidos básicos, Dashboard, Auditoría |
| **PROFESIONAL** | PYME que vende y produce | BASE + Recetas, Producción, Portal mayorista, Listas de precio, Picking/Despacho, Portal chofer |
| **OPERACIONES** | Operación completa | PROFESIONAL + Finanzas (Caja/CxC/CxP/EERR/Costos), Mantención, Limpieza, RRHH/Asistencia, Campañas |
| **EMPRESA** | Multi-entidad / avanzado | OPERACIONES + Facturación DTE, Multi-company, Integration Hub avanzado (bancos/POS/ecommerce), Observabilidad/SLA, Agente IA |

## 2. Ejes de dimensionamiento (límites por plan)
- **Sucursales** y **bodegas** incluidas.
- **Usuarios** incluidos (+ costo por usuario adicional).
- **Módulos** activos.
- **Almacenamiento** (archivos/evidencias).
- **Integraciones** habilitadas.
- **Volumen transaccional** (pedidos/facturas/mes).

## 3. Regla anti-abuso de licencias
> El modelo **no debe incentivar compartir usuarios**. Diseño:
- Cada persona = **un usuario nominal** (auditoría por usuario lo requiere igual).
- Precio por usuario **razonable** + **usuarios operativos** (operario/chofer/picker) en una categoría más económica que los administrativos, para no empujar a compartir cuentas.
- Sesiones concurrentes por usuario limitadas/auditadas; detección de uso compartido.
- El valor por **módulos/volumen/entidades**, no por escasez artificial de usuarios.

## 4. Relación módulo → plan
Los planes son **conjuntos de módulos + límites** expresados como **datos** (`plans`, `plan_modules`, `plan_limits`). Cambiar un plan = configuración, no código. Un tenant puede tener **add-ons** (p.ej. DTE) sobre su plan base.

## 5. Consideraciones
- **Trial / marcha blanca** ya existe como concepto (switch actual).
- **Facturación del SaaS** (cobro a los tenants) es un sistema aparte del DTE de los clientes; puede apoyarse en el mismo Integration Hub (pagos) — fase de escalamiento.
