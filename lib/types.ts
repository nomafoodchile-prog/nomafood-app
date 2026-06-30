export type Role =
  | "Gerencia"
  | "Administracion"
  | "EncargadoProduccion"
  | "Operario"
  | "Armado"
  | "Chofer";

export type MovementType =
  | "Entrada"
  | "Salida"
  | "Merma"
  | "Vencido"
  | "Ajuste"
  | "Traslado";

export type Product = {
  id: string;
  code: string;
  name: string;
  category: string;
  subcategory: string;
  unit: string;
  currentStock: number;
  minimumStock: number;
  location: string;
  supplier: string;
  cost: number;
  batch: string;
  expiration: string;
  notes: string;
};

export type Movement = {
  id: string;
  date: string;
  type: MovementType;
  productId: string;
  productName: string;
  quantity: number;
  responsible: string;
  sourceDestination: string;
  notes: string;
};

export type InventoryBrain = {
  categories: string[];
  subcategories: string[];
  suppliers: string[];
  locations: string[];
  units: string[];
  responsibles: string[];
};

export type AlertLevel = "critica" | "alta" | "media" | "baja";

export type InventoryAlert = {
  id: string;
  title: string;
  detail: string;
  level: AlertLevel;
  productId: string;
};

export type ProductForm = Omit<Product, "id">;

export type MovementForm = Omit<Movement, "id" | "productName">;
