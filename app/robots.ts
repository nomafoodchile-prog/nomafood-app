import type { MetadataRoute } from 'next'

const SITE_URL = 'https://nommafood.cl'

// Le dice a Google qué puede indexar. Público: la landing (/) y "Solicitar acceso"
// (/mayoristas). Privado (NO indexar): portal de clientes, central, apis y logins.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/portal/',
          '/operario/',
          '/chofer/',
          '/login',
          '/recuperar',
          '/comercial',
          '/compras',
          '/dashboard',
          '/finanzas',
          '/gerencia',
          '/operaciones',
          '/personas',
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  }
}
