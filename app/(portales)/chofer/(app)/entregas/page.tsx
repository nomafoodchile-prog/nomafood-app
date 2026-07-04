'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { ChevronRight, Loader2, MapPin } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'

interface Pedido {
  id: string; numero_pedido: string; estado: string; total: number
  direccion_entrega: string | null; hora_programada: string | null
  mayorista: { nombre: string; empresa: string | null } | null
}
const PENDIENTES = ['confirmado', 'pagado', 'en_preparacion', 'despachado']

const ESTADO_LABEL: Record<string, string> = {
  confirmado: 'Confirmado', pagado: 'Pagado', en_preparacion: 'En preparación',
  despachado: 'Despachado', entregado: 'Entregado', cancelado: 'Cancelado',
}
const ESTADO_COLOR: Record<string, string> = {
  confirmado: 'bg-blue-100 text-blue-700', pagado: 'bg-emerald-100 text-emerald-700',
  en_preparacion: 'bg-amber-100 text-amber-700', despachado: 'bg-[#eef3ee] text-[#1f3d2c]',
  entregado: 'bg-green-100 text-green-700', cancelado: 'bg-red-100 text-red-700',
}
function hhmm(iso: string | null) {
  return iso ? new Date(iso).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }) : ''
}

export default function EntregasPage() {
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'pendientes' | 'completadas'>('pendientes')

  const cargar = useCallback(async () => {
    setLoading(true)
    const { data: d } = await supabase.from('drivers').select('id').limit(1).maybeSingle()
    if (!d) { setLoading(false); return }
    const { data } = await supabase.from('mayorista_pedidos')
      .select('id, numero_pedido, estado, total, direccion_entrega, hora_programada, mayorista:mayoristas(nombre, empresa)')
      .eq('chofer_id', d.id).order('hora_programada', { ascending: true, nullsFirst: false })
    setPedidos((data as unknown as Pedido[]) || [])
    setLoading(false)
  }, [])
  useEffect(() => { cargar() }, [cargar])

  const pendientes = pedidos.filter(p => PENDIENTES.includes(p.estado))
  const completadas = pedidos.filter(p => p.estado === 'entregado')
  const lista = tab === 'pendientes' ? pendientes : completadas

  return (
    <div>
      <div className="bg-[#1f3d2c] text-white px-5 py-4">
        <h1 className="text-lg font-semibold text-center">Entregas</h1>
      </div>

      <div className="flex border-b border-gray-100 bg-white sticky top-0 z-10">
        <Tab active={tab === 'pendientes'} onClick={() => setTab('pendientes')} label={`Pendientes (${pendientes.length})`} />
        <Tab active={tab === 'completadas'} onClick={() => setTab('completadas')} label={`Completadas (${completadas.length})`} />
      </div>

      {loading ? (
        <div className="py-16 flex justify-center"><Loader2 className="w-6 h-6 text-[#1f3d2c] animate-spin" /></div>
      ) : lista.length === 0 ? (
        <p className="text-center text-gray-400 text-sm py-16">No hay entregas {tab}.</p>
      ) : (
        <div className="divide-y divide-gray-50 bg-white">
          {lista.map((p, i) => (
            <Link key={p.id} href={`/chofer/entregas/${p.id}`} className="flex items-center gap-3 px-5 py-4 active:bg-gray-50">
              <span className="w-8 h-8 rounded-full bg-[#eef3ee] text-[#1f3d2c] flex items-center justify-center text-sm font-semibold flex-shrink-0">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 truncate">{p.mayorista?.empresa || p.mayorista?.nombre || 'Cliente'}</p>
                <p className="text-xs text-gray-500 truncate flex items-center gap-1"><MapPin size={12} />{p.direccion_entrega || 'Sin dirección'}</p>
              </div>
              <div className="text-right flex-shrink-0">
                {p.hora_programada && <p className="text-xs text-gray-500">{hhmm(p.hora_programada)}</p>}
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${ESTADO_COLOR[p.estado] || 'bg-gray-100 text-gray-600'}`}>{ESTADO_LABEL[p.estado] || p.estado}</span>
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
  return (
    <button onClick={onClick}
      className={`flex-1 py-3 text-sm font-semibold border-b-2 transition-colors ${active ? 'border-[#1f3d2c] text-[#1f3d2c]' : 'border-transparent text-gray-400'}`}>
      {label}
    </button>
  )
}
