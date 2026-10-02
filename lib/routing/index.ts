// Capa desacoplada de ruteo. Hoy usa OSRM (gratis). Para cambiar de motor
// (p.ej. Google Routes con tráfico) basta con implementar otro proveedor con
// la misma firma `optimizeRoute(origin, stops)` y seleccionarlo por env
// ROUTING_PROVIDER, sin tocar las pantallas ni los endpoints.
import { optimizeRoute as osrmOptimize } from './osrm'
export type { LatLng, Matrix, OptimizeResult } from './osrm'
export { haversineM } from './osrm'

export function optimizeRoute(origin: import('./osrm').LatLng, stops: import('./osrm').LatLng[]) {
  const provider = process.env.ROUTING_PROVIDER || 'osrm'
  switch (provider) {
    case 'osrm':
    default:
      return osrmOptimize(origin, stops)
  }
}
