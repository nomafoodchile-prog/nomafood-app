'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Truck, MapPin, CheckCircle2, Clock, AlertCircle, Play, RefreshCw,
  Wifi, WifiOff, Navigation, DollarSign, ChevronDown, ChevronUp,
  User, Phone, Package, Send, Camera, Fuel
} from 'lucide-react'

/* ─────────────────────────────────────────────
   TIPOS
───────────────────────────────────────────── */
type DispatchStatus = 'pendiente' | 'en_ruta' | 'entregado' | 'fallido'

interface Chofer {
  id: string
  nombre: string
  apellido: string
  patente: string
  token: string
}

interface DeliveryStop {
  id: string
  orden: number
  cliente_nombre: string
  cliente_direccion: string
  cliente_telefono?: string
  pedido_numero: string
  bultos: number
  status: DispatchStatus
  entregado_at?: string
  notas?: string
  lat?: number
  lng?: number
}

interface Dispatch {
  id: string
  fecha: string
  status: DispatchStatus
  kilometraje_inicio?: number
  kilometraje_fin?: number
  stops: DeliveryStop[]
}

interface Gasto {
  tipo: 'combustible' | 'peaje' | 'estacionamiento' | 'otro'
  monto: number
  descripcion: string
}

/* ─────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────── */
const STATUS_COLORS: Record<DispatchStatus, string> = {
  pendiente: 'bg-gray-100 text-gray-600',
  en_ruta: 'bg-blue-100 text-blue-700',
  entregado: 'bg-green-100 text-green-700',
  fallido: 'bg-red-100 text-red-700',
}

const STATUS_LABELS: Record<DispatchStatus, string> = {
  pendiente: 'Pendiente',
  en_ruta: 'En ruta',
  entregado: 'Entregado',
  fallido: 'No entregado',
}

function openWaze(address: string) {
  const encoded = encodeURIComponent(address)
  window.open(`https://waze.com/ul?q=${encoded}&navigate=yes`, '_blank')
}

function openGMaps(address: string) {
  const encoded = encodeURIComponent(address)
  window.open(`https://maps.google.com/maps?q=${encoded}`, '_blank')
}

/* ─────────────────────────────────────────────
   COMPONENTE PRINCIPAL
───────────────────────────────────────────── */
export default function PortalChofer({ params }: { params: { token: string } }) {
  const { token } = params

  const [chofer, setChofer] = useState<Chofer | null>(null)
  const [dispatch, setDispatch] = useState<Dispatch | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [online, setOnline] = useState(true)

  const [expandedStop, setExpandedStop] = useState<string | null>(null)
  const [saving, setSaving] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Gasto form
  const [showGasto, setShowGasto] = useState(false)
  const [gasto, setGasto] = useState<Gasto>({ tipo: 'combustible', monto: 0, descripcion: '' })

  // Notas por parada
  const [notas, setNotas] = useState<Record<string, string>>({})

  /* ── Carga ── */
  const loadData = useCallback(async () => {
    try {
      setOnline(navigator.onLine)
      const res = await fetch(`/api/portal/chofer/${token}`)
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        setError(err.error || 'Token inválido')
        setLoading(false)
        return
      }
      const data = await res.json()
      setChofer(data.chofer)
      setDispatch(data.dispatch)
      setError(null)
    } catch {
      setOnline(false)
      setError('Sin conexión')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => { loadData() }, [loadData])

  useEffect(() => {
    const onOnline = () => { setOnline(true); loadData() }
    const onOffline = () => setOnline(false)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => { window.removeEventListener('online', onOnline); window.removeEventListener('offline', onOffline) }
  }, [loadData])

  /* ── Acciones ── */
  function showSuccess(msg: string) {
    setSuccessMsg(msg)
    setTimeout(() => setSuccessMsg(null), 3000)
  }

  async function startRoute() {
    if (!dispatch) return
    setSaving('route')
    try {
      await fetch(`/api/portal/chofer/${token}/dispatch/${dispatch.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'en_ruta', started_at: new Date().toISOString() })
      })
      setDispatch(d => d ? { ...d, status: 'en_ruta' } : null)
      showSuccess('Ruta iniciada')
    } finally { setSaving(null) }
  }

  async function markDelivered(stopId: string, success: boolean) {
    setSaving(stopId)
    try {
      await fetch(`/api/portal/chofer/${token}/stop/${stopId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: success ? 'entregado' : 'fallido',
          entregado_at: new Date().toISOString(),
          notas: notas[stopId] || ''
        })
      })
      setDispatch(d => {
        if (!d) return null
        return {
          ...d,
          stops: d.stops.map(s => s.id === stopId
            ? { ...s, status: success ? 'entregado' : 'fallido', entregado_at: new Date().toISOString(), notas: notas[stopId] }
            : s)
        }
      })
      setExpandedStop(null)
      showSuccess(success ? '¡Entrega confirmada!' : 'Entrega marcada como fallida')
    } finally { setSaving(null) }
  }

  async function submitGasto() {
    if (!gasto.monto || !dispatch) return
    setSaving('gasto')
    try {
      await fetch(`/api/portal/chofer/${token}/gasto`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...gasto, dispatch_id: dispatch.id })
      })
      setGasto({ tipo: 'combustible', monto: 0, descripcion: '' })
      setShowGasto(false)
      showSuccess('Gasto registrado')
    } finally { setSaving(null) }
  }

  /* ── Stats ── */
  const stops = dispatch?.stops || []
  const entregados = stops.filter(s => s.status === 'entregado').length
  const fallidos = stops.filter(s => s.status === 'fallido').length
  const pendientes = stops.filter(s => s.status === 'pendiente' || s.status === 'en_ruta').length

  /* ── LOADING ── */
  if (loading) {
    return (
      <div className="min-h-screen bg-[#f5f0e8] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#c9a84c] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 text-sm">Cargando portal...</p>
        </div>
      </div>
    )
  }

  if (error && !chofer) {
    return (
      <div className="min-h-screen bg-[#f5f0e8] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center shadow-sm border border-gray-100">
          <AlertCircle className="text-red-500 w-12 h-12 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-gray-800 mb-2">Acceso no autorizado</h2>
          <p className="text-sm text-gray-500">{error}</p>
        </div>
      </div>
    )
  }

  /* ── PORTAL ── */
  return (
    <div className="min-h-screen bg-[#f5f0e8]">
      {/* Toast */}
      {successMsg && (
        <div className="fixed top-4 right-4 z-50 bg-green-500 text-white px-4 py-2 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2">
          <CheckCircle2 size={16} /> {successMsg}
        </div>
      )}

      {/* Header */}
      <div className="bg-[#0f0f0f] text-white px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#c9a84c] flex items-center justify-center">
            <Truck size={16} className="text-[#0f0f0f]" />
          </div>
          <div>
            <p className="text-xs text-gray-400">Portal Chofer</p>
            <p className="text-sm font-semibold">{chofer?.nombre} {chofer?.apellido}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {online ? <Wifi size={14} className="text-green-400" /> : <WifiOff size={14} className="text-red-400" />}
          <button onClick={loadData} className="p-1.5 rounded-lg hover:bg-white/10">
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {!online && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-xs text-amber-700 flex items-center gap-2">
          <WifiOff size={12} /> Sin conexión — modo offline activo
        </div>
      )}

      <div className="max-w-md mx-auto px-4 py-5 space-y-4">

        {/* Sin despacho */}
        {!dispatch && (
          <div className="bg-white rounded-xl p-8 text-center border border-gray-100 shadow-sm">
            <Truck className="mx-auto text-gray-300 mb-3" size={40} />
            <p className="text-sm font-semibold text-gray-600">Sin despacho asignado hoy</p>
            <p className="text-xs text-gray-400 mt-1">Contacta al administrador</p>
          </div>
        )}

        {dispatch && (
          <>
            {/* Resumen del despacho */}
            <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-xs text-gray-400">Despacho del día</p>
                  <p className="text-sm font-bold text-gray-800">
                    {new Date(dispatch.fecha).toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${STATUS_COLORS[dispatch.status]}`}>
                  {STATUS_LABELS[dispatch.status]}
                </span>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="bg-green-50 rounded-lg p-2 text-center">
                  <p className="text-lg font-bold text-green-600">{entregados}</p>
                  <p className="text-xs text-green-700">Entregados</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-2 text-center">
                  <p className="text-lg font-bold text-gray-600">{pendientes}</p>
                  <p className="text-xs text-gray-600">Pendientes</p>
                </div>
                <div className="bg-red-50 rounded-lg p-2 text-center">
                  <p className="text-lg font-bold text-red-500">{fallidos}</p>
                  <p className="text-xs text-red-600">Fallidos</p>
                </div>
              </div>

              {/* Barra de progreso */}
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#c9a84c] transition-all"
                  style={{ width: `${stops.length > 0 ? ((entregados / stops.length) * 100) : 0}%` }}
                />
              </div>

              {/* Iniciar ruta */}
              {dispatch.status === 'pendiente' && (
                <button
                  onClick={startRoute}
                  disabled={saving === 'route'}
                  className="mt-3 w-full bg-[#0f0f0f] text-white rounded-xl py-2.5 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {saving === 'route' ? <RefreshCw size={14} className="animate-spin" /> : <Play size={14} />}
                  Iniciar ruta
                </button>
              )}
            </div>

            {/* Vehículo */}
            <div className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm flex items-center gap-3">
              <div className="p-2 bg-gray-100 rounded-lg">
                <Truck size={18} className="text-gray-500" />
              </div>
              <div>
                <p className="text-xs text-gray-400">Vehículo asignado</p>
                <p className="text-sm font-semibold text-gray-800">{chofer?.patente || 'Ver con supervisor'}</p>
              </div>
            </div>

            {/* Lista de paradas */}
            <div className="space-y-2">
              <h2 className="text-sm font-semibold text-gray-700 px-1">
                Paradas ({stops.length})
              </h2>

              {stops.length === 0 && (
                <div className="bg-white rounded-xl p-6 text-center border border-gray-100">
                  <Package className="mx-auto text-gray-300 mb-2" size={28} />
                  <p className="text-sm text-gray-400">Sin paradas asignadas</p>
                </div>
              )}

              {stops.map((stop, idx) => {
                const isExpanded = expandedStop === stop.id
                const isDone = stop.status === 'entregado' || stop.status === 'fallido'

                return (
                  <div
                    key={stop.id}
                    className={`bg-white rounded-xl border shadow-sm overflow-hidden ${
                      isDone ? 'opacity-70' : 'border-gray-100'
                    } ${stop.status === 'entregado' ? 'border-green-200' : stop.status === 'fallido' ? 'border-red-200' : 'border-gray-100'}`}
                  >
                    {/* Cabecera parada */}
                    <button
                      onClick={() => setExpandedStop(isExpanded ? null : stop.id)}
                      className="w-full flex items-center gap-3 p-3 text-left"
                    >
                      {/* Número parada */}
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                        stop.status === 'entregado' ? 'bg-green-100 text-green-700' :
                        stop.status === 'fallido' ? 'bg-red-100 text-red-600' :
                        'bg-[#c9a84c]/20 text-[#c9a84c]'
                      }`}>
                        {stop.status === 'entregado'
                          ? <CheckCircle2 size={16} />
                          : stop.orden || idx + 1}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${isDone ? 'text-gray-400' : 'text-gray-800'}`}>
                          {stop.cliente_nombre}
                        </p>
                        <p className="text-xs text-gray-400 truncate">{stop.cliente_direccion}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`text-xs px-1.5 py-0.5 rounded-full ${STATUS_COLORS[stop.status]}`}>
                            {STATUS_LABELS[stop.status]}
                          </span>
                          <span className="text-xs text-gray-400">{stop.bultos} bultos · #{stop.pedido_numero}</span>
                        </div>
                      </div>
                      {isExpanded ? <ChevronUp size={16} className="text-gray-400 shrink-0" /> : <ChevronDown size={16} className="text-gray-400 shrink-0" />}
                    </button>

                    {/* Detalle expandible */}
                    {isExpanded && (
                      <div className="px-3 pb-3 border-t border-gray-100 pt-3 space-y-3">
                        {/* Navegación */}
                        <div className="flex gap-2">
                          <button
                            onClick={() => openWaze(stop.cliente_direccion)}
                            className="flex-1 bg-[#00aaff]/10 text-[#007acc] rounded-lg py-2 text-xs font-semibold flex items-center justify-center gap-1.5"
                          >
                            <Navigation size={13} /> Waze
                          </button>
                          <button
                            onClick={() => openGMaps(stop.cliente_direccion)}
                            className="flex-1 bg-green-50 text-green-700 rounded-lg py-2 text-xs font-semibold flex items-center justify-center gap-1.5"
                          >
                            <MapPin size={13} /> Google Maps
                          </button>
                          {stop.cliente_telefono && (
                            <a
                              href={`tel:${stop.cliente_telefono}`}
                              className="flex-1 bg-gray-50 text-gray-600 rounded-lg py-2 text-xs font-semibold flex items-center justify-center gap-1.5"
                            >
                              <Phone size={13} /> Llamar
                            </a>
                          )}
                        </div>

                        {/* Dirección completa */}
                        <p className="text-xs text-gray-600 bg-gray-50 rounded-lg p-2">
                          <MapPin size={12} className="inline mr-1 text-gray-400" />
                          {stop.cliente_direccion}
                        </p>

                        {/* Nota */}
                        {!isDone && (
                          <textarea
                            value={notas[stop.id] || ''}
                            onChange={e => setNotas(n => ({ ...n, [stop.id]: e.target.value }))}
                            placeholder="Nota de entrega (opcional)..."
                            className="w-full border border-gray-200 rounded-lg p-2 text-xs resize-none focus:outline-none focus:ring-1 focus:ring-[#c9a84c]"
                            rows={2}
                          />
                        )}

                        {/* Acciones entrega */}
                        {!isDone && dispatch.status === 'en_ruta' && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => markDelivered(stop.id, false)}
                              disabled={saving === stop.id}
                              className="flex-1 bg-red-50 text-red-600 border border-red-200 rounded-xl py-2 text-xs font-semibold disabled:opacity-50"
                            >
                              No entregado
                            </button>
                            <button
                              onClick={() => markDelivered(stop.id, true)}
                              disabled={saving === stop.id}
                              className="flex-1 bg-green-500 text-white rounded-xl py-2 text-xs font-semibold flex items-center justify-center gap-1.5 disabled:opacity-50"
                            >
                              {saving === stop.id ? <RefreshCw size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                              Entregado
                            </button>
                          </div>
                        )}

                        {/* Estado final */}
                        {isDone && (
                          <p className="text-xs text-gray-400">
                            {stop.status === 'entregado' ? '✓ Entregado' : '✗ No entregado'}
                            {stop.entregado_at && ` a las ${new Date(stop.entregado_at).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}`}
                            {stop.notas && ` · "${stop.notas}"`}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Registrar gasto */}
            <button
              onClick={() => setShowGasto(true)}
              className="w-full bg-white border border-gray-200 rounded-xl py-3 text-sm font-medium text-gray-600 flex items-center justify-center gap-2 hover:bg-gray-50"
            >
              <DollarSign size={16} className="text-[#c9a84c]" /> Registrar gasto de ruta
            </button>
          </>
        )}

        {/* Footer */}
        <div className="text-center text-xs text-gray-400 pb-4">
          <p>Noma Food · Portal Chofer</p>
        </div>
      </div>

      {/* Modal: Gasto */}
      {showGasto && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 w-full max-w-sm shadow-xl">
            <h3 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2">
              <DollarSign size={18} className="text-[#c9a84c]" /> Registrar Gasto
            </h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Tipo de gasto</label>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    { value: 'combustible', icon: Fuel, label: 'Combustible' },
                    { value: 'peaje', icon: Navigation, label: 'Peaje' },
                    { value: 'estacionamiento', icon: MapPin, label: 'Estacionamiento' },
                    { value: 'otro', icon: DollarSign, label: 'Otro' },
                  ] as const).map(({ value, icon: Icon, label }) => (
                    <button
                      key={value}
                      onClick={() => setGasto(g => ({ ...g, tipo: value }))}
                      className={`py-2 px-3 rounded-lg text-xs font-medium flex items-center gap-1.5 border ${
                        gasto.tipo === value ? 'bg-[#c9a84c]/10 border-[#c9a84c] text-[#c9a84c]' : 'border-gray-200 text-gray-500'
                      }`}
                    >
                      <Icon size={13} /> {label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Monto (CLP)</label>
                <input
                  type="number"
                  value={gasto.monto || ''}
                  onChange={e => setGasto(g => ({ ...g, monto: Number(e.target.value) }))}
                  placeholder="Ej: 15000"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#c9a84c]"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Descripción</label>
                <input
                  type="text"
                  value={gasto.descripcion}
                  onChange={e => setGasto(g => ({ ...g, descripcion: e.target.value }))}
                  placeholder="Descripción del gasto..."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#c9a84c]"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setShowGasto(false)}
                  className="flex-1 bg-gray-100 rounded-xl py-2.5 text-sm text-gray-600 font-medium"
                >Cancelar</button>
                <button
                  onClick={submitGasto}
                  disabled={!gasto.monto || saving === 'gasto'}
                  className="flex-1 bg-[#0f0f0f] text-white rounded-xl py-2.5 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {saving === 'gasto' ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
                  Registrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
