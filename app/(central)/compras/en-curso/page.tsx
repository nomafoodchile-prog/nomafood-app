'use client'

import { useCallback, useEffect, useState } from 'react'
import { ShoppingCart, Loader2, RefreshCw, Check, Circle, User, Camera, Image as ImageIcon } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'

interface CItem { id: string; producto: string; cantidad: number | null; unidad: string | null; precio_unitario: number | null; comprado: boolean; foto_url: string | null }
interface Compra {
  id: string; numero: string; proveedor: string | null; estado: string; monto_autorizado: number | null; created_at: string
  driver: { nombre: string } | null
  items: CItem[]
}
const EST: Record<string, string> = { asignada: 'noma-badge-gray', en_compra: 'noma-badge-gold', finalizada: 'noma-badge-green', cancelada: 'noma-badge-red' }
const EST_L: Record<string, string> = { asignada: 'Asignada', en_compra: 'En compra', finalizada: 'Finalizada', cancelada: 'Cancelada' }
function clp(n: number) { return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n || 0) }

export default function ComprasEnCurso() {
  const [compras, setCompras] = useState<Compra[]>([])
  const [loading, setLoading] = useState(true)

  const cargar = useCallback(async () => {
    const { data } = await supabase.from('compras')
      .select('id, numero, proveedor, estado, monto_autorizado, created_at, driver:drivers(nombre), items:compra_items(id, producto, cantidad, unidad, precio_unitario, comprado, foto_url)')
      .neq('estado', 'cancelada').order('created_at', { ascending: false }).limit(30)
    const list = (data as unknown as Compra[]) || []
    list.forEach(c => c.items?.sort((a, b) => a.producto.localeCompare(b.producto)))
    setCompras(list)
    setLoading(false)
  }, [])
  useEffect(() => { cargar() }, [cargar])
  useEffect(() => {
    const ch = supabase.channel('central-compras')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'compra_items' }, () => cargar())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'compras' }, () => cargar())
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [cargar])

  async function verFoto(path: string) {
    const { data } = await supabase.storage.from('comprobantes').createSignedUrl(path, 3600)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank')
  }

  if (loading) return <div className="min-h-[60vh] flex items-center justify-center"><Loader2 className="w-6 h-6 text-[#1b2a4a] animate-spin" /></div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1b2a4a] flex items-center gap-2"><ShoppingCart className="w-6 h-6 text-[#c9a24e]" /> Compras en curso</h1>
          <p className="text-sm text-gray-500 mt-0.5">Lo que cada chofer va comprando, en tiempo real.</p>
        </div>
        <span className="flex items-center gap-1.5 text-xs font-semibold text-green-700 bg-green-50 px-3 py-1.5 rounded-full">
          <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" /><span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" /></span> En vivo
        </span>
      </div>

      {compras.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-card p-10 text-center text-sm text-gray-400">No hay compras registradas.</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {compras.map(c => {
            const total = c.items?.reduce((s, it) => s + (it.precio_unitario || 0), 0) || 0
            const comprados = c.items?.filter(it => it.comprado).length || 0
            const sobreTope = c.monto_autorizado != null && total > c.monto_autorizado
            return (
              <div key={c.id} className="bg-white rounded-2xl shadow-card p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-[#1b2a4a]">{c.proveedor || 'Compra'}</p>
                    <p className="text-xs text-gray-400 flex items-center gap-1"><User size={12} />{c.driver?.nombre || '—'} · {c.numero}</p>
                  </div>
                  <span className={EST[c.estado] || 'noma-badge-gray'}>{EST_L[c.estado] || c.estado}</span>
                </div>

                <div className="mt-3 space-y-1.5">
                  {c.items?.length ? c.items.map(it => (
                    <div key={it.id} className="flex items-center gap-2 text-sm">
                      {it.comprado
                        ? <Check size={15} className="text-green-600 flex-shrink-0" />
                        : <Circle size={15} className="text-gray-300 flex-shrink-0" />}
                      <span className={`flex-1 min-w-0 truncate ${it.comprado ? 'text-gray-500' : 'text-gray-800'}`}>{it.producto}{it.cantidad ? ` · ${it.cantidad} ${it.unidad || ''}` : ''}</span>
                      {it.foto_url && (
                        <button onClick={() => verFoto(it.foto_url!)} className="text-[#1b2a4a] hover:text-[#c9a24e] flex-shrink-0" title="Ver foto"><ImageIcon size={15} /></button>
                      )}
                      <span className="text-gray-700 font-medium w-16 text-right flex-shrink-0">{it.precio_unitario != null ? clp(it.precio_unitario) : '—'}</span>
                    </div>
                  )) : <p className="text-xs text-gray-400">Sin ítems.</p>}
                </div>

                <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-100 text-sm">
                  <span className="text-gray-400">{comprados}/{c.items?.length || 0} comprados</span>
                  <span className={`font-bold ${sobreTope ? 'text-red-600' : 'text-[#1b2a4a]'}`}>
                    {clp(total)}{c.monto_autorizado != null && <span className="text-xs font-normal text-gray-400"> / {clp(c.monto_autorizado)}</span>}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
