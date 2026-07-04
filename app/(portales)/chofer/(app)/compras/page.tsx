'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { ShoppingCart, MapPin, Navigation, Loader2, CreditCard, Clock, User, Camera, Check, Plus, Flag } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'

interface CItem {
  id: string; producto: string; cantidad: number | null; unidad: string | null; observaciones: string | null
  precio_unitario: number | null; comprado: boolean; foto_url: string | null; nota: string | null
}
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
  const [driverId, setDriverId] = useState<string | null>(null)

  const cargar = useCallback(async () => {
    const { data: d } = await supabase.from('drivers').select('id').limit(1).maybeSingle()
    if (!d) { setLoading(false); return }
    setDriverId(d.id)
    const { data } = await supabase.from('compras')
      .select('id, numero, proveedor, direccion, telefono, contacto, horario_atencion, forma_pago, monto_autorizado, estado, observaciones, lat, lng, items:compra_items(id, producto, cantidad, unidad, observaciones, precio_unitario, comprado, foto_url, nota)')
      .eq('driver_id', d.id).order('created_at', { ascending: false })
    const list = (data as unknown as Compra[]) || []
    list.forEach(c => c.items?.sort((a, b) => a.producto.localeCompare(b.producto)))
    setCompras(list)
    setLoading(false)
  }, [])
  useEffect(() => { cargar() }, [cargar])

  function updateLocal(compraId: string, itemId: string, patch: Partial<CItem>) {
    setCompras(cs => cs.map(c => c.id !== compraId ? c : { ...c, items: c.items.map(it => it.id === itemId ? { ...it, ...patch } : it) }))
  }

  async function toggleComprado(c: Compra, it: CItem) {
    const nuevo = !it.comprado
    updateLocal(c.id, it.id, { comprado: nuevo })
    const { error } = await supabase.rpc('guardar_item_compra', { p_item_id: it.id, p_comprado: nuevo })
    if (error) { updateLocal(c.id, it.id, { comprado: it.comprado }) }
  }
  async function guardarPrecio(c: Compra, it: CItem, valor: number | null) {
    await supabase.rpc('guardar_item_compra', { p_item_id: it.id, p_precio: valor })
  }
  async function subirFoto(c: Compra, it: CItem, file: File) {
    const path = `${c.id}/${it.id}-${Date.now()}-${file.name.replace(/[^a-z0-9.]/gi, '_')}`
    const up = await supabase.storage.from('comprobantes').upload(path, file)
    if (up.error) return
    updateLocal(c.id, it.id, { foto_url: path })
    await supabase.rpc('guardar_item_compra', { p_item_id: it.id, p_foto_url: path })
  }
  async function agregar(c: Compra, producto: string) {
    const { error } = await supabase.rpc('agregar_item_compra', { p_compra_id: c.id, p_producto: producto })
    if (!error) cargar()
  }
  async function finalizar(c: Compra) {
    await supabase.from('compras').update({ estado: 'finalizada', updated_at: new Date().toISOString() }).eq('id', c.id)
    cargar()
  }
  function navegar(c: Compra) {
    const url = c.lat != null && c.lng != null
      ? `https://www.waze.com/ul?ll=${c.lat}%2C${c.lng}&navigate=yes`
      : `https://www.waze.com/ul?q=${encodeURIComponent(c.direccion || '')}&navigate=yes`
    window.open(url, '_blank')
  }

  if (loading) return <div className="py-16 flex justify-center"><Loader2 className="w-6 h-6 text-[#1b2a4a] animate-spin" /></div>

  return (
    <div>
      <div className="bg-[#1b2a4a] text-white px-5 py-4"><h1 className="text-lg font-semibold text-center">Compras</h1></div>
      {compras.length === 0 ? (
        <div className="px-5 py-16 flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-full bg-[#eef1f6] flex items-center justify-center mb-3"><ShoppingCart className="w-7 h-7 text-[#1b2a4a]" /></div>
          <p className="font-semibold text-gray-800">Sin compras asignadas</p>
          <p className="text-sm text-gray-500 mt-1 max-w-xs">La Central te asignará aquí las solicitudes de compra.</p>
        </div>
      ) : (
        <div className="px-5 py-4 space-y-4">
          {compras.map(c => {
            const editable = c.estado === 'asignada' || c.estado === 'en_compra'
            const total = c.items?.reduce((s, it) => s + (it.precio_unitario || 0), 0) || 0
            const comprados = c.items?.filter(it => it.comprado).length || 0
            const sobreTope = c.monto_autorizado != null && total > c.monto_autorizado
            return (
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

                <button onClick={() => navegar(c)} className="w-full mt-3 bg-white border border-gray-200 text-gray-700 font-medium py-2.5 rounded-xl flex items-center justify-center gap-2">
                  <Navigation className="w-4 h-4 text-[#1b2a4a]" /> Navegar con Waze
                </button>

                <div className="mt-3 border-t border-gray-100 pt-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-[#c9a24e] uppercase tracking-wide">Lista de compra</p>
                    <span className="text-[11px] text-gray-400">{comprados}/{c.items?.length || 0} comprados</span>
                  </div>
                  <div className="space-y-2">
                    {c.items?.map(it => (
                      <ItemFila key={it.id} it={it} editable={editable}
                        onToggle={() => toggleComprado(c, it)}
                        onPrecio={v => { updateLocal(c.id, it.id, { precio_unitario: v }) }}
                        onPrecioBlur={v => guardarPrecio(c, it, v)}
                        onFoto={f => subirFoto(c, it, f)} />
                    ))}
                  </div>

                  {editable && <AgregarItem onAdd={p => agregar(c, p)} />}

                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-100">
                    <span className="text-sm text-gray-500">Total gastado</span>
                    <span className={`font-bold ${sobreTope ? 'text-red-600' : 'text-gray-900'}`}>{clp(total)}</span>
                  </div>
                  {sobreTope && <p className="text-[11px] text-red-500 text-right">Supera el tope autorizado</p>}
                </div>

                {editable && (
                  <button onClick={() => finalizar(c)} className="w-full mt-3 bg-[#1b2a4a] hover:bg-[#142033] text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2">
                    <Flag className="w-4 h-4" /> Finalizar compra
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function ItemFila({ it, editable, onToggle, onPrecio, onPrecioBlur, onFoto }: {
  it: CItem; editable: boolean
  onToggle: () => void; onPrecio: (v: number | null) => void; onPrecioBlur: (v: number | null) => void; onFoto: (f: File) => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [subiendo, setSubiendo] = useState(false)
  return (
    <div className={`rounded-xl border p-2.5 ${it.comprado ? 'border-green-200 bg-green-50/40' : 'border-gray-100'}`}>
      <div className="flex items-center gap-2.5">
        <button onClick={onToggle} disabled={!editable}
          className={`w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 border ${it.comprado ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 text-transparent'}`}>
          <Check size={15} />
        </button>
        <div className="min-w-0 flex-1">
          <p className={`text-sm ${it.comprado ? 'text-gray-500 line-through' : 'text-gray-800'}`}>{it.producto}</p>
          <p className="text-[11px] text-gray-400">{it.cantidad ?? ''} {it.unidad || ''}{it.observaciones ? ` · ${it.observaciones}` : ''}</p>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <div className="relative">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[11px] text-gray-400">$</span>
            <input type="number" inputMode="numeric" disabled={!editable}
              value={it.precio_unitario ?? ''} placeholder="precio"
              onChange={e => onPrecio(e.target.value === '' ? null : Number(e.target.value))}
              onBlur={e => onPrecioBlur(e.target.value === '' ? null : Number(e.target.value))}
              className="w-[86px] pl-5 pr-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c9a24e]" />
          </div>
          <button onClick={() => fileRef.current?.click()} disabled={!editable}
            className={`w-9 h-9 rounded-lg border flex items-center justify-center flex-shrink-0 ${it.foto_url ? 'border-green-300 bg-green-50 text-green-600' : 'border-gray-200 text-[#1b2a4a]'}`}>
            {subiendo ? <Loader2 size={15} className="animate-spin" /> : <Camera size={15} />}
          </button>
          <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden"
            onChange={async e => { const f = e.target.files?.[0]; if (f) { setSubiendo(true); await onFoto(f); setSubiendo(false) } }} />
        </div>
      </div>
    </div>
  )
}

function AgregarItem({ onAdd }: { onAdd: (producto: string) => void }) {
  const [txt, setTxt] = useState('')
  return (
    <div className="flex gap-2 mt-2">
      <input value={txt} onChange={e => setTxt(e.target.value)} placeholder="Agregar producto…"
        className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c9a24e]" />
      <button onClick={() => { if (txt.trim()) { onAdd(txt.trim()); setTxt('') } }}
        className="px-3 rounded-lg bg-[#c9a24e] text-[#1b2a4a] font-semibold flex items-center gap-1 text-sm">
        <Plus size={15} /> Añadir
      </button>
    </div>
  )
}
