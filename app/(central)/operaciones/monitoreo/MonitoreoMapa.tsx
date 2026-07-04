'use client'

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

export interface MapaPunto {
  id: string
  tipo: 'chofer' | 'pedido'
  nombre: string
  detalle?: string
  lat: number
  lng: number
  activo?: boolean
}

// Centro por defecto: Santiago, Chile
const SANTIAGO: [number, number] = [-33.45, -70.66]

function icono(tipo: MapaPunto['tipo'], activo?: boolean) {
  const bg = tipo === 'chofer' ? (activo ? '#1b2a4a' : '#8a94a6') : '#c9a24e'
  const inner = tipo === 'chofer'
    ? '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.62l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/></svg>'
    : '<span style="width:8px;height:8px;border-radius:9999px;background:#1b2a4a;display:block"></span>'
  return L.divIcon({
    className: '',
    html: `<div style="width:30px;height:30px;border-radius:9999px;background:${bg};display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,.35);border:2px solid #fff">${inner}</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -16],
  })
}

export default function MonitoreoMapa({ puntos }: { puntos: MapaPunto[] }) {
  const choferes = puntos.filter(p => p.tipo === 'chofer')
  const center: [number, number] = choferes[0]
    ? [choferes[0].lat, choferes[0].lng]
    : puntos[0]
      ? [puntos[0].lat, puntos[0].lng]
      : SANTIAGO

  return (
    <MapContainer center={center} zoom={12} scrollWheelZoom style={{ height: '100%', width: '100%' }}>
      <TileLayer
        attribution='&copy; OpenStreetMap'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {puntos.map(p => (
        <Marker key={p.id} position={[p.lat, p.lng]} icon={icono(p.tipo, p.activo)}>
          <Popup>
            <span style={{ fontWeight: 600 }}>{p.nombre}</span>
            {p.detalle && <><br />{p.detalle}</>}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}
