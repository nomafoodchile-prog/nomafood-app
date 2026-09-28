'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, Check, PackageCheck, MapPin } from 'lucide-react'

interface Item { id: string; producto_nombre: string; producto_sku: string | null; cantidad: number; unidad: string | null; pickeado: boolean; cantidad_pickeada: number | null }
interface Pedido { id: string; numero_pedido: string; total: number; estado_armado: string; direccion_entrega: string | null; mayorista: { nombre: string; empresa: string | null } | null }

export default function PickerPedido({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [pedido, setPedido] = useState<Pedido | null>(null)
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [finalizando, setFinalizando] = useState(false)

  const cargar = useCallback(async () => {
    const r = await fetch(`/api/portal/armado?pedido=${params.id}`)
    const d = await r.json().catch(() => ({}))
    setPedido(d.pedido || null); setItems((d.items as Item[]) || [])
    setLoading(false)
  }, [params.id])
  useEffect(() => { cargar() }, [cargar])

  async function toggle(it: Item) {
    setSaving(it.id)
    const nuevo = !it.pickeado
    setItems(prev => prev.map(x => x.id === it.id ? { ...x, pickeado: nuevo } : x))
    await fetch('/api/portal/armado', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'item', item_id: it.id, pickeado: nuevo, cantidad_pickeada: nuevo ? it.cantidad : null }) })
    setSaving(null)
  }

  async function finalizar() {
    setFinalizando(true)
    const r = await fetch('/api/portal/armado', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'finalizar', pedido_id: params.id }) })
    setFinalizando(false)
    if (r.ok) router.push('/picker')
  }

  if (loading) return <div className="py-16 flex justify-center"><Loader2 className="w-6 h-6 text-[#1b2a4a] animate-spin" /></div>
  if (!pedido) return <div className="p-6 text-center text-gray-400 text-sm">Pedido no encontrado.</div>

  const total = items.length
  const listos = items.filter(i => i.pickeado).length
  const todosListos = total > 0 && listos === total
  const armado = pedido.estado_armado === 'armado'

  return (
    <div>
      <div className="bg-white border-b border-gray-100 px-4 py-3 sticky top-[46px] z-10">
        <button onClick={() => router.push('/picker')} className="flex items-center gap-1 text-sm text-gray-500 mb-2"><ArrowLeft size={15} /> Volver</button>
        <div className="font-semibold text-gray-900">{pedido.mayorista?.empresa || pedido.mayorista?.nombre || 'Cliente'}</div>
        <div className="text-xs text-gray-500 flex items-center gap-1"><MapPin size={12} />{pedido.direccion_entrega || 'Sin dirección'} · Pedido #{pedido.numero_pedido}</div>
        <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-[#639922] transition-all" style={{ width: `${total ? (listos / total) * 100 : 0}%` }} /></div>
        <div className="text-[11px] text-gray-500 mt-1">{listos}/{total} ítems armados</div>
      </div>

      <div className="divide-y divide-gray-50 bg-white">
        {items.map(it => (
          <button key={it.id} disabled={armado || saving === it.id} onClick={() => toggle(it)} className="w-full flex items-center gap-3 px-5 py-4 text-left active:bg-gray-50 disabled:opacity-100">
            <span className={`w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 border ${it.pickeado ? 'bg-[#639922] border-[#639922]' : 'border-gray-300'}`}>{it.pickeado ? <Check size={15} className="text-white" /> : null}</span>
            <div className="flex-1 min-w-0">
              <p className={`font-medium truncate ${it.pickeado ? 'text-gray-400 line-through' : 'text-gray-900'}`}>{it.producto_nombre}</p>
              {it.producto_sku ? <p className="text-[11px] text-gray-400">{it.producto_sku}</p> : null}
            </div>
            <span className="text-sm font-semibold text-[#1b2a4a] flex-shrink-0">{it.cantidad} {it.unidad || ''}</span>
          </button>
        ))}
        {items.length === 0 && <p className="text-center text-gray-400 text-sm py-10">Este pedido no tiene ítems.</p>}
      </div>

      {!armado && (
        <div className="p-4 sticky bottom-0 bg-[#f7f6f2]">
          <button onClick={finalizar} disabled={!todosListos || finalizando}
            className="w-full bg-[#1b2a4a] text-white font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2 disabled:opacity-40">
            {finalizando ? <Loader2 size={16} className="animate-spin" /> : <PackageCheck size={16} />} {todosListos ? 'Marcar pedido armado' : `Faltan ${total - listos} ítems`}
          </button>
        </div>
      )}
      {armado && <div className="p-4"><div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-xl px-4 py-3 text-center flex items-center justify-center gap-2"><PackageCheck size={16} /> Pedido armado ✓</div></div>}
    </div>
  )
}
