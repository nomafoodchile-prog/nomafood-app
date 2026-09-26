# INVENTORY_ARCHITECTURE — Inventario como fuente de verdad

> El inventario es el corazón operativo y la defensa contra overselling. Diseño robusto y multi-tenant (stock por `warehouse`, todo con `tenant_id`).

## 1. Estados de stock (por producto × bodega)

| Estado | Definición |
|---|---|
| **Físico (on_hand)** | Lo que hay realmente en la bodega |
| **Reservado (reserved)** | Comprometido a pedidos/producción aún no despachados |
| **En producción (in_production)** | Insumos consumidos / producto en proceso |
| **En tránsito (in_transit)** | En transferencia entre bodegas o por recibir |
| **Seguridad (safety)** | Colchón que no se ofrece a venta (configurable por producto) |
| **Disponible (available)** | **`available = on_hand − reserved − safety`** (lo único que se ofrece a venta) |

> La web/portal muestra **solo `available`**. Nunca `on_hand`.

## 2. Modelo de datos (conceptual)
- `stock_levels(tenant_id, product_id, warehouse_id, on_hand, reserved, safety)` — snapshot rápido.
- `stock_movements(tenant_id, product_id, warehouse_id, tipo, cantidad, ref_tipo, ref_id, lote_id?, ts, user_id)` — **libro mayor inmutable** (append-only) que es la verdad; los `stock_levels` se derivan/actualizan de forma atómica.
- `stock_reservations(tenant_id, product_id, warehouse_id, order_id, cantidad, estado, expira_at)`.
- `lots(tenant_id, product_id, warehouse_id, lote, vencimiento, cantidad)` para lotes/FEFO.

## 3. Operaciones y su efecto

| Operación | Efecto en stock |
|---|---|
| **Recepción** (compra) | on_hand ↑ (+ lote/vencimiento) |
| **Reserva** (pedido) | reserved ↑ (available ↓) — atómica |
| **Liberación** (cancelación/expira) | reserved ↓ |
| **Picking** | confirma reserva (marca ítems) |
| **Despacho** | on_hand ↓ y reserved ↓ (sale del inventario) |
| **Producción** | consume insumos (on_hand ↓ de MP) y genera terminado (on_hand ↑) |
| **Transferencia** | in_transit entre bodegas (origen ↓, destino ↑ al recibir) |
| **Devolución** | on_hand ↑ (según política/estado) |
| **Merma** | on_hand ↓ con motivo (auditado) |
| **Ajuste/Conteo** | on_hand ← valor contado, con diferencia auditada |

Todas escriben en `stock_movements` (trazabilidad total) y son **auditadas**.

## 4. Anti-overselling y condiciones de carrera (crítico)

**Problema:** dos clientes compran las últimas unidades al mismo tiempo.

**Diseño:**
1. La reserva se hace con una **operación atómica a nivel de BD** que decremente `available` **solo si hay suficiente**:
   ```sql
   UPDATE stock_levels
      SET reserved = reserved + :qty
    WHERE tenant_id = :t AND product_id = :p AND warehouse_id = :w
      AND (on_hand - reserved - safety) >= :qty
   RETURNING *;   -- si no afecta filas → no había disponible
   ```
   Al estar en una sola sentencia (o dentro de una transacción con `SELECT ... FOR UPDATE`), **no hay carrera**: solo uno gana las últimas unidades.
2. **Reservas con expiración** (`expira_at`): si el pedido no se paga/confirma en X minutos, un job libera la reserva (devuelve disponibilidad). Evita stock "colgado".
3. **Idempotencia**: reintentos del mismo pedido no reservan dos veces (clave idempotente por `order_id`).
4. **available calculado en servidor** en cada consulta de catálogo; nunca confiar en un número cacheado para decidir la venta.

## 5. Multi-bodega y multi-tenant
- Stock siempre a nivel `warehouse` (que pertenece a `branch`/`tenant`).
- `available` puede consolidarse por branch/tenant para mostrar, pero la **reserva** se hace contra una bodega concreta (según regla de asignación configurable).
- RLS por `tenant_id` en todas las tablas de stock.

## 6. Lotes y vencimientos
- Soporte **FEFO** (primero en vencer, primero en salir) configurable por producto.
- Alertas de vencimiento (Observability/Alertas).

## 7. Relación con hoy
Existen `inventario_lotes`/`inventario_movimientos`/`stock_reservations`. El diseño **formaliza los estados** y la **reserva atómica**; hay que verificar/robustecer la atomicidad actual (`REQUIERE CONFIRMACIÓN` de cómo se reserva hoy) — es un punto clave de la Phase 3.
