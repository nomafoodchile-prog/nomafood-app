'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Loader2, ChevronRight, ChefHat } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'

type Row = Record<string, unknown>
const S = (v: unknown) => v === null || v === undefined ? '' : String(v)
const hoy = () => new Date().toLocaleDateString('en-CA')

const EST: Record<string, { l: string; c: string }> = {
  pendiente: { l: 'Pendiente', c: 'bg-gray-100 text-gray-500' },
  en_proceso: { l: 'En proceso', c: 'bg-amber-100 text-amber-700' },
  pausada: { l: 'Pausada', c: 'bg-orange-100 text-orange-700' },
  finalizada: { l: 'Finalizada', c: 'bg-green-100 text-green-700' },
  rechazada_calidad: { l: 'Rechazada', c: 'bg-red-100 text-red-700' },
}

export default function OperarioProduccionPage() {
  const [loading, setLoading] = useState(true)
  const [tareas, setTareas] = useState<Row[]>([])

  const cargar = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('op_tareas')
      .select('*').eq('operario_id', user.id).eq('fecha', hoy())
      .in('tipo', ['produccion', 'preelaboracion']).order('hora_programada', { ascending: true })
    setTareas((data as Row[]) || [])
    setLoading(false)
  }, [])

  useEffect(() => { cargar() }, [cargar])

  if (loading) return <div className="min-h-[60vh] flex items-center justify-center"><Loader2 className="w-6 h-6 text-[#1b2a4a] animate-spin" /></div>

  return (
    <div>
      <header className="bg-[#1b2a4a] text-white px-5 pt-6 pb-5 rounded-b-3xl">
        <h1 className="text-lg font-semibold">Producción · hoy</h1>
        <p className="text-xs text-white/70">Sigue la receta aprobada y registra el cierre</p>
      </header>
      <div className="px-5 pt-4 space-y-2.5">
        {tareas.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-gray-400">
            <ChefHat className="w-8 h-8 mx-auto text-gray-300 mb-2" />
            <p className="text-sm">No tienes producciones asignadas hoy.</p>
          </div>
        ) : tareas.map(t => {
          const e = EST[S(t.estado)] || EST.pendiente
          return (
            <Link key={S(t.id)} href={`/operario/tareas/${S(t.id)}`} className="flex items-center gap-3 bg-white rounded-2xl border border-gray-100 p-3.5 active:bg-gray-50">
              <div className="w-10 h-10 rounded-xl bg-[#f5efdf] flex items-center justify-center text-[#c9a24e] flex-shrink-0"><ChefHat size={18} /></div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-[#1a1a1a] text-sm truncate">{S(t.titulo)}</div>
                <div className="text-[11px] text-gray-500">{S(t.cantidad_asignada)}{S(t.unidad)} · {S(t.hora_programada).slice(0, 5) || '—'} · est. {S(t.tiempo_estimado_min)}m</div>
              </div>
              <span className={`text-[10px] font-semibold px-2 py-1 rounded-full ${e.c}`}>{e.l}</span>
              <ChevronRight size={16} className="text-gray-300" />
            </Link>
          )
        })}
        <p className="text-[11px] text-gray-400 text-center pt-2">El paso a paso de la receta con lotes FEFO llega en la fase O-C.</p>
      </div>
    </div>
  )
}
