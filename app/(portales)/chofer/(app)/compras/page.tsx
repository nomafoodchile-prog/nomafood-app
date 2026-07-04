'use client'

import { useEffect, useState, useCallback } from 'react'
import { ShoppingCart, MapPin, Navigation, Loader2, CreditCard, Clock, User } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'

interface CItem { producto: string; cantidad: number | null; unidad: string | null; observaciones: string | null }
interface Compra {
  id: string; numero: string; proveedor: string | null; direccion: string | null
  telefono: string | null; contacto: string | null; horario_atencion: string | null
  forma_pago: string | null; monto_autorizado: number | null; estado: string
  observaciones: string | null; lat: number | null; lng: number | null
  items: CItem[]
}
const EST: Record<string, string> = { asignada: 'bg-[#eef1f6] text-[#1b2a4a]', en_compra: 'bg-amber-100 text-amber-700', finalizada: 'bg-green-100 text-green-700', cancelada: 'bg-red-100 text-red-700' }
const EST_L: Record<string, string> = { asignada: 'Asignada', en_compra: 'En compra', finalizada: 'Finalizada', cancelada: 'Cancelada' }
function clp(n: number) { return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n || 0) }

export default function ComprasPage() {
  const [compras, setCompras] = useState<Compra[]>([])
  const [loading, setLoading] = useState(true)

  const cargar = useCallback(async () => {
    const { data: d } = await supabase.from('drivers').select('id').limit(1).maybeSingle()
    if (!d) { setLoading(false); return }
    const { data } = await supabase.from('compras')
      .select('id, numero, proveedor, direccion, telefono, contacto, horario_atencion, forma_pago, monto_autorizado, estado, observaciones, lat, lng, items:compra_items(producto, cantidad, unidad, observaciones)')
      .eq('driver_id', d.id).order('created_at', { ascending: false })
    setCompras((data as unknown as Compra[]) || [])
    setLoading(false)
  }, [])
  useEffect(() => { cargar() }, [cargar])

  function navegar(c: Compra) {
    const dest = c.lat && c.lng ? `${c.lat},${c.lng}` : encodeURIComponent(c.direccion || '')
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${dest}`, '_blank')
  }

  return (
    <div>
      <div className="bg-[#1b2a4a] text-white px-5 py-4"><h1 className="text-lg font-semibold text-center">Compras</h1></div>
      {loading ? (
        <div className="py-16 flex justify-center"><Loader2 className="w-6 h-6 text-[#1b2a4a] animate-spin" /></div>
      ) : compras.length === 0 ? (
        <div className="px-5 py-16 flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-full bg-[#eef1f6] flex items-center justify-center mb-3"><ShoppingCart className="w-7 h-7 text-[#1b2a4a]" /></div>
          <p className="font-semibold text-gray-800">Sin compras asignadas</p>
          <p className="text-sm text-gray-500 mt-1 max-w-xs">La Central te asignará aquí las solicitudes de compra.</p>
        </div>
      ) : (
        <div className="px-5 py-4 space-y-4">
          {compras.map(c => (
            <div key={c.id} className="bg-white rounded-2xl border border-gray-100 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{c.numero}</span>
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${EST[c.estado] || 'bg-gray-100 text-gray-600'}`}>{EST_L[c.estado] || c.estado}</span>
              </div>
              <p className="font-bold text-gray-900">{c.proveedor}</p>
              <p className="text-sm text-gray-500 flex items-center gap-1"><MapPin size={13} />{c.direccion}</p>
              <div className="grid grid-cols-2 gap-y-1 mt-2 text-xs text-gray-500">
                {c.contacto && <span className="flex items-center gap-1"><User size={12} />{c.contacto}</span>}
                {c.horario_atencion && <span className="flex items-center gap-1"><Clock size={12} />{c.horario_atencion}</span>}
                {c.forma_pago && <span className="flex items-center gap-1"><CreditCard size={12} />{c.forma_pago}</span>}
                {c.monto_autorizado != null && <span className="font-semibold text-gray-700">Tope {clp(c.monto_autorizado)}</span>}
              </div>

              <div className="mt-3 border-t border-gray-100 pt-3">
                <p className="text-xs font-semibold text-[#c9a24e] uppercase tracking-wide mb-2">Lista de compra</p>
                <div className="space-y-1.5">
                  {c.items?.map((it, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span className="text-gray-700">{it.producto}{it.observaciones && <span className="text-gray-400"> · {it.observaciones}</span>}</span>
                      <span className="font-semibold text-gray-900 whitespace-nowrap">{it.cantidad} {it.unidad}</span>
                    </div>
                  ))}
                </div>
              </div>

              {c.observaciones && <p className="text-xs text-gray-400 italic mt-2">Obs: {c.observaciones}</p>}

              <button onClick={() => navegar(c)} className="w-full mt-3 bg-white border border-gray-200 text-gray-700 font-medium py-2.5 rounded-xl flex items-center justify-center gap-2">
                <Navigation className="w-4 h-4 text-[#1b2a4a]" /> Navegar al proveedor
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
