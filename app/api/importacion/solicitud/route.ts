import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

const str = (v: unknown, n = 500) =>
  v === null || v === undefined || v === '' ? null : String(v).slice(0, n)

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({} as Record<string, unknown>))

  // Honeypot anti-spam
  if (body.website) return NextResponse.json({ ok: true, numero: null })

  // Consentimiento obligatorio
  if (body.consentimiento !== true) {
    return NextResponse.json({ error: 'Debes autorizar el contacto.' }, { status: 400 })
  }

  // Requeridos mínimos
  const nombre = str(body.nombre, 120)
  const descripcion = str(body.descripcion, 1000)
  const contacto = str(body.telefono, 60) || str(body.email, 160)
  if (!nombre || !descripcion || !contacto) {
    return NextResponse.json({ error: 'Faltan datos: nombre, qué buscas importar y un contacto.' }, { status: 400 })
  }

  const insert = {
    tipo:              str(body.tipo, 40),
    rubro:             str(body.rubro, 120),
    descripcion,
    cantidad_estimada: str(body.cantidad_estimada, 120),
    presupuesto:       str(body.presupuesto, 120),
    nombre,
    empresa:           str(body.empresa, 160),
    telefono:          str(body.telefono, 60),
    email:             str(body.email, 160),
    comentario:        str(body.comentario, 1000),
    origen:            str(body.origen, 40) || 'landing',
  }

  const { data, error } = await createServerClient()
    .from('import_requests')
    .insert(insert)
    .select('numero')
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'No pudimos registrar tu solicitud. Intenta de nuevo.' }, { status: 500 })
  }
  return NextResponse.json({ ok: true, numero: data.numero })
}
