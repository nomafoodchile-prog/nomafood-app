'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { ChevronRight, Loader2, MapPin } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'

interface Pedido {
  id: string; numero_pedido: string; estado_entrega: string; total: number
  direccion_entrega: string | null; hora_programada: string | null
  mayorista: { nombre: string; empresa: string | null } | null
}
const ACTIVOS = ['pendiente', 'cargado', 'en_ruta', 'llego_cliente', 'incidencia']
const EE_LABEL: Record<string, string> = {
  pendiente: 'Por iniciar', cargado: 'Cargado', en_ruta: 'En ruta', llego_cliente: 'En el cliente',
  entregado: 'Entregado', no_entregado: 'No entregado', incidencia: 'Incidencia',
}
const EE_COLOR: Record<string, string> = {
  pendiente: 'bg-gray-100 text-gray-600', cargado: 'bg-blue-100 text-blue-700',
  en_ruta: 'bg-green-100 text-green-700', llego_cliente: 'bg-[#eef1f6] text-[#1b2a4a]',
  entregado: 'bg-green-100 text-green-700', no_entregado: 'bg-red-100 text-red-700', incidencia: 'bg-red-100 text-red-700',
}
function hhmm(iso: string | null) { return iso ? new Date(iso).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }) : '' }

export default function EntregasPage() {
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'pendientes' | 'completadas'>('pendientes')
  const [driverId, setDriverId] = useState<string | null>(null)

  const cargar = useCallback(async () => {
    const { data: d } = await supabase.from('drivers').select('id').limit(1).maybeSingle()
    if (!d) { setLoading(false); return }
    setDriverId(d.id)
    const { data } = await supabase.from('mayorista_pedidos')
      .select('id, numero_pedido, estado_entrega, total, direccion_entrega, hora_programada, mayorista:mayoristas(nombre, empresa)')
      .eq('chofer_id', d.id).order('hora_programada', { ascending: true, nullsFirst: false })
    setPedidos((data as unknown as Pedido[]) || [])
    setLoading(false)
  }, [])
  useEffect(() => { cargar() }, [cargar])
  useEffect(() => {
    if (!driverId) return
    const ch = supabase.channel('entregas-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mayorista_pedidos', filter: `chofer_id=eq.${driverId}` }, () => cargar())
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [driverId, cargar])

  const pendientes = pedidos.filter(p => ACTIVOS.includes(p.estado_entrega))
  const completadas = pedidos.filter(p => ['entregado', 'no_entregado'].includes(p.estado_entrega))
  const lista = tab === 'pendientes' ? pendientes : completadas

  return (
    <div>
      <div className="bg-[#1b2a4a] text-white px-5 py-4"><h1 className="text-lg font-semibold text-center">Entregas</h1></div>
      <div className="flex border-b border-gray-100 bg-white sticky top-0 z-10">
        <Tab active={tab === 'pendientes'} onClick={() => setTab('pendientes')} label={`Pendientes (${pendientes.length})`} />
        <Tab active={tab === 'completadas'} onClick={() => setTab('completadas')} label={`Completadas (${completadas.length})`} />
      </div>
      {loading ? (
        <div className="py-16 flex justify-center"><Loader2 className="w-6 h-6 text-[#1b2a4a] animate-spin" /></div>
      ) : lista.length === 0 ? (
        <p className="text-center text-gray-400 text-sm py-16">No hay entregas {tab}.</p>
      ) : (
        <div className="divide-y divide-gray-50 bg-white">
          {lista.map((p, i) => (
            <Link key={p.id} href={`/chofer/entregas/${p.id}`} className="flex items-center gap-3 px-5 py-4 active:bg-gray-50">
              <span className="w-8 h-8 rounded-full bg-[#eef1f6] text-[#1b2a4a] flex items-center justify-center text-sm font-semibold flex-shrink-0">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 truncate">{p.mayorista?.empresa || p.mayorista?.nombre || 'Cliente'}</p>
                <p className="text-xs text-gray-500 truncate flex items-center gap-1"><MapPin size={12} />{p.direccion_entrega || 'Sin dirección'}</p>
              </div>
              <div className="text-right flex-shrink-0">
                {p.hora_programada && <p className="text-xs text-gray-500">{hhmm(p.hora_programada)}</p>}
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${EE_COLOR[p.estado_entrega] || 'bg-gray-100 text-gray-600'}`}>{EE_LABEL[p.estado_entrega] || p.estado_entrega}</span>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

function Tab({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return <button onClick={onClick} className={`flex-1 py-3 text-sm font-semibold border-b-2 transition-colors ${active ? 'border-[#1b2a4a] text-[#1b2a4a]' : 'border-transparent text-gray-400'}`}>{label}</button>
}
