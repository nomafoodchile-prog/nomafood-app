export type WholesaleCategory =
  | "Sandwiches"
  | "Empanadas"
  | "Pizzas"
  | "Gohan"
  | "Ensaladas"
  | "Sushi"
  | "Pasteleria";

export type WholesaleProduct = {
  id: string;
  name: string;
  category: WholesaleCategory;
  description: string;
  shelfLife: string;
  format: string;
  basePrice: number;
  clientPrice: number;
  available: boolean;
  imageUrl?: string;
  imageAlt: string;
  imageTone: string;
  operationsArea: "Cocina caliente" | "Frio" | "Panaderia" | "Armado";
};

export type WholesaleOrderStatus =
  | "Carrito"
  | "Pedido enviado"
  | "Pendiente de pago"
  | "Pago aprobado"
  | "Confirmado"
  | "En produccion"
  | "Listo para despacho"
  | "En ruta"
  | "Entregado"
  | "Con incidencia";

export type WholesalePaymentStatus = "Pendiente" | "Aprobado" | "Credito autorizado" | "Requiere revision";

export type WholesaleOrder = {
  id: string;
  code: string;
  createdAt: string;
  deliveryDate: string;
  status: WholesaleOrderStatus;
  paymentStatus: WholesalePaymentStatus;
  total: number;
  products: Array<{
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: number;
  }>;
  deliveryEvidence?: string;
  giftReservation?: string;
  operationsLink?: string;
  inventoryReservation?: string;
  adtLink?: string;
};

export type WholesaleClient = {
  businessName: string;
  contactName: string;
  priceList: string;
  minimumOrder: number;
  accountStatus: "Al dia" | "Con deuda" | "Credito retenido";
  creditAuthorized: boolean;
  nextDispatchDate: string;
  address: string;
  commune: string;
};

export const wholesaleClient: WholesaleClient = {
  businessName: "Cafe Raiz",
  contactName: "Martin Leiva",
  priceList: "Lista mayorista local -15%",
  minimumOrder: 85000,
  accountStatus: "Al dia",
  creditAuthorized: true,
  nextDispatchDate: "2026-06-24",
  address: "Av. Italia 1320, local 4",
  commune: "Nunoa"
};

export const wholesaleCategories: WholesaleCategory[] = [
  "Sandwiches",
  "Empanadas",
  "Pizzas",
  "Gohan",
  "Ensaladas",
  "Sushi",
  "Pasteleria"
];

export const wholesaleProducts: WholesaleProduct[] = [
  {
    id: "may-001",
    name: "Ciabatta lomito seitan",
    category: "Sandwiches",
    description: "Ciabatta artesanal con lomito de seitan, vegetales asados y salsa NOMA.",
    shelfLife: "5 dias refrigerado",
    format: "Caja 12 unidades",
    basePrice: 3850,
    clientPrice: 3270,
    available: true,
    imageUrl: "/images/wholesale/ciabatta-lomito-seitan.jpg",
    imageAlt: "Ciabatta artesanal con lomito vegetal de seitan lista para vitrina",
    imageTone: "from-alma-black via-slate-800 to-alma-gold",
    operationsArea: "Armado"
  },
  {
    id: "may-002",
    name: "Ciabatta milanesa seitan",
    category: "Sandwiches",
    description: "Milanesa de seitan apanada, hojas verdes, tomate y aderezo vegano.",
    shelfLife: "5 dias refrigerado",
    format: "Caja 12 unidades",
    basePrice: 3950,
    clientPrice: 3360,
    available: true,
    imageUrl: "/images/wholesale/ciabatta-milanesa-seitan.jpg",
    imageAlt: "Sandwich ciabatta con milanesa vegetal apanada y vegetales",
    imageTone: "from-alma-black via-alma-bottle to-alma-softGold",
    operationsArea: "Armado"
  },
  {
    id: "may-003",
    name: "Burrito sabanero",
    category: "Sandwiches",
    description: "Tortilla rellena con porotos, arroz especiado, vegetales y salsa cremosa.",
    shelfLife: "6 dias refrigerado",
    format: "Caja 10 unidades",
    basePrice: 3200,
    clientPrice: 2720,
    available: true,
    imageUrl: "/images/wholesale/burrito-sabanero.jpg",
    imageAlt: "Burrito vegetariano relleno con arroz especiado, porotos y vegetales",
    imageTone: "from-alma-black via-slate-800 to-alma-gold",
    operationsArea: "Cocina caliente"
  },
  {
    id: "may-004",
    name: "Chicken't burger",
    category: "Sandwiches",
    description: "Hamburguesa vegetal crispy, pan brioche vegano y salsa de la casa.",
    shelfLife: "5 dias refrigerado",
    format: "Caja 10 unidades",
    basePrice: 4200,
    clientPrice: 3570,
    available: true,
    imageUrl: "/images/wholesale/chickent-burger.jpg",
    imageAlt: "Hamburguesa vegetal crispy en pan brioche vegano",
    imageTone: "from-alma-black via-alma-bottle to-alma-gold",
    operationsArea: "Armado"
  },
  {
    id: "may-005",
    name: "Empanadas",
    category: "Empanadas",
    description: "Mix vegano horneado: pino vegetal, champinon queso vegano y napolitana.",
    shelfLife: "7 dias refrigerado",
    format: "Bandeja 20 unidades",
    basePrice: 1450,
    clientPrice: 1230,
    available: true,
    imageUrl: "/images/wholesale/empanadas-veganas.jpg",
    imageAlt: "Empanadas veganas horneadas listas para vender",
    imageTone: "from-alma-black via-alma-bottle to-alma-softGold",
    operationsArea: "Panaderia"
  },
  {
    id: "may-006",
    name: "Pizza cuadrada",
    category: "Pizzas",
    description: "Porcion cuadrada con masa fermentada, salsa de tomate y toppings vegetales.",
    shelfLife: "6 dias refrigerado",
    format: "Caja 16 porciones",
    basePrice: 2600,
    clientPrice: 2210,
    available: true,
    imageUrl: "/images/wholesale/pizza-cuadrada.jpg",
    imageAlt: "Porciones de pizza cuadrada vegetariana para vitrina",
    imageTone: "from-alma-black via-slate-800 to-alma-gold",
    operationsArea: "Panaderia"
  },
  {
    id: "may-007",
    name: "Gohan chicken crispy",
    category: "Gohan",
    description: "Bowl con arroz, vegetales frescos, chicken vegetal crispy y salsa oriental.",
    shelfLife: "4 dias refrigerado",
    format: "Caja 8 bowls 750 ml",
    basePrice: 5200,
    clientPrice: 4420,
    available: true,
    imageUrl: "/images/wholesale/gohan-chicken-crispy.jpg",
    imageAlt: "Gohan con arroz, vegetales y proteina vegetal crispy",
    imageTone: "from-alma-black via-alma-bottle to-alma-gold",
    operationsArea: "Frio"
  },
  {
    id: "may-008",
    name: "Ensalada falafel",
    category: "Ensaladas",
    description: "Ensalada lista para vitrina con falafel, hummus, hojas verdes y dressing.",
    shelfLife: "4 dias refrigerado",
    format: "Caja 8 bowls 750 ml",
    basePrice: 4900,
    clientPrice: 4160,
    available: true,
    imageUrl: "/images/wholesale/ensalada-falafel.jpg",
    imageAlt: "Ensalada con falafel, hummus y hojas verdes en bowl",
    imageTone: "from-alma-black via-alma-bottle to-alma-softGold",
    operationsArea: "Frio"
  },
  {
    id: "may-009",
    name: "Sushi vegetariano",
    category: "Sushi",
    description: "Rolls vegetarianos surtidos con palta, vegetales, queso crema vegano y salsas.",
    shelfLife: "48 horas refrigerado",
    format: "Caja 12 packs",
    basePrice: 5600,
    clientPrice: 4760,
    available: true,
    imageUrl: "/images/wholesale/sushi-vegetariano.jpg",
    imageAlt: "Sushi vegetariano surtido con palta, vegetales y salsas",
    imageTone: "from-neutral-950 via-slate-800 to-emerald-300",
    operationsArea: "Frio"
  },
  {
    id: "may-010",
    name: "Yogurt con granola",
    category: "Pasteleria",
    description: "Postre individual vegetal con yogurt, granola artesanal y fruta de temporada.",
    shelfLife: "5 dias refrigerado",
    format: "Caja 12 vasos 250 ml",
    basePrice: 2400,
    clientPrice: 2040,
    available: true,
    imageUrl: "/images/wholesale/yogurt-granola.jpg",
    imageAlt: "Postre vegetal individual con yogurt, granola y fruta",
    imageTone: "from-alma-black via-slate-800 to-alma-gold",
    operationsArea: "Frio"
  }
];

export const wholesaleOrders: WholesaleOrder[] = [
  {
    id: "wo-001",
    code: "MAY-2048",
    createdAt: "2026-06-18",
    deliveryDate: "2026-06-21",
    status: "En produccion",
    paymentStatus: "Aprobado",
    total: 188240,
    products: [
      { productId: "may-007", productName: "Gohan chicken crispy", quantity: 16, unitPrice: 4420 },
      { productId: "may-005", productName: "Empanadas", quantity: 40, unitPrice: 1230 },
      { productId: "may-009", productName: "Sushi vegetariano", quantity: 12, unitPrice: 4760 }
    ],
    operationsLink: "Panel interno: pedido confirmado MAY-2048",
    inventoryReservation: "Stock reservado y faltantes calculados",
    adtLink: "ADT Frio y Armado generada para 2026-06-20"
  },
  {
    id: "wo-002",
    code: "MAY-2039",
    createdAt: "2026-06-12",
    deliveryDate: "2026-06-14",
    status: "Entregado",
    paymentStatus: "Aprobado",
    total: 126740,
    products: [
      { productId: "may-001", productName: "Ciabatta lomito seitan", quantity: 24, unitPrice: 3270 },
      { productId: "may-010", productName: "Yogurt con granola", quantity: 18, unitPrice: 2040 }
    ],
    deliveryEvidence: "Foto de entrega y firma digital cargadas",
    operationsLink: "Despacho cerrado en ruta Nunoa"
  },
  {
    id: "wo-003",
    code: "MAY-2033",
    createdAt: "2026-06-08",
    deliveryDate: "2026-06-10",
    status: "Con incidencia",
    paymentStatus: "Aprobado",
    total: 91460,
    products: [
      { productId: "may-006", productName: "Pizza cuadrada", quantity: 20, unitPrice: 2210 },
      { productId: "may-008", productName: "Ensalada falafel", quantity: 10, unitPrice: 4160 }
    ],
    deliveryEvidence: "Incidencia: cliente reporto 2 unidades con etiqueta danada",
    operationsLink: "Ticket de calidad asociado a operaciones"
  }
];

export const wholesaleStatuses: WholesaleOrderStatus[] = [
  "Carrito",
  "Pedido enviado",
  "Pendiente de pago",
  "Pago aprobado",
  "Confirmado",
  "En produccion",
  "Listo para despacho",
  "En ruta",
  "Entregado",
  "Con incidencia"
];

export const wholesalePaymentProviders = {
  mode: "demo",
  mercadoPago: {
    checkout: "Checkout Pro",
    envPublicKey: "NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY",
    envAccessToken: "MERCADO_PAGO_ACCESS_TOKEN"
  },
  webpay: {
    checkout: "Webpay Plus",
    envCommerceCode: "WEBPAY_COMMERCE_CODE",
    envApiKey: "WEBPAY_API_KEY"
  }
} as const;

