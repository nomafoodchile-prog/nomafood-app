import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase/auth-server'
import { createServerClient } from '@/lib/supabase/server'
import { contextoAldea } from '@/lib/aldea/permisos'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const hoyCL = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' }).format(new Date())

// GET /api/portal/aldea/facturas?sucursal= → facturas de la sucursal
export async function GET(req: NextRequest) {
  const { data: { user } } = await getServerSupabase().auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  const db = createServerClient()
  const ctx = await contextoAldea(db, user.id)
  if (!ctx) return NextResponse.json({ error: 'Sin acceso' }, { status: 403 })

  const sucursal = req.nextUrl.searchParams.get('sucursal') || [...ctx.sucursales][0]
  if (!sucursal || !ctx.sucursales.has(sucursal)) return NextResponse.json({ error: 'No puedes ver esta sucursal' }, { status: 403 })

  const { data } = await db.from('aldea_facturas')
    .select('id, numero, monto, fecha_emision, fecha_vencimiento, estado, pdf_url, created_at')
    .eq('mayorista_id', sucursal).order('fecha_vencimiento', { ascending: true, nullsFirst: false })

  const hoy = hoyCL()
  const facturas = (data || []).map(f => {
    let estado_real = f.estado
    if (f.estado === 'por_pagar' && f.fecha_vencimiento && String(f.fecha_vencimiento) < hoy) estado_real = 'vencida'
    return { ...f, monto: Number(f.monto), estado_real }
  })
  const resumen = {
    por_pagar: facturas.filter(f => f.estado_real !== 'pagada').reduce((s, f) => s + f.monto, 0),
    vencidas: facturas.filter(f => f.estado_real === 'vencida').reduce((s, f) => s + f.monto, 0),
    n_vencidas: facturas.filter(f => f.estado_real === 'vencida').length,
  }
  return NextResponse.json({ facturas, resumen })
}
