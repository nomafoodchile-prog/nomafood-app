import type { OperativeArea } from "@/lib/operations";

export type SupplierProductPrice = {
  id: string;
  productName: string;
  unit: string;
  price: number;
  lastUpdated: string;
  minimumOrder: string;
  notes: string;
};

export type FactorySupplier = {
  id: string;
  name: string;
  rut: string;
  contactName: string;
  phone: string;
  email: string;
  address: string;
  commune: string;
  paymentTerms: string;
  deliveryDays: string;
  leadTime: string;
  category: string;
  notes: string;
  products: SupplierProductPrice[];
};

export type FactorySupplierForm = Omit<FactorySupplier, "id" | "products"> & {
  productName: string;
  productUnit: string;
  productPrice: number;
};

export type ValledorPrice = {
  id: string;
  week: string;
  productName: string;
  unit: string;
  price: number;
  supplier: string;
  quality: "Alta" | "Media" | "Oferta";
  notes: string;
};

export type ValledorPriceForm = Omit<ValledorPrice, "id">;

export type CleaningTask = {
  id: string;
  frequency: "Diaria" | "Semanal" | "Mensual";
  day: string;
  area: OperativeArea | "Bodega" | "Lavado" | "Sala venta";
  task: string;
  assignedTo: string;
  products: Array<{
    name: string;
    amount: string;
    instruction: string;
  }>;
  steps: string[];
  status: "Pendiente" | "En proceso" | "Completada";
};

export type CleaningScheduleType = "Diaria" | "Recurrente" | "Profunda";

export type CleaningScheduleStatus = "Programada" | "Asignada" | "Completada";

export type CleaningScheduleTask = {
  id: string;
  date: string;
  type: CleaningScheduleType;
  recurrence: string;
  area: OperativeArea | "Bodega" | "Lavado" | "Sala venta";
  task: string;
  assignedTo: string;
  estimatedMinutes: number;
  products: Array<{
    name: string;
    amount: string;
    instruction: string;
  }>;
  steps: string[];
  status: CleaningScheduleStatus;
  notes: string;
};

export type CleaningScheduleForm = Omit<CleaningScheduleTask, "id" | "products" | "steps"> & {
  productName: string;
  productAmount: string;
  productInstruction: string;
  stepsText: string;
};

export type MachineMaintenance = {
  id: string;
  machine: string;
  area: OperativeArea | "Bodega";
  frequency: "Semanal" | "Mensual" | "Trimestral";
  nextDate: string;
  responsible: string;
  task: string;
  steps: string[];
  status: "Programada" | "Pendiente repuesto" | "Realizada";
};

export type MachineMaintenanceFrequency = "Semanal" | "Quincenal" | "Mensual" | "Bimestral" | "Trimestral" | "Semestral" | "Anual";

export type MachineStatus = "Operativa" | "Requiere mantencion" | "Fuera de servicio";

export type MachineInventoryItem = {
  id: string;
  code: string;
  name: string;
  brand: string;
  model: string;
  serialNumber: string;
  area: OperativeArea | "Bodega" | "Lavado" | "Sala venta";
  location: string;
  purchaseDate: string;
  warrantyUntil: string;
  serviceProvider: string;
  providerContact: string;
  providerPhone: string;
  providerEmail: string;
  maintenanceFrequency: MachineMaintenanceFrequency;
  lastMaintenanceDate: string;
  nextMaintenanceDate: string;
  estimatedCost: number;
  responsible: string;
  status: MachineStatus;
  maintenanceTask: string;
  checklist: string[];
  notes: string;
};

export type MachineInventoryForm = Omit<MachineInventoryItem, "id" | "checklist"> & {
  checklistText: string;
};

export const initialFactorySuppliers: FactorySupplier[] = [
  {
    id: "sup-001",
    name: "Verde Origen SpA",
    rut: "76.455.210-8",
    contactName: "Natalia Pavez",
    phone: "+56 9 5512 4480",
    email: "ventas@verdeorigen.cl",
    address: "Camino Lo Echevers 2140",
    commune: "Quilicura",
    paymentTerms: "Transferencia 7 dias",
    deliveryDays: "Lunes, miercoles y viernes",
    leadTime: "24 horas",
    category: "Vegetales y tofu",
    notes: "Buen proveedor para tofu firme y verduras de proceso.",
    products: [
      {
        id: "spp-001",
        productName: "Tofu firme",
        unit: "kg",
        price: 3450,
        lastUpdated: "2026-06-17",
        minimumOrder: "20 kg",
        notes: "Caja refrigerada"
      },
      {
        id: "spp-002",
        productName: "Lechuga costina",
        unit: "unidad",
        price: 890,
        lastUpdated: "2026-06-18",
        minimumOrder: "30 unidades",
        notes: "Calidad alta"
      }
    ]
  },
  {
    id: "sup-002",
    name: "Distribuidora Andina",
    rut: "77.102.889-1",
    contactName: "Sergio Munoz",
    phone: "+56 9 6120 9001",
    email: "pedidos@andina.cl",
    address: "Av. Americo Vespucio 921",
    commune: "Pudahuel",
    paymentTerms: "Credito 15 dias",
    deliveryDays: "Martes y jueves",
    leadTime: "48 horas",
    category: "Secos y envases",
    notes: "Alternativa para envases compostables y arroz.",
    products: [
      {
        id: "spp-003",
        productName: "Bowl compostable 750 ml",
        unit: "unidad",
        price: 145,
        lastUpdated: "2026-06-14",
        minimumOrder: "500 unidades",
        notes: "Incluye tapa"
      },
      {
        id: "spp-004",
        productName: "Arroz grano corto",
        unit: "kg",
        price: 1260,
        lastUpdated: "2026-06-15",
        minimumOrder: "50 kg",
        notes: "Usado para gohan y sushi"
      }
    ]
  },
  {
    id: "sup-003",
    name: "Proteinas Sur",
    rut: "76.884.331-5",
    contactName: "Elena Rivas",
    phone: "+56 9 9011 2033",
    email: "comercial@proteinassur.cl",
    address: "Los Industriales 405",
    commune: "San Joaquin",
    paymentTerms: "Contado",
    deliveryDays: "Lunes a viernes",
    leadTime: "24 horas",
    category: "Proteinas vegetales",
    notes: "Mejor precio para seitan y proteina crispy.",
    products: [
      {
        id: "spp-005",
        productName: "Seitan laminado",
        unit: "kg",
        price: 4200,
        lastUpdated: "2026-06-16",
        minimumOrder: "15 kg",
        notes: "Formato refrigerado"
      },
      {
        id: "spp-006",
        productName: "Proteina vegetal crispy",
        unit: "kg",
        price: 4980,
        lastUpdated: "2026-06-16",
        minimumOrder: "10 kg",
        notes: "Para bowls y burgers"
      }
    ]
  }
];

export const emptyFactorySupplier: FactorySupplierForm = {
  name: "",
  rut: "",
  contactName: "",
  phone: "",
  email: "",
  address: "",
  commune: "",
  paymentTerms: "Transferencia",
  deliveryDays: "",
  leadTime: "",
  category: "",
  notes: "",
  productName: "",
  productUnit: "kg",
  productPrice: 0
};

export const initialValledorPrices: ValledorPrice[] = [
  {
    id: "val-001",
    week: "2026-W25",
    productName: "Lechuga escarola",
    unit: "unidad",
    price: 720,
    supplier: "Lo Valledor - Puesto 18",
    quality: "Alta",
    notes: "Buena hoja para lavado y sanitizado"
  },
  {
    id: "val-002",
    week: "2026-W25",
    productName: "Tomate larga vida",
    unit: "kg",
    price: 1180,
    supplier: "Lo Valledor - Puesto 42",
    quality: "Media",
    notes: "Usar en salsas y sandwiches"
  },
  {
    id: "val-003",
    week: "2026-W25",
    productName: "Palta hass",
    unit: "kg",
    price: 3890,
    supplier: "Lo Valledor - Puesto 7",
    quality: "Alta",
    notes: "Comprar madura parcial"
  },
  {
    id: "val-004",
    week: "2026-W25",
    productName: "Zanahoria",
    unit: "kg",
    price: 690,
    supplier: "Lo Valledor - Puesto 31",
    quality: "Oferta",
    notes: "Stockear para base de ensaladas"
  }
];

export const emptyValledorPrice: ValledorPriceForm = {
  week: "2026-W25",
  productName: "",
  unit: "kg",
  price: 0,
  supplier: "Lo Valledor",
  quality: "Media",
  notes: ""
};

export const cleaningTasks: CleaningTask[] = [
  {
    id: "clean-001",
    frequency: "Diaria",
    day: "Lunes a sabado",
    area: "Lavado",
    task: "Sanitizado de lechugas y hojas verdes",
    assignedTo: "Rodrigo Campos",
    products: [
      {
        name: "Sanitizante verduras",
        amount: "1 tapa de color",
        instruction: "Diluir en lava fondo full de agua fria"
      }
    ],
    steps: [
      "Llenar lava fondo con agua fria limpia.",
      "Agregar 1 tapa de color de sanitizante.",
      "Sumergir lechuga ya deshojada durante tiempo definido por ficha interna.",
      "Escurrir en bandeja sanitizada y rotular hora de proceso."
    ],
    status: "Pendiente"
  },
  {
    id: "clean-002",
    frequency: "Diaria",
    day: "Lunes a sabado",
    area: "Cocina caliente",
    task: "Cierre de mesones, tablas y utensilios",
    assignedTo: "Marisol Fuentes",
    products: [
      {
        name: "Detergente neutro",
        amount: "30 ml",
        instruction: "Diluir en 5 litros de agua"
      },
      {
        name: "Alcohol 70",
        amount: "Aplicacion directa",
        instruction: "Usar al final sobre superficie seca"
      }
    ],
    steps: [
      "Retirar residuos visibles.",
      "Lavar con detergente neutro diluido.",
      "Enjuagar y secar.",
      "Aplicar alcohol 70 y dejar evaporar."
    ],
    status: "En proceso"
  },
  {
    id: "clean-003",
    frequency: "Mensual",
    day: "Primer lunes del mes",
    area: "Bodega",
    task: "Limpieza profunda de estanterias secas",
    assignedTo: "Javier Rojas",
    products: [
      {
        name: "Limpiador multiuso",
        amount: "50 ml",
        instruction: "Diluir en 8 litros de agua"
      }
    ],
    steps: [
      "Retirar productos por seccion.",
      "Revisar vencimientos y lotes.",
      "Limpiar estanteria de arriba hacia abajo.",
      "Reubicar productos aplicando FIFO."
    ],
    status: "Pendiente"
  }
];

export const initialCleaningSchedule: CleaningScheduleTask[] = [
  {
    id: "clean-schedule-001",
    date: "2026-06-21",
    type: "Profunda",
    recurrence: "Mensual",
    area: "Cocina caliente",
    task: "Limpieza profunda de campanas de cocina",
    assignedTo: "Marisol Fuentes",
    estimatedMinutes: 75,
    products: [
      {
        name: "Desengrasante autorizado",
        amount: "80 ml",
        instruction: "Diluir en 5 litros de agua caliente"
      },
      {
        name: "Paños microfibra",
        amount: "3 unidades",
        instruction: "Usar paños separados para lavado, enjuague y secado"
      }
    ],
    steps: [
      "Apagar equipos cercanos y asegurar que no haya preparaciones expuestas.",
      "Retirar filtros de campana y dejar remojando con desengrasante diluido.",
      "Lavar interior y exterior de la campana de arriba hacia abajo.",
      "Enjuagar, secar, reinstalar filtros y registrar evidencia visual."
    ],
    status: "Asignada",
    notes: "Debe aparecer en ADT diario antes de iniciar cocina caliente."
  },
  {
    id: "clean-schedule-002",
    date: "2026-06-21",
    type: "Diaria",
    recurrence: "Lunes a sabado",
    area: "Lavado",
    task: "Sanitizado de lechugas y hojas verdes",
    assignedTo: "Rodrigo Campos",
    estimatedMinutes: 35,
    products: [
      {
        name: "Sanitizante verduras",
        amount: "1 tapa de color",
        instruction: "Diluir en lava fondo full de agua fria"
      }
    ],
    steps: [
      "Llenar lava fondo con agua fria limpia.",
      "Agregar 1 tapa de color de sanitizante.",
      "Sumergir hojas verdes segun ficha interna.",
      "Escurrir en bandeja sanitizada y rotular hora de proceso."
    ],
    status: "Asignada",
    notes: "Control diario de inocuidad."
  },
  {
    id: "clean-schedule-003",
    date: "2026-06-24",
    type: "Recurrente",
    recurrence: "Semanal",
    area: "Frio",
    task: "Limpieza de refrigerador de preparaciones",
    assignedTo: "Rodrigo Campos",
    estimatedMinutes: 45,
    products: [
      {
        name: "Limpiador multiuso",
        amount: "40 ml",
        instruction: "Diluir en 6 litros de agua"
      }
    ],
    steps: [
      "Trasladar preparaciones a frio auxiliar.",
      "Limpiar repisas, gomas y manillas.",
      "Revisar temperatura antes de reingresar productos.",
      "Registrar hora de inicio y termino."
    ],
    status: "Programada",
    notes: "Coordinar con produccion para no cortar cadena de frio."
  },
  {
    id: "clean-schedule-004",
    date: "2026-07-06",
    type: "Profunda",
    recurrence: "Mensual",
    area: "Bodega",
    task: "Limpieza profunda de estanterias secas",
    assignedTo: "Javier Rojas",
    estimatedMinutes: 90,
    products: [
      {
        name: "Limpiador multiuso",
        amount: "50 ml",
        instruction: "Diluir en 8 litros de agua"
      }
    ],
    steps: [
      "Retirar productos por seccion.",
      "Revisar vencimientos y lotes.",
      "Limpiar estanterias de arriba hacia abajo.",
      "Reubicar productos aplicando FIFO."
    ],
    status: "Programada",
    notes: "Programada para primer lunes del mes."
  }
];

export const emptyCleaningScheduleForm: CleaningScheduleForm = {
  date: "2026-06-21",
  type: "Diaria",
  recurrence: "Unica",
  area: "Cocina caliente",
  task: "",
  assignedTo: "",
  estimatedMinutes: 30,
  status: "Programada",
  notes: "",
  productName: "",
  productAmount: "",
  productInstruction: "",
  stepsText: ""
};

export const machineMaintenance: MachineMaintenance[] = [
  {
    id: "maint-001",
    machine: "Selladora al vacio",
    area: "Armado",
    frequency: "Semanal",
    nextDate: "2026-06-24",
    responsible: "Daniela Perez",
    task: "Revision de resistencia, sello y limpieza interna",
    steps: [
      "Desconectar maquina.",
      "Limpiar canal de sellado.",
      "Revisar resistencia y goma.",
      "Probar sello con bolsa de control."
    ],
    status: "Programada"
  },
  {
    id: "maint-002",
    machine: "Horno convector",
    area: "Panaderia",
    frequency: "Mensual",
    nextDate: "2026-06-28",
    responsible: "Nicolas Araya",
    task: "Limpieza profunda y control de temperatura",
    steps: [
      "Retirar bandejas y rejillas.",
      "Limpiar camara con producto autorizado.",
      "Revisar burletes.",
      "Registrar temperatura de prueba."
    ],
    status: "Programada"
  },
  {
    id: "maint-003",
    machine: "Refrigerador preparaciones",
    area: "Frio",
    frequency: "Mensual",
    nextDate: "2026-06-22",
    responsible: "Rodrigo Campos",
    task: "Control de temperatura y limpieza de gomas",
    steps: [
      "Registrar temperatura inicial.",
      "Limpiar gomas y manillas.",
      "Revisar cierre de puerta.",
      "Registrar temperatura posterior."
    ],
    status: "Pendiente repuesto"
  }
];

export const initialMachineInventory: MachineInventoryItem[] = [
  {
    id: "machine-001",
    code: "MAQ-HOR-001",
    name: "Horno convector industrial",
    brand: "Venancio",
    model: "FCDB10",
    serialNumber: "VC-2025-1180",
    area: "Panaderia",
    location: "Linea caliente / panaderia",
    purchaseDate: "2025-08-14",
    warrantyUntil: "2027-08-14",
    serviceProvider: "Tecnocalor SpA",
    providerContact: "Felipe Riquelme",
    providerPhone: "+56 9 5520 1188",
    providerEmail: "servicio@tecnocalor.cl",
    maintenanceFrequency: "Mensual",
    lastMaintenanceDate: "2026-05-28",
    nextMaintenanceDate: "2026-06-28",
    estimatedCost: 145000,
    responsible: "Nicolas Araya",
    status: "Operativa",
    maintenanceTask: "Limpieza profunda, control de temperatura y revision de burletes",
    checklist: [
      "Retirar bandejas y rejillas.",
      "Limpiar camara con producto autorizado.",
      "Revisar burletes, ventilador y resistencia.",
      "Registrar temperatura de prueba."
    ],
    notes: "Equipo critico para panaderia y productos horneados."
  },
  {
    id: "machine-002",
    code: "MAQ-SEL-002",
    name: "Selladora al vacio",
    brand: "Torrey",
    model: "EV-40",
    serialNumber: "TR-4066-22",
    area: "Armado",
    location: "Sala de armado",
    purchaseDate: "2025-11-05",
    warrantyUntil: "2026-11-05",
    serviceProvider: "Packaging Service Chile",
    providerContact: "Daniel Soto",
    providerPhone: "+56 9 6612 4400",
    providerEmail: "mantencion@packservice.cl",
    maintenanceFrequency: "Semanal",
    lastMaintenanceDate: "2026-06-17",
    nextMaintenanceDate: "2026-06-24",
    estimatedCost: 52000,
    responsible: "Daniela Perez",
    status: "Operativa",
    maintenanceTask: "Revision de resistencia, sello, goma y limpieza interna",
    checklist: [
      "Desconectar maquina.",
      "Limpiar canal de sellado.",
      "Revisar resistencia y goma.",
      "Probar sello con bolsa de control."
    ],
    notes: "Si falla, afecta armado de pedidos refrigerados."
  },
  {
    id: "machine-003",
    code: "MAQ-FRI-003",
    name: "Refrigerador preparaciones",
    brand: "Mimet",
    model: "R1400",
    serialNumber: "MMT-8891",
    area: "Frio",
    location: "Camara fria secundaria",
    purchaseDate: "2025-03-02",
    warrantyUntil: "2027-03-02",
    serviceProvider: "Frio Mantenciones Ltda.",
    providerContact: "Claudia Muñoz",
    providerPhone: "+56 9 7400 2210",
    providerEmail: "agenda@friomantenciones.cl",
    maintenanceFrequency: "Mensual",
    lastMaintenanceDate: "2026-05-22",
    nextMaintenanceDate: "2026-06-22",
    estimatedCost: 98000,
    responsible: "Rodrigo Campos",
    status: "Requiere mantencion",
    maintenanceTask: "Control de temperatura, limpieza de gomas y revision de cierre",
    checklist: [
      "Registrar temperatura inicial.",
      "Limpiar gomas, repisas y manillas.",
      "Revisar cierre de puerta.",
      "Registrar temperatura posterior."
    ],
    notes: "Agendar antes de aumentar volumen de preparaciones."
  }
];

export const emptyMachineInventoryForm: MachineInventoryForm = {
  code: "",
  name: "",
  brand: "",
  model: "",
  serialNumber: "",
  area: "Cocina caliente",
  location: "",
  purchaseDate: "2026-06-21",
  warrantyUntil: "2027-06-21",
  serviceProvider: "",
  providerContact: "",
  providerPhone: "",
  providerEmail: "",
  maintenanceFrequency: "Mensual",
  lastMaintenanceDate: "2026-06-21",
  nextMaintenanceDate: "2026-07-21",
  estimatedCost: 0,
  responsible: "",
  status: "Operativa",
  maintenanceTask: "",
  checklistText: "",
  notes: ""
};
