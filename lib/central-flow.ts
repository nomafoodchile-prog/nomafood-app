export type CentralFlowStatus = "Listo" | "Preparado" | "Pendiente";

export type CentralFlowStep = {
  id: string;
  title: string;
  owner: string;
  source: string;
  result: string;
  status: CentralFlowStatus;
};

export type IntegrationEvent = {
  id: string;
  date: string;
  event: string;
  origin: string;
  target: string;
  status: CentralFlowStatus;
};

export const centralFlowSteps: CentralFlowStep[] = [
  {
    id: "flow-001",
    title: "Pedido mayorista confirmado",
    owner: "Comercial",
    source: "Portal Mayorista",
    result: "Pedido creado en Operaciones con cliente, productos, precios y despacho.",
    status: "Preparado"
  },
  {
    id: "flow-002",
    title: "Pago o credito validado",
    owner: "Finanzas",
    source: "Pasarela / reglas de credito",
    result: "Ingreso en Caja o cuenta por cobrar en Cobranza sin duplicar pagos.",
    status: "Pendiente"
  },
  {
    id: "flow-003",
    title: "Reserva de stock y faltantes",
    owner: "Bodega",
    source: "Inventario",
    result: "Stock reservado, faltantes calculados y solicitud de compra sugerida.",
    status: "Preparado"
  },
  {
    id: "flow-004",
    title: "Produccion y ADT",
    owner: "Produccion",
    source: "Recetas por tanda",
    result: "Orden de produccion y tareas diarias por trabajador con instrucciones.",
    status: "Listo"
  },
  {
    id: "flow-005",
    title: "Validacion de supervisor",
    owner: "Supervisor",
    source: "Portal trabajador",
    result: "Cumplimiento pendiente de aprobacion antes de mover inventario real.",
    status: "Preparado"
  },
  {
    id: "flow-006",
    title: "Despacho y balance",
    owner: "Despacho / Gerencia",
    source: "Armado y rutas",
    result: "Entrega con evidencia y balance alimentado por ventas, costos y caja.",
    status: "Pendiente"
  }
];

export const integrationEvents: IntegrationEvent[] = [
  {
    id: "evt-001",
    date: "2026-06-23T08:30:00-04:00",
    event: "Pedido MAY-2048 recibido desde portal mayorista",
    origin: "Portal Mayorista",
    target: "Operaciones > Pedidos",
    status: "Preparado"
  },
  {
    id: "evt-002",
    date: "2026-06-23T08:32:00-04:00",
    event: "Pago demo pendiente de webhook seguro",
    origin: "Checkout",
    target: "Finanzas > Caja",
    status: "Pendiente"
  },
  {
    id: "evt-003",
    date: "2026-06-23T08:36:00-04:00",
    event: "ADT sugerida para cocina fria y armado",
    origin: "Planificacion",
    target: "Personas > ADT / Tareas Diarias",
    status: "Listo"
  }
];
