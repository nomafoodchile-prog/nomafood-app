import { NextRequest, NextResponse } from 'next/server'
import { createServerClient as createSsrClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

// Estados válidos de un pedido mayorista (deben coincidir con el flujo del portal)
const ESTADOS_VALIDOS = [
  'borrador',
  'confirmado',
  'pagado',
  'en_preparacion',
  'despachado',
  'entregado',
  'cancelado',
] as const

// Verifica que quien llama tenga una sesión iniciada en la app central.
// Devuelve el usuario o null; la API responde 401 si no hay sesión.
async function getSessionUser() {
  const cookieStore = cookies()
  const supabase = createSsrClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll() {
          // Solo lectura de sesión en el route handler; no se refrescan cookies.
        },
      },
    }
  )
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

// Cliente con service_role para leer/escribir los pedidos (bypasa RLS).
function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

// GET /api/central/pedidos-mayoristas — lista los pedidos mayoristas reales
export async function GET() {
  const user = await getSessionUser()
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { data, error } = await admin()
    .from('mayorista_pedidos')
    .select(`
      id, numero_pedido, estado, total, subtotal, descuento_monto,
      direccion_entrega, fecha_entrega_req, notas, created_at, mp_status,
      mayorista:mayoristas ( nombre, empresa, email, telefono ),
      items:mayorista_pedido_items ( producto_nombre, producto_sku, cantidad, precio_final, unidad )
    `)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: 'Error al leer pedidos' }, { status: 500 })
  }

  return NextResponse.json({ pedidos: data ?? [] })
}

// PATCH /api/central/pedidos-mayoristas — cambia el estado de un pedido
export async function PATCH(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const { id, estado } = body as { id?: string; estado?: string }

  if (!id || !estado) {
    return NextResponse.json({ error: 'Faltan id o estado.' }, { status: 400 })
  }
  if (!ESTADOS_VALIDOS.includes(estado as (typeof ESTADOS_VALIDOS)[number])) {
    return NextResponse.json({ error: 'Estado no válido.' }, { status: 400 })
  }

  const { error } = await admin()
    .from('mayorista_pedidos')
    .update({ estado })
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: 'No se pudo actualizar el pedido.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, id, estado })
}

