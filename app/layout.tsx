import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { headers } from "next/headers";
import "./globals.css";

// Google Analytics 4 — se activa solo si hay un measurement ID configurado en Vercel.
// Aceptamos ambos nombres por compatibilidad: la variable ya existente en Vercel
// se llama NEXT_PUBLIC_GA4_ID, y NEXT_PUBLIC_GA_ID es el nombre original del código.
const GA_ID = process.env.NEXT_PUBLIC_GA_ID || process.env.NEXT_PUBLIC_GA4_ID;

// Metadatos por marca según el dominio de entrada. Así, al compartir un enlace
// de mayoristas.brotesasiaticos.cl, la tarjeta de vista previa (WhatsApp, redes,
// Google) sale con la identidad de Brotes, y no la de NOMMA.
const NOMMA_META = {
  url: "https://nommafood.cl",
  name: "NOMMA FOOD",
  template: "%s | NOMMA FOOD",
  title: "NOMMA FOOD | Productos vegetarianos y veganos para canal mayorista",
  description:
    "Abastecimiento mayorista de productos vegetarianos y veganos, directo de fábrica. Empanadas, mendocinos, pastelería, ensaladas y más para cafeterías, minimarkets, universidades y oficinas. Solicita tu cuenta mayorista.",
  author: "NOMMA FOOD — Alma Libre Grupo SpA",
};
const BROTES_META = {
  url: "https://mayoristas.brotesasiaticos.cl",
  name: "BROTES ASIÁTICOS",
  template: "%s | BROTES ASIÁTICOS",
  title: "BROTES ASIÁTICOS | Portal Mayorista",
  description:
    "Portal mayorista de Brotes Asiáticos — abastecimiento de productos plant-based directo de fábrica para tu negocio. Ingresa o solicita tu cuenta mayorista.",
  author: "Brotes Asiáticos — Alma Libre Grupo SpA",
};

export async function generateMetadata(): Promise<Metadata> {
  const host = (await headers()).get("host") || "";
  const M = host.includes("brotesasiaticos") ? BROTES_META : NOMMA_META;
  return {
    metadataBase: new URL(M.url),
    title: { default: M.title, template: M.template },
    description: M.description,
    applicationName: M.name,
    keywords: [
      "comida vegana mayorista", "comida vegetariana mayorista", "plant based Chile",
      "proveedor vegano Chile", "empanadas veganas", "mendocinos", "pastelería vegana",
      "abastecimiento mayorista", "productos veganos para cafeterías", "food service vegano",
    ],
    authors: [{ name: M.author }],
    alternates: { canonical: M.url },
    openGraph: {
      type: "website",
      locale: "es_CL",
      url: M.url,
      siteName: M.name,
      title: M.title,
      description: M.description,
    },
    twitter: {
      card: "summary_large_image",
      title: M.title,
      description: M.description,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, "max-image-preview": "large" },
    },
  };
}

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

