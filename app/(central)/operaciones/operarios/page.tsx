'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Loader2, RefreshCw, ArrowLeft, Image as ImageIcon, CheckSquare, AlertTriangle, MessageSquare } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'

type Row = Record<string, unknown>
const S = (v: unknown) => v === null || v === undefined ? '' : String(v)
const N = (v: unknown) => { const n = Number(v); return Number.isNaN(n) ? 0 : n }
const hoy = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' }).format(new Date())
const hhmm = (v: unknown) => v ? new Date(String(v)).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }) : '—'

const JORN_LBL: Record<string, { l: string; c: string }> = {
  en_turno: { l: 'En turno', c: 'bg-green-100 text-green-700' },
  pausado: { l: 'Pausado', c: 'bg-amber-100 text-amber-700' },
  finalizado: { l: 'Finalizado', c: 'bg-gray-100 text-gray-500' },
  no_iniciado: { l: 'No iniciado', c: 'bg-gray-100 text-gray-400' },
}
const CAL_LBL: Record<string, { l: string; c: string }> = {
  aprobado: { l: 'Aprobado', c: 'bg-green-100 text-green-700' },
  con_observacion: { l: 'Con observación', c: 'bg-amber-100 text-amber-700' },
  retenido: { l: 'Retenido', c: 'bg-orange-100 text-orange-700' },
  rechazado: { l: 'Rechazado', c: 'bg-red-100 text-red-700' },
}
const pctColor = (p: number | null) => p === null ? 'bg-gray-200' : p >= 80 ? 'bg-[#639922]' : p >= 50 ? 'bg-[#EF9F27]' : 'bg-[#E24B4A]'

export default function CentralOperariosPage() {
  const [loading, setLoading] = useState(true)
  const [ops, setOps] = useState<Row[]>([])
  const [profs, setProfs] = useState<Row[]>([])
  const [jorns, setJorns] = useState<Row[]>([])
  const [tars, setTars] = useState<Row[]>([])
  const [cis, setCis] = useState<Row[]>([])
  const [sel, setSel] = useState<string | null>(null)

  const cargar = useCallback(async () => {
    const { data: o } = await supabase.from('operarios').select('profile_id, area, turno_default, activo')
    const lista = (o as Row[]) || []
    setOps(lista)
    const ids = lista.map(x => S(x.profile_id)).filter(Boolean)
    const [{ data: p }, { data: j }, { data: t }, { data: c }] = await Promise.all([
      ids.length ? supabase.from('profiles').select('id, full_name, email').in('id', ids) : Promise.resolve({ data: [] }),
      supabase.from('op_jornadas').select('operario_id, estado, hora_inicio, hora_fin').eq('fecha', hoy()),
      supabase.from('op_tareas').select('id, operario_id, tipo, estado, titulo, cantidad_asignada, unidad, tiempo_estimado_min').eq('fecha', hoy()),
      supabase.from('op_tarea_cierre').select('*'),
    ])
    setProfs((p as Row[]) || [])
    setJorns((j as Row[]) || [])
    setTars((t as Row[]) || [])
    setCis((c as Row[]) || [])
    setLoading(false)
  }, [])

  useEffect(() => { cargar() }, [cargar])

  // Tiempo real: refresca al cambiar tareas o cierres
  useEffect(() => {
    const ch = supabase.channel('central-operarios')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'op_tareas' }, () => cargar())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'op_tarea_cierre' }, () => cargar())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'op_jornadas' }, () => cargar())
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [cargar])

  const nombre = useCallback((id: string) => {
    const p = profs.find(x => S(x.id) === id)
    return S(p?.full_name) || S(p?.email) || 'Operario'
  }, [profs])

  const metricas = useMemo(() => {
    const idTars = new Set(tars.map(t => S(t.id)))
    return ops.map(o => {
      const id = S(o.profile_id)
      const jor = jorns.find(j => S(j.operario_id) === id)
      const misTars = tars.filter(t => S(t.operario_id) === id)
      const misCis = cis.filter(c => S(c.operario_id) === id && idTars.has(S(c.tarea_id)))
      const done = misTars.filter(t => misCis.some(c => S(c.tarea_id) === S(t.id))).length
      const estTot = misCis.reduce((a, c) => a + N(c.tiempo_estimado_min), 0)
      const realTot = misCis.reduce((a, c) => a + N(c.tiempo_real_min), 0)
      const merma = misCis.reduce((a, c) => a + N(c.merma), 0)
      const prodCis = misCis.filter(c => misTars.some(t => S(t.id) === S(c.tarea_id) && ['produccion', 'preelaboracion'].includes(S(t.tipo))))
      const problemas = misCis.filter(c => ['retenido', 'rechazado'].includes(S(c.calidad_resultado))).length
      const pctTareas = misTars.length ? Math.round((done / misTars.length) * 100) : null
      const pctTiempo = realTot > 0 ? Math.min(100, Math.round((estTot / realTot) * 100)) : null
      return { id, area: S(o.area), estado: S(jor?.estado) || 'no_iniciado', ingreso: jor?.hora_inicio,
        asignadas: misTars.length, done, pctTareas, pctTiempo, merma, prod: prodCis.length, problemas }
    }).sort((a, b) => a.estado === 'en_turno' ? -1 : b.estado === 'en_turno' ? 1 : 0)
  }, [ops, jorns, tars, cis])

  if (loading) return <div className="min-h-[60vh] flex items-center justify-center"><Loader2 className="w-6 h-6 text-[#1b2a4a] animate-spin" /></div>

  // ── Detalle de un operario ──
  if (sel) {
    const m = metricas.find(x => x.id === sel)
    const idTars = new Set(tars.map(t => S(t.id)))
    const misCis = cis.filter(c => S(c.operario_id) === sel && idTars.has(S(c.tarea_id)))
    return (
      <div className="space-y-5">
        <button onClick={() => setSel(null)} className="flex items-center gap-1 text-sm text-gray-500 hover:text-[#1b2a4a]"><ArrowLeft size={15} /> Volver a operarios</button>
        <div>
          <h1 className="text-2xl font-bold text-[#1a1a1a]">{nombre(sel)}</h1>
          <p className="text-sm text-gray-500">{m?.area || 'Sin área'} · {JORN_LBL[m?.estado || 'no_iniciado']?.l} · ingreso {hhmm(m?.ingreso)}</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Metric label="Tareas" value={`${m?.done ?? 0}/${m?.asignadas ?? 0}`} />
          <Metric label="Cumpl. tiempo" value={m?.pctTiempo === null || m?.pctTiempo === undefined ? '—' : `${m?.pctTiempo}%`} />
          <Metric label="Merma total" value={String(m?.merma ?? 0)} />
          <Metric label="Retenidos/Rech." value={String(m?.problemas ?? 0)} danger={(m?.problemas ?? 0) > 0} />
        </div>

        <div>
          <h2 className="text-sm font-semibold text-[#1b2a4a] mb-2">Cierres de hoy ({misCis.length})</h2>
          {misCis.length === 0 ? <p className="text-sm text-gray-400">Sin tareas cerradas hoy.</p> : (
            <div className="space-y-2.5">
              {misCis.map(c => {
                const tar = tars.find(t => S(t.id) === S(c.tarea_id))
                const cal = CAL_LBL[S(c.calidad_resultado)] || null
                const chk = c.checklist_respuestas as Record<string, boolean> | null
                const chkOk = chk ? Object.values(chk).filter(Boolean).length : 0
                const chkTot = chk ? Object.keys(chk).length : 0
                return (
                  <div key={S(c.id)} className="noma-card !p-4">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="font-medium text-[#1a1a1a]">{S(tar?.titulo) || 'Tarea'}</div>
                      {cal ? <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${cal.c}`}>{cal.l}</span> : null}
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1 text-xs text-gray-600 mt-2">
                      <span>Producida: <b>{S(c.cantidad_producida) || '—'}</b></span>
                      <span>Merma: <b>{S(c.merma) || '0'}</b></span>
                      <span>Tiempo: <b>{S(c.tiempo_real_min)}/{S(c.tiempo_estimado_min)}m</b></span>
                      <span>Checklist: <b>{chkOk}/{chkTot}</b></span>
                      <span>Elab: {S(c.fecha_elaboracion) || '—'}</span>
                      <span>Vence: {S(c.fecha_vencimiento) || '—'}</span>
                    </div>
                    {c.merma_motivo ? <div className="text-xs text-gray-500 mt-1">Merma: {S(c.merma_motivo)}</div> : null}
                    {c.calidad_motivo ? <div className="text-xs text-red-600 mt-1"><AlertTriangle size={12} className="inline mr-1" />{S(c.calidad_motivo)} — {S(c.calidad_comentario)}</div> : null}
                    <div className="flex items-center gap-3 mt-2">
                      {c.evidencia_url ? <a href={S(c.evidencia_url)} target="_blank" rel="noreferrer" className="text-xs text-[#c9a24e] font-medium flex items-center gap-1"><ImageIcon size={13} /> Ver foto final</a>
                        : c.evidencia_cargada ? <span className="text-xs text-gray-400 flex items-center gap-1"><ImageIcon size={13} /> Foto registrada</span> : null}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── Lista de operarios ──
  const enTurno = metricas.filter(m => m.estado === 'en_turno').length
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#1a1a1a]">Operarios</h1>
          <p className="text-sm text-gray-500 mt-0.5">{enTurno} en turno · {ops.length} operarios · en tiempo real</p>
        </div>
        <div className="flex gap-2">
          <a href="/operaciones/operarios/mensajes" className="flex items-center gap-2 text-sm text-gray-600 border border-gray-200 rounded-lg px-3 py-2 hover:border-[#c9a24e]"><MessageSquare size={15} /> Mensajes</a>
          <button onClick={() => { setLoading(true); cargar() }} className="flex items-center gap-2 text-sm text-gray-600 border border-gray-200 rounded-lg px-3 py-2 hover:border-[#c9a24e]"><RefreshCw size={15} /> Actualizar</button>
        </div>
      </div>

      {ops.length === 0 ? (
        <div className="noma-card text-center text-gray-400 py-10">
          <CheckSquare className="w-8 h-8 mx-auto text-gray-300 mb-2" />
          <p className="text-sm">Aún no hay operarios. Créalos y actívalos desde Personas.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {metricas.map(m => {
            const jl = JORN_LBL[m.estado] || JORN_LBL.no_iniciado
            return (
              <button key={m.id} onClick={() => setSel(m.id)} className="noma-card !p-4 text-left hover:border-[#c9a24e] transition-colors">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-[#1b2a4a]">{nombre(m.id)}</div>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${jl.c}`}>{jl.l}</span>
                </div>
                <div className="text-xs text-gray-500 mb-3">{m.area || 'Sin área'}</div>
                <div className="space-y-1.5">
                  <Barra label={`Tareas ${m.done}/${m.asignadas}`} pct={m.pctTareas} />
                  <Barra label="Tiempo" pct={m.pctTiempo} />
                </div>
                <div className="flex gap-3 text-[11px] text-gray-500 mt-3">
                  <span>Producciones: {m.prod}</span>
                  <span>Merma: {m.merma}</span>
                  {m.problemas > 0 ? <span className="text-red-600 font-medium">Calidad: {m.problemas}</span> : null}
                </div>
              </button>
            )
          })}
        </div>
      )}

      <p className="text-xs text-gray-400">Las métricas (cumplimiento, calidad, merma, tiempos) quedan guardadas para los futuros indicadores de bonos.</p>
    </div>
  )
}

function Metric({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <div className="bg-gray-50 rounded-xl p-3">
      <div className="text-[11px] text-gray-500">{label}</div>
      <div className={`text-xl font-semibold ${danger ? 'text-red-600' : 'text-[#1b2a4a]'}`}>{value}</div>
    </div>
  )
}

function Barra({ label, pct }: { label: string; pct: number | null }) {
  return (
    <div>
      <div className="flex justify-between text-[11px] text-gray-600"><span>{label}</span><span>{pct === null ? '—' : `${pct}%`}</span></div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mt-0.5"><div className={`h-full ${pctColor(pct)}`} style={{ width: `${pct ?? 0}%` }} /></div>
    </div>
  )
}
