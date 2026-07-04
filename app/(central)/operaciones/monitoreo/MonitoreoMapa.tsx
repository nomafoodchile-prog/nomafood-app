'use client'

import { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
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
  if (tipo === 'chofer') {
    // Camión bien visible: círculo dorado grande con camión azul marino + halo
    const truck = '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1b2a4a" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.62l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/></svg>'
    return L.divIcon({
      className: '',
      html: `<div style="position:relative;width:44px;height:44px">
        <div style="position:absolute;inset:0;border-radius:9999px;background:${activo ? 'rgba(201,162,78,.35)' : 'rgba(138,148,166,.3)'};animation:nfpulse 1.6s ease-out infinite"></div>
        <div style="position:absolute;inset:6px;border-radius:9999px;background:${activo ? '#c9a24e' : '#8a94a6'};display:flex;align-items:center;justify-content:center;box-shadow:0 3px 8px rgba(0,0,0,.4);border:3px solid #fff">${truck}</div>
      </div>
      <style>@keyframes nfpulse{0%{transform:scale(.6);opacity:.9}100%{transform:scale(1.4);opacity:0}}</style>`,
      iconSize: [44, 44],
      iconAnchor: [22, 22],
      popupAnchor: [0, -22],
    })
  }
  return L.divIcon({
    className: '',
    html: `<div style="width:26px;height:26px;border-radius:9999px;background:#1b2a4a;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,.35);border:2px solid #fff"><span style="width:7px;height:7px;border-radius:9999px;background:#c9a24e;display:block"></span></div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    popupAnchor: [0, -14],
  })
}

// Sigue al chofer cuando se mueve
function Seguir({ lat, lng }: { lat?: number; lng?: number }) {
  const map = useMap()
  useEffect(() => {
    if (lat != null && lng != null) map.setView([lat, lng], Math.max(map.getZoom(), 14), { animate: true })
  }, [lat, lng, map])
  return null
}

export default function MonitoreoMapa({ puntos }: { puntos: MapaPunto[] }) {
  const chofer = puntos.find(p => p.tipo === 'chofer')
  const center: [number, number] = chofer
    ? [chofer.lat, chofer.lng]
    : puntos[0] ? [puntos[0].lat, puntos[0].lng] : SANTIAGO

  return (
    <MapContainer center={center} zoom={12} scrollWheelZoom style={{ height: '100%', width: '100%' }}>
      <TileLayer
        attribution='&copy; OpenStreetMap'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {chofer && <Seguir lat={chofer.lat} lng={chofer.lng} />}
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
