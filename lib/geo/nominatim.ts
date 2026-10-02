// Geocodificación con Nominatim (OpenStreetMap): gratis, sin API key.
// Mismo criterio que app/api/geocode/route.ts: intenta exacta → calle → sector,
// filtra a Chile y respeta el límite de 1 request/seg.

const UA = 'NommaFood-Logistica/1.0 (contacto: brotesladera@gmail.com)'

export interface GeocodeHit { lat: number; lng: number; display: string; precision: 'exacta' | 'calle' | 'sector' }

async function buscar(q: string): Promise<{ lat: number; lng: number; display: string } | null> {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=cl&q=${encodeURIComponent(q)}`
  const r = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'es' } })
  if (!r.ok) return null
  const data = (await r.json()) as Array<{ lat: string; lon: string; display_name: string }>
  if (!Array.isArray(data) || data.length === 0) return null
  return { lat: Number(data[0].lat), lng: Number(data[0].lon), display: data[0].display_name }
}

function candidatos(dir: string): { q: string; precision: 'exacta' | 'calle' | 'sector' }[] {
  const base = dir.replace(/\s+/g, ' ').trim()
  const conPais = /chile/i.test(base) ? base : `${base}, Chile`
  const sinNumero = conPais.replace(/\b\d{1,6}\b/, '').replace(/\s*,\s*,/g, ',').replace(/\s{2,}/g, ' ').replace(/,\s*,/g, ',').trim()
  const partes = base.split(',').map(s => s.trim()).filter(Boolean)
  const sector = [...partes.slice(1)].join(', ') || partes.slice(-2).join(', ')
  const out: { q: string; precision: 'exacta' | 'calle' | 'sector' }[] = [{ q: conPais, precision: 'exacta' }]
  if (sinNumero && sinNumero !== conPais) out.push({ q: sinNumero, precision: 'calle' })
  if (sector) out.push({ q: /chile/i.test(sector) ? sector : `${sector}, Chile`, precision: 'sector' })
  return out
}

// Geocodifica una dirección completa. Respeta 1 req/seg entre intentos.
export async function geocodeDireccion(dir: string): Promise<GeocodeHit | null> {
  const q = (dir || '').trim()
  if (!q) return null
  const cands = candidatos(q)
  for (let i = 0; i < cands.length; i++) {
    const hit = await buscar(cands[i].q)
    if (hit) return { ...hit, precision: cands[i].precision }
    if (i < cands.length - 1) await new Promise(res => setTimeout(res, 1100))
  }
  return null
}
