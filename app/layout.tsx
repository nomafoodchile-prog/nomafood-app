import type { Metadata, Viewport } from "next";
import "./globals.css";

const SITE_URL = "https://nomafood.cl";
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
      <body>{children}</body>
    </html>
  );
}

