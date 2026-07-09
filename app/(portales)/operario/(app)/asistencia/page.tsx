'use client'

import { useCallback, useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'

type Row = Record<string, unknown>
const S = (v: unknown) => v === null || v === undefined ? '' : String(v)
const hhmm = (v: unknown) => v ? new Date(String(v)).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }) : '—'
const MES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

export default function OperarioAsistenciaPage() {
  const [loading, setLoading] = useState(true)
  const [jornadas, setJornadas] = useState<Record<string, Row>>({})
  const [sel, setSel] = useState<string | null>(null)

  const now = new Date()
  const anio = now.getFullYear(), mes = now.getMonth()
  const primerDia = new Date(anio, mes, 1)
  const diasEnMes = new Date(anio, mes + 1, 0).getDate()
  const offset = (primerDia.getDay() + 6) % 7 // lunes = 0

  const cargar = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const desde = new Date(anio, mes, 1).toLocaleDateString('en-CA')
    const hasta = new Date(anio, mes + 1, 0).toLocaleDateString('en-CA')
    const { data } = await supabase.from('op_jornadas').select('*')
      .eq('operario_id', user.id).gte('fecha', desde).lte('fecha', hasta)
    const map: Record<string, Row> = {}
    for (const j of (data as Row[]) || []) map[S(j.fecha)] = j
    setJornadas(map)
    setLoading(false)
  }, [anio, mes])

  useEffect(() => { cargar() }, [cargar])

  const asistidos = Object.keys(jornadas).length
  const detalle = sel ? jornadas[sel] : null

  if (loading) return <div className="min-h-[60vh] flex items-center justify-center"><Loader2 className="w-6 h-6 text-[#1b2a4a] animate-spin" /></div>

  const celdas: (number | null)[] = [...Array(offset).fill(null), ...Array.from({ length: diasEnMes }, (_, i) => i + 1)]

  return (
    <div>
      <header className="bg-[#1b2a4a] text-white px-5 pt-6 pb-5 rounded-b-3xl">
        <h1 className="text-lg font-semibold">Mi asistencia · {MES[mes]}</h1>
        <p className="text-xs text-white/70">Días con jornada registrada</p>
      </header>

      <div className="px-5 pt-4 space-y-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <div className="grid grid-cols-7 gap-1.5 text-center">
            {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => <div key={i} className="text-[11px] text-gray-400">{d}</div>)}
            {celdas.map((n, i) => {
              if (n === null) return <div key={i} />
              const fecha = new Date(anio, mes, n).toLocaleDateString('en-CA')
              const tiene = !!jornadas[fecha]
              const esHoy = fecha === now.toLocaleDateString('en-CA')
              return (
                <button key={i} onClick={() => tiene && setSel(fecha)}
                  className={`aspect-square rounded-lg text-xs flex items-center justify-center ${tiene ? 'bg-green-500 text-white font-medium' : 'bg-gray-50 text-gray-400'} ${esHoy ? 'ring-2 ring-[#c9a24e]' : ''}`}>
                  {n}
                </button>
              )
            })}
          </div>
          <div className="flex items-center gap-2 mt-3 text-[11px] text-gray-500">
            <span className="w-3 h-3 rounded bg-green-500 inline-block" /> Asistió · {asistidos} día(s) este mes
          </div>
        </div>

        {detalle && (
          <div className="bg-white rounded-2xl border border-gray-100 p-4 text-sm">
            <div className="font-medium text-[#1b2a4a] mb-2">{sel}</div>
            <div className="flex justify-between text-gray-500"><span>Ingreso</span><span className="text-gray-800">{hhmm(detalle.hora_inicio)}</span></div>
            <div className="flex justify-between text-gray-500"><span>Salida</span><span className="text-gray-800">{hhmm(detalle.hora_fin)}</span></div>
            <div className="flex justify-between text-gray-500"><span>Estado</span><span className="text-gray-800">{S(detalle.estado)}</span></div>
          </div>
        )}

        <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 text-center text-xs text-gray-500">
          La integración con <strong>GeoVictoria</strong> (atrasos, faltas, turnos y cumplimiento) llega en la fase O-D.
        </div>
      </div>
    </div>
  )
}
