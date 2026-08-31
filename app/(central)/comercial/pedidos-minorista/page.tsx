'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { ShoppingCart, Loader2, RefreshCw, X, MapPin, Phone, Mail, Package } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'

interface Item { id: string; producto_nombre: string; producto_sku: string | null; cantidad: number; precio: number }
interface Pedido {
  id: string; wc_order_id: number | null; numero: string; marca: string
  cliente_nombre: string | null; cliente_email: string | null; cliente_telefono: string | null
  despacho_direccion: string | null; despacho_comuna: string | null; despacho_region: string | null
  subtotal: number; envio: number; iva: number; total: number; estado: string
  metodo_pago: string | null; notas: string | null; created_at: string
  items?: Item[]
}

const fmt = (n: number) => '$' + Math.round(n || 0).toLocaleString('es-CL')
const cuando = (iso: string) => new Date(iso).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' })
const EST: Record<string, string> = {
  nuevo: 'noma-badge-blue', procesando: 'noma-badge-gold', processing: 'noma-badge-gold', 'on-hold': 'noma-badge-gold',
  pending: 'noma-badge-gold', pendiente_pago: 'noma-badge-gold', completado: 'noma-badge-green', completed: 'noma-badge-green',
  cancelado: 'noma-badge-red', cancelled: 'noma-badge-red', failed: 'noma-badge-red',
}

export default function PedidosMinorista() {
  const [rows, setRows] = useState<Pedido[]>([])
  const [loading, setLoading] = useState(true)
  const [marca, setMarca] = useState('todas')
  const [q, setQ] = useState('')
  const [sel, setSel] = useState<Pedido | null>(null)

  const cargar = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('minorista_pedidos')
      .select('*, items:minorista_pedido_items(*)')
      .order('created_at', { ascending: false })
      .limit(200)
    setRows((data as Pedido[]) || [])
    setLoading(false)
  }, [])
  useEffect(() => { cargar() }, [cargar])

  const filtered = useMemo(() => rows.filter(p => {
    const mM = marca === 'todas' || p.marca === marca
    const s = (q || '').toLowerCase()
    const mQ = !s || [p.numero, p.cliente_nombre, p.cliente_email, p.despacho_comuna].some(v => (v || '').toLowerCase().includes(s))
    return mM && mQ
  }), [rows, marca, q])

  return (
    <div className="p-4 lg:p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-[#16233f] flex items-center gap-2"><ShoppingCart className="w-6 h-6" /> Pedidos minorista</h1>
          <p className="text-sm text-gray-500">Pedidos de la web (retail) que llegan a la Central.</p>
        </div>
        <button onClick={cargar} className="flex items-center gap-1.5 text-sm bg-white border px-3 py-2 rounded-xl hover:bg-gray-50"><RefreshCw className="w-4 h-4" /> Actualizar</button>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {['todas', 'Brotes Asiáticos', 'NOMMA FOOD'].map(m => (
          <button key={m} onClick={() => setMarca(m)} className={`px-3 py-1.5 rounded-full text-sm font-medium ${marca === m ? 'bg-[#16233f] text-white' : 'bg-white border text-gray-600'}`}>{m === 'todas' ? 'Todas' : m}</button>
        ))}
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar pedido, cliente, comuna..." className="flex-1 min-w-[200px] px-3 py-2 rounded-xl border text-sm" />
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400"><Package className="w-10 h-10 mx-auto mb-2 opacity-30" /><p className="text-sm">Aún no hay pedidos minorista.</p></div>
      ) : (
        <div className="bg-white rounded-2xl border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase"><tr>
              <th className="text-left px-4 py-2">Pedido</th><th className="text-left px-4 py-2">Cliente</th>
              <th className="text-left px-4 py-2">Comuna</th><th className="text-right px-4 py-2">Total</th>
              <th className="text-left px-4 py-2">Estado</th><th className="text-left px-4 py-2">Fecha</th>
            </tr></thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id} onClick={() => setSel(p)} className="border-t hover:bg-gray-50 cursor-pointer">
                  <td className="px-4 py-2.5 font-semibold text-[#16233f]">#{p.numero}<div className="text-[11px] text-gray-400">{p.marca}</div></td>
                  <td className="px-4 py-2.5">{p.cliente_nombre || '—'}<div className="text-[11px] text-gray-400">{p.cliente_email}</div></td>
                  <td className="px-4 py-2.5">{p.despacho_comuna || '—'}</td>
                  <td className="px-4 py-2.5 text-right font-semibold">{fmt(p.total)}</td>
                  <td className="px-4 py-2.5"><span className={`text-xs px-2 py-0.5 rounded-full ${EST[p.estado] || 'noma-badge-gold'}`}>{p.estado}</span></td>
                  <td className="px-4 py-2.5 text-gray-500">{cuando(p.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {sel && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setSel(null)}>
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[85vh] overflow-auto" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b flex items-center justify-between">
              <div><h2 className="font-bold text-[#16233f]">Pedido #{sel.numero}</h2><p className="text-xs text-gray-400">{sel.marca} · {cuando(sel.created_at)}</p></div>
              <button onClick={() => setSel(null)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="p-5 space-y-3 text-sm">
              <div className="flex flex-col gap-1 text-gray-600">
                {sel.cliente_nombre && <span className="font-semibold text-[#16233f] text-base">{sel.cliente_nombre}</span>}
                {sel.cliente_email && <span className="flex items-center gap-2"><Mail className="w-4 h-4 text-gray-400" />{sel.cliente_email}</span>}
                {sel.cliente_telefono && <span className="flex items-center gap-2"><Phone className="w-4 h-4 text-gray-400" />{sel.cliente_telefono}</span>}
                {(sel.despacho_direccion || sel.despacho_comuna) && <span className="flex items-center gap-2"><MapPin className="w-4 h-4 text-gray-400" />{[sel.despacho_direccion, sel.despacho_comuna, sel.despacho_region].filter(Boolean).join(', ')}</span>}
              </div>
              {sel.notas && <div className="bg-amber-50 text-amber-800 text-xs p-2 rounded-lg">Nota: {sel.notas}</div>}
              <div className="border rounded-xl overflow-hidden">
                {(sel.items || []).map(it => (
                  <div key={it.id} className="flex justify-between px-3 py-2 border-b last:border-0">
                    <span>{it.cantidad}× {it.producto_nombre}</span><span className="font-medium">{fmt(it.precio * it.cantidad)}</span>
                  </div>
                ))}
              </div>
              <div className="space-y-1 pt-1">
                <div className="flex justify-between text-gray-500"><span>Subtotal</span><span>{fmt(sel.subtotal)}</span></div>
                <div className="flex justify-between text-gray-500"><span>Envío</span><span>{fmt(sel.envio)}</span></div>
                <div className="flex justify-between font-bold text-[#16233f] text-base pt-1 border-t"><span>Total</span><span>{fmt(sel.total)}</span></div>
                {sel.metodo_pago && <div className="text-xs text-gray-400 text-right">Pago: {sel.metodo_pago}</div>}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
