export type AccessRequestPayload = {
  businessName?: string;
  rut?: string;
  contactName?: string;
  phone?: string;
  email?: string;
  commune?: string;
  address?: string;
  businessType?: string;
  purchaseVolume?: string;
  interestedProducts?: string;
  marketingConsent?: string;
  receivedAt?: string;
};

export const sampleAccessRequest: AccessRequestPayload = {
  businessName: "Cafeteria Brotes Ladera",
  rut: "76.123.456-7",
  contactName: "Camila Soto",
  phone: "+56 9 8765 4321",
  email: "compras@brotesladera.cl",
  commune: "Providencia",
  address: "Av. Los Leones 1234",
  businessType: "Cafeteria",
  purchaseVolume: "$300.000 a $700.000 semanal",
  interestedProducts: "Lasanas veganas, quiches, panes de masa madre y postres sin lacteos.",
  marketingConsent: "on",
  receivedAt: "2026-06-20T12:00:00.000Z"
};

export function buildAccessRequestEmail(payload: AccessRequestPayload, recipient: string) {
  const subject = `Nueva solicitud portal mayorista - ${value(payload.businessName)}`;
  const receivedAt = payload.receivedAt
    ? new Intl.DateTimeFormat("es-CL", {
        dateStyle: "full",
        timeStyle: "short",
        timeZone: "America/Santiago"
      }).format(new Date(payload.receivedAt))
    : "Recien recibida";

  const rows: Array<[string, string | undefined]> = [
    ["Negocio", payload.businessName],
    ["RUT", payload.rut],
    ["Contacto", payload.contactName],
    ["Telefono", payload.phone],
    ["Correo", payload.email],
    ["Comuna", payload.commune],
    ["Direccion", payload.address],
    ["Tipo de negocio", payload.businessType],
    ["Volumen de compra", payload.purchaseVolume],
    ["Productos de interes", payload.interestedProducts],
    ["Consentimiento marketing", payload.marketingConsent ? "Si, autorizado" : "No informado"],
    ["Fecha de solicitud", receivedAt]
  ];

  const text = [
    subject,
    "",
    `Para: ${recipient}`,
    "",
    ...rows.map(([label, rowValue]) => `${label}: ${value(rowValue)}`),
    "",
    "Accion sugerida: contactar al cliente, validar condiciones mayoristas y aprobar acceso al portal."
  ].join("\n");

  const htmlRows = rows
    .map(
      ([label, rowValue]) => `
        <tr>
          <td style="padding:12px;border-bottom:1px solid #dfe8c8;color:#70824a;font-size:12px;text-transform:uppercase;font-weight:700;">${escapeHtml(label)}</td>
          <td style="padding:12px;border-bottom:1px solid #dfe8c8;color:#0d2238;font-size:15px;font-weight:700;">${escapeHtml(value(rowValue))}</td>
        </tr>`
    )
    .join("");

  const html = `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(subject)}</title>
  </head>
  <body style="margin:0;background:#f8faf6;font-family:Arial,Helvetica,sans-serif;color:#0d2238;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8faf6;padding:24px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:680px;background:#ffffff;border:1px solid #b8c987;border-radius:12px;overflow:hidden;">
            <tr>
              <td style="background:#071a2f;color:#ffffff;padding:26px;">
                <div style="display:inline-block;background:#b8c987;color:#071a2f;font-weight:900;padding:8px 10px;border-radius:6px;">NF</div>
                <h1 style="margin:18px 0 6px;font-size:26px;line-height:1.2;">Nueva solicitud de acceso mayorista</h1>
                <p style="margin:0;color:#f0f4dc;font-size:15px;">NOMA FOOD Portal Mayoristas</p>
              </td>
            </tr>
            <tr>
              <td style="padding:24px;">
                <p style="margin:0 0 18px;font-size:16px;line-height:1.55;">
                  Un cliente completo el formulario para solicitar acceso al portal. Este aviso esta dirigido a
                  <strong>${escapeHtml(recipient)}</strong>.
                </p>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #dfe8c8;border-radius:10px;overflow:hidden;">
                  ${htmlRows}
                </table>
                <div style="margin-top:22px;padding:16px;background:#f0f4dc;border:1px solid #b8c987;border-radius:10px;">
                  <p style="margin:0;font-size:14px;line-height:1.5;">
                    Accion sugerida: contactar al cliente, validar condiciones mayoristas y aprobar acceso al portal.
                  </p>
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return { subject, text, html };
}

function value(input?: string) {
  return input?.trim() || "No informado";
}

function escapeHtml(input: string) {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

