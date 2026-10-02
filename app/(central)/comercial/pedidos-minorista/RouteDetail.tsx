'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { Loader2, X, MapPin, Phone, User, Truck, Trash2 } from 'lucide-react'

const PlannerMap = dynamic(() => import('./PlannerMap'), { ssr: false })

interface Stop {
  orden: number; cliente_nombre: string | null; direccion: string | null; comuna: string | null
  telefono: string | null; lat: number | null; lng: number | null; eta: string | null; estado_entrega: string | null
}
interface Ruta {
  id: string; codigo: string; estado: string; fecha: string
  origen_nombre: string | null; origen_lat: number | null; origen_lng: number | null
  km_estimados: number | null; duracion_min_estimada: number | null; hora_salida_plan: string | null
  chofer: { nombre: string; telefono: string | null } | null
  stops: Stop[]
}

const hhmm = (iso: string | null) => {
  if (!iso) return '—'
  try { return new Date(iso).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }) } catch { return '—' }
}
const EE: Record<string, { cls: string; txt: string }> = {
  pendiente: { cls: 'bg-gray-100 text-gray-500', txt: 'Pendiente' },
  en_ruta: { cls: 'bg-amber-100 text-amber-700', txt: 'En ruta' },
  llego_cliente: { cls: 'bg-amber-100 text-amber-700', txt: 'Llegando' },
  entregado: { cls: 'bg-green-100 text-green-700', txt: 'Entregado' },
  no_entregado: { cls: 'bg-red-100 text-red-700', txt: 'No entregado' },
  incidencia: { cls: 'bg-red-100 text-red-700', txt: 'Incidencia' },
}

export default function RouteDetail({ routeId, onClose, onDeleted }: { routeId: string; onClose: () => void; onDeleted?: () => void }) {
  const [ruta, setRuta] = useState<Ruta | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const deshacer = async () => {
    if (!confirm('¿Deshacer esta ruta? Sus pedidos volverán a quedar "sin ruta" para poder armarla de nuevo. No se cancela ningún pedido.')) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/central/rutas/${routeId}`, { method: 'DELETE' })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) { alert(d.error || 'No se pudo deshacer la ruta.'); setDeleting(false); return }
      if (onDeleted) onDeleted(); else onClose()
    } catch { alert('Error de conexión.'); setDeleting(false) }
  }

  useEffect(() => {
    let alive = true
    setLoading(true)
    fetch(`/api/central/rutas/${routeId}`)
      .then(r => r.json())
      .then(d => { if (!alive) return; if (d.ok) setRuta(d.ruta); else setError(d.error || 'No se pudo cargar la ruta') })
      .catch(() => { if (alive) setError('Error de conexión') })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [routeId])

  const origin = ruta && ruta.origen_lat != null && ruta.origen_lng != null
    ? { lat: ruta.origen_lat, lng: ruta.origen_lng, nombre: ruta.origen_nombre || 'Salida' }
    : { lat: -33.45, lng: -70.66, nombre: 'Salida' }
  const mapStops = (ruta?.stops || []).filter(s => s.lat != null && s.lng != null)
    .map(s => ({ orden: s.orden, cliente: s.cliente_nombre, lat: s.lat as number, lng: s.lng as number }))
  const dur = ruta?.duracion_min_estimada || 0

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-stretch sm:items-center justify-center sm:p-4" onClick={onClose}>
      <div className="bg-[#f5efe6] w-full sm:max-w-5xl sm:rounded-2xl max-h-full sm:max-h-[92vh] overflow-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-[#16233f] text-white px-5 py-3.5 flex items-center justify-between z-10">
          <div>
            <h2 className="font-bold text-lg flex items-center gap-2"><Truck className="w-5 h-5" /> {ruta?.codigo || 'Ruta'}</h2>
            <p className="text-xs text-white/70">{ruta?.chofer?.nombre ? `Chofer: ${ruta.chofer.nombre}` : 'Sin chofer asignado'}</p>
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
                { k: 'Paradas', v: String(ruta.stops.length) },
                { k: 'Estado', v: ruta.estado },
              ].map(m => (
                <div key={m.k} className="bg-white border rounded-xl px-3.5 py-2 min-w-[92px]">
                  <div className="text-[10px] uppercase tracking-wide text-gray-400 font-bold">{m.k}</div>
                  <div className="text-lg font-bold text-[#16233f] capitalize">{m.v}</div>
                </div>
              ))}
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-white border rounded-xl p-4">
                <h3 className="font-semibold text-[#16233f] mb-1 text-sm flex items-center gap-1.5"><MapPin className="w-4 h-4 text-[#c9a24e]" /> Salida: {ruta.origen_nombre || 'Centro de despacho'}</h3>
                <p className="text-[11px] text-gray-400 mb-3">Orden de entrega optimizado</p>
                <div className="space-y-2">
                  {ruta.stops.map(s => {
                    const ee = EE[String(s.estado_entrega || 'pendiente')] || EE.pendiente
                    return (
                      <div key={s.orden} className="flex gap-2.5 items-center p-2.5 border rounded-xl bg-gray-50">
                        <div className="w-7 h-7 rounded-full bg-[#16233f] text-white font-bold grid place-items-center text-sm flex-none">{s.orden}</div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm text-[#16233f] truncate flex items-center gap-1"><User className="w-3 h-3 text-gray-400" />{s.cliente_nombre || 'Cliente'}</div>
                          <div className="text-[11px] text-gray-400 truncate">{[s.direccion, s.comuna].filter(Boolean).join(', ')}</div>
                          {s.telefono && <div className="text-[11px] text-gray-400 flex items-center gap-1"><Phone className="w-3 h-3" />{s.telefono}</div>}
                        </div>
                        <div className="text-right flex-none">
                          <div className="font-bold text-sm text-[#16233f] tabular-nums">{hhmm(s.eta)}</div>
                          <div className="text-[9px] uppercase text-gray-400">llegada</div>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${ee.cls}`}>{ee.txt}</span>
                        </div>
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
              <button onClick={deshacer} disabled={deleting}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-red-200 text-red-600 text-sm font-semibold hover:bg-red-50 disabled:opacity-60">
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />} Deshacer ruta
              </button>
              <button onClick={onClose} className="px-5 py-2.5 rounded-xl bg-[#16233f] text-white text-sm font-semibold">Cerrar</button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
