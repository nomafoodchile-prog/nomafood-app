import { NextRequest, NextResponse } from 'next/server'

// Geocodifica una dirección → { lat, lng } usando Nominatim (OpenStreetMap).
// Server-side para respetar la política de uso (User-Agent, sin exponer al cliente).
// Datos gratuitos: si no resuelve el número exacto, cae a calle y luego a comuna/ciudad.
export const runtime = 'nodejs'

const UA = 'NommaFood-Logistica/1.0 (contacto: brotesladera@gmail.com)'

async function buscar(q: string): Promise<{ lat: number; lng: number; display: string } | null> {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=cl&q=${encodeURIComponent(q)}`
  const r = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'es' } })
  if (!r.ok) return null
  const data = (await r.json()) as Array<{ lat: string; lon: string; display_name: string }>
  if (!Array.isArray(data) || data.length === 0) return null
  return { lat: Number(data[0].lat), lng: Number(data[0].lon), display: data[0].display_name }
}

// Genera intentos de más preciso a más general
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

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim()
  if (!q) return NextResponse.json({ error: 'Falta la dirección' }, { status: 400 })
  try {
    for (const c of candidatos(q)) {
      const hit = await buscar(c.q)
      if (hit) return NextResponse.json({ found: true, precision: c.precision, ...hit })
      await new Promise(res => setTimeout(res, 1100)) // Nominatim: máx 1 request/seg
    }
    return NextResponse.json({ found: false })
  } catch {
    return NextResponse.json({ error: 'geocode_failed' }, { status: 502 })
  }
}
