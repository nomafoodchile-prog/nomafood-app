'use client'

import { useEffect, useRef } from 'react'

// Mapa del planificador de ruta: origen (bodega) + paradas numeradas + recorrido.
// Usa Leaflet por CDN + tiles de OpenStreetMap (mismo enfoque que el resto del
// sistema; gratis, sin API key). Se redibuja cuando cambia el orden de paradas.

export interface MapStop { orden: number; cliente: string | null; lat: number; lng: number }

export default function PlannerMap({
  origin, stops,
}: { origin: { lat: number; lng: number; nombre?: string }; stops: MapStop[] }) {
  const elRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<any>(null)
  const layerRef = useRef<any>(null)

  function draw(L: any) {
    if (!mapRef.current) return
    if (layerRef.current) layerRef.current.remove()
    layerRef.current = L.layerGroup().addTo(mapRef.current)
    const pts: [number, number][] = []

    const oIcon = L.divIcon({
      html: '<div style="width:30px;height:30px;background:#c9a24e;border-radius:8px;border:2px solid #16233f;display:flex;align-items:center;justify-content:center;font-size:15px">🏭</div>',
      className: '', iconSize: [30, 30], iconAnchor: [15, 15],
    })
    L.marker([origin.lat, origin.lng], { icon: oIcon }).addTo(layerRef.current)
      .bindPopup(origin.nombre || 'Centro de despacho')
    pts.push([origin.lat, origin.lng])

    stops.forEach(s => {
      const icon = L.divIcon({
        html: `<div style="width:26px;height:26px;background:#16233f;color:#fff;border-radius:50%;border:2px solid #fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12px;box-shadow:0 1px 4px rgba(0,0,0,.4)">${s.orden}</div>`,
        className: '', iconSize: [26, 26], iconAnchor: [13, 13],
      })
      L.marker([s.lat, s.lng], { icon }).addTo(layerRef.current)
        .bindPopup(`${s.orden}. ${s.cliente || ''}`)
      pts.push([s.lat, s.lng])
    })

    if (pts.length > 1) {
      L.polyline(pts, { color: '#c9a24e', weight: 3, opacity: 0.85, dashArray: '4 8' }).addTo(layerRef.current)
      mapRef.current.fitBounds(pts, { padding: [30, 30] })
    } else {
      mapRef.current.setView(pts[0] || [-33.45, -70.66], 12)
    }
  }

  function ensureLeaflet(): Promise<any> {
    return new Promise(resolve => {
      const w = window as any
      if (w.L) { resolve(w.L); return }
      if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link')
        link.id = 'leaflet-css'; link.rel = 'stylesheet'
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
        document.head.appendChild(link)
      }
      let s = document.getElementById('leaflet-js') as HTMLScriptElement | null
      if (!s) {
        s = document.createElement('script')
        s.id = 'leaflet-js'; s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
        s.onload = () => resolve((window as any).L)
        document.head.appendChild(s)
      } else if ((window as any).L) {
        resolve((window as any).L)
      } else {
        s.addEventListener('load', () => resolve((window as any).L))
      }
    })
  }

  useEffect(() => {
    let cancelled = false
    ensureLeaflet().then(L => {
      if (cancelled || !elRef.current) return
      if (!mapRef.current) {
        mapRef.current = L.map(elRef.current, { zoomControl: true })
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap', maxZoom: 19,
        }).addTo(mapRef.current)
      }
      draw(L)
    })
    return () => {
      cancelled = true
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const L = (window as any).L
    if (L && mapRef.current) draw(L)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [origin, stops])

  return <div ref={elRef} className="w-full h-full min-h-[340px] rounded-xl overflow-hidden" />
}
