'use client'

import { useEffect, useState, useCallback } from 'react'
import { Bot, RefreshCw, AlertTriangle, TrendingUp, Clock, Sparkles } from 'lucide-react'

type Prioridad = 'critica' | 'alta' | 'media' | 'baja'
interface Informe { fuente: 'reglas' | 'ia'; titular: string; resumen: string; prioridades: string[]; generado: string }
interface Contexto { ventasMes?: number; porCobrar?: number; porPagar?: number; pedidosHoy?: number }
interface Ultimo { ejecutado: string; disparador: string; stats: { senales: number; criticas: number; altas: number; nuevas: number }; contexto: Contexto; informe: Informe }
interface Alerta { id: string; tipo: string; prioridad: Prioridad; area: string; titulo: string; mensaje: string; accion_sugerida: string; created_at: string }

const CLP = (n?: number) => (typeof n === 'number' ? '$' + Math.round(n).toLocaleString('es-CL') : '—')
const fecha = (iso?: string) => { try { return iso ? new Date(iso).toLocaleString('es-CL', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—' } catch { return '—' } }

const PRIO: Record<Prioridad, { label: string; dot: string; chip: string }> = {
  critica: { label: 'Crítica', dot: 'bg-red-500', chip: 'bg-red-50 text-red-700 border-red-200' },
  alta: { label: 'Alta', dot: 'bg-orange-500', chip: 'bg-orange-50 text-orange-700 border-orange-200' },
  media: { label: 'Media', dot: 'bg-amber-500', chip: 'bg-amber-50 text-amber-700 border-amber-200' },
  baja: { label: 'Baja', dot: 'bg-gray-400', chip: 'bg-gray-50 text-gray-600 border-gray-200' },
}

export default function AgentePage() {
  const [ultimo, setUltimo] = useState<Ultimo | null>(null)
  const [alertas, setAlertas] = useState<Alerta[]>([])
  const [iaActiva, setIaActiva] = useState(false)
  const [cargando, setCargando] = useState(true)
  const [ejecutando, setEjecutando] = useState(false)
  const [error, setError] = useState('')

  const cargar = useCallback(async () => {
    try {
      const r = await fetch('/api/central/agente/resumen', { cache: 'no-store' })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error || 'Error')
      setUltimo(j.ultimo); setAlertas(j.alertas || []); setIaActiva(!!j.iaActiva)
    } catch (e) { setError(e instanceof Error ? e.message : 'Error al cargar') }
    finally { setCargando(false) }
  }, [])

  useEffect(() => { cargar() }, [cargar])

  const ejecutar = async () => {
    setEjecutando(true); setError('')
    try {
      const r = await fetch('/api/central/agente/resumen', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'ejecutar' }) })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error || 'Error')
      setUltimo(j.ultimo); setAlertas(j.alertas || []); setIaActiva(!!j.iaActiva)
    } catch (e) { setError(e instanceof Error ? e.message : 'Error al ejecutar') }
    finally { setEjecutando(false) }
  }

  const inf = ultimo?.informe
  const ctx = ultimo?.contexto || {}

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Encabezado */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-[#307139] flex items-center justify-center text-[#F8EDD9] flex-shrink-0">
            <Bot size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#1F4D27] leading-tight">Agente administrativo</h1>
            <p className="text-sm text-gray-500">Vigila tu operación y te resume lo importante del día.</p>
          </div>
        </div>
        <button onClick={ejecutar} disabled={ejecutando}
          className="inline-flex items-center gap-2 bg-[#307139] hover:bg-[#255A2D] text-[#F8EDD9] font-semibold px-4 py-2 rounded-lg transition-colors disabled:opacity-60">
          <RefreshCw size={16} className={ejecutando ? 'animate-spin' : ''} />
          {ejecutando ? 'Analizando…' : 'Ejecutar ahora'}
        </button>
      </div>

      {/* Estado del cerebro IA */}
      <div className={`flex items-center gap-2 text-sm rounded-lg border px-3 py-2 ${iaActiva ? 'bg-[#307139]/8 border-[#307139]/30 text-[#1F4D27]' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
        <Sparkles size={15} className="flex-shrink-0" />
        {iaActiva
          ? <span><strong>Cerebro IA activo.</strong> El agente razona y prioriza con inteligencia artificial.</span>
          : <span><strong>Cerebro IA en reposo.</strong> Funciona con reglas (sin costo). Al cargar la API key de Claude, empieza a razonar solo.</span>}
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">{error}</div>}

      {cargando ? (
        <div className="text-center text-gray-400 py-16">Cargando…</div>
      ) : !ultimo ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-10 text-center space-y-3">
          <div className="w-14 h-14 rounded-full bg-[#307139]/10 flex items-center justify-center mx-auto text-[#307139]"><Bot size={26} /></div>
          <h2 className="font-bold text-[#1F4D27]">El agente aún no ha corrido</h2>
          <p className="text-sm text-gray-500 max-w-md mx-auto">Apreta "Ejecutar ahora" para su primer análisis. Luego correrá solo cada mañana.</p>
        </div>
      ) : (
        <>
          {/* Informe */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-[#307139]/10 text-[#307139]">
                {inf?.fuente === 'ia' ? <><Sparkles size={12} /> Analizado con IA</> : <>Analizado por reglas</>}
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs text-gray-400"><Clock size={12} /> {fecha(ultimo.ejecutado)} · {ultimo.disparador === 'cron' ? 'automático' : 'manual'}</span>
            </div>
            <h2 className="text-lg font-bold text-[#1F4D27]">{inf?.titular}</h2>
            <p className="text-sm text-gray-600 leading-relaxed">{inf?.resumen}</p>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Prioridades sugeridas</p>
              <ul className="space-y-2">
                {inf?.prioridades.map((p, i) => (
                  <li key={i} className="flex gap-2.5 text-sm text-[#1F4D27]">
                    <span className="mt-0.5 w-5 h-5 rounded-full bg-[#307139] text-[#F8EDD9] text-xs font-bold flex items-center justify-center flex-shrink-0">{i + 1}</span>
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Números del día */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Stat icon={<TrendingUp size={16} />} label="Ventas del mes" valor={CLP(ctx.ventasMes)} />
            <Stat label="Por cobrar" valor={CLP(ctx.porCobrar)} />
            <Stat label="Por pagar" valor={CLP(ctx.porPagar)} />
            <Stat label="Pedidos hoy" valor={String(ctx.pedidosHoy ?? 0)} />
          </div>

          {/* Alertas abiertas */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
            <div className="flex items-center gap-2 px-5 py-3 border-b border-gray-100">
              <AlertTriangle size={16} className="text-[#307139]" />
              <h3 className="font-bold text-[#1F4D27]">Alertas abiertas</h3>
              <span className="text-xs text-gray-400">({alertas.length})</span>
            </div>
            {alertas.length === 0 ? (
              <p className="text-sm text-gray-400 px-5 py-8 text-center">Sin alertas abiertas. Operación al día. 🌱</p>
            ) : (
              <ul className="divide-y divide-gray-50">
                {alertas.map(a => {
                  const p = PRIO[a.prioridad] || PRIO.baja
                  return (
                    <li key={a.id} className="flex items-start gap-3 px-5 py-3">
                      <span className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${p.dot}`} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-[#1F4D27]">{a.titulo}</span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${p.chip}`}>{p.label}</span>
                          <span className="text-[10px] text-gray-400">{a.area}</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">{a.mensaje}</p>
                        {a.accion_sugerida && <p className="text-xs text-[#307139] mt-0.5">→ {a.accion_sugerida}</p>}
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  )
}

function Stat({ icon, label, valor }: { icon?: React.ReactNode; label: string; valor: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
      <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-1">{icon}{label}</div>
      <div className="text-lg font-bold text-[#1F4D27] tabular-nums">{valor}</div>
    </div>
  )
}
