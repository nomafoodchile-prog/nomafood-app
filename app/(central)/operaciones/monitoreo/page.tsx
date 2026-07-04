'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import {
  Radio, RefreshCw, Truck, Package, CheckCircle2, AlertTriangle, MapPin,
  Clock, Boxes, Loader2, User, Navigation, Circle, Route, Map as MapIcon, Gauge,
  Eye, ArrowRightLeft, Check,
} from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import type { MapaPunto } from './MonitoreoMapa'

// Leaflet accede a window → cargar solo en cliente, sin SSR
const MonitoreoMapa = dynamic(() => import('./MonitoreoMapa'), {
  ssr: false,
  loading: () => <div className="h-full flex items-center justify-center"><Loader2 className="w-5 h-5 text-[#1b2a4a] animate-spin" /></div>,
})

/* ── Tipos ───────────────────────────────────────────────────────── */
interface Driver { id: string; nombre: string; telefono: string | null }
interface Pos { driver_id: string; lat: number | null; lng: number | null; velocidad: number | null; updated_at: string }
interface Pedido {
  id: string; numero_pedido: string; estado: string; estado_entrega: string; total: number
  direccion_entrega: string | null; hora_programada: string | null; bultos: number | null
  chofer_id: string | null; lat: number | null; lng: number | null
  mayorista: { nombre: string; empresa: string | null } | null
}
interface Incidencia {
  id: string; pedido_id: string | null; driver_id: string; tipo: string; comentario: string | null
  estado_resolucion: string; created_at: string
  driver: { nombre: string } | null
  pedido: { numero_pedido: string } | null
}

/* ── Pistas de estado ────────────────────────────────────────────── */
// Pista Central (la mueve SuperAdmin)
const ESTADO_CENTRAL = ['pagado', 'en_preparacion', 'listo_para_despacho', 'asignado']
const EC_LABEL: Record<string, string> = {
  pagado: 'Pagado', en_preparacion: 'En preparación', listo_para_despacho: 'Listo p/ despacho', asignado: 'Asignado', entregado: 'Entregado',
}
// Pista Chofer
const EE_ACTIVOS = ['pendiente', 'cargado', 'en_ruta', 'llego_cliente']
const EE_LABEL: Record<string, string> = {
  pendiente: 'Por iniciar', cargado: 'Cargado', en_ruta: 'En ruta', llego_cliente: 'En el cliente',
  entregado: 'Entregado', no_entregado: 'No entregado', incidencia: 'Incidencia',
}
const EE_BADGE: Record<string, string> = {
  pendiente: 'noma-badge-gray', cargado: 'noma-badge-gray', en_ruta: 'noma-badge-blue',
  llego_cliente: 'noma-badge-gold', entregado: 'noma-badge-green', no_entregado: 'noma-badge-red', incidencia: 'noma-badge-red',
}
const INC_LABEL: Record<string, string> = {
  cliente_ausente: 'Cliente ausente', direccion_incorrecta: 'Dirección incorrecta', producto_danado: 'Producto dañado',
  rechazo: 'Rechazo', retraso: 'Retraso', problema_pago: 'Problema de pago', otro: 'Otro',
}

function clp(n: number) { return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n || 0) }
function hhmm(iso: string | null) { return iso ? new Date(iso).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }) : '—' }
function tipoInc(t: string) { return INC_LABEL[t] || t.replace(/_/g, ' ') }

export default function MonitoreoEnVivo() {
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [enRuta, setEnRuta] = useState<Set<string>>(new Set())
  const [pos, setPos] = useState<Record<string, Pos>>({})
  const [cumpl, setCumpl] = useState<Record<string, number>>({})
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [incidencias, setIncidencias] = useState<Incidencia[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [sync, setSync] = useState<Date>(new Date())
  const [, setTick] = useState(0)
  const [busy, setBusy] = useState<string | null>(null)
  const [reasignando, setReasignando] = useState<{ pedidoId: string; incidenciaId: string } | null>(null)
  const [notaReasignar, setNotaReasignar] = useState('')
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  const cargar = useCallback(async () => {
    const hoy = new Date().toISOString().slice(0, 10)
    const [dr, rt, ps, pe, inc] = await Promise.all([
      supabase.from('drivers').select('id, nombre, telefono').eq('activo', true).order('nombre'),
      supabase.from('routes').select('driver_id').eq('fecha', hoy).eq('estado', 'en_ruta'),
      supabase.from('driver_positions').select('driver_id, lat, lng, velocidad, updated_at'),
      supabase.from('mayorista_pedidos')
        .select('id, numero_pedido, estado, estado_entrega, total, direccion_entrega, hora_programada, bultos, chofer_id, lat, lng, mayorista:mayoristas(nombre, empresa)')
        .or(`estado.in.(${ESTADO_CENTRAL.join(',')}),and(estado.eq.entregado,hora_entrega_real.gte.${hoy})`)
        .order('hora_programada', { ascending: true, nullsFirst: false }),
      supabase.from('incidencias')
        .select('id, pedido_id, driver_id, tipo, comentario, estado_resolucion, created_at, driver:drivers(nombre), pedido:mayorista_pedidos(numero_pedido)')
        .in('estado_resolucion', ['abierta', 'en_revision'])
        .order('created_at', { ascending: false }),
    ])
    if (dr.error) { setErr(dr.error.message) } else { setErr(null) }
    const driversList = (dr.data as Driver[]) || []
    setDrivers(driversList)
    setEnRuta(new Set(((rt.data as { driver_id: string }[]) || []).map(r => r.driver_id)))
    setPos(Object.fromEntries(((ps.data as Pos[]) || []).map(p => [p.driver_id, p])))
    setPedidos((pe.data as unknown as Pedido[]) || [])
    setIncidencias((inc.data as unknown as Incidencia[]) || [])

    // Cumplimiento (puntualidad de entregas de hoy) por chofer
    const cumplPairs = await Promise.all(
      driversList.map(async d => {
        const { data } = await supabase.rpc('calcular_cumplimiento', { p_driver: d.id, p_fecha: hoy })
        return [d.id, typeof data === 'number' ? data : 100] as const
      })
    )
    setCumpl(Object.fromEntries(cumplPairs))

    setSync(new Date())
    setLoading(false)
  }, [])

  useEffect(() => { cargar() }, [cargar])

  // Tiempo real: cualquier cambio de choferes/pedidos/incidencias se refleja sin recargar
  useEffect(() => {
    const refrescar = () => {
      if (debounce.current) clearTimeout(debounce.current)
      debounce.current = setTimeout(() => cargar(), 400)
    }
    const ch = supabase.channel('central-monitoreo')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mayorista_pedidos' }, refrescar)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'incidencias' }, refrescar)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'driver_positions' }, refrescar)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'routes' }, refrescar)
      .subscribe()
    return () => { if (debounce.current) clearTimeout(debounce.current); supabase.removeChannel(ch) }
  }, [cargar])

  // Re-render suave para refrescar "hace X" de la última sync
  useEffect(() => { const t = setInterval(() => setTick(x => x + 1), 30000); return () => clearInterval(t) }, [])

  // ── Acciones de la Central (Fase 2D) ──────────────────────────────
  async function accionIncidencia(id: string, estado: 'en_revision' | 'resuelta') {
    setBusy(id); setErr(null)
    const { error } = await supabase.rpc('resolver_incidencia', { p_incidencia_id: id, p_estado: estado })
    if (error) setErr(error.message)
    await cargar(); setBusy(null)
  }
  async function confirmarReasignar(choferId: string) {
    if (!reasignando) return
    const { pedidoId, incidenciaId } = reasignando
    const nota = notaReasignar.trim()
    setBusy(incidenciaId); setErr(null)
    const { error } = await supabase.rpc('reasignar_pedido', { p_pedido_id: pedidoId, p_chofer_id: choferId })
    if (error) { setErr(error.message); setBusy(null); return }
    // Si hay instrucción, se la mandamos como mensaje al chofer
    if (nota) await supabase.rpc('enviar_mensaje_chofer', { p_driver_id: choferId, p_texto: nota, p_tipo: 'alerta' })
    // Reasignar cierra la incidencia (deja la nota como respuesta)
    await supabase.rpc('resolver_incidencia', { p_incidencia_id: incidenciaId, p_estado: 'resuelta', p_respuesta: nota || 'Reasignada' })
    setReasignando(null); setNotaReasignar(''); await cargar(); setBusy(null)
  }

  const enCurso = pedidos.filter(p => p.estado_entrega !== 'entregado')
  const asignados = pedidos.filter(p => p.chofer_id)
  const porAsignar = enCurso.filter(p => !p.chofer_id)
  const entregadasHoy = pedidos.filter(p => p.estado_entrega === 'entregado').length
  const enPipeline = enCurso.length

  // Puntos del mapa: choferes con GPS + destinos de pedidos con coordenadas
  const puntos: MapaPunto[] = [
    ...drivers
      .filter(d => pos[d.id]?.lat != null && pos[d.id]?.lng != null)
      .map(d => ({
        id: `d-${d.id}`, tipo: 'chofer' as const, nombre: d.nombre,
        detalle: enRuta.has(d.id) ? 'En ruta' : 'Disponible',
        lat: pos[d.id]!.lat as number, lng: pos[d.id]!.lng as number, activo: enRuta.has(d.id),
      })),
    ...pedidos
      .filter(p => p.lat != null && p.lng != null && p.estado_entrega !== 'entregado')
      .map(p => ({
        id: `p-${p.id}`, tipo: 'pedido' as const,
        nombre: p.mayorista?.empresa || p.mayorista?.nombre || p.numero_pedido,
        detalle: p.direccion_entrega || undefined, lat: p.lat as number, lng: p.lng as number,
      })),
  ]
  const conGps = puntos.some(p => p.tipo === 'chofer')

  if (loading) return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <Loader2 className="w-6 h-6 text-[#1b2a4a] animate-spin" />
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#1b2a4a] flex items-center gap-2">
            <Radio className="w-6 h-6 text-[#c9a24e]" /> Monitoreo en vivo
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Central de despacho — choferes, pedidos e incidencias en tiempo real.</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-xs font-semibold text-green-700 bg-green-50 px-3 py-1.5 rounded-full">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
            </span>
            En vivo
          </span>
          <button onClick={() => cargar()} className="flex items-center gap-1.5 text-xs font-medium text-[#1b2a4a] border border-gray-200 bg-white px-3 py-1.5 rounded-full hover:bg-gray-50">
            <RefreshCw size={13} /> Actualizar
          </button>
        </div>
      </div>

      {err && <p className="text-sm text-red-700 bg-red-50 rounded-lg px-3 py-2">{err}</p>}

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi icon={Truck} label="Choferes en ruta" value={`${enRuta.size} / ${drivers.length}`} />
        <Kpi icon={Package} label="Pedidos en curso" value={enPipeline} />
        <Kpi icon={CheckCircle2} label="Entregas de hoy" value={entregadasHoy} tone="green" />
        <Kpi icon={AlertTriangle} label="Incidencias abiertas" value={incidencias.length} tone={incidencias.length ? 'red' : 'muted'} />
      </div>

      {/* Mapa en vivo */}
      <div className="bg-white rounded-2xl shadow-card overflow-hidden">
        <div className="flex items-center justify-between px-5 pt-4 pb-3">
          <h2 className="font-bold text-[#1b2a4a] flex items-center gap-2"><MapIcon size={17} className="text-[#c9a24e]" /> Mapa en vivo</h2>
          <span className="text-xs text-gray-400">{conGps ? 'GPS activo' : 'Sin señal GPS todavía'}</span>
        </div>
        <div className="relative h-72 lg:h-80">
          <MonitoreoMapa puntos={puntos} />
          {!conGps && (
            <div className="absolute inset-x-0 bottom-0 z-[500] bg-[#1b2a4a]/85 text-white text-xs text-center py-1.5 pointer-events-none">
              Esperando ubicación GPS de los choferes (se activa al iniciar ruta desde el teléfono).
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Choferes en vivo */}
        <div className="xl:col-span-2 space-y-3">
          <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2"><User size={16} className="text-[#1b2a4a]" /> Choferes</h2>
          {drivers.length === 0 ? (
            <Empty texto="No hay choferes activos." />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {drivers.map(d => {
                const ruta = enRuta.has(d.id)
                const mios = asignados.filter(p => p.chofer_id === d.id)
                const pend = mios.filter(p => EE_ACTIVOS.includes(p.estado_entrega))
                const hechas = mios.filter(p => p.estado_entrega === 'entregado').length
                const actual = pend.find(p => p.estado_entrega === 'llego_cliente') || pend.find(p => p.estado_entrega === 'en_ruta') || pend[0]
                const gps = pos[d.id]
                const cval = cumpl[d.id] ?? 100
                const cc = cval >= 90 ? '#3b6d11' : cval >= 70 ? '#c9a24e' : '#c0392b'
                return (
                  <div key={d.id} className="bg-white rounded-2xl border border-gray-100 p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-9 h-9 rounded-full bg-[#eef1f6] flex items-center justify-center flex-shrink-0">
                          <User size={16} className="text-[#1b2a4a]" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-900 truncate">{d.nombre}</p>
                          <p className="text-xs text-gray-400">{mios.length} asignados · {hechas} entregados</p>
                        </div>
                      </div>
                      <span className={ruta ? 'noma-badge-green flex items-center gap-1' : 'noma-badge-gray flex items-center gap-1'}>
                        <Circle size={7} className={ruta ? 'fill-green-600 text-green-600' : 'fill-gray-400 text-gray-400'} />
                        {ruta ? 'En ruta' : 'Disponible'}
                      </span>
                    </div>

                    {actual ? (
                      <div className="mt-3 bg-[#f8f6f1] rounded-xl p-3">
                        <p className="text-[11px] font-semibold text-[#c9a24e] uppercase tracking-wide">Entrega actual</p>
                        <p className="text-sm font-semibold text-gray-900 truncate mt-0.5">{actual.mayorista?.empresa || actual.mayorista?.nombre || 'Cliente'}</p>
                        <p className="text-xs text-gray-500 flex items-center gap-1 truncate"><MapPin size={12} />{actual.direccion_entrega || 'Sin dirección'}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className={EE_BADGE[actual.estado_entrega]}>{EE_LABEL[actual.estado_entrega]}</span>
                          <span className="text-xs text-gray-400 flex items-center gap-1"><Clock size={11} />{hhmm(actual.hora_programada)}</span>
                        </div>
                      </div>
                    ) : (
                      <p className="mt-3 text-xs text-gray-400">{ruta ? 'Sin entrega en curso.' : 'Sin ruta iniciada.'}</p>
                    )}

                    {/* Cumplimiento — puntualidad de entregas de hoy */}
                    <div className="mt-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] text-gray-500 flex items-center gap-1"><Gauge size={12} /> Cumplimiento</span>
                        {hechas > 0
                          ? <span className="text-[11px] font-bold" style={{ color: cc }}>{cval}%</span>
                          : <span className="text-[11px] text-gray-400">Sin entregas aún</span>}
                      </div>
                      <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: hechas > 0 ? `${cval}%` : '0%', background: cc }} />
                      </div>
                    </div>

                    {/* Base para GPS (Fase 2E) */}
                    <div className="mt-2 flex items-center justify-between text-[11px] text-gray-400">
                      <span className="flex items-center gap-1">
                        <Navigation size={11} />
                        {gps ? `GPS ${hhmm(gps.updated_at)}${gps.velocidad != null ? ` · ${Math.round(gps.velocidad)} km/h` : ''}` : 'GPS sin señal'}
                      </span>
                      {gps?.lat != null && gps?.lng != null && (
                        <a href={`https://www.google.com/maps?q=${gps.lat},${gps.lng}`} target="_blank" rel="noreferrer" className="text-[#1b2a4a] hover:underline">Ver mapa</a>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Incidencias entrantes */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2"><AlertTriangle size={16} className="text-[#c0392b]" /> Incidencias entrantes</h2>
          {incidencias.length === 0 ? (
            <Empty texto="Sin incidencias abiertas. Todo en orden." ok />
          ) : (
            <div className="space-y-3">
              {incidencias.map(i => (
                <div key={i.id} className="bg-white rounded-2xl border-l-4 border-[#c0392b] border-y border-r border-gray-100 p-4">
                  <div className="flex items-center justify-between">
                    <span className="noma-badge-red">{tipoInc(i.tipo)}</span>
                    <span className="text-[11px] text-gray-400">{hhmm(i.created_at)}</span>
                  </div>
                  <p className="text-sm text-gray-800 mt-2">{i.comentario || 'Sin comentario.'}</p>
                  <p className="text-xs text-gray-500 mt-1.5 flex items-center gap-1">
                    <User size={12} />{i.driver?.nombre || 'Chofer'}
                    {i.pedido?.numero_pedido && <span className="text-gray-400">· {i.pedido.numero_pedido}</span>}
                  </p>
                  {i.estado_resolucion === 'en_revision' && <span className="noma-badge-gold mt-2 inline-block">En revisión</span>}

                  {/* Acciones de la Central (Fase 2D) */}
                  {reasignando?.incidenciaId === i.id ? (
                    <div className="mt-3 border-t border-gray-100 pt-3 space-y-2">
                      <p className="text-[11px] font-semibold text-gray-500">Instrucción para el chofer (opcional)</p>
                      <textarea value={notaReasignar} onChange={e => setNotaReasignar(e.target.value)} rows={2}
                        placeholder="Ej: Vuelve a la fábrica a retirar el pedido de Café Central para despacho inmediato."
                        className="w-full text-xs border border-gray-200 rounded-lg px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-[#c9a24e] resize-none" />
                      <p className="text-[11px] font-semibold text-gray-500">Asignar a:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {drivers.map(d => (
                          <button key={d.id} disabled={busy === i.id} onClick={() => confirmarReasignar(d.id)}
                            className="text-xs px-2.5 py-1.5 rounded-lg bg-[#1b2a4a] text-white hover:bg-[#142033] disabled:opacity-60 flex items-center gap-1">
                            {busy === i.id && <Loader2 size={12} className="animate-spin" />}
                            {d.nombre}{d.id === i.driver_id ? ' (mismo)' : ''}
                          </button>
                        ))}
                        <button onClick={() => { setReasignando(null); setNotaReasignar('') }}
                          className="text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50">
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {i.estado_resolucion === 'abierta' && (
                        <button disabled={busy === i.id} onClick={() => accionIncidencia(i.id, 'en_revision')}
                          className="text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 text-[#1b2a4a] hover:bg-gray-50 flex items-center gap-1 disabled:opacity-60">
                          <Eye size={13} /> En revisión
                        </button>
                      )}
                      {i.pedido_id && (
                        <button disabled={busy === i.id} onClick={() => { setNotaReasignar(''); setReasignando({ pedidoId: i.pedido_id as string, incidenciaId: i.id }) }}
                          className="text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 text-[#1b2a4a] hover:bg-gray-50 flex items-center gap-1 disabled:opacity-60">
                          <ArrowRightLeft size={13} /> Reasignar / avisar
                        </button>
                      )}
                      <button disabled={busy === i.id} onClick={() => accionIncidencia(i.id, 'resuelta')}
                        className="text-xs px-2.5 py-1.5 rounded-lg bg-[#c9a24e] text-[#1b2a4a] font-semibold hover:bg-[#b8923f] flex items-center gap-1 disabled:opacity-60">
                        {busy === i.id ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Cerrar
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Pedidos en vivo — dos pistas de estado */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2"><Package size={16} className="text-[#1b2a4a]" /> Pedidos en curso</h2>

        {porAsignar.length > 0 && (
          <div className="bg-[#faf0d7] border border-[#e7d5a6] rounded-xl px-4 py-2.5 text-sm text-[#7a5c15] flex items-center gap-2">
            <Route size={15} /> {porAsignar.length} {porAsignar.length === 1 ? 'pedido en curso sin chofer asignado' : 'pedidos en curso sin chofer asignado'}.
          </div>
        )}

        {enCurso.length === 0 ? (
          <Empty texto="No hay pedidos en el flujo de despacho." />
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-400 border-b border-gray-100">
                    <th className="px-4 py-2.5 font-medium">Pedido</th>
                    <th className="px-4 py-2.5 font-medium">Cliente</th>
                    <th className="px-4 py-2.5 font-medium">Pista Central</th>
                    <th className="px-4 py-2.5 font-medium">Pista Chofer</th>
                    <th className="px-4 py-2.5 font-medium">Hora</th>
                    <th className="px-4 py-2.5 font-medium text-right">Bultos</th>
                    <th className="px-4 py-2.5 font-medium text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {enCurso.map(p => (
                    <tr key={p.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60">
                      <td className="px-4 py-2.5 font-medium text-gray-700 whitespace-nowrap">{p.numero_pedido}</td>
                      <td className="px-4 py-2.5 text-gray-600 max-w-[180px] truncate">{p.mayorista?.empresa || p.mayorista?.nombre || '—'}</td>
                      <td className="px-4 py-2.5"><span className="noma-badge-blue">{EC_LABEL[p.estado] || p.estado}</span></td>
                      <td className="px-4 py-2.5">
                        {p.chofer_id
                          ? <span className={EE_BADGE[p.estado_entrega]}>{EE_LABEL[p.estado_entrega]}</span>
                          : <span className="noma-badge-gray">Sin asignar</span>}
                      </td>
                      <td className="px-4 py-2.5 text-gray-500 whitespace-nowrap">{hhmm(p.hora_programada)}</td>
                      <td className="px-4 py-2.5 text-right text-gray-600"><span className="inline-flex items-center gap-1 justify-end"><Boxes size={12} className="text-gray-400" />{p.bultos ?? '—'}</span></td>
                      <td className="px-4 py-2.5 text-right font-medium text-gray-700 whitespace-nowrap">{clp(p.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <p className="text-center text-[11px] text-gray-400 flex items-center justify-center gap-1">
        <RefreshCw size={11} /> Última sincronización {hhmm(sync.toISOString())}
      </p>
    </div>
  )
}

/* ── Subcomponentes ──────────────────────────────────────────────── */
function Kpi({ icon: Icon, label, value, tone }: { icon: React.ElementType; label: string; value: string | number; tone?: 'green' | 'red' | 'muted' }) {
  const color = tone === 'green' ? 'text-green-600' : tone === 'red' ? 'text-[#c0392b]' : tone === 'muted' ? 'text-gray-400' : 'text-[#1b2a4a]'
  const iconColor = tone === 'green' ? 'text-green-600' : tone === 'red' ? 'text-[#c0392b]' : 'text-[#c9a24e]'
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4">
      <Icon className={`w-5 h-5 ${iconColor} mb-2`} />
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </div>
  )
}

function Empty({ texto, ok }: { texto: string; ok?: boolean }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center">
      {ok
        ? <CheckCircle2 className="w-8 h-8 text-green-500 mx-auto mb-2" />
        : <Package className="w-8 h-8 text-gray-300 mx-auto mb-2" />}
      <p className="text-sm text-gray-500">{texto}</p>
    </div>
  )
}
