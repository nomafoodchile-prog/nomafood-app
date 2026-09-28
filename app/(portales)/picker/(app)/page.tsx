'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { ChevronRight, Loader2, PackageCheck, MapPin } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'

interface Pedido {
  id: string; numero_pedido: string; total: number; estado_armado: string
  direccion_entrega: string | null
  mayorista: { nombre: string; empresa: string | null } | null
}
const EA_LABEL: Record<string, string> = { sin_asignar: 'Sin asignar', asignado: 'Por armar', en_armado: 'En armado', armado: 'Armado' }
const EA_COLOR: Record<string, string> = {
  asignado: 'bg-amber-100 text-amber-700', en_armado: 'bg-blue-100 text-blue-700', armado: 'bg-green-100 text-green-700',
}

export default function PickerHome() {
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'pendientes' | 'armados'>('pendientes')
  const [pid, setPid] = useState<string | null>(null)

  const cargar = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) setPid(user.id)
    const r = await fetch('/api/portal/armado')
    const d = await r.json().catch(() => ({}))
    setPedidos((d.pedidos as Pedido[]) || [])
    setLoading(false)
  }, [])
  useEffect(() => { cargar() }, [cargar])
  useEffect(() => {
    if (!pid) return
    const ch = supabase.channel('picker-pedidos')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mayorista_pedidos', filter: `picker_id=eq.${pid}` }, () => cargar())
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [pid, cargar])

  const pendientes = pedidos.filter(p => p.estado_armado !== 'armado')
  const armados = pedidos.filter(p => p.estado_armado === 'armado')
  const lista = tab === 'pendientes' ? pendientes : armados

  return (
    <div>
      <div className="flex border-b border-gray-100 bg-white sticky top-[46px] z-10">
        <button onClick={() => setTab('pendientes')} className={`flex-1 py-3 text-sm font-semibold border-b-2 ${tab === 'pendientes' ? 'border-[#1b2a4a] text-[#1b2a4a]' : 'border-transparent text-gray-400'}`}>Por armar ({pendientes.length})</button>
        <button onClick={() => setTab('armados')} className={`flex-1 py-3 text-sm font-semibold border-b-2 ${tab === 'armados' ? 'border-[#1b2a4a] text-[#1b2a4a]' : 'border-transparent text-gray-400'}`}>Armados ({armados.length})</button>
      </div>
      {loading ? (
        <div className="py-16 flex justify-center"><Loader2 className="w-6 h-6 text-[#1b2a4a] animate-spin" /></div>
      ) : lista.length === 0 ? (
        <div className="text-center text-gray-400 text-sm py-20"><PackageCheck className="w-8 h-8 mx-auto text-gray-300 mb-2" />No hay pedidos {tab === 'pendientes' ? 'por armar' : 'armados'}.</div>
      ) : (
        <div className="divide-y divide-gray-50 bg-white">
          {lista.map(p => (
            <Link key={p.id} href={`/picker/pedido/${p.id}`} className="flex items-center gap-3 px-5 py-4 active:bg-gray-50">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 truncate">{p.mayorista?.empresa || p.mayorista?.nombre || 'Cliente'}</p>
                <p className="text-xs text-gray-500 truncate flex items-center gap-1"><MapPin size={12} />{p.direccion_entrega || 'Sin dirección'}</p>
                <p className="text-[11px] text-gray-400">Pedido #{p.numero_pedido}</p>
              </div>
              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${EA_COLOR[p.estado_armado] || 'bg-gray-100 text-gray-600'}`}>{EA_LABEL[p.estado_armado] || p.estado_armado}</span>
              <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
