'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sprout, Loader2, LogOut, ShoppingBag, Package, Tag, ArrowRight, Clock } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'

interface May { id: string; nombre: string; empresa: string | null; token: string; descuento_pct: number | null }
interface Pedido { id: string; numero_pedido: string; estado: string; estado_entrega: string; total: number; created_at: string; fecha_entrega_req: string | null }

function clp(n: number) { return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n || 0) }
function fecha(iso: string | null) { return iso ? new Date(iso).toLocaleDateString('es-CL', { day: '2-digit', month: 'short' }) : '—' }
function estadoCliente(p: Pedido): { t: string; c: string } {
  if (p.estado_entrega === 'entregado' || p.estado === 'entregado') return { t: 'Entregado', c: 'bg-green-100 text-green-700' }
  if (['cargado', 'en_ruta', 'llego_cliente'].includes(p.estado_entrega)) return { t: 'En camino', c: 'bg-blue-100 text-blue-700' }
  const m: Record<string, string> = { confirmado: 'Confirmado', pagado: 'Pagado', en_preparacion: 'En preparación', listo_para_despacho: 'Listo para despacho', asignado: 'En despacho', borrador: 'Borrador', cancelado: 'Cancelado' }
  return { t: m[p.estado] || p.estado, c: 'bg-[#eef1f6] text-[#1b2a4a]' }
}

export default function CuentaMayorista() {
  const router = useRouter()
  const [may, setMay] = useState<May | null>(null)
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [loading, setLoading] = useState(true)
  const [noCuenta, setNoCuenta] = useState(false)

  const cargar = useCallback(async () => {
    const { data: s } = await supabase.auth.getSession()
    if (!s.session) { router.replace('/portal/mayoristas/login'); return }
    const { data: m } = await supabase.from('mayoristas').select('id, nombre, empresa, token, descuento_pct').eq('profile_id', s.session.user.id).order('created_at', { ascending: false }).limit(1).maybeSingle()
    if (!m) { setNoCuenta(true); setLoading(false); return }
    setMay(m as May)
    const { data: p } = await supabase.from('mayorista_pedidos')
      .select('id, numero_pedido, estado, estado_entrega, total, created_at, fecha_entrega_req')
      .eq('mayorista_id', (m as May).id).order('created_at', { ascending: false }).limit(20)
    setPedidos((p as Pedido[]) || [])
    setLoading(false)
  }, [router])

  useEffect(() => { cargar() }, [cargar])
  useEffect(() => {
    if (!may) return
    const ch = supabase.channel('mayorista-cuenta')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mayorista_pedidos', filter: `mayorista_id=eq.${may.id}` }, () => cargar())
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [may, cargar])

  async function salir() { await supabase.auth.signOut(); router.replace('/portal/mayoristas/login') }

  if (loading) return <div className="min-h-screen bg-[#f5f0e8] flex items-center justify-center"><Loader2 className="w-6 h-6 text-[#1b2a4a] animate-spin" /></div>
  if (noCuenta) return (
    <div className="min-h-screen bg-[#f5f0e8] flex flex-col items-center justify-center p-6 text-center">
      <p className="font-semibold text-[#1b2a4a]">Tu cuenta aún no está vinculada a un cliente mayorista.</p>
      <button onClick={salir} className="mt-4 text-sm text-[#c9a24e] underline">Cerrar sesión</button>
    </div>
  )

  const activos = pedidos.filter(p => !['entregado', 'cancelado'].includes(p.estado) && p.estado_entrega !== 'entregado')

  return (
    <div className="min-h-screen bg-[#f5f0e8]">
      <header className="bg-[#1b2a4a] text-white px-5 py-4 flex items-center justify-between">
        <span className="flex items-center gap-2"><Sprout className="w-6 h-6 text-[#c9a24e]" /><span className="font-bold tracking-wide text-sm">NOMMA FOOD</span></span>
        <button onClick={salir} className="text-white/70 hover:text-white flex items-center gap-1 text-sm"><LogOut size={16} /> Salir</button>
      </header>

      <main className="max-w-md mx-auto px-5 py-5 space-y-4">
        <div>
          <p className="text-sm text-gray-500">Hola,</p>
          <h1 className="text-xl font-bold text-[#1b2a4a]">{may?.empresa || may?.nombre}</h1>
          {may?.descuento_pct ? <span className="inline-flex items-center gap-1 mt-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-[#c9a24e]/15 text-[#c9a24e]"><Tag size={12} /> {may.descuento_pct}% de descuento mayorista</span> : null}
        </div>

        <a href={`/portal/mayoristas/${may?.token}`} className="block bg-[#1b2a4a] text-white rounded-2xl p-5 hover:bg-[#142033] transition-colors">
          <div className="flex items-center justify-between">
            <div><p className="font-bold flex items-center gap-2"><ShoppingBag size={18} className="text-[#c9a24e]" /> Ver catálogo y pedir</p><p className="text-white/60 text-sm mt-0.5">Productos, precios y pago en línea</p></div>
            <ArrowRight className="text-[#c9a24e]" />
          </div>
        </a>

        {activos.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-gray-700 mb-2">Pedidos en curso</h2>
            <div className="space-y-2">
              {activos.map(p => {
                const e = estadoCliente(p)
                return (
                  <div key={p.id} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center justify-between">
                    <div><p className="font-semibold text-[#1b2a4a] text-sm">{p.numero_pedido}</p><p className="text-xs text-gray-400 flex items-center gap-1"><Clock size={11} /> Entrega {fecha(p.fecha_entrega_req)} · {clp(p.total)}</p></div>
                    <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${e.c}`}>{e.t}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <div>
          <h2 className="text-sm font-semibold text-gray-700 mb-2">Historial de pedidos</h2>
          {pedidos.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center text-sm text-gray-400"><Package className="w-8 h-8 text-gray-200 mx-auto mb-2" />Aún no tienes pedidos. ¡Haz el primero desde el catálogo!</div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
              {pedidos.map(p => {
                const e = estadoCliente(p)
                return (
                  <div key={p.id} className="flex items-center justify-between px-4 py-3">
                    <div><p className="text-sm font-medium text-[#1b2a4a]">{p.numero_pedido}</p><p className="text-xs text-gray-400">{fecha(p.created_at)}</p></div>
                    <div className="text-right"><p className="text-sm font-semibold text-gray-800">{clp(p.total)}</p><span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${e.c}`}>{e.t}</span></div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
