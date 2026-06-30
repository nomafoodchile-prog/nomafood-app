'use client'

import { useEffect, useRef } from 'react'
import { MapPin } from 'lucide-react'

interface DriverMapClientProps {
  lat?: number
  lng?: number
  driverName?: string
  address?: string
}

export function DriverMapClient({
  lat = -33.45,
  lng = -70.66,
  driverName = 'Chofer',
  address,
}: DriverMapClientProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)

  useEffect(() => {
    if (typeof window === 'undefined' || !mapRef.current) return
    if (mapInstanceRef.current) return // already initialized

    // Load Leaflet CSS
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
    document.head.appendChild(link)

    // Load Leaflet JS
    const script = document.createElement('script')
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
    script.onload = () => {
      const L = (window as any).L
      if (!L || !mapRef.current) return

      const map = L.map(mapRef.current, {
        center: [lat, lng],
        zoom: 14,
        zoomControl: true,
      })

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
        maxZoom: 19,
      }).addTo(map)

      // Custom gold marker icon
      const icon = L.divIcon({
        html: `<div style="width:36px;height:36px;background:#c9a84c;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid #0f0f0f;box-shadow:0 2px 8px rgba(0,0,0,0.4)"></div>`,
        className: '',
        iconSize: [36, 36],
        iconAnchor: [18, 36],
      })

      const marker = L.marker([lat, lng], { icon }).addTo(map)
      marker.bindPopup(
        `<div style="font-family:system-ui;padding:4px"><strong>${driverName}</strong>${address ? `<br/><small>${address}</small>` : ''}</div>`
      ).openPopup()

      mapInstanceRef.current = map
    }
    document.head.appendChild(script)

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [lat, lng, driverName, address])

  return (
    <div className="relative w-full h-full min-h-[300px] rounded-xl overflow-hidden">
      <div ref={mapRef} className="w-full h-full" />
      {/* Overlay badge */}
      <div className="absolute top-3 left-3 z-[1000] bg-[#0f0f0f] text-white text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-lg">
        <MapPin size={12} className="text-[#c9a84c]" />
        <span>Santiago, Chile</span>
      </div>
    </div>
  )
}
