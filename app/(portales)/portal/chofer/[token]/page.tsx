'use client'

import { useState, useEffect, useRef } from 'react'
import { MapPin, Navigation, CheckCircle2, ExternalLink, Truck, Package, Phone } from 'lucide-react'

interface DispatchInfo {
  id: string
  cliente: string
  direccion: string
  items: { nombre: string; cantidad: number; unidad: string }[]
  contacto: string
  telefono: string
}

// Demo data
const DEMO_DISPATCH: DispatchInfo = {
  id: 'DES-2026-089',
  cliente: 'Cafe Raiz',
  direccion: 'Av. Italia 1320, Ñuñoa, Santiago',
  items: [
    { nombre: 'Ciabatta lomito seitan', cantidad: 12, unidad: 'unidades' },
    { nombre: 'Bowl thai tofu', cantidad: 8, unidad: 'unidades' },
    { nombre: 'Empanadas veganas', cantidad: 20, unidad: 'unidades' },
  ],
  contacto: 'Martin Leiva',
  telefono: '+56 9 7718 2030',
}

export default function ChoferPortalPage({ params }: { params: { token: string } }) {
  const [dispatch] = useState<DispatchInfo>(DEMO_DISPATCH)
  const [gpsActive, setGpsActive] = useState(false)
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [delivered, setDelivered] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const watchIdRef = useRef<number | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const sendLocation = async (lat: number, lng: number, accuracy: number) => {
    try {
      await fetch('/api/driver/location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dispatch_id: dispatch.id,
          driver_name: 'Chofer',
          lat,
          lng,
          accuracy,
          speed: 0,
        }),
      })
    } catch {
      // Silent fail for location pings
    }
  }

  const startGPS = () => {
    if (!navigator.geolocation) {
      setError('Tu dispositivo no soporta GPS.')
      return
    }

    setGpsActive(true)
    watchIdRef.current = navigator.geolocation.watchPosition(
      pos => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        sendLocation(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy)
      },
      err => setError('Error al obtener ubicación: ' + err.message),
      { enableHighAccuracy: true }
    )

    // Also send every 15 seconds
    intervalRef.current = setInterval(() => {
      if (coords) {
        sendLocation(coords.lat, coords.lng, 10)
      }
    }, 15000)
  }

  const stopGPS = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    setGpsActive(false)
  }

  useEffect(() => {
    return () => {
      stopGPS()
    }
  }, [])

  const handleConfirmDelivery = async () => {
    setLoading(true)
    // Simulate API call
    await new Promise(r => setTimeout(r, 1000))
    setDelivered(true)
    setLoading(false)
    stopGPS()
  }

  if (delivered) {
    return (
      <div className="min-h-screen bg-[#f5f0e8] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-card p-8 max-w-sm w-full text-center">
          <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={32} className="text-green-500" />
          </div>
          <h2 className="text-xl font-bold text-[#1a1a1a] mb-2">¡Entrega confirmada!</h2>
          <p className="text-gray-500 text-sm mb-4">
            Despacho <strong>{dispatch.id}</strong> entregado a {dispatch.cliente}.
          </p>
          <p className="text-xs text-gray-400">Gracias, {new Date().toLocaleTimeString('es-CL')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f5f0e8]">
      {/* Header */}
      <header className="bg-[#0f0f0f] text-white px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[#c9a84c] rounded-lg flex items-center justify-center font-black text-[#0f0f0f] text-sm">
            NF
          </div>
          <div>
            <p className="font-bold text-sm">Portal Chofer</p>
            <p className="text-[10px] text-gray-400">{dispatch.id}</p>
          </div>
          {gpsActive && (
            <div className="ml-auto flex items-center gap-1.5 text-green-400 text-xs">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              GPS activo
            </div>
          )}
        </div>
      </header>

      <div className="max-w-lg mx-auto p-4 space-y-4">
        {/* Client info */}
        <div className="bg-white rounded-2xl shadow-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <Truck size={16} className="text-[#c9a84c]" />
            <h2 className="font-bold text-[#1a1a1a]">Información de entrega</h2>
          </div>
          <div className="space-y-2.5">
            <div>
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Cliente</p>
              <p className="font-bold text-[#1a1a1a]">{dispatch.cliente}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Dirección</p>
              <p className="text-sm text-gray-700">{dispatch.direccion}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Contacto</p>
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-700">{dispatch.contacto}</p>
                <a
                  href={`tel:${dispatch.telefono}`}
                  className="flex items-center gap-1.5 text-xs text-[#c9a84c] font-semibold"
                >
                  <Phone size={12} />
                  {dispatch.telefono}
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Items list */}
        <div className="bg-white rounded-2xl shadow-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <Package size={16} className="text-[#c9a84c]" />
            <h2 className="font-bold text-[#1a1a1a]">Contenido del despacho</h2>
          </div>
          <div className="space-y-2">
            {dispatch.items.map((item, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <span className="text-sm text-gray-700">{item.nombre}</span>
                <span className="text-sm font-bold text-[#1a1a1a]">
                  {item.cantidad} {item.unidad}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* GPS */}
        <div className="bg-white rounded-2xl shadow-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <Navigation size={16} className="text-[#c9a84c]" />
            <h2 className="font-bold text-[#1a1a1a]">Ubicación GPS</h2>
          </div>

          {coords && (
            <div className="bg-gray-50 rounded-xl p-3 mb-3 text-xs text-gray-500 font-mono">
              lat: {coords.lat.toFixed(5)} · lng: {coords.lng.toFixed(5)}
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-700 mb-3">
              {error}
            </div>
          )}

          <button
            onClick={gpsActive ? stopGPS : startGPS}
            className={`w-full py-3 rounded-xl font-bold text-sm transition-all ${
              gpsActive
                ? 'bg-red-50 text-red-600 border border-red-200'
                : 'bg-[#c9a84c] text-[#0f0f0f] hover:bg-[#b8962e]'
            }`}
          >
            {gpsActive ? 'Detener GPS' : 'Activar GPS'}
          </button>
        </div>

        {/* Navigation links */}
        <div className="grid grid-cols-2 gap-3">
          <a
            href={`https://waze.com/ul?q=${encodeURIComponent(dispatch.direccion)}&navigate=yes`}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-[#09C4F4] text-white py-3 px-4 rounded-xl font-semibold text-sm flex items-center justify-center gap-2"
          >
            <ExternalLink size={14} />
            Abrir Waze
          </a>
          <a
            href={`https://maps.google.com/?q=${encodeURIComponent(dispatch.direccion)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-[#4285F4] text-white py-3 px-4 rounded-xl font-semibold text-sm flex items-center justify-center gap-2"
          >
            <MapPin size={14} />
            Google Maps
          </a>
        </div>

        {/* Confirm delivery */}
        <button
          onClick={handleConfirmDelivery}
          disabled={loading}
          className="w-full bg-green-600 text-white py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2 hover:bg-green-700 transition-colors disabled:opacity-50"
        >
          <CheckCircle2 size={20} />
          {loading ? 'Confirmando...' : 'Confirmar entrega'}
        </button>
      </div>
    </div>
  )
}
