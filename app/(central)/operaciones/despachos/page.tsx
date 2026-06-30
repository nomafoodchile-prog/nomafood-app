import { Truck, MapPin, CheckCircle2, Clock, User } from 'lucide-react'
import { operationsDemo } from '@/lib/operations'
import type { Dispatch } from '@/lib/operations'

function StatusBadge({ status }: { status: Dispatch['status'] }) {
  const map: Record<string, string> = {
    Programado: 'noma-badge-gray',
    'En ruta': 'noma-badge-blue',
    Entregado: 'noma-badge-green',
  }
  return <span className={map[status] || 'noma-badge-gray'}>{status}</span>
}

function DriverMapPlaceholder({ address }: { address?: string }) {
  return (
    <div className="relative w-full h-64 md:h-80 rounded-2xl overflow-hidden bg-gradient-to-br from-[#0f0f0f] via-gray-900 to-gray-800 flex items-center justify-center">
      {/* Grid lines to simulate map */}
      <div className="absolute inset-0 opacity-10">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={`h-${i}`}
            className="absolute w-full border-t border-white"
            style={{ top: `${(i + 1) * 12.5}%` }}
          />
        ))}
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={`v-${i}`}
            className="absolute h-full border-l border-white"
            style={{ left: `${(i + 1) * 12.5}%` }}
          />
        ))}
      </div>

      {/* Marker */}
      <div className="relative z-10 flex flex-col items-center">
        <div className="w-12 h-12 bg-[#c9a84c] rounded-full flex items-center justify-center shadow-xl animate-pulse mb-2">
          <Truck size={20} className="text-[#0f0f0f]" />
        </div>
        <div className="bg-white/90 backdrop-blur rounded-xl px-4 py-2 text-center shadow-lg">
          <p className="text-xs font-bold text-[#0f0f0f]">Santiago, Chile</p>
          <p className="text-[10px] text-gray-600">lat: -33.45 · lng: -70.66</p>
          {address && <p className="text-[10px] text-[#c9a84c] mt-1 font-medium truncate max-w-48">{address}</p>}
        </div>
      </div>

      {/* Badge */}
      <div className="absolute top-3 left-3 bg-[#c9a84c]/20 backdrop-blur border border-[#c9a84c]/40 text-[#c9a84c] text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5">
        <MapPin size={11} />
        <span>Mapa en tiempo real</span>
      </div>
      <div className="absolute bottom-3 right-3 text-[10px] text-gray-500">
        Leaflet / OpenStreetMap
      </div>
    </div>
  )
}

export default function DespachosPage() {
  const { dispatches, customers } = operationsDemo

  const inRoute = dispatches.filter(d => d.status === 'En ruta')
  const pending = dispatches.filter(d => d.status === 'Programado')
  const delivered = dispatches.filter(d => d.status === 'Entregado')

  // Get customer address
  const getAddress = (dispatch: Dispatch) => {
    const customer = customers.find(c => {
      // match by customer name from order
      return c.name.toLowerCase().includes(dispatch.route.split(' ')[0].toLowerCase())
    })
    return customer?.address || dispatch.route
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1a1a1a]">Despachos</h1>
          <p className="text-sm text-gray-500 mt-0.5">Rutas activas — 30 jun 2026</p>
        </div>
        <button className="noma-btn-primary text-sm flex items-center gap-2">
          <Truck size={14} />
          Nuevo despacho
        </button>
      </div>

      {/* Status summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'En ruta', count: inRoute.length, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Programados', count: pending.length, color: 'text-yellow-600', bg: 'bg-yellow-50' },
          { label: 'Entregados hoy', count: delivered.length, color: 'text-green-600', bg: 'bg-green-50' },
        ].map(s => (
          <div key={s.label} className="noma-card !py-4 text-center">
            <p className={`text-2xl font-bold ${s.color}`}>{s.count}</p>
            <p className="text-xs text-gray-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Map */}
        <div className="noma-card">
          <h2 className="font-bold text-[#1a1a1a] mb-4 flex items-center gap-2">
            <MapPin size={16} className="text-[#c9a84c]" />
            Mapa de rutas
          </h2>
          <DriverMapPlaceholder address="Santiago, Región Metropolitana" />
        </div>

        {/* Dispatch list */}
        <div className="space-y-4">
          {dispatches.length === 0 ? (
            <div className="noma-card text-center py-12">
              <Truck size={32} className="text-gray-300 mx-auto mb-3" />
              <p className="text-gray-400">No hay despachos activos</p>
            </div>
          ) : (
            dispatches.map(dispatch => (
              <div key={dispatch.id} className="noma-card">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                        {dispatch.orderId}
                      </span>
                      <StatusBadge status={dispatch.status} />
                    </div>
                    <h3 className="font-semibold text-[#1a1a1a]">{dispatch.customerName}</h3>
                  </div>
                  {dispatch.status === 'En ruta' && (
                    <div className="w-3 h-3 rounded-full bg-blue-500 animate-pulse" />
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <User size={12} className="text-gray-400" />
                    <span>{dispatch.driverName}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <MapPin size={12} className="text-gray-400" />
                    <span className="truncate">{dispatch.route}</span>
                  </div>
                  {dispatch.status === 'En ruta' && (
                    <div className="flex items-center gap-2 text-xs text-blue-600">
                      <Clock size={12} />
                      <span>En camino · estimado 25 min</span>
                    </div>
                  )}
                  {dispatch.status === 'Entregado' && dispatch.evidence && (
                    <div className="flex items-center gap-2 text-xs text-green-600">
                      <CheckCircle2 size={12} />
                      <span>Entregado con evidencia</span>
                    </div>
                  )}
                </div>

                <div className="mt-3 flex gap-2">
                  <button className="noma-btn-secondary text-xs py-1.5 flex items-center gap-1.5">
                    <MapPin size={12} />
                    Ver en mapa
                  </button>
                  {dispatch.status === 'Programado' && (
                    <button className="noma-btn-primary text-xs py-1.5 flex items-center gap-1.5">
                      <Truck size={12} />
                      Iniciar ruta
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
