'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'

type Row = Record<string, unknown>
const S = (v: unknown) => v === null || v === undefined ? '' : String(v)
const N = (v: unknown) => { const n = Number(v); return Number.isNaN(n) ? 0 : n }
const hhmm = (v: unknown) => v ? new Date(String(v)).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }) : '—'
const MES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

const EST: Record<string, { l: string; cell: string; dot: string }> = {
  asistio: { l: 'Asistió', cell: 'bg-green-500 text-white', dot: '#639922' },
  atraso: { l: 'Atraso', cell: 'bg-amber-400 text-amber-900', dot: '#EF9F27' },
  ausente: { l: 'Ausente', cell: 'bg-red-500 text-white', dot: '#E24B4A' },
  injustificada: { l: 'Falta injustificada', cell: 'bg-red-500 text-white', dot: '#E24B4A' },
  justificada: { l: 'Justificada', cell: 'bg-blue-500 text-white', dot: '#378ADD' },
  libre: { l: 'Libre', cell: 'bg-gray-100 text-gray-400', dot: '#B4B2A9' },
}

export default function OperarioAsistenciaPage() {
  const [loading, setLoading] = useState(true)
  const [asist, setAsist] = useState<Row[]>([])
  const [jorns, setJorns] = useState<Row[]>([])
  const [gv, setGv] = useState<Row | null>(null)
  const [sel, setSel] = useState<string | null>(null)

  const now = new Date()
  const anio = now.getFullYear(), mes = now.getMonth()
  const diasEnMes = new Date(anio, mes + 1, 0).getDate()
  const offset = (new Date(anio, mes, 1).getDay() + 6) % 7 // lunes = 0

  const cargar = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const desde = new Date(anio, mes, 1).toLocaleDateString('en-CA')
    const hasta = new Date(anio, mes + 1, 0).toLocaleDateString('en-CA')
    const [{ data: a }, { data: j }, { data: g }] = await Promise.all([
      supabase.from('op_asistencia').select('*').eq('operario_id', user.id).gte('fecha', desde).lte('fecha', hasta),
      supabase.from('op_jornadas').select('fecha, hora_inicio, hora_fin, estado').eq('operario_id', user.id).gte('fecha', desde).lte('fecha', hasta),
      supabase.from('geovictoria_config').select('estado, mensaje').eq('id', 1).maybeSingle(),
    ])
    setAsist((a as Row[]) || [])
    setJorns((j as Row[]) || [])
    setGv((g as Row) || null)
    setLoading(false)
  }, [anio, mes])

  useEffect(() => { cargar() }, [cargar])

  // Estado por día: asistencia real; si falta pero hubo jornada → asistió
  const porDia = useMemo(() => {
    const map: Record<string, Row> = {}
    for (const a of asist) map[S(a.fecha)] = a
    for (const j of jorns) {
      const f = S(j.fecha)
      if (!map[f]) map[f] = { fecha: f, estado: 'asistio', entrada_real: j.hora_inicio, salida_real: j.hora_fin, fuente: 'jornada' }
    }
    return map
  }, [asist, jorns])

  const resumen = useMemo(() => {
    const vals = Object.values(porDia)
    const asistidos = vals.filter(v => ['asistio', 'atraso'].includes(S(v.estado))).length
    const faltas = vals.filter(v => ['ausente', 'injustificada'].includes(S(v.estado))).length
    const cumpl = asistidos + faltas > 0 ? Math.round((asistidos / (asistidos + faltas)) * 100) : null
    return { asistidos, faltas, cumpl }
  }, [porDia])

  if (loading) return <div className="min-h-[60vh] flex items-center justify-center"><Loader2 className="w-6 h-6 text-[#1b2a4a] animate-spin" /></div>

  const celdas: (number | null)[] = [...Array(offset).fill(null), ...Array.from({ length: diasEnMes }, (_, i) => i + 1)]
  const detalle = sel ? porDia[sel] : null
  const detEst = detalle ? (EST[S(detalle.estado)] || EST.asistio) : null

  return (
    <div>
      <header className="bg-[#1b2a4a] text-white px-5 pt-6 pb-5 rounded-b-3xl">
        <h1 className="text-lg font-semibold">Mi asistencia · {MES[mes]}</h1>
        <p className="text-xs text-white/70">Fuente: GeoVictoria · {S(gv?.estado) || 'pendiente'}</p>
      </header>

      <div className="px-5 pt-4 space-y-4">
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-white rounded-xl border border-gray-100 p-3 text-center"><div className="text-lg font-bold text-green-600">{resumen.asistidos}</div><div className="text-[11px] text-gray-500">Asistidos</div></div>
          <div className="bg-white rounded-xl border border-gray-100 p-3 text-center"><div className="text-lg font-bold text-red-600">{resumen.faltas}</div><div className="text-[11px] text-gray-500">Faltas</div></div>
          <div className="bg-white rounded-xl border border-gray-100 p-3 text-center"><div className="text-lg font-bold text-[#1b2a4a]">{resumen.cumpl === null ? '—' : `${resumen.cumpl}%`}</div><div className="text-[11px] text-gray-500">Cumplimiento</div></div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <div className="grid grid-cols-7 gap-1.5 text-center">
            {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => <div key={i} className="text-[11px] text-gray-400">{d}</div>)}
            {celdas.map((n, i) => {
              if (n === null) return <div key={i} />
              const fecha = new Date(anio, mes, n).toLocaleDateString('en-CA')
              const row = porDia[fecha]
              const est = row ? (EST[S(row.estado)] || EST.asistio) : null
              const esHoy = fecha === now.toLocaleDateString('en-CA')
              return (
                <button key={i} onClick={() => row && setSel(fecha)}
                  className={`aspect-square rounded-lg text-xs flex items-center justify-center ${est ? est.cell : 'bg-gray-50 text-gray-300'} ${esHoy ? 'ring-2 ring-[#c9a24e]' : ''}`}>
                  {n}
                </button>
              )
            })}
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1.5 mt-3 text-[11px] text-gray-500">
            {['asistio', 'atraso', 'ausente', 'justificada'].map(k => (
              <span key={k} className="flex items-center gap-1"><span className="w-3 h-3 rounded inline-block" style={{ background: EST[k].dot }} /> {EST[k].l}</span>
            ))}
          </div>
        </div>

        {detalle && detEst ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-4 text-sm space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="font-medium text-[#1b2a4a]">{sel}</div>
              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${detEst.cell}`}>{detEst.l}</span>
            </div>
            <Fila k="Entrada esperada" v={detalle.entrada_esperada ? S(detalle.entrada_esperada).slice(0, 5) : '—'} />
            <Fila k="Entrada real" v={hhmm(detalle.entrada_real)} />
            <Fila k="Salida real" v={hhmm(detalle.salida_real)} />
            {N(detalle.atraso_min) > 0 ? <Fila k="Atraso" v={`${N(detalle.atraso_min)} min`} /> : null}
            {detalle.justificacion ? <Fila k="Justificación" v={S(detalle.justificacion)} /> : null}
            {detalle.validado_at ? <Fila k="Validado" v="Sí, por jefatura" /> : null}
          </div>
        ) : null}

        <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 text-center text-xs text-gray-500">
          {S(gv?.mensaje) || 'GeoVictoria se conectará para traer marcaciones, atrasos y faltas automáticamente.'}
        </div>
      </div>
    </div>
  )
}

function Fila({ k, v }: { k: string; v: string }) {
  return <div className="flex justify-between"><span className="text-gray-500">{k}</span><span className="text-gray-800">{v}</span></div>
}
