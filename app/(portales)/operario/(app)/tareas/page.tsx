'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Loader2, ChevronRight } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'

type Row = Record<string, unknown>
const S = (v: unknown) => v === null || v === undefined ? '' : String(v)
const hoy = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' }).format(new Date())

const TIPO_LBL: Record<string, string> = { produccion: 'Producción', preelaboracion: 'Preelaboración', limpieza: 'Limpieza', apoyo: 'Apoyo', orden: 'Orden', revision: 'Revisión', especial: 'Especial' }
const PRIOR_CLR: Record<string, string> = { alta: 'bg-red-500', media: 'bg-amber-500', baja: 'bg-green-500' }
const EST: Record<string, { l: string; c: string }> = {
  pendiente: { l: 'Pendiente', c: 'bg-gray-100 text-gray-500' },
  en_proceso: { l: 'En proceso', c: 'bg-amber-100 text-amber-700' },
  pausada: { l: 'Pausada', c: 'bg-orange-100 text-orange-700' },
  finalizada: { l: 'Finalizada', c: 'bg-green-100 text-green-700' },
  finalizada_incidencia: { l: 'Con incidencia', c: 'bg-red-100 text-red-700' },
  rechazada_calidad: { l: 'Rechazada', c: 'bg-red-100 text-red-700' },
  reasignada: { l: 'Reasignada', c: 'bg-gray-100 text-gray-500' },
}
const FILTROS = [['todas', 'Todas'], ['produccion', 'Producción'], ['limpieza', 'Limpieza'], ['orden', 'Orden']] as const

export default function OperarioTareasPage() {
  const [loading, setLoading] = useState(true)
  const [tareas, setTareas] = useState<Row[]>([])
  const [filtro, setFiltro] = useState<string>('todas')

  const cargar = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('op_tareas')
      .select('*').eq('operario_id', user.id).eq('fecha', hoy())
      .order('prioridad', { ascending: true }).order('hora_programada', { ascending: true })
    setTareas((data as Row[]) || [])
    setLoading(false)
  }, [])

  useEffect(() => { cargar() }, [cargar])

  const vis = tareas.filter(t => filtro === 'todas' || S(t.tipo) === filtro)
  const orden: Record<string, number> = { alta: 0, media: 1, baja: 2 }
  vis.sort((a, b) => (orden[S(a.prioridad)] ?? 3) - (orden[S(b.prioridad)] ?? 3))

  if (loading) return <div className="min-h-[60vh] flex items-center justify-center"><Loader2 className="w-6 h-6 text-[#1b2a4a] animate-spin" /></div>

  return (
    <div>
      <header className="bg-[#1b2a4a] text-white px-5 pt-6 pb-5 rounded-b-3xl">
        <h1 className="text-lg font-semibold">Mis tareas · hoy</h1>
        <p className="text-xs text-white/70">Ordenadas por prioridad</p>
      </header>

      <div className="px-5 pt-4">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {FILTROS.map(([k, l]) => (
            <button key={k} onClick={() => setFiltro(k)} className={`text-xs px-3 py-1.5 rounded-full whitespace-nowrap ${filtro === k ? 'bg-[#1b2a4a] text-white' : 'bg-white border border-gray-200 text-gray-600'}`}>{l}</button>
          ))}
        </div>

        <div className="space-y-2.5 mt-3">
          {vis.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-gray-400 text-sm">No tienes tareas {filtro !== 'todas' ? 'de este tipo ' : ''}hoy.</div>
          ) : vis.map(t => {
            const e = EST[S(t.estado)] || EST.pendiente
            return (
              <Link key={S(t.id)} href={`/operario/tareas/${S(t.id)}`} className="flex items-center gap-3 bg-white rounded-2xl border border-gray-100 p-3.5 active:bg-gray-50">
                <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${PRIOR_CLR[S(t.prioridad)] || 'bg-gray-300'}`} />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-[#1a1a1a] text-sm truncate">{S(t.titulo)}{t.cantidad_asignada ? ` · ${S(t.cantidad_asignada)}${S(t.unidad)}` : ''}</div>
                  <div className="text-[11px] text-gray-500">{TIPO_LBL[S(t.tipo)]} · {S(t.hora_programada).slice(0, 5) || '—'} · est. {S(t.tiempo_estimado_min)}m</div>
                </div>
                <span className={`text-[10px] font-semibold px-2 py-1 rounded-full ${e.c}`}>{e.l}</span>
                <ChevronRight size={16} className="text-gray-300" />
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
