import type { MetadataRoute } from 'next'

const SITE_URL = 'https://nommafood.cl'

// El "índice" de páginas públicas que le entregamos a Google.
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()
  return [
    { url: SITE_URL, lastModified: now, changeFrequency: 'weekly', priority: 1 },
  ]
}
