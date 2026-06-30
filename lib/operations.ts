import type { Product } from "@/lib/types";

export type OperativeArea = "Cocina caliente" | "Frio" | "Panaderia" | "Armado" | "Despacho";

export type UserAccount = {
  id: string;
  name: string;
  email: string;
  role: string;
  operativeId?: string;
  active: boolean;
};

export type Operator = {
  id: string;
  name: string;
  area: OperativeArea;
  shift: string;
};

export type Customer = {
  id: string;
  name: string;
  channel: "B2B" | "Retail" | "Eventos";
  address: string;
  contact: string;
  phone: string;
};

export type ProductionItemType = "Materia prima" | "Envase" | "Preelaboracion" | "Producto terminado";

export type RecipeIngredient = {
  itemId: string;
  itemName: string;
  quantity: number;
  unit: string;
  stage: "Premezcla" | "Preelaboracion" | "Montaje" | "Envase";
  availableStock: number;
};

export type RecipeStep = {
  order: number;
  area: OperativeArea;
  title: string;
  detail: string;
  minutes: number;
  assignedRole: string;
};

export type Recipe = {
  id: string;
  productId: string;
  productName: string;
  yieldQuantity: number;
  yieldUnit: string;
  area: OperativeArea;
  preparationMinutes: number;
  ingredients: RecipeIngredient[];
  steps: RecipeStep[];
};

export type OrderLine = {
  productId: string;
  productName: string;
  quantity: number;
  unit: string;
};

export type Order = {
  id: string;
  code: string;
  customerId: string;
  customerName: string;
  status: "Confirmado" | "Reservado" | "En produccion" | "Armado" | "Despachado";
  deliveryDate: string;
  lines: OrderLine[];
};

export type StockShortage = {
  itemId: string;
  itemName: string;
  required: number;
  available: number;
  missing: number;
  unit: string;
  sourceOrder: string;
};

export type ProductionOrder = {
  id: string;
  code: string;
  orderId: string;
  productName: string;
  quantity: number;
  unit: string;
  area: OperativeArea;
  status: "Pendiente" | "En proceso" | "Completada";
  dueDate: string;
};

export type DailyTask = {
  id: string;
  date: string;
  operatorId: string;
  operatorName: string;
  area: OperativeArea;
  task: string;
  detail: string;
  recipeId?: string;
  status: "Pendiente" | "En proceso" | "Lista";
  estimatedMinutes: number;
};

export type PickingTask = {
  id: string;
  orderId: string;
  customerName: string;
  basketCode: string;
  checklist: Array<{ label: string; done: boolean }>;
  status: "Pendiente" | "En armado" | "Listo";
};

export type Dispatch = {
  id: string;
  orderId: string;
  customerName: string;
  driverName: string;
  route: string;
  status: "Programado" | "En ruta" | "Entregado";
  evidence: string;
};

export type OperationsDatabase = {
  users: UserAccount[];
  operators: Operator[];
  customers: Customer[];
  catalogItems: Array<{
    id: string;
    name: string;
    type: ProductionItemType;
    unit: string;
    stock: number;
    minimumStock: number;
  }>;
  recipes: Recipe[];
  orders: Order[];
  shortages: StockShortage[];
  productionOrders: ProductionOrder[];
  dailyTasks: DailyTask[];
  pickingTasks: PickingTask[];
  dispatches: Dispatch[];
};

export const operationsDemo: OperationsDatabase = {
  users: [
    {
      id: "usr-001",
      name: "Valentina Morales",
      email: "gerencia@nomafood.cl",
      role: "Gerencia",
      active: true
    },
    {
      id: "usr-002",
      name: "Camila Soto",
      email: "admin@nomafood.cl",
      role: "Administracion",
      active: true
    },
    {
      id: "usr-003",
      name: "Javier Rojas",
      email: "produccion@nomafood.cl",
      role: "Encargado produccion",
      active: true
    },
    {
      id: "usr-004",
      name: "Daniela Perez",
      email: "armado@nomafood.cl",
      role: "Armado",
      operativeId: "op-004",
      active: true
    }
  ],
  operators: [
    { id: "op-001", name: "Marisol Fuentes", area: "Cocina caliente", shift: "07:00-15:00" },
    { id: "op-002", name: "Rodrigo Campos", area: "Frio", shift: "07:00-15:00" },
    { id: "op-003", name: "Nicolas Araya", area: "Panaderia", shift: "08:00-16:00" },
    { id: "op-004", name: "Daniela Perez", area: "Armado", shift: "09:00-17:00" },
    { id: "op-005", name: "Hector Silva", area: "Despacho", shift: "10:00-18:00" }
  ],
  customers: [
    {
      id: "cli-001",
      name: "Clinica Santa Emilia",
      channel: "B2B",
      address: "Av. Providencia 1800, Santiago",
      contact: "Paula Herrera",
      phone: "+56 9 4422 1100"
    },
    {
      id: "cli-002",
      name: "Cafe Raiz",
      channel: "Retail",
      address: "Italia 1320, Nunoa",
      contact: "Martin Leiva",
      phone: "+56 9 7718 2030"
    },
    {
      id: "cli-003",
      name: "Evento Green Summit",
      channel: "Eventos",
      address: "Centro Parque, Las Condes",
      contact: "Antonia Vidal",
      phone: "+56 9 6621 8840"
    }
  ],
  catalogItems: [
    { id: "prod-001", name: "Harina integral", type: "Materia prima", unit: "kg", stock: 28, minimumStock: 25 },
    { id: "prod-002", name: "Tofu firme", type: "Materia prima", unit: "kg", stock: 8, minimumStock: 12 },
    { id: "prod-004", name: "Bowl compostable 750 ml", type: "Envase", unit: "unidad", stock: 420, minimumStock: 300 },
    { id: "prod-005", name: "Salsa de tomate base", type: "Preelaboracion", unit: "lt", stock: 18, minimumStock: 20 },
    { id: "pt-001", name: "Lasagna vegana individual", type: "Producto terminado", unit: "unidad", stock: 36, minimumStock: 40 },
    { id: "pt-002", name: "Bowl thai tofu", type: "Producto terminado", unit: "unidad", stock: 22, minimumStock: 30 },
    { id: "pt-003", name: "Focaccia integral", type: "Producto terminado", unit: "unidad", stock: 48, minimumStock: 40 }
  ],
  recipes: [
    {
      id: "rec-001",
      productId: "pt-001",
      productName: "Lasagna vegana individual",
      yieldQuantity: 24,
      yieldUnit: "unidad",
      area: "Cocina caliente",
      preparationMinutes: 150,
      ingredients: [
        {
          itemId: "prod-005",
          itemName: "Salsa de tomate base",
          quantity: 8,
          unit: "lt",
          stage: "Preelaboracion",
          availableStock: 18
        },
        {
          itemId: "prod-002",
          itemName: "Tofu firme",
          quantity: 4,
          unit: "kg",
          stage: "Premezcla",
          availableStock: 8
        },
        {
          itemId: "prod-004",
          itemName: "Bowl compostable 750 ml",
          quantity: 24,
          unit: "unidad",
          stage: "Envase",
          availableStock: 420
        }
      ],
      steps: [
        {
          order: 1,
          area: "Cocina caliente",
          title: "Sanitizar puesto y mise en place",
          detail: "Preparar bandejas, utensilios, etiquetas de lote y controlar temperatura de insumos refrigerados.",
          minutes: 15,
          assignedRole: "Operario cocina"
        },
        {
          order: 2,
          area: "Cocina caliente",
          title: "Dosificar preelaboraciones",
          detail: "Usar 8 lt de salsa base y 4 kg de tofu por batch de 24 unidades. Registrar lote de salsa y tofu.",
          minutes: 35,
          assignedRole: "Operario cocina"
        },
        {
          order: 3,
          area: "Cocina caliente",
          title: "Montar lasanas por unidad",
          detail: "Armar 24 bowls por batch, controlar gramaje visual y evitar mezclar lotes.",
          minutes: 55,
          assignedRole: "Operario cocina"
        },
        {
          order: 4,
          area: "Armado",
          title: "Etiquetar y liberar producto terminado",
          detail: "Etiquetar con cliente, fecha, lote y conservar en camara segun ruta de despacho.",
          minutes: 45,
          assignedRole: "Armado"
        }
      ]
    },
    {
      id: "rec-002",
      productId: "pt-002",
      productName: "Bowl thai tofu",
      yieldQuantity: 30,
      yieldUnit: "unidad",
      area: "Frio",
      preparationMinutes: 110,
      ingredients: [
        {
          itemId: "prod-002",
          itemName: "Tofu firme",
          quantity: 6,
          unit: "kg",
          stage: "Premezcla",
          availableStock: 8
        },
        {
          itemId: "prod-004",
          itemName: "Bowl compostable 750 ml",
          quantity: 30,
          unit: "unidad",
          stage: "Envase",
          availableStock: 420
        }
      ],
      steps: [
        {
          order: 1,
          area: "Frio",
          title: "Preparar base fria",
          detail: "Retirar tofu firme, controlar vencimiento y cortar segun ficha tecnica.",
          minutes: 30,
          assignedRole: "Operario frio"
        },
        {
          order: 2,
          area: "Frio",
          title: "Mezclar componentes",
          detail: "Dosificar tofu y vegetales por bowl, mantener cadena de frio y registrar lote.",
          minutes: 45,
          assignedRole: "Operario frio"
        },
        {
          order: 3,
          area: "Armado",
          title: "Cerrar, etiquetar y ordenar por cliente",
          detail: "Cerrar bowls, pegar etiqueta, separar por cesta y validar checklist de despacho.",
          minutes: 35,
          assignedRole: "Armado"
        }
      ]
    }
  ],
  orders: [
    {
      id: "ord-001",
      code: "PED-1024",
      customerId: "cli-001",
      customerName: "Clinica Santa Emilia",
      status: "Confirmado",
      deliveryDate: "2026-06-21",
      lines: [
        { productId: "pt-001", productName: "Lasagna vegana individual", quantity: 60, unit: "unidad" },
        { productId: "pt-003", productName: "Focaccia integral", quantity: 35, unit: "unidad" }
      ]
    },
    {
      id: "ord-002",
      code: "PED-1025",
      customerId: "cli-002",
      customerName: "Cafe Raiz",
      status: "Reservado",
      deliveryDate: "2026-06-21",
      lines: [{ productId: "pt-002", productName: "Bowl thai tofu", quantity: 42, unit: "unidad" }]
    },
    {
      id: "ord-003",
      code: "PED-1026",
      customerId: "cli-003",
      customerName: "Evento Green Summit",
      status: "En produccion",
      deliveryDate: "2026-06-22",
      lines: [
        { productId: "pt-001", productName: "Lasagna vegana individual", quantity: 80, unit: "unidad" },
        { productId: "pt-002", productName: "Bowl thai tofu", quantity: 80, unit: "unidad" }
      ]
    }
  ],
  shortages: [
    {
      itemId: "pt-001",
      itemName: "Lasagna vegana individual",
      required: 140,
      available: 36,
      missing: 104,
      unit: "unidad",
      sourceOrder: "PED-1024 / PED-1026"
    },
    {
      itemId: "pt-002",
      itemName: "Bowl thai tofu",
      required: 122,
      available: 22,
      missing: 100,
      unit: "unidad",
      sourceOrder: "PED-1025 / PED-1026"
    },
    {
      itemId: "prod-002",
      itemName: "Tofu firme",
      required: 26,
      available: 8,
      missing: 18,
      unit: "kg",
      sourceOrder: "Produccion sugerida"
    }
  ],
  productionOrders: [
    {
      id: "oprod-001",
      code: "OP-2201",
      orderId: "ord-001",
      productName: "Lasagna vegana individual",
      quantity: 120,
      unit: "unidad",
      area: "Cocina caliente",
      status: "Pendiente",
      dueDate: "2026-06-20"
    },
    {
      id: "oprod-002",
      code: "OP-2202",
      orderId: "ord-002",
      productName: "Bowl thai tofu",
      quantity: 120,
      unit: "unidad",
      area: "Frio",
      status: "En proceso",
      dueDate: "2026-06-20"
    }
  ],
  dailyTasks: [
    {
      id: "adt-001",
      date: "2026-06-20",
      operatorId: "op-001",
      operatorName: "Marisol Fuentes",
      area: "Cocina caliente",
      task: "Lasagna vegana: ejecutar pasos 1 a 3 de receta REC-001",
      detail: "Produccion requerida: 120 unidades. Rinde 24 por batch: preparar 5 batches. Verificar 40 lt salsa base, 20 kg tofu y 120 envases antes de iniciar.",
      recipeId: "rec-001",
      status: "Pendiente",
      estimatedMinutes: 300
    },
    {
      id: "adt-002",
      date: "2026-06-20",
      operatorId: "op-002",
      operatorName: "Rodrigo Campos",
      area: "Frio",
      task: "Bowl thai tofu: preparar base fria y mezcla",
      detail: "Produccion requerida: 120 unidades. Rinde 30 por batch: preparar 4 batches. Revisar disponibilidad de tofu antes de liberar.",
      recipeId: "rec-002",
      status: "En proceso",
      estimatedMinutes: 220
    },
    {
      id: "adt-003",
      date: "2026-06-20",
      operatorId: "op-004",
      operatorName: "Daniela Perez",
      area: "Armado",
      task: "Armado: separar cestas por cliente y validar checklist",
      detail: "Priorizar Clinica Santa Emilia CSE-01 y Cafe Raiz CR-01. No despachar sin etiqueta, lote y conteo final.",
      status: "Pendiente",
      estimatedMinutes: 160
    }
  ],
  pickingTasks: [
    {
      id: "pick-001",
      orderId: "ord-001",
      customerName: "Clinica Santa Emilia",
      basketCode: "CSE-01",
      checklist: [
        { label: "60 lasagnas", done: false },
        { label: "35 focaccias", done: true },
        { label: "Etiquetas cliente", done: true }
      ],
      status: "En armado"
    },
    {
      id: "pick-002",
      orderId: "ord-002",
      customerName: "Cafe Raiz",
      basketCode: "CR-01",
      checklist: [
        { label: "42 bowls thai", done: false },
        { label: "Salsas y cubiertos", done: false }
      ],
      status: "Pendiente"
    }
  ],
  dispatches: [
    {
      id: "des-001",
      orderId: "ord-001",
      customerName: "Clinica Santa Emilia",
      driverName: "Hector Silva",
      route: "Ruta Oriente 1",
      status: "Programado",
      evidence: "Pendiente foto entrega"
    },
    {
      id: "des-002",
      orderId: "ord-002",
      customerName: "Cafe Raiz",
      driverName: "Hector Silva",
      route: "Ruta Nunoa",
      status: "Programado",
      evidence: "Pendiente firma cliente"
    }
  ]
};

export function buildOperationsDatabase(products: Product[]): OperationsDatabase {
  const productItems = products.map((product) => ({
    id: product.id,
    name: product.name,
    type:
      product.category === "Packaging y envases"
        ? ("Envase" as const)
        : product.category === "Preelaboraciones"
          ? ("Preelaboracion" as const)
          : ("Materia prima" as const),
    unit: product.unit,
    stock: product.currentStock,
    minimumStock: product.minimumStock
  }));

  return {
    ...operationsDemo,
    catalogItems: [
      ...productItems,
      ...operationsDemo.catalogItems.filter((item) => item.type === "Producto terminado")
    ]
  };
}

