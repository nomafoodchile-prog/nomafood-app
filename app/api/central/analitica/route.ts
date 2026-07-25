import { NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase/auth-server'
import { createServerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

const VER = ['SuperAdmin', 'Administracion', 'Gerencia', 'Comercial']

type Row = Record<string, unknown>
const S = (v: unknown) => (v === null || v === undefined ? '' : String(v))

async function getAuth() {
  const { data: { user } } = await getServerSupabase().auth.getUser()
  if (!user) return null
  const { data: p } = await createServerClient().from('profiles').select('role').eq('id', user.id).maybeSingle()
  return { role: (p?.role as string) || '' }
}

// Clasifica el origen de la visita: UTM si viene, si no deduce del referrer.
function fuente(v: Row): string {
  const utm = S(v.utm_source).trim()
  if (utm) return utm
  const r = S(v.referrer).toLowerCase()
  if (!r) return 'Directo'
  if (r.includes('google')) return 'Google'
  if (r.includes('instagram')) return 'Instagram'
  if (r.includes('facebook') || r.includes('fb.')) return 'Facebook'
  if (r.includes('whatsapp') || r.includes('wa.me')) return 'WhatsApp'
  if (r.includes('tiktok')) return 'TikTok'
  if (r.includes('bing')) return 'Bing'
  try { return new URL(S(v.referrer)).hostname.replace(/^www\./, '') } catch { return 'Otro' }
}

const topN = (m: Map<string, number>, n: number) =>
  [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, v]) => ({ nombre: k, total: v }))

export async function GET() {
  const auth = await getAuth()
  if (!auth || !VER.includes(auth.role)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const db = createServerClient()
  const dias = 30
  const desde = new Date(Date.now() - dias * 24 * 3600 * 1000).toISOString()

  const { data } = await db.from('web_visits')
    .select('path, referrer, utm_source, utm_campaign, visitor_id, created_at')
    .gte('created_at', desde)
    .order('created_at', { ascending: false })
    .limit(20000)

  const rows = (data || []) as Row[]

  const porFuente = new Map<string, number>()
  const porPath = new Map<string, number>()
  const porCampana = new Map<string, number>()
  const porDia = new Map<string, number>()
  const visitantes = new Set<string>()

  for (const v of rows) {
    porFuente.set(fuente(v), (porFuente.get(fuente(v)) || 0) + 1)
    const path = S(v.path) || '/'
    porPath.set(path, (porPath.get(path) || 0) + 1)
    const camp = S(v.utm_campaign).trim()
    if (camp) porCampana.set(camp, (porCampana.get(camp) || 0) + 1)
    const dia = S(v.created_at).slice(0, 10)
    if (dia) porDia.set(dia, (porDia.get(dia) || 0) + 1)
    const vid = S(v.visitor_id)
    if (vid) visitantes.add(vid)
  }

  // Serie de los últimos 14 días (rellenando días sin visitas con 0)
  const serie: { dia: string; total: number }[] = []
  for (let i = 13; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 3600 * 1000).toISOString().slice(0, 10)
    serie.push({ dia: d, total: porDia.get(d) || 0 })
  }

  return NextResponse.json({
    ok: true,
    rango_dias: dias,
    total_visitas: rows.length,
    visitantes_unicos: visitantes.size,
    fuentes: topN(porFuente, 8),
    paths: topN(porPath, 8),
    campanas: topN(porCampana, 8),
    serie,
  })
}
