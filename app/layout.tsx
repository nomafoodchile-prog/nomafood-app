import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";

// Google Analytics 4 — se activa solo si hay un measurement ID configurado en Vercel.
// Aceptamos ambos nombres por compatibilidad: la variable ya existente en Vercel
// se llama NEXT_PUBLIC_GA4_ID, y NEXT_PUBLIC_GA_ID es el nombre original del código.
const GA_ID = process.env.NEXT_PUBLIC_GA_ID || process.env.NEXT_PUBLIC_GA4_ID;

const SITE_URL = "https://nommafood.cl";
const TITLE = "NOMMA FOOD | Productos vegetarianos y veganos para canal mayorista";
const DESCRIPTION =
  "Abastecimiento mayorista de productos vegetarianos y veganos, directo de fábrica. Empanadas, mendocinos, pastelería, ensaladas y más para cafeterías, minimarkets, universidades y oficinas. Solicita tu cuenta mayorista.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: TITLE,
    template: "%s | NOMMA FOOD",
  },
  description: DESCRIPTION,
  applicationName: "NOMMA FOOD",
  keywords: [
    "NOMMA FOOD", "comida vegana mayorista", "comida vegetariana mayorista",
    "proveedor vegano Chile", "empanadas veganas", "mendocinos", "pastelería vegana",
    "abastecimiento mayorista", "productos veganos para cafeterías", "food service vegano",
  ],
  authors: [{ name: "NOMMA FOOD — Alma Libre Grupo SpA" }],
  alternates: { canonical: SITE_URL },
  openGraph: {
    type: "website",
    locale: "es_CL",
    url: SITE_URL,
    siteName: "NOMMA FOOD",
    title: TITLE,
    description: DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>
        {children}
        {GA_ID ? (
          <>
            <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
            <Script
              id="ga4-init"
              strategy="afterInteractive"
              dangerouslySetInnerHTML={{
                __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA_ID}');`,
              }}
            />
          </>
        ) : null}
      </body>
    </html>
  );
}

