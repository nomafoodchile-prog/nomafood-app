import { NextRequest, NextResponse } from 'next/server'

// Geocodifica una dirección → { lat, lng } usando Nominatim (OpenStreetMap).
// Server-side para respetar la política de uso (User-Agent, sin exponer al cliente).
export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim()
  if (!q) return NextResponse.json({ error: 'Falta la dirección' }, { status: 400 })

  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=cl&q=${encodeURIComponent(q)}`
  try {
    const r = await fetch(url, {
      headers: {
        'User-Agent': 'NommaFood-Logistica/1.0 (contacto: brotesladera@gmail.com)',
        'Accept-Language': 'es',
      },
    })
    if (!r.ok) return NextResponse.json({ error: 'geocode_upstream' }, { status: 502 })
    const data = (await r.json()) as Array<{ lat: string; lon: string; display_name: string }>
    if (!Array.isArray(data) || data.length === 0) return NextResponse.json({ found: false })
    const { lat, lon, display_name } = data[0]
    return NextResponse.json({ found: true, lat: Number(lat), lng: Number(lon), display: display_name })
  } catch {
    return NextResponse.json({ error: 'geocode_failed' }, { status: 502 })
  }
}
