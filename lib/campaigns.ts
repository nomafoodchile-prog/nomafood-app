export type BusinessType = "Restaurante" | "Cafe" | "Clinica" | "Retail saludable" | "Eventos" | "Prospecto";

export type PaymentStatus = "Al dia" | "Con deuda" | "Credito retenido" | "Prospecto";

export type MarketingChannel = "Email marketing" | "WhatsApp Business";

export type CampaignStatus = "Borrador" | "Programada" | "Enviada" | "Cancelada";

export type DeliveryStatus = "enviado" | "entregado" | "abierto/clic" | "respondido" | "cancelado";

export type MarketingCustomer = {
  id: string;
  contactName: string;
  businessName: string;
  businessType: BusinessType;
  active: boolean;
  lastPurchase: string | null;
  commune: string;
  paymentStatus: PaymentStatus;
  purchasedProducts: string[];
  marketingConsent: boolean;
  consentDate: string | null;
  authorizedChannels: MarketingChannel[];
  unsubscribed: boolean;
  portalUrl: string;
};

export type CampaignTemplate = {
  id: string;
  name: string;
  channel: MarketingChannel;
  subject?: string;
  body: string;
  featuredProducts: string[];
};

export type Campaign = {
  id: string;
  name: string;
  channel: MarketingChannel;
  status: CampaignStatus;
  segmentName: string;
  templateId: string;
  scheduledAt: string | null;
  createdAt: string;
};

export type CampaignDelivery = {
  id: string;
  campaignId: string;
  customerId: string;
  customerName: string;
  businessName: string;
  channel: MarketingChannel;
  status: DeliveryStatus;
  lastEventAt: string;
};

export const marketingCustomers: MarketingCustomer[] = [
  {
    id: "mcli-001",
    contactName: "Paula Herrera",
    businessName: "Clinica Santa Emilia",
    businessType: "Clinica",
    active: true,
    lastPurchase: "2026-06-18",
    commune: "Providencia",
    paymentStatus: "Al dia",
    purchasedProducts: ["Lasagna vegana individual", "Focaccia integral"],
    marketingConsent: true,
    consentDate: "2026-05-15",
    authorizedChannels: ["Email marketing", "WhatsApp Business"],
    unsubscribed: false,
    portalUrl: "https://portal.nomafood.cl/pedido/clinica-santa-emilia"
  },
  {
    id: "mcli-002",
    contactName: "Martin Leiva",
    businessName: "Cafe Raiz",
    businessType: "Cafe",
    active: true,
    lastPurchase: "2026-05-08",
    commune: "Nunoa",
    paymentStatus: "Al dia",
    purchasedProducts: ["Bowl thai tofu", "Salsa de tomate base"],
    marketingConsent: true,
    consentDate: "2026-04-20",
    authorizedChannels: ["WhatsApp Business"],
    unsubscribed: false,
    portalUrl: "https://portal.nomafood.cl/pedido/cafe-raiz"
  },
  {
    id: "mcli-003",
    contactName: "Antonia Vidal",
    businessName: "Evento Green Summit",
    businessType: "Eventos",
    active: true,
    lastPurchase: null,
    commune: "Las Condes",
    paymentStatus: "Prospecto",
    purchasedProducts: [],
    marketingConsent: true,
    consentDate: "2026-06-01",
    authorizedChannels: ["Email marketing"],
    unsubscribed: false,
    portalUrl: "https://portal.nomafood.cl/pedido/green-summit"
  },
  {
    id: "mcli-004",
    contactName: "Francisca Rivas",
    businessName: "Mercado Verde",
    businessType: "Retail saludable",
    active: false,
    lastPurchase: "2026-04-12",
    commune: "Santiago",
    paymentStatus: "Con deuda",
    purchasedProducts: ["Focaccia integral"],
    marketingConsent: true,
    consentDate: "2026-03-10",
    authorizedChannels: ["Email marketing", "WhatsApp Business"],
    unsubscribed: false,
    portalUrl: "https://portal.nomafood.cl/pedido/mercado-verde"
  },
  {
    id: "mcli-005",
    contactName: "Diego Munoz",
    businessName: "Restaurant Brote",
    businessType: "Restaurante",
    active: true,
    lastPurchase: "2026-06-05",
    commune: "Vitacura",
    paymentStatus: "Credito retenido",
    purchasedProducts: ["Lasagna vegana individual", "Bowl thai tofu"],
    marketingConsent: false,
    consentDate: null,
    authorizedChannels: [],
    unsubscribed: false,
    portalUrl: "https://portal.nomafood.cl/pedido/restaurant-brote"
  },
  {
    id: "mcli-006",
    contactName: "Isidora Paredes",
    businessName: "Comedor Norte",
    businessType: "Prospecto",
    active: false,
    lastPurchase: null,
    commune: "Huechuraba",
    paymentStatus: "Prospecto",
    purchasedProducts: [],
    marketingConsent: true,
    consentDate: "2026-06-10",
    authorizedChannels: ["Email marketing", "WhatsApp Business"],
    unsubscribed: false,
    portalUrl: "https://portal.nomafood.cl/pedido/comedor-norte"
  }
];

export const campaignTemplates: CampaignTemplate[] = [
  {
    id: "tpl-001",
    name: "Reposicion semanal mayorista",
    channel: "Email marketing",
    subject: "Hola {{nombre_cliente}}, arma tu pedido semanal NOMA FOOD",
    featuredProducts: ["Lasagna vegana individual", "Bowl thai tofu", "Focaccia integral"],
    body:
      "Hola {{nombre_cliente}}, tenemos disponibilidad para {{nombre_negocio}}. Productos destacados: {{productos_destacados}}. Proximo despacho: {{fecha_despacho}}. Haz tu pedido aqui: {{link_portal}}"
  },
  {
    id: "tpl-002",
    name: "WhatsApp recompra 30 dias",
    channel: "WhatsApp Business",
    featuredProducts: ["Bowl thai tofu", "Salsa de tomate base"],
    body:
      "Hola {{nombre_cliente}}, soy NOMA FOOD. Vimos que {{nombre_negocio}} no compra hace un tiempo. Tenemos {{productos_destacados}} para despacho {{fecha_despacho}}. Pedido: {{link_portal}}"
  }
];

export const demoCampaigns: Campaign[] = [
  {
    id: "camp-001",
    name: "Reactivacion clientes 30 dias",
    channel: "WhatsApp Business",
    status: "Programada",
    segmentName: "Clientes sin compra en 30 dias",
    templateId: "tpl-002",
    scheduledAt: "2026-06-21T09:00:00",
    createdAt: "2026-06-20T10:30:00"
  },
  {
    id: "camp-002",
    name: "Pedido semanal B2B",
    channel: "Email marketing",
    status: "Borrador",
    segmentName: "Clientes activos",
    templateId: "tpl-001",
    scheduledAt: null,
    createdAt: "2026-06-20T11:00:00"
  }
];

export const demoDeliveries: CampaignDelivery[] = [
  {
    id: "del-001",
    campaignId: "camp-001",
    customerId: "mcli-002",
    customerName: "Martin Leiva",
    businessName: "Cafe Raiz",
    channel: "WhatsApp Business",
    status: "respondido",
    lastEventAt: "2026-06-20T12:15:00"
  },
  {
    id: "del-002",
    campaignId: "camp-002",
    customerId: "mcli-001",
    customerName: "Paula Herrera",
    businessName: "Clinica Santa Emilia",
    channel: "Email marketing",
    status: "abierto/clic",
    lastEventAt: "2026-06-20T12:30:00"
  }
];

export function daysSinceLastPurchase(lastPurchase: string | null, today = new Date("2026-06-20T00:00:00")) {
  if (!lastPurchase) return null;
  const date = new Date(`${lastPurchase}T00:00:00`);
  return Math.floor((today.getTime() - date.getTime()) / (24 * 60 * 60 * 1000));
}

export function automaticSegmentCustomers(segment: string, customers: MarketingCustomer[]) {
  return customers.filter((customer) => {
    if (segment === "Clientes sin compra en 30 dias") {
      const days = daysSinceLastPurchase(customer.lastPurchase);
      return customer.marketingConsent && !customer.unsubscribed && days !== null && days >= 30;
    }
    if (segment === "Clientes activos") {
      return customer.marketingConsent && !customer.unsubscribed && customer.active;
    }
    if (segment === "Clientes con deuda") {
      return customer.marketingConsent && !customer.unsubscribed && customer.paymentStatus === "Con deuda";
    }
    if (segment === "Prospectos sin primera compra") {
      return customer.marketingConsent && !customer.unsubscribed && customer.lastPurchase === null;
    }
    return customer.marketingConsent && !customer.unsubscribed;
  });
}

export function renderTemplate(
  template: CampaignTemplate,
  customer: MarketingCustomer,
  dispatchDate: string
) {
  return template.body
    .replaceAll("{{nombre_cliente}}", customer.contactName)
    .replaceAll("{{nombre_negocio}}", customer.businessName)
    .replaceAll("{{link_portal}}", customer.portalUrl)
    .replaceAll("{{productos_destacados}}", template.featuredProducts.join(", "))
    .replaceAll("{{fecha_despacho}}", dispatchDate);
}

