'use client'

import { useCallback, useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { Loader2, X, MapPin, Phone, User, Truck, Trash2, Save, Undo2 } from 'lucide-react'

const PlannerMap = dynamic(() => import('./PlannerMap'), { ssr: false })

interface Stop {
  id: string; orden: number; cliente_nombre: string | null; direccion: string | null; comuna: string | null
  telefono: string | null; lat: number | null; lng: number | null; eta: string | null; estado_entrega: string | null
  minorista_pedido_id: string | null; mayorista_pedido_id: string | null
}
interface Ruta {
  id: string; codigo: string; estado: string; fecha: string; chofer_id: string | null
  origen_nombre: string | null; origen_lat: number | null; origen_lng: number | null
  km_estimados: number | null; duracion_min_estimada: number | null; hora_salida_plan: string | null
  chofer: { nombre: string; telefono: string | null } | null
  stops: Stop[]
}
interface Chofer { id: string; nombre: string }

const hhmm = (iso: string | null) => {
  if (!iso) return '—'
  try { return new Date(iso).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }) } catch { return '—' }
}
const horaDe = (iso: string | null) => {
  if (!iso) return '10:00'
  try { return new Date(iso).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Santiago' }).slice(0, 5) } catch { return '10:00' }
}
const EE: Record<string, { cls: string; txt: string }> = {
  pendiente: { cls: 'bg-gray-100 text-gray-500', txt: 'Pendiente' },
  en_ruta: { cls: 'bg-amber-100 text-amber-700', txt: 'En ruta' },
  llego_cliente: { cls: 'bg-amber-100 text-amber-700', txt: 'Llegando' },
  entregado: { cls: 'bg-green-100 text-green-700', txt: 'Entregado' },
  no_entregado: { cls: 'bg-red-100 text-red-700', txt: 'No entregado' },
  incidencia: { cls: 'bg-red-100 text-red-700', txt: 'Incidencia' },
}

export default function RouteDetail({ routeId, onClose, onDeleted, onChanged }: { routeId: string; onClose: () => void; onDeleted?: () => void; onChanged?: () => void }) {
  const [ruta, setRuta] = useState<Ruta | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [choferes, setChoferes] = useState<Chofer[]>([])
  const [choferSel, setChoferSel] = useState('')
  const [hora, setHora] = useState('10:00')
  const [removed, setRemoved] = useState<Set<string>>(new Set())

  const recargar = useCallback(async () => {
    setLoading(true)
    try {
      const d = await fetch(`/api/central/rutas/${routeId}`).then(r => r.json())
      if (d.ok) {
        setRuta(d.ruta)
        setChoferSel(d.ruta.chofer_id || '')
        setHora(horaDe(d.ruta.hora_salida_plan))
        setRemoved(new Set())
      } else setError(d.error || 'No se pudo cargar la ruta')
    } catch { setError('Error de conexión') }
    setLoading(false)
  }, [routeId])

  useEffect(() => { recargar() }, [recargar])
  useEffect(() => { fetch('/api/central/rutas/choferes').then(r => r.json()).then(d => setChoferes(d.choferes || [])).catch(() => {}) }, [])

  const pedidoId = (s: Stop) => s.minorista_pedido_id || s.mayorista_pedido_id || s.id
  const toggleQuitar = (s: Stop) => setRemoved(prev => { const n = new Set(prev); const k = pedidoId(s); if (n.has(k)) n.delete(k); else n.add(k); return n })

  const hayCambios = ruta ? (removed.size > 0 || choferSel !== (ruta.chofer_id || '') || hora !== horaDe(ruta.hora_salida_plan)) : false

  const guardar = async () => {
    if (!ruta) return
    if (removed.size >= ruta.stops.length) { alert('No puedes quitar todas las paradas. Si quieres eliminar la ruta completa, usa "Deshacer ruta".'); return }
    setSaving(true)
    try {
      const res = await fetch(`/api/central/rutas/${routeId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ remove: Array.from(removed), chofer_id: choferSel || null, hora_salida: hora }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) { alert(d.error || 'No se pudieron guardar los cambios.'); setSaving(false); return }
      if (onChanged) onChanged()
      await recargar()
    } catch { alert('Error de conexión.') }
    setSaving(false)
  }

  const deshacer = async () => {
    if (!confirm('¿Deshacer esta ruta? Sus pedidos volverán a quedar "sin ruta". No se cancela ningún pedido.')) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/central/rutas/${routeId}`, { method: 'DELETE' })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) { alert(d.error || 'No se pudo deshacer la ruta.'); setDeleting(false); return }
      if (onDeleted) onDeleted(); else onClose()
    } catch { alert('Error de conexión.'); setDeleting(false) }
  }

  const origin = ruta && ruta.origen_lat != null && ruta.origen_lng != null
    ? { lat: ruta.origen_lat, lng: ruta.origen_lng, nombre: ruta.origen_nombre || 'Salida' }
    : { lat: -33.45, lng: -70.66, nombre: 'Salida' }
  const mapStops = (ruta?.stops || []).filter(s => s.lat != null && s.lng != null && !removed.has(pedidoId(s)))
    .map(s => ({ orden: s.orden, cliente: s.cliente_nombre, lat: s.lat as number, lng: s.lng as number }))
  const dur = ruta?.duracion_min_estimada || 0
  const quedan = ruta ? ruta.stops.length - removed.size : 0

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-stretch sm:items-center justify-center sm:p-4" onClick={onClose}>
      <div className="bg-[#f5efe6] w-full sm:max-w-5xl sm:rounded-2xl max-h-full sm:max-h-[92vh] overflow-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-[#16233f] text-white px-5 py-3.5 flex items-center justify-between z-10">
          <div>
            <h2 className="font-bold text-lg flex items-center gap-2"><Truck className="w-5 h-5" /> {ruta?.codigo || 'Ruta'}</h2>
            <p className="text-xs text-white/70">Quita clientes, cambia la hora o el chofer, y guarda.</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-lg"><X className="w-5 h-5" /></button>
        </div>

        {loading ? (
          <div className="py-24 text-center text-gray-500"><Loader2 className="w-7 h-7 animate-spin mx-auto mb-2" />Cargando ruta…</div>
        ) : error ? (
          <div className="p-6"><div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm">{error}</div></div>
        ) : ruta ? (
          <div className="p-4 sm:p-5">
            <div className="flex flex-wrap gap-2 mb-3">
              {[
                { k: 'Distancia', v: `${(ruta.km_estimados || 0).toFixed(1)} km` },
                { k: 'Duración', v: `${Math.floor(dur / 60)}h ${dur % 60}m` },
                { k: 'Paradas', v: String(quedan) },
                { k: 'Estado', v: ruta.estado },
              ].map(m => (
                <div key={m.k} className="bg-white border rounded-xl px-3.5 py-2 min-w-[86px]">
                  <div className="text-[10px] uppercase tracking-wide text-gray-400 font-bold">{m.k}</div>
                  <div className="text-lg font-bold text-[#16233f] capitalize">{m.v}</div>
                </div>
              ))}
            </div>

            {/* Controles de edición */}
            <div className="bg-white border rounded-xl p-3 mb-3 flex flex-wrap gap-3 items-end">
              <label className="flex flex-col gap-1 text-[11px] font-bold uppercase text-gray-400">Hora de salida
                <input type="time" value={hora} onChange={e => setHora(e.target.value)} className="border rounded-lg px-2 py-1.5 text-sm font-normal text-[#16233f]" />
              </label>
              <label className="flex flex-col gap-1 text-[11px] font-bold uppercase text-gray-400 flex-1 min-w-[160px]">Chofer
                <select value={choferSel} onChange={e => setChoferSel(e.target.value)} className="border rounded-lg px-2 py-1.5 text-sm font-normal text-[#16233f]">
                  <option value="">— Sin asignar —</option>
                  {choferes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </label>
              <p className="text-[11px] text-gray-400 flex-1 min-w-[180px]">La hora de llegada es <b>estimada</b> según la salida. La hora real se registra cuando el chofer inicia la ruta y entrega.</p>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-white border rounded-xl p-4">
                <h3 className="font-semibold text-[#16233f] mb-1 text-sm flex items-center gap-1.5"><MapPin className="w-4 h-4 text-[#c9a24e]" /> Salida: {ruta.origen_nombre || 'Centro de despacho'}</h3>
                <p className="text-[11px] text-gray-400 mb-3">Orden de entrega optimizado · toca ✕ para sacar un cliente de hoy</p>
                <div className="space-y-2">
                  {ruta.stops.map(s => {
                    const ee = EE[String(s.estado_entrega || 'pendiente')] || EE.pendiente
                    const quitado = removed.has(pedidoId(s))
                    return (
                      <div key={s.id} className={`flex gap-2.5 items-center p-2.5 border rounded-xl ${quitado ? 'bg-red-50 opacity-60' : 'bg-gray-50'}`}>
                        <div className={`w-7 h-7 rounded-full text-white font-bold grid place-items-center text-sm flex-none ${quitado ? 'bg-gray-300' : 'bg-[#16233f]'}`}>{s.orden}</div>
                        <div className="flex-1 min-w-0">
                          <div className={`font-semibold text-sm text-[#16233f] truncate flex items-center gap-1 ${quitado ? 'line-through' : ''}`}><User className="w-3 h-3 text-gray-400" />{s.cliente_nombre || 'Cliente'}</div>
                          <div className="text-[11px] text-gray-400 truncate">{[s.direccion, s.comuna].filter(Boolean).join(', ')}</div>
                          {s.telefono && <div className="text-[11px] text-gray-400 flex items-center gap-1"><Phone className="w-3 h-3" />{s.telefono}</div>}
                        </div>
                        <div className="text-right flex-none">
                          <div className="font-bold text-sm text-[#16233f] tabular-nums">{hhmm(s.eta)}</div>
                          <div className="text-[9px] uppercase text-gray-400">est.</div>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${ee.cls}`}>{ee.txt}</span>
                        </div>
                        <button onClick={() => toggleQuitar(s)} title={quitado ? 'Volver a incluir' : 'Sacar de la ruta'} className="flex-none text-gray-300 hover:text-red-500">
                          {quitado ? <Undo2 className="w-4 h-4" /> : <X className="w-4 h-4" />}
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="bg-white border rounded-xl p-2 min-h-[340px]">
                <PlannerMap origin={origin} stops={mapStops} />
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 mt-4 flex-wrap">
              <button onClick={deshacer} disabled={deleting || saving}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-red-200 text-red-600 text-sm font-semibold hover:bg-red-50 disabled:opacity-60">
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />} Deshacer ruta
              </button>
              <div className="flex gap-2 ml-auto">
                <button onClick={onClose} className="px-4 py-2.5 rounded-xl border bg-white text-sm font-semibold text-gray-600">Cerrar</button>
                <button onClick={guardar} disabled={saving || deleting || !hayCambios}
                  className="px-5 py-2.5 rounded-xl bg-[#c9a24e] hover:bg-[#b8923f] text-[#16233f] text-sm font-bold flex items-center gap-2 disabled:opacity-50">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Guardar cambios
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
