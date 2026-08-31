// URL base del portal mayorista según la marca.
// Brotes tiene su PROPIO dominio (mayoristas.brotesasiaticos.cl) para que un
// cliente de Brotes nunca vea "nommafood.cl" en sus enlaces ni en la barra.
// NOMMA sigue en nommafood.cl. Se puede sobreescribir por env si algún día cambia.
export const NOMMA_PORTAL_URL = process.env.NEXT_PUBLIC_NOMMA_PORTAL_URL || 'https://nommafood.cl'
export const BROTES_PORTAL_URL = process.env.NEXT_PUBLIC_BROTES_PORTAL_URL || 'https://mayoristas.brotesasiaticos.cl'

export function esMarcaBrotes(marca?: string | null): boolean {
  return String(marca || '').toLowerCase().includes('brotes')
}

// Base del portal (sin ruta) para la marca dada.
export function portalBase(marca?: string | null): string {
  return esMarcaBrotes(marca) ? BROTES_PORTAL_URL : NOMMA_PORTAL_URL
}
