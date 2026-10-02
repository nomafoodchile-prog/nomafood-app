// Proveedor de ruteo OSRM (OpenStreetMap, gratis, sin API key).
// Calcula: (a) el orden óptimo de paradas por RED VIAL (servicio "trip"),
// y (b) la matriz de tiempos/distancias entre todos los puntos (servicio
// "table") para poder recalcular al instante cuando se reordena a mano.
// Si el servidor público no responde, cae a una estimación local (haversine
// + vecino más cercano) para que la función nunca se caiga.

export interface LatLng { lat: number; lng: number }
export interface Matrix { duration_s: number[][]; distance_m: number[][] }
export interface OptimizeResult {
  provider: string
  // índice 0 = origen (bodega); 1..n = paradas en el MISMO orden que `stops`
  order: number[]            // orden óptimo de visita (empieza en 0 = origen)
  matrix: Matrix
}

const OSRM_BASE = process.env.OSRM_BASE_URL || 'https://router.project-osrm.org'
const SPEED_KMH = Number(process.env.DESPACHO_SPEED_KMH || 24) // velocidad urbana estimada

function coordsParam(points: LatLng[]): string {
  return points.map(p => `${p.lng},${p.lat}`).join(';')
}

export function haversineM(a: LatLng, b: LatLng): number {
  const R = 6371000, r = Math.PI / 180
  const dLat = (b.lat - a.lat) * r, dLng = (b.lng - a.lng) * r
  const s = Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(s))
}

// Estimación local (respaldo): matriz por haversine + orden vecino-más-cercano
function localEstimate(points: LatLng[]): OptimizeResult {
  const n = points.length
  const duration_s: number[][] = [], distance_m: number[][] = []
  for (let i = 0; i < n; i++) {
    duration_s[i] = []; distance_m[i] = []
    for (let j = 0; j < n; j++) {
      const d = haversineM(points[i], points[j])
      distance_m[i][j] = d
      duration_s[i][j] = d / (SPEED_KMH * 1000 / 3600)
    }
  }
  // vecino más cercano desde el origen (índice 0)
  const order = [0]; const pool = new Set<number>()
  for (let i = 1; i < n; i++) pool.add(i)
  let cur = 0
  while (pool.size) {
    let best = -1, bd = Infinity
    for (const j of pool) { if (distance_m[cur][j] < bd) { bd = distance_m[cur][j]; best = j } }
    order.push(best); pool.delete(best); cur = best
  }
  return { provider: 'local-estimate', order, matrix: { duration_s, distance_m } }
}

async function osrmTable(points: LatLng[], signal: AbortSignal): Promise<Matrix> {
  const url = `${OSRM_BASE}/table/v1/driving/${coordsParam(points)}?annotations=duration,distance`
  const r = await fetch(url, { signal })
  if (!r.ok) throw new Error('osrm table ' + r.status)
  const j = await r.json() as { code: string; durations: number[][]; distances: number[][] }
  if (j.code !== 'Ok' || !j.durations) throw new Error('osrm table code ' + j.code)
  return { duration_s: j.durations, distance_m: j.distances }
}

async function osrmOrder(points: LatLng[], signal: AbortSignal): Promise<number[]> {
  // source=first fija el origen; roundtrip=false => ruta abierta (no vuelve a la bodega)
  const url = `${OSRM_BASE}/trip/v1/driving/${coordsParam(points)}?source=first&roundtrip=false`
  const r = await fetch(url, { signal })
  if (!r.ok) throw new Error('osrm trip ' + r.status)
  const j = await r.json() as { code: string; waypoints: { waypoint_index: number }[] }
  if (j.code !== 'Ok' || !Array.isArray(j.waypoints)) throw new Error('osrm trip code ' + j.code)
  // waypoints viene en orden de ENTRADA; waypoint_index = su posición en el viaje óptimo
  const order = j.waypoints
    .map((w, inputIdx) => ({ inputIdx, pos: w.waypoint_index }))
    .sort((a, b) => a.pos - b.pos)
    .map(x => x.inputIdx)
  return order
}

export async function optimizeRoute(origin: LatLng, stops: LatLng[]): Promise<OptimizeResult> {
  const points = [origin, ...stops]
  if (stops.length === 0) return { provider: 'none', order: [0], matrix: { duration_s: [[0]], distance_m: [[0]] } }
  if (stops.length === 1) {
    // una sola parada: no hay nada que optimizar, pero igual pedimos distancia real
    try {
      const ctrl = new AbortController(); const to = setTimeout(() => ctrl.abort(), 8000)
      const matrix = await osrmTable(points, ctrl.signal); clearTimeout(to)
      return { provider: 'osrm', order: [0, 1], matrix }
    } catch { return localEstimate(points) }
  }
  try {
    const ctrl = new AbortController(); const to = setTimeout(() => ctrl.abort(), 9000)
    const [order, matrix] = await Promise.all([
      osrmOrder(points, ctrl.signal),
      osrmTable(points, ctrl.signal),
    ])
    clearTimeout(to)
    // garantiza que el origen quede primero
    const ord = order[0] === 0 ? order : [0, ...order.filter(i => i !== 0)]
    return { provider: 'osrm', order: ord, matrix }
  } catch {
    return localEstimate(points)
  }
}
