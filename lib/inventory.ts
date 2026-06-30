import type {
  InventoryAlert,
  Movement,
  MovementType,
  Product
} from "@/lib/types";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function currency(value: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0
  }).format(value);
}

export function formatDate(value: string) {
  if (!value) return "Sin vencimiento";
  return new Intl.DateTimeFormat("es-CL", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(`${value}T00:00:00`));
}

export function daysUntil(dateValue: string, today = new Date()) {
  if (!dateValue) return null;
  const expiration = new Date(`${dateValue}T00:00:00`);
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.ceil((expiration.getTime() - start.getTime()) / MS_PER_DAY);
}

export function movementDelta(type: MovementType, quantity: number) {
  if (type === "Entrada") return Math.abs(quantity);
  if (type === "Salida" || type === "Merma" || type === "Vencido") {
    return -Math.abs(quantity);
  }
  if (type === "Ajuste") return quantity;
  return 0;
}

export function applyMovement(products: Product[], movement: Movement) {
  return products.map((product) => {
    if (product.id !== movement.productId) return product;

    const nextStock = Math.max(
      0,
      product.currentStock + movementDelta(movement.type, movement.quantity)
    );

    return {
      ...product,
      currentStock: nextStock
    };
  });
}

export function buildAlerts(products: Product[], today = new Date()): InventoryAlert[] {
  return products.flatMap((product) => {
    const alerts: InventoryAlert[] = [];
    const remainingDays = daysUntil(product.expiration, today);

    if (product.currentStock <= 0) {
      alerts.push({
        id: `${product.id}-agotado`,
        title: "Producto agotado",
        detail: `${product.name} no tiene stock disponible.`,
        level: "critica",
        productId: product.id
      });
    } else if (product.currentStock <= product.minimumStock) {
      alerts.push({
        id: `${product.id}-stock-bajo`,
        title: "Stock bajo",
        detail: `${product.name} esta en ${product.currentStock} ${product.unit}; minimo ${product.minimumStock}.`,
        level: "alta",
        productId: product.id
      });
    }

    if (remainingDays !== null) {
      if (remainingDays < 0) {
        alerts.push({
          id: `${product.id}-vencido`,
          title: "Producto vencido",
          detail: `${product.name} vencio el ${formatDate(product.expiration)}.`,
          level: "critica",
          productId: product.id
        });
      } else if ([30, 15, 7].includes(remainingDays) || remainingDays <= 7) {
        alerts.push({
          id: `${product.id}-vence-${remainingDays}`,
          title: "Proximo a vencer",
          detail: `${product.name} vence en ${remainingDays} dias.`,
          level: remainingDays <= 7 ? "alta" : "media",
          productId: product.id
        });
      }
    }

    return alerts;
  });
}

export function inventoryValue(products: Product[]) {
  return products.reduce(
    (total, product) => total + product.currentStock * product.cost,
    0
  );
}

export function uniqueSorted(values: string[]) {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) =>
    a.localeCompare(b, "es")
  );
}
