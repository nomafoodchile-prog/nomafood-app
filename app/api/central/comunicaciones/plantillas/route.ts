import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getCentralUser } from '@/lib/central/guard'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET → plantillas por marca: { "Brotes Asiáticos": { recibido: "...", ... }, "NOMMA FOOD": {...} }
export async function GET() {
  const { isAdmin } = await getCentralUser()
  if (!isAdmin) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  const db = createServerClient()
  const { data, error } = await db.from('wa_plantillas').select('marca, tipo, texto')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const porMarca: Record<string, Record<string, string>> = {}
  for (const p of data || []) {
    (porMarca[p.marca] = porMarca[p.marca] || {})[p.tipo] = p.texto
  }
  return NextResponse.json({ ok: true, plantillas: porMarca })
}

// POST → edita/crea una plantilla { marca, tipo, texto } (configurable sin deploy)
export async function POST(req: NextRequest) {
  const { isAdmin } = await getCentralUser()
  if (!isAdmin) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  let b: any = {}
  try { b = await req.json() } catch { /* vacío */ }
  if (!b.marca || !b.tipo || !b.texto) return NextResponse.json({ error: 'Faltan datos' }, { status: 400 })
  const db = createServerClient()
  const { error } = await db.from('wa_plantillas')
    .upsert({ marca: b.marca, tipo: b.tipo, texto: b.texto, updated_at: new Date().toISOString() }, { onConflict: 'marca,tipo' })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
