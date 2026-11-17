import { NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase/auth-server'
import { createServerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ROLES = ['SuperAdmin', 'Administracion', 'Gerencia']
const S = (v: unknown) => (v === null || v === undefined ? '' : String(v))
type Row = Record<string, unknown>

// Palabras que delatan datos de prueba/demo
const PATRONES = ['demo', 'prueba', 'test', 'ejemplo', 'ficticio', 'lorem']
const EMAIL_DEMO = ['example.com', 'test.com', 'mailinator']

function pareceDemo(valores: string[]): string | null {
  for (const v of valores) {
    const low = v.toLowerCase().trim()
    if (!low) continue
    for (const p of PATRONES) if (low.includes(p)) return `"${v}" contiene "${p}"`
    for (const d of EMAIL_DEMO) if (low.includes(d)) return `correo de prueba (${d})`
  }
  return null
}

// Config: tabla, columnas de texto a revisar, columnas a mostrar
const TABLAS: { tabla: string; cols: string[]; etiqueta: string }[] = [
  { tabla: 'products', cols: ['nombre', 'sku', 'marca'], etiqueta: 'Productos' },
  { tabla: 'mayoristas', cols: ['nombre', 'empresa', 'email'], etiqueta: 'Clientes mayoristas' },
  { tabla: 'proveedores', cols: ['nombre', 'email'], etiqueta: 'Proveedores' },
  { tabla: 'recetas', cols: ['nombre'], etiqueta: 'Recetas' },
  { tabla: 'minorista_pedidos', cols: ['cliente_nombre', 'cliente_email', 'numero'], etiqueta: 'Pedidos minorista' },
]

export async function GET() {
  const { data: { user } } = await getServerSupabase().auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  const db = createServerClient()
  const { data: profile } = await db.from('profiles').select('role').eq('id', user.id).maybeSingle()
  if (!ROLES.includes(S(profile?.role))) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const términos = [...PATRONES, ...EMAIL_DEMO]
  // Todas las tablas en PARALELO, solo el filtro ilike (sin conteo total caro)
  const resultados = await Promise.all(TABLAS.map(async t => {
    const orExpr = t.cols.flatMap(c => términos.map(p => `${c}.ilike.*${p}*`)).join(',')
    const { data, error } = await db.from(t.tabla).select(['id', ...t.cols].join(', ')).or(orExpr).limit(100)
    if (error) return { tabla: t.tabla, etiqueta: t.etiqueta, error: error.message, sospechosas: [], sospechosasTotal: 0 }
    const sospechosas = ((data as unknown as Row[] | null) || []).map(r => ({
      id: S(r.id),
      muestra: t.cols.map(c => S(r[c])).filter(Boolean).join(' · '),
      motivo: pareceDemo(t.cols.map(c => S(r[c]))) || 'coincidencia',
    }))
    return { tabla: t.tabla, etiqueta: t.etiqueta, sospechosas, sospechosasTotal: sospechosas.length }
  }))

  return NextResponse.json({ ok: true, resultados })
}
