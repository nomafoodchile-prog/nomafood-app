import type { InventoryBrain, Movement, Product } from "@/lib/types";

export const initialBrain: InventoryBrain = {
  categories: [
    "Materias primas secas",
    "Refrigerados",
    "Congelados",
    "Frutas y verduras",
    "Proteinas vegetales",
    "Preelaboraciones",
    "Panaderia",
    "Pasteleria",
    "Condimentos y salsas",
    "Packaging y envases",
    "Limpieza y sanitizacion",
    "EPP y operacion",
    "Otros"
  ],
  subcategories: [
    "Harinas",
    "Legumbres",
    "Verduras frescas",
    "Salsas base",
    "Envases compostables",
    "Quimicos limpieza"
  ],
  suppliers: [
    "Distribuidora Central",
    "Campo Vivo",
    "Veggie Proteins",
    "Packaging Sur",
    "NOMA FOOD"
  ],
  locations: [
    "Bodega seca",
    "Camara refrigerada",
    "Camara congelada",
    "Produccion",
    "Zona despacho"
  ],
  units: ["kg", "g", "lt", "ml", "unidad", "caja", "bolsa"],
  responsibles: ["Camila Soto", "Javier Rojas", "Equipo Produccion", "Administrador"]
};

export const initialProducts: Product[] = [
  {
    id: "prod-001",
    code: "NF-MP-001",
    name: "Harina integral",
    category: "Materias primas secas",
    subcategory: "Harinas",
    unit: "kg",
    currentStock: 28,
    minimumStock: 25,
    location: "Bodega seca",
    supplier: "Distribuidora Central",
    cost: 1250,
    batch: "HI-2406-A",
    expiration: "2026-07-04",
    notes: "Saco abierto en uso."
  },
  {
    id: "prod-002",
    code: "NF-REF-014",
    name: "Tofu firme",
    category: "Proteinas vegetales",
    subcategory: "Legumbres",
    unit: "kg",
    currentStock: 8,
    minimumStock: 12,
    location: "Camara refrigerada",
    supplier: "Veggie Proteins",
    cost: 3400,
    batch: "TF-0716",
    expiration: "2026-06-26",
    notes: "Priorizar en produccion semanal."
  },
  {
    id: "prod-003",
    code: "NF-FV-021",
    name: "Tomate pera",
    category: "Frutas y verduras",
    subcategory: "Verduras frescas",
    unit: "kg",
    currentStock: 0,
    minimumStock: 15,
    location: "Camara refrigerada",
    supplier: "Campo Vivo",
    cost: 980,
    batch: "TP-1906",
    expiration: "2026-06-18",
    notes: "Producto vencido, revisar merma."
  },
  {
    id: "prod-004",
    code: "NF-PKG-006",
    name: "Bowl compostable 750 ml",
    category: "Packaging y envases",
    subcategory: "Envases compostables",
    unit: "unidad",
    currentStock: 420,
    minimumStock: 300,
    location: "Bodega seca",
    supplier: "Packaging Sur",
    cost: 145,
    batch: "BC-750-09",
    expiration: "",
    notes: "Sin vencimiento."
  },
  {
    id: "prod-005",
    code: "NF-SAL-002",
    name: "Salsa de tomate base",
    category: "Preelaboraciones",
    subcategory: "Salsas base",
    unit: "lt",
    currentStock: 18,
    minimumStock: 20,
    location: "Produccion",
    supplier: "NOMA FOOD",
    cost: 2100,
    batch: "STB-2206",
    expiration: "2026-07-18",
    notes: "Rotar antes de abrir nuevo lote."
  }
];

export const initialMovements: Movement[] = [
  {
    id: "mov-001",
    date: "2026-06-19",
    type: "Entrada",
    productId: "prod-001",
    productName: "Harina integral",
    quantity: 20,
    responsible: "Javier Rojas",
    sourceDestination: "Distribuidora Central",
    notes: "Recepcion parcial OC-154."
  },
  {
    id: "mov-002",
    date: "2026-06-19",
    type: "Salida",
    productId: "prod-002",
    productName: "Tofu firme",
    quantity: 6,
    responsible: "Equipo Produccion",
    sourceDestination: "Linea produccion",
    notes: "Batch menu semanal."
  },
  {
    id: "mov-003",
    date: "2026-06-18",
    type: "Merma",
    productId: "prod-003",
    productName: "Tomate pera",
    quantity: 5,
    responsible: "Camila Soto",
    sourceDestination: "Control calidad",
    notes: "Golpes y sobremaduracion."
  }
];

