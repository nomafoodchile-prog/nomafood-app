export type PaymentProvider = "webpay" | "mercado-pago" | "manual";

export type PaymentCheckoutPayload = {
  orderCode: string;
  amount: number;
  currency?: "CLP";
  customerName: string;
  customerEmail?: string;
  returnUrl?: string;
};

export type PaymentProviderStatus = {
  provider: PaymentProvider;
  label: string;
  ready: boolean;
  mode: "demo" | "production-ready";
  missing: string[];
};

export type DeliveryStop = {
  customerName: string;
  address: string;
  commune: string;
};

function missingEnv(items: Array<[string, string | undefined]>) {
  return items.filter(([, value]) => !value).map(([key]) => key);
}

export function getPaymentProviderStatus(): PaymentProviderStatus {
  const configured = (process.env.WHOLESALE_PAYMENT_PROVIDER ?? "manual") as PaymentProvider;

  if (configured === "webpay") {
    const missing = missingEnv([
      ["WEBPAY_COMMERCE_CODE", process.env.WEBPAY_COMMERCE_CODE],
      ["WEBPAY_API_KEY", process.env.WEBPAY_API_KEY]
    ]);

    return {
      provider: "webpay",
      label: "Webpay Plus / Transbank",
      ready: missing.length === 0,
      mode: missing.length === 0 ? "production-ready" : "demo",
      missing
    };
  }

  if (configured === "mercado-pago") {
    const missing = missingEnv([
      ["MERCADO_PAGO_ACCESS_TOKEN", process.env.MERCADO_PAGO_ACCESS_TOKEN],
      ["NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY", process.env.NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY]
    ]);

    return {
      provider: "mercado-pago",
      label: "Mercado Pago Checkout Pro",
      ready: missing.length === 0,
      mode: missing.length === 0 ? "production-ready" : "demo",
      missing
    };
  }

  return {
    provider: "manual",
    label: "Pago manual / transferencia",
    ready: false,
    mode: "demo",
    missing: ["WHOLESALE_PAYMENT_PROVIDER"]
  };
}

export function buildDemoCheckoutUrl(payload: PaymentCheckoutPayload) {
  const params = new URLSearchParams({
    pedido: payload.orderCode,
    monto: String(payload.amount),
    moneda: payload.currency ?? "CLP",
    cliente: payload.customerName
  });

  return `/mayoristas?checkout_demo=1&${params.toString()}`;
}

export function buildWazeUrl(stop: DeliveryStop) {
  const query = `${stop.address}, ${stop.commune}, Chile`;
  return `https://waze.com/ul?q=${encodeURIComponent(query)}&navigate=yes`;
}

export function buildGoogleMapsUrl(stop: DeliveryStop) {
  const query = `${stop.address}, ${stop.commune}, Chile`;
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(query)}&travelmode=driving`;
}
