'use client'

import { useCallback, useEffect, useState } from 'react'
import { Loader2, Navigation, Phone, CheckCircle2, AlertTriangle, Truck, MapPin, PartyPopper, Play } from 'lucide-react'

interface Stop {
  id: string; orden: number; cliente_nombre: string | null; direccion: string | null; comuna: string | null
  telefono: string | null; lat: number | null; lng: number | null; eta: string | null; estado_entrega: string | null
}
interface Ruta {
  id: string; codigo: string; estado: string; hora_salida_plan: string | null
  km_estimados: number | null; duracion_min_estimada: number | null; stops: Stop[]
}

const hhmm = (iso: string | null) => {
  if (!iso) return '—'
  try { return new Date(iso).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }) } catch { return '—' }
}
const wazeUrl = (s: Stop) =>
  s.lat != null && s.lng != null
    ? `https://waze.com/ul?ll=${s.lat},${s.lng}&navigate=yes`
    : `https://waze.com/ul?q=${encodeURIComponent([s.direccion, s.comuna].filter(Boolean).join(', '))}`

export default function ChoferReparto() {
  const [rutas, setRutas] = useState<Ruta[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [iniciando, setIniciando] = useState<string | null>(null)

  const cargar = useCallback(async () => {
    try {
      const res = await fetch('/api/portal/chofer/reparto', { cache: 'no-store' })
      const d = await res.json().catch(() => ({}))
      setRutas(res.ok ? (d.rutas || []) : [])
    } catch { setRutas([]) }
    setLoading(false)
  }, [])
  useEffect(() => { cargar() }, [cargar])

  const marcar = async (stop: Stop, estado: string) => {
    setSaving(stop.id)
    let lat: number | undefined, lng: number | undefined
    try {
      if (typeof navigator !== 'undefined' && navigator.geolocation) {
        await new Promise<void>(resolve => navigator.geolocation.getCurrentPosition(
          p => { lat = p.coords.latitude; lng = p.coords.longitude; resolve() },
          () => resolve(), { timeout: 4000 }))
      }
    } catch { /* sin gps */ }
    try {
      const res = await fetch('/api/portal/chofer/reparto', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stop_id: stop.id, estado, lat, lng }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) { alert(d.error || 'No se pudo guardar.'); setSaving(null); return }
      await cargar()
    } catch { alert('Error de conexión.') }
    setSaving(null)
  }

  const iniciar = async (routeId: string) => {
    setIniciando(routeId)
    try {
      const res = await fetch('/api/portal/chofer/reparto', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'iniciar', route_id: routeId }),
      })
      if (!res.ok) { const d = await res.json().catch(() => ({})); alert(d.error || 'No se pudo iniciar la ruta.'); setIniciando(null); return }
      await cargar()
    } catch { alert('Error de conexión.') }
    setIniciando(null)
  }

  if (loading) {
    return <div className="py-24 flex justify-center"><Loader2 className="w-6 h-6 text-[#1b2a4a] animate-spin" /></div>
  }

  const ruta = rutas[0] // ruta activa del día (si hay varias, se muestran en orden)
  if (!ruta) {
    return (
      <div className="px-4 py-16 text-center text-gray-500">
        <Truck className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p className="font-semibold text-[#1b2a4a]">No tienes reparto asignado</p>
        <p className="text-sm">Cuando te asignen una ruta de pedidos web, aparecerá aquí.</p>
      </div>
    )
  }

  return (
    <div className="px-4 py-4 space-y-4">
      {rutas.map(ruta => {
        const total = ruta.stops.length
        const hechas = ruta.stops.filter(s => ['entregado', 'no_entregado'].includes(String(s.estado_entrega))).length
        const dur = ruta.duracion_min_estimada || 0
        const todoListo = total > 0 && hechas === total
        return (
          <div key={ruta.id} className="space-y-3">
            <div className="bg-[#1b2a4a] text-white rounded-2xl p-4">
              <div className="flex items-center gap-2 font-bold text-lg"><Truck className="w-5 h-5 text-[#c9a24e]" /> {ruta.codigo}</div>
              <div className="text-white/70 text-sm mt-0.5">
                Salida {hhmm(ruta.hora_salida_plan)} · {(ruta.km_estimados || 0).toFixed(1)} km · {Math.floor(dur / 60)}h {dur % 60}m
              </div>
              <div className="mt-2 text-sm font-semibold text-[#c9a24e]">{hechas} de {total} entregas completadas</div>
              {ruta.estado === 'en_ruta' ? (
                <div className="mt-3 text-xs bg-white/10 rounded-lg py-1.5 text-center">● En ruta · horas reales desde tu salida</div>
              ) : ruta.estado !== 'finalizada' ? (
                <button onClick={() => iniciar(ruta.id)} disabled={iniciando === ruta.id}
                  className="mt-3 w-full flex items-center justify-center gap-2 bg-[#c9a24e] text-[#1b2a4a] font-bold rounded-xl py-2.5 text-sm disabled:opacity-60">
                  {iniciando === ruta.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />} Iniciar ruta
                </button>
              ) : null}
            </div>

            {todoListo && (
              <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl p-3 text-sm flex items-center gap-2">
                <PartyPopper className="w-5 h-5" /> ¡Terminaste todas las entregas de esta ruta! 🎉
              </div>
            )}

            {ruta.stops.map(s => {
              const done = s.estado_entrega === 'entregado'
              const failed = s.estado_entrega === 'no_entregado' || s.estado_entrega === 'incidencia'
              return (
                <div key={s.id} className={`bg-white rounded-2xl border p-3.5 ${done ? 'opacity-70' : ''}`}>
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-full grid place-items-center font-bold text-sm flex-none text-white ${done ? 'bg-green-600' : failed ? 'bg-red-500' : 'bg-[#1b2a4a]'}`}>
                      {done ? '✓' : s.orden}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-[#1b2a4a]">{s.cliente_nombre || 'Cliente'}</div>
                      <div className="text-sm text-gray-500 flex items-start gap-1"><MapPin className="w-3.5 h-3.5 mt-0.5 flex-none" />{[s.direccion, s.comuna].filter(Boolean).join(', ')}</div>
                    </div>
                    <div className="text-right flex-none">
                      <div className="font-bold text-[#1b2a4a] tabular-nums">{hhmm(s.eta)}</div>
                      <div className="text-[10px] uppercase text-gray-400">llegada</div>
                    </div>
                  </div>

                  {done ? (
                    <div className="mt-3 text-center text-green-700 font-semibold text-sm bg-green-50 rounded-xl py-2">✓ Entregado</div>
                  ) : failed ? (
                    <div className="mt-3 flex items-center justify-between gap-2">
                      <span className="text-red-600 font-semibold text-sm">No entregado</span>
                      <button onClick={() => marcar(s, 'entregado')} disabled={saving === s.id} className="text-xs font-semibold text-[#1b2a4a] underline">Reintentar entrega</button>
                    </div>
                  ) : (
                    <>
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <a href={wazeUrl(s)} target="_blank" rel="noopener noreferrer"
                          className="flex items-center justify-center gap-1.5 bg-[#33ccff]/15 text-[#0b7fab] font-semibold rounded-xl py-2.5 text-sm">
                          <Navigation className="w-4 h-4" /> Waze
                        </a>
                        {s.telefono ? (
                          <a href={`tel:${s.telefono}`} className="flex items-center justify-center gap-1.5 bg-gray-100 text-[#1b2a4a] font-semibold rounded-xl py-2.5 text-sm">
                            <Phone className="w-4 h-4" /> Llamar
                          </a>
                        ) : <span className="flex items-center justify-center text-gray-300 text-sm">Sin teléfono</span>}
                      </div>
                      <div className="mt-2 grid grid-cols-3 gap-2">
                        <button onClick={() => marcar(s, 'entregado')} disabled={saving === s.id}
                          className="col-span-2 flex items-center justify-center gap-1.5 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl py-2.5 text-sm disabled:opacity-60">
                          {saving === s.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Entregado
                        </button>
                        <button onClick={() => marcar(s, 'no_entregado')} disabled={saving === s.id}
                          className="flex items-center justify-center gap-1 bg-red-50 text-red-600 font-semibold rounded-xl py-2.5 text-xs disabled:opacity-60">
                          <AlertTriangle className="w-3.5 h-3.5" /> No pude
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}
