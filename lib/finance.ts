export type CashEntryType = "Ingreso" | "Egreso";

export type CashEntry = {
  id: string;
  date: string;
  type: CashEntryType;
  category: string;
  description: string;
  amount: number;
  paymentMethod: string;
  responsible: string;
  notes: string;
};

export type CashEntryForm = Omit<CashEntry, "id">;

export type BankTransactionStatus = "Pendiente" | "Conciliado" | "Ignorado";

export type BankTransaction = {
  id: string;
  date: string;
  account: string;
  description: string;
  counterparty: string;
  reference: string;
  type: CashEntryType;
  amount: number;
  suggestedCategory: string;
  status: BankTransactionStatus;
  matchedCashEntryId?: string;
};

export type ReceivableStatus = "Pendiente" | "Por vencer" | "Vencida" | "Pagada";

export type CustomerReceivable = {
  id: string;
  invoiceNumber: string;
  customerName: string;
  issueDate: string;
  dueDate: string;
  amount: number;
  paidAmount: number;
  paymentTerms: string;
  status: ReceivableStatus;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  notes: string;
};

export type CompanyAsset = {
  id: string;
  name: string;
  category: "Maquinaria" | "Inversion" | "Infraestructura";
  acquisitionDate: string;
  originalValue: number;
  currentValue: number;
  monthlyDepreciation: number;
  notes: string;
};

export type CompanyLiability = {
  id: string;
  name: string;
  category: "Credito" | "Deuda por pagar" | "Impuesto" | "Leasing";
  creditor: string;
  originalAmount: number;
  outstandingAmount: number;
  monthlyPayment: number;
  dueDate: string;
  status: "Al dia" | "Por vencer" | "Atrasada";
};

export type FinancialSnapshot = {
  month: string;
  income: number;
  expenses: number;
  cash: number;
  inventory: number;
  receivables: number;
  payables: number;
  credits: number;
  machinery: number;
  investments: number;
};

export const cashCategories = [
  "Venta mayorista",
  "Venta retail",
  "Pago cliente credito",
  "Compra materia prima",
  "Remuneraciones",
  "Arriendo y gastos comunes",
  "Servicios basicos",
  "Transporte y despacho",
  "Marketing",
  "Mantencion",
  "Otros"
];

export const paymentMethods = ["Transferencia", "Efectivo", "Tarjeta", "Mercado Pago", "Webpay", "Credito cliente"];

export const bankAccounts = [
  "Banco empresa NOMA FOOD - Cuenta corriente",
  "Caja efectivo fabrica",
  "Webpay / Transbank",
  "Mercado Pago"
];

export const initialCashEntries: CashEntry[] = [
  {
    id: "cash-001",
    date: "2026-06-20",
    type: "Ingreso",
    category: "Venta mayorista",
    description: "Pedido Cafe Raiz MAY-2108",
    amount: 286450,
    paymentMethod: "Transferencia",
    responsible: "Camila Soto",
    notes: "Pago recibido antes de despacho"
  },
  {
    id: "cash-002",
    date: "2026-06-20",
    type: "Egreso",
    category: "Compra materia prima",
    description: "Compra tofu firme y verduras",
    amount: 124800,
    paymentMethod: "Transferencia",
    responsible: "Valentina Morales",
    notes: "Proveedor Verde Origen"
  },
  {
    id: "cash-003",
    date: "2026-06-19",
    type: "Ingreso",
    category: "Venta retail",
    description: "Ventas vitrina local",
    amount: 168900,
    paymentMethod: "Tarjeta",
    responsible: "Camila Soto",
    notes: "Cierre diario POS"
  },
  {
    id: "cash-004",
    date: "2026-06-18",
    type: "Egreso",
    category: "Transporte y despacho",
    description: "Ruta Oriente y Nunoa",
    amount: 42000,
    paymentMethod: "Efectivo",
    responsible: "Hector Silva",
    notes: "Combustible y estacionamientos"
  }
];

export const initialBankTransactions: BankTransaction[] = [
  {
    id: "bank-001",
    date: "2026-06-21",
    account: "Banco empresa NOMA FOOD - Cuenta corriente",
    description: "Transferencia recibida pedido MAY-2114",
    counterparty: "Minimarket La Huerta",
    reference: "TRX-884219",
    type: "Ingreso",
    amount: 412900,
    suggestedCategory: "Venta mayorista",
    status: "Pendiente"
  },
  {
    id: "bank-002",
    date: "2026-06-21",
    account: "Banco empresa NOMA FOOD - Cuenta corriente",
    description: "Pago proveedor envases compostables",
    counterparty: "EcoPack Chile",
    reference: "TEF-440921",
    type: "Egreso",
    amount: 189600,
    suggestedCategory: "Compra materia prima",
    status: "Pendiente"
  },
  {
    id: "bank-003",
    date: "2026-06-20",
    account: "Webpay / Transbank",
    description: "Abono cierre POS local vitrina",
    counterparty: "Transbank",
    reference: "WEB-773109",
    type: "Ingreso",
    amount: 168900,
    suggestedCategory: "Venta retail",
    status: "Conciliado",
    matchedCashEntryId: "cash-003"
  },
  {
    id: "bank-004",
    date: "2026-06-19",
    account: "Banco empresa NOMA FOOD - Cuenta corriente",
    description: "Pago arriendo planta productiva",
    counterparty: "Inversiones Los Maitenes",
    reference: "TEF-319008",
    type: "Egreso",
    amount: 680000,
    suggestedCategory: "Arriendo y gastos comunes",
    status: "Pendiente"
  },
  {
    id: "bank-005",
    date: "2026-06-18",
    account: "Banco empresa NOMA FOOD - Cuenta corriente",
    description: "Pago factura FAC-1842",
    counterparty: "Clinica Santa Emilia",
    reference: "TRX-550917",
    type: "Ingreso",
    amount: 742560,
    suggestedCategory: "Pago cliente credito",
    status: "Pendiente"
  }
];

export const initialReceivables: CustomerReceivable[] = [
  {
    id: "rec-001",
    invoiceNumber: "FAC-1842",
    customerName: "Clinica Santa Emilia",
    issueDate: "2026-06-10",
    dueDate: "2026-06-25",
    amount: 742560,
    paidAmount: 0,
    paymentTerms: "Credito 15 dias",
    status: "Por vencer",
    contactName: "Paula Herrera",
    contactEmail: "pagos@santaemilia.cl",
    contactPhone: "+56 9 4422 1100",
    notes: "Enviar respaldo de despacho junto a recordatorio"
  },
  {
    id: "rec-002",
    invoiceNumber: "FAC-1815",
    customerName: "Cafe Raiz",
    issueDate: "2026-05-26",
    dueDate: "2026-06-15",
    amount: 358900,
    paidAmount: 0,
    paymentTerms: "Credito 20 dias",
    status: "Vencida",
    contactName: "Martin Leiva",
    contactEmail: "administracion@caferaiz.cl",
    contactPhone: "+56 9 7718 2030",
    notes: "Cliente comprometio pago esta semana"
  },
  {
    id: "rec-003",
    invoiceNumber: "FAC-1850",
    customerName: "Evento Green Summit",
    issueDate: "2026-06-18",
    dueDate: "2026-06-21",
    amount: 1290000,
    paidAmount: 650000,
    paymentTerms: "50% anticipo, saldo contra entrega",
    status: "Pendiente",
    contactName: "Antonia Vidal",
    contactEmail: "produccion@greensummit.cl",
    contactPhone: "+56 9 6621 8840",
    notes: "Saldo pendiente antes de liberar proximo evento"
  },
  {
    id: "rec-004",
    invoiceNumber: "FAC-1799",
    customerName: "Retail Saludable Norte",
    issueDate: "2026-05-18",
    dueDate: "2026-06-02",
    amount: 214300,
    paidAmount: 214300,
    paymentTerms: "Credito 15 dias",
    status: "Pagada",
    contactName: "Felipe Andrade",
    contactEmail: "compras@saludablenorte.cl",
    contactPhone: "+56 9 3355 7081",
    notes: "Pagada por transferencia"
  }
];

export const initialCompanyAssets: CompanyAsset[] = [
  {
    id: "asset-001",
    name: "Horno convector industrial",
    category: "Maquinaria",
    acquisitionDate: "2025-08-14",
    originalValue: 4200000,
    currentValue: 3620000,
    monthlyDepreciation: 70000,
    notes: "Equipo clave para panaderia y pasteleria salada"
  },
  {
    id: "asset-002",
    name: "Camara de frio principal",
    category: "Maquinaria",
    acquisitionDate: "2025-03-02",
    originalValue: 6800000,
    currentValue: 5950000,
    monthlyDepreciation: 85000,
    notes: "Refrigerados y preelaboraciones"
  },
  {
    id: "asset-003",
    name: "Mesones acero inoxidable",
    category: "Infraestructura",
    acquisitionDate: "2024-11-20",
    originalValue: 1850000,
    currentValue: 1560000,
    monthlyDepreciation: 25000,
    notes: "Area produccion y armado"
  },
  {
    id: "asset-004",
    name: "Fondo reserva temporada alta",
    category: "Inversion",
    acquisitionDate: "2026-04-01",
    originalValue: 2500000,
    currentValue: 2500000,
    monthlyDepreciation: 0,
    notes: "Capital reservado para stock y campanas"
  }
];

export const initialCompanyLiabilities: CompanyLiability[] = [
  {
    id: "liab-001",
    name: "Credito capital de trabajo",
    category: "Credito",
    creditor: "Banco empresa",
    originalAmount: 12000000,
    outstandingAmount: 7600000,
    monthlyPayment: 520000,
    dueDate: "2026-07-05",
    status: "Al dia"
  },
  {
    id: "liab-002",
    name: "Factura proveedor envases",
    category: "Deuda por pagar",
    creditor: "EcoPack Chile",
    originalAmount: 980000,
    outstandingAmount: 980000,
    monthlyPayment: 980000,
    dueDate: "2026-06-28",
    status: "Por vencer"
  },
  {
    id: "liab-003",
    name: "Leasing selladora al vacio",
    category: "Leasing",
    creditor: "Leasing maquinaria",
    originalAmount: 3900000,
    outstandingAmount: 2450000,
    monthlyPayment: 210000,
    dueDate: "2026-07-12",
    status: "Al dia"
  },
  {
    id: "liab-004",
    name: "IVA por pagar estimado",
    category: "Impuesto",
    creditor: "Tesoreria / SII",
    originalAmount: 640000,
    outstandingAmount: 640000,
    monthlyPayment: 640000,
    dueDate: "2026-07-20",
    status: "Al dia"
  }
];

export const initialFinancialSnapshots: FinancialSnapshot[] = [
  {
    month: "2026-01",
    income: 8200000,
    expenses: 7100000,
    cash: 1350000,
    inventory: 4200000,
    receivables: 980000,
    payables: 2850000,
    credits: 9100000,
    machinery: 10350000,
    investments: 850000
  },
  {
    month: "2026-02",
    income: 8750000,
    expenses: 7350000,
    cash: 1620000,
    inventory: 4480000,
    receivables: 1120000,
    payables: 2680000,
    credits: 8720000,
    machinery: 10170000,
    investments: 1100000
  },
  {
    month: "2026-03",
    income: 9180000,
    expenses: 7810000,
    cash: 1840000,
    inventory: 4860000,
    receivables: 1430000,
    payables: 3020000,
    credits: 8340000,
    machinery: 9990000,
    investments: 1350000
  },
  {
    month: "2026-04",
    income: 10450000,
    expenses: 8460000,
    cash: 2260000,
    inventory: 5220000,
    receivables: 1510000,
    payables: 2880000,
    credits: 7960000,
    machinery: 9810000,
    investments: 2500000
  },
  {
    month: "2026-05",
    income: 11280000,
    expenses: 9020000,
    cash: 2740000,
    inventory: 5580000,
    receivables: 1760000,
    payables: 3210000,
    credits: 7580000,
    machinery: 9630000,
    investments: 2500000
  },
  {
    month: "2026-06",
    income: 12420000,
    expenses: 9480000,
    cash: 3180000,
    inventory: 6120000,
    receivables: 2210000,
    payables: 3380000,
    credits: 7210000,
    machinery: 9440000,
    investments: 2500000
  }
];

export const emptyCashEntry: CashEntryForm = {
  date: new Date().toISOString().slice(0, 10),
  type: "Ingreso",
  category: "Venta mayorista",
  description: "",
  amount: 0,
  paymentMethod: "Transferencia",
  responsible: "",
  notes: ""
};

export function balanceOf(entry: CashEntry) {
  return entry.type === "Ingreso" ? entry.amount : -entry.amount;
}

export function bankBalanceOf(transaction: BankTransaction) {
  return transaction.type === "Ingreso" ? transaction.amount : -transaction.amount;
}

export function receivableBalance(receivable: CustomerReceivable) {
  return Math.max(0, receivable.amount - receivable.paidAmount);
}

export function daysUntilDue(dueDate: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(`${dueDate}T12:00:00`);
  return Math.ceil((due.getTime() - today.getTime()) / 86400000);
}

export function receivableComputedStatus(receivable: CustomerReceivable): ReceivableStatus {
  if (receivableBalance(receivable) <= 0) return "Pagada";
  const days = daysUntilDue(receivable.dueDate);
  if (days < 0) return "Vencida";
  if (days <= 7) return "Por vencer";
  return "Pendiente";
}

