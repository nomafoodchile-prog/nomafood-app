'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import { Loader2, X, ArrowUp, ArrowDown, Trash2, MapPin, CheckCircle2, AlertTriangle } from 'lucide-react'

const PlannerMap = dynamic(() => import('./PlannerMap'), { ssr: false })

interface PointStop {
  origin: false; id: string; cliente: string | null; telefono: string | null
  direccion: string | null; comuna: string | null; lat: number; lng: number; geo_status?: string
}
interface PointOrigin { origin: true; nombre: string; lat: number; lng: number }
type Point = PointOrigin | PointStop
interface Matrix { duration_s: number[][]; distance_m: number[][] }
interface Faltante { id: string; cliente: string | null; direccion: string | null; comuna: string | null }
interface OptData {
  points: Point[]; order: number[]; matrix: Matrix
  origen: { nombre: string; lat: number; lng: number }
  serviceMin: number; horaSalida: string; faltan: Faltante[]; provider: string
}
interface Chofer { id: string; nombre: string; telefono: string | null }

// Cada parada en la secuencia actual guarda su índice en points/matrix (pi).
interface SeqStop { pi: number; id: string; cliente: string | null; direccion: string | null; comuna: string | null; lat: number; lng: number; etaMin?: number }

const toMin = (hhmm: string) => { const [h, m] = (hhmm || '10:00').split(':').map(Number); return (h || 0) * 60 + (m || 0) }
const fromMin = (t: number) => { const x = ((Math.round(t) % 1440) + 1440) % 1440; return `${String(Math.floor(x / 60)).padStart(2, '0')}:${String(x % 60).padStart(2, '0')}` }

export default function RoutePlanner({
  ids, onClose, onConfirmed,
}: { ids: string[]; onClose: () => void; onConfirmed: (codigo: string) => void }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<OptData | null>(null)
  const [seq, setSeq] = useState<SeqStop[]>([])
  const [salida, setSalida] = useState('10:00')
  const [serviceMin, setServiceMin] = useState(8)
  const [choferes, setChoferes] = useState<Chofer[]>([])
  const [choferId, setChoferId] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [faltan, setFaltan] = useState<Faltante[]>([])
  const [fixVals, setFixVals] = useState<Record<string, string>>({})
  const [fixing, setFixing] = useState<string | null>(null)
  const [dragPi, setDragPi] = useState<number | null>(null)

  const optimizar = useCallback(async (silent?: boolean) => {
    if (!silent) setLoading(true)
    setError(null)
    try {
      // 1) geocodificar los que no tengan coordenadas (automático)
      await fetch('/api/central/rutas/geocodificar', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids, soloFaltantes: true }),
      }).catch(() => {})
      // 2) optimizar
      const res = await fetch('/api/central/rutas/optimizar', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) { setError(d.error || 'No se pudo calcular la ruta. ¿Corriste la migración SQL?'); setLoading(false); return }
      const od = d as OptData
      setData(od); setFaltan(od.faltan || [])
      setSalida(od.horaSalida || '10:00'); setServiceMin(Number(od.serviceMin || 8))
      // construir secuencia inicial desde el orden óptimo (saltando el origen, índice 0)
      const s: SeqStop[] = (od.order || []).filter(i => i !== 0).map(pi => {
        const p = od.points[pi] as PointStop
        return { pi, id: p.id, cliente: p.cliente, direccion: p.direccion, comuna: p.comuna, lat: p.lat, lng: p.lng }
      })
      setSeq(s)
    } catch {
      setError('Error de conexión al calcular la ruta.')
    }
    setLoading(false)
  }, [ids])

  useEffect(() => { optimizar() }, [optimizar])
  useEffect(() => {
    fetch('/api/central/rutas/choferes').then(r => r.json()).then(d => setChoferes(d.choferes || [])).catch(() => {})
  }, [])

  // Recalcula ETA, km y duración según la secuencia + config actuales.
  const calc = useMemo(() => {
    if (!data) return { stops: seq, km: 0, totalMin: 0 }
    const { matrix } = data
    let t = toMin(salida), km = 0, prev = 0
    const stops = seq.map(s => {
      const legS = matrix.duration_s?.[prev]?.[s.pi] ?? 0
      const legM = matrix.distance_m?.[prev]?.[s.pi] ?? 0
      t += legS / 60; km += legM / 1000
      const etaMin = t
      t += serviceMin
      prev = s.pi
      return { ...s, etaMin }
    })
    return { stops, km, totalMin: Math.round(t - toMin(salida)) }
  }, [data, seq, salida, serviceMin])

  const move = (pi: number, dir: number) => {
    setSeq(prev => {
      const i = prev.findIndex(s => s.pi === pi), j = i + dir
      if (i < 0 || j < 0 || j >= prev.length) return prev
      const n = [...prev];[n[i], n[j]] = [n[j], n[i]]; return n
    })
  }
  const remove = (pi: number) => setSeq(prev => prev.filter(s => s.pi !== pi))
  const onDrop = (pi: number) => {
    if (dragPi == null || dragPi === pi) return
    setSeq(prev => {
      const from = prev.findIndex(s => s.pi === dragPi), to = prev.findIndex(s => s.pi === pi)
      if (from < 0 || to < 0) return prev
      const n = [...prev]; const [m] = n.splice(from, 1); n.splice(to, 0, m); return n
    })
    setDragPi(null)
  }

  const corregir = async (id: string) => {
    const dir = (fixVals[id] || '').trim()
    if (!dir) return
    setFixing(id)
    const f = faltan.find(x => x.id === id)
    try {
      const res = await fetch('/api/central/rutas/corregir-direccion', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, direccion: dir, comuna: f?.comuna || '' }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok || !d.ok) { alert(d.error || 'No se pudo ubicar esa dirección.'); setFixing(null); return }
      await optimizar(true) // re-optimiza ya con la dirección corregida
    } catch { alert('Error al corregir la dirección.') }
    setFixing(null)
  }

  const confirmar = async () => {
    if (!data || calc.stops.length === 0) return
    setConfirming(true)
    const hoy = new Date().toISOString().slice(0, 10)
    const payload = {
      stops: calc.stops.map(s => ({ pedido_id: s.id, eta: `${hoy}T${fromMin(s.etaMin || 0)}:00-03:00` })),
      chofer_id: choferId || null,
      service_min: serviceMin,
      hora_salida: salida,
      km_estimados: Math.round(calc.km * 10) / 10,
      duracion_min: calc.totalMin,
      origen: data.origen,
      provider: data.provider,
    }
    try {
      const res = await fetch('/api/central/rutas', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) { alert(d.error || 'No se pudo confirmar la ruta.'); setConfirming(false); return }
      onConfirmed(d.route?.codigo || 'la ruta')
    } catch { alert('Error de conexión al confirmar.'); setConfirming(false) }
  }

  const mapStops = calc.stops.map((s, i) => ({ orden: i + 1, cliente: s.cliente, lat: s.lat, lng: s.lng }))

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-stretch sm:items-center justify-center sm:p-4" onClick={onClose}>
      <div className="bg-[#f5efe6] w-full sm:max-w-5xl sm:rounded-2xl max-h-full sm:max-h-[92vh] overflow-auto" onClick={e => e.stopPropagation()}>
        {/* Cabecera */}
        <div className="sticky top-0 bg-[#16233f] text-white px-5 py-3.5 flex items-center justify-between z-10">
          <div>
            <h2 className="font-bold text-lg">Nueva ruta de despacho</h2>
            <p className="text-xs text-white/70">Revisa el orden y los tiempos, asigna un chofer y confirma.</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-lg"><X className="w-5 h-5" /></button>
        </div>

        {loading ? (
          <div className="py-24 text-center text-gray-500"><Loader2 className="w-7 h-7 animate-spin mx-auto mb-2" />Calculando la mejor ruta…</div>
        ) : error ? (
          <div className="p-6">
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm">{error}</div>
            <button onClick={() => optimizar()} className="mt-3 px-4 py-2 rounded-xl bg-[#16233f] text-white text-sm font-semibold">Reintentar</button>
          </div>
        ) : (
          <div className="p-4 sm:p-5">
            {/* Métricas */}
            <div className="flex flex-wrap gap-2 mb-3">
              {[
                { k: 'Distancia', v: `${calc.km.toFixed(1)} km` },
                { k: 'Duración', v: `${Math.floor(calc.totalMin / 60)}h ${calc.totalMin % 60}m` },
                { k: 'Paradas', v: String(calc.stops.length) },
              ].map(m => (
                <div key={m.k} className="bg-white border rounded-xl px-3.5 py-2 min-w-[92px]">
                  <div className="text-[10px] uppercase tracking-wide text-gray-400 font-bold">{m.k}</div>
                  <div className="text-lg font-bold text-[#16233f]">{m.v}</div>
                </div>
              ))}
              {data?.provider === 'local-estimate' && (
                <div className="bg-amber-50 border border-amber-200 text-amber-700 rounded-xl px-3 py-2 text-[11px] flex items-center gap-1.5 max-w-[240px]">
                  <AlertTriangle className="w-3.5 h-3.5 flex-none" /> Estimación aproximada (el servidor de rutas no respondió; distancias en línea recta).
                </div>
              )}
            </div>

            {/* Direcciones a revisar */}
            {faltan.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-3 space-y-2">
                {faltan.map(f => (
                  <div key={f.id} className="text-sm">
                    <div className="flex items-center gap-1.5 text-amber-800 font-semibold">
                      <AlertTriangle className="w-4 h-4" /> Dirección a revisar — {f.cliente || 'Cliente'}
                    </div>
                    <div className="text-xs text-amber-700 mb-1.5">Original: {[f.direccion, f.comuna].filter(Boolean).join(', ') || '(vacía)'}</div>
                    <div className="flex gap-2">
                      <input
                        value={fixVals[f.id] || ''} onChange={e => setFixVals(v => ({ ...v, [f.id]: e.target.value }))}
                        placeholder="Calle y número correctos"
                        className="flex-1 min-w-0 border rounded-lg px-2.5 py-1.5 text-sm" />
                      <button onClick={() => corregir(f.id)} disabled={fixing === f.id}
                        className="px-3 py-1.5 rounded-lg bg-[#16233f] text-white text-xs font-semibold flex items-center gap-1.5 disabled:opacity-60">
                        {fixing === f.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MapPin className="w-3.5 h-3.5" />} Corregir
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-4">
              {/* Paradas */}
              <div className="bg-white border rounded-xl p-4">
                <h3 className="font-semibold text-[#16233f] mb-2.5 text-sm">Paradas · arrastra o usa ▲▼ para reordenar</h3>
                <div className="flex flex-wrap gap-2 items-end mb-3">
                  <label className="flex flex-col gap-1 text-[11px] font-bold uppercase text-gray-400">Salida fábrica
                    <input type="time" value={salida} onChange={e => setSalida(e.target.value)} className="border rounded-lg px-2 py-1.5 text-sm font-normal text-[#16233f]" />
                  </label>
                  <label className="flex flex-col gap-1 text-[11px] font-bold uppercase text-gray-400">Min/entrega
                    <select value={serviceMin} onChange={e => setServiceMin(Number(e.target.value))} className="border rounded-lg px-2 py-1.5 text-sm font-normal text-[#16233f]">
                      {[5, 8, 10, 15].map(n => <option key={n} value={n}>{n} min</option>)}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1 text-[11px] font-bold uppercase text-gray-400 flex-1 min-w-[140px]">Chofer
                    <select value={choferId} onChange={e => setChoferId(e.target.value)} className="border rounded-lg px-2 py-1.5 text-sm font-normal text-[#16233f]">
                      <option value="">— Asignar después —</option>
                      {choferes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                    </select>
                  </label>
                </div>

                <div className="space-y-2">
                  {calc.stops.map((s, i) => (
                    <div key={s.pi} draggable
                      onDragStart={() => setDragPi(s.pi)} onDragOver={e => e.preventDefault()} onDrop={() => onDrop(s.pi)}
                      className="flex gap-2.5 items-center p-2.5 border rounded-xl bg-gray-50">
                      <div className="w-7 h-7 rounded-full bg-[#16233f] text-white font-bold grid place-items-center text-sm flex-none cursor-grab">{i + 1}</div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm text-[#16233f] truncate">{s.cliente || 'Cliente'}</div>
                        <div className="text-[11px] text-gray-400 truncate">{[s.direccion, s.comuna].filter(Boolean).join(', ')}</div>
                      </div>
                      <div className="text-right flex-none">
                        <div className="font-bold text-sm text-[#16233f] tabular-nums">{fromMin(s.etaMin || 0)}</div>
                        <div className="text-[9px] uppercase text-gray-400">llegada</div>
                      </div>
                      <div className="flex flex-col flex-none">
                        <button onClick={() => move(s.pi, -1)} className="text-gray-400 hover:text-[#16233f] w-6 h-5 grid place-items-center"><ArrowUp className="w-3.5 h-3.5" /></button>
                        <button onClick={() => move(s.pi, 1)} className="text-gray-400 hover:text-[#16233f] w-6 h-5 grid place-items-center"><ArrowDown className="w-3.5 h-3.5" /></button>
                      </div>
                      <button onClick={() => remove(s.pi)} title="Quitar de la ruta" className="text-gray-300 hover:text-red-500 flex-none"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  ))}
                  {calc.stops.length === 0 && <div className="text-sm text-gray-400 py-4 text-center">No quedan paradas en esta ruta.</div>}
                </div>
              </div>

              {/* Mapa */}
              <div className="bg-white border rounded-xl p-2 min-h-[340px]">
                {data && <PlannerMap origin={data.origen} stops={mapStops} />}
              </div>
            </div>

            {/* Confirmar */}
            <div className="flex items-center justify-between gap-3 mt-4 flex-wrap">
              <p className="text-xs text-gray-500">
                {choferId ? 'Se asignará al chofer y aparecerá en su app.' : 'Puedes asignar el chofer ahora o después.'}
              </p>
              <div className="flex gap-2 ml-auto">
                <button onClick={onClose} className="px-4 py-2.5 rounded-xl border bg-white text-sm font-semibold text-gray-600">Cancelar</button>
                <button onClick={confirmar} disabled={confirming || calc.stops.length === 0}
                  className="px-5 py-2.5 rounded-xl bg-[#c9a24e] hover:bg-[#b8923f] text-[#16233f] text-sm font-bold flex items-center gap-2 disabled:opacity-60">
                  {confirming ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Confirmar ruta
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
