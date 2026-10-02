// Proveedor de ruteo OSRM (OpenStreetMap, gratis, sin API key).
// Estrategia de orden: "vecino más cercano desde el origen" + mejora 2-opt,
// usando la matriz de TIEMPOS de viaje por calles reales (servicio "table" de
// OSRM). Esto hace que la ruta salga de la fábrica hacia la parada más cercana
// y avance de forma coherente (sin partir por la más lejana), que es lo que se
// espera en un reparto. Si el servidor público no responde, cae a una
// estimación local (haversine) para que la función nunca se caiga.

export interface LatLng { lat: number; lng: number }
export interface Matrix { duration_s: number[][]; distance_m: number[][] }
export interface OptimizeResult {
  provider: string
  // índice 0 = origen (bodega); 1..n = paradas en el MISMO orden que `stops`
  order: number[]            // orden de visita (empieza en 0 = origen)
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

function matrizLocal(points: LatLng[]): Matrix {
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
  return { duration_s, distance_m }
}

async function osrmTable(points: LatLng[], signal: AbortSignal): Promise<Matrix> {
  const url = `${OSRM_BASE}/table/v1/driving/${coordsParam(points)}?annotations=duration,distance`
  const r = await fetch(url, { signal })
  if (!r.ok) throw new Error('osrm table ' + r.status)
  const j = await r.json() as { code: string; durations: number[][]; distances: number[][] }
  if (j.code !== 'Ok' || !j.durations) throw new Error('osrm table code ' + j.code)
  return { duration_s: j.durations, distance_m: j.distances }
}

// Costo total de una ruta ABIERTA (no vuelve al origen) según la matriz de costo.
function costoRuta(order: number[], cost: number[][]): number {
  let t = 0
  for (let i = 0; i < order.length - 1; i++) t += cost[order[i]][order[i + 1]]
  return t
}

// Vecino más cercano desde el origen (índice 0).
function vecinoMasCercano(cost: number[][], n: number): number[] {
  const order = [0]
  const pend = new Set<number>()
  for (let i = 1; i < n; i++) pend.add(i)
  let cur = 0
  while (pend.size) {
    let best = -1, bd = Infinity
    for (const j of pend) { if (cost[cur][j] < bd) { bd = cost[cur][j]; best = j } }
    order.push(best); pend.delete(best); cur = best
  }
  return order
}

// Mejora 2-opt para una ruta ABIERTA, manteniendo fijo el origen en la posición 0.
// Deshace cruces → ruta más coherente y corta, sin "saltos" raros.
function dosOpt(order: number[], cost: number[][]): number[] {
  const n = order.length
  if (n < 4) return order
  let best = order.slice()
  let mejoró = true
  let guard = 0
  while (mejoró && guard++ < 50) {
    mejoró = false
    // i desde 1 para no mover el origen (posición 0)
    for (let i = 1; i < n - 1; i++) {
      for (let k = i + 1; k < n; k++) {
        const a = best[i - 1], b = best[i], c = best[k], d = k + 1 < n ? best[k + 1] : -1
        const antes = cost[a][b] + (d >= 0 ? cost[c][d] : 0)
        const despues = cost[a][c] + (d >= 0 ? cost[b][d] : 0)
        if (despues + 1e-6 < antes) {
          const nuevo = best.slice(0, i).concat(best.slice(i, k + 1).reverse(), best.slice(k + 1))
          best = nuevo; mejoró = true
        }
      }
    }
  }
  return best
}

function ordenar(matrix: Matrix, n: number): number[] {
  // Ordena por TIEMPO de viaje (duration), que refleja mejor las calles reales.
  const cost = matrix.duration_s
  const nn = vecinoMasCercano(cost, n)
  const opt = dosOpt(nn, cost)
  // Nos quedamos con la mejor de las dos por si acaso
  return costoRuta(opt, cost) <= costoRuta(nn, cost) ? opt : nn
}

export async function optimizeRoute(origin: LatLng, stops: LatLng[]): Promise<OptimizeResult> {
  const points = [origin, ...stops]
  const n = points.length
  if (stops.length === 0) return { provider: 'none', order: [0], matrix: { duration_s: [[0]], distance_m: [[0]] } }

  let matrix: Matrix
  let provider: string
  try {
    const ctrl = new AbortController(); const to = setTimeout(() => ctrl.abort(), 9000)
    matrix = await osrmTable(points, ctrl.signal); clearTimeout(to); provider = 'osrm'
  } catch {
    matrix = matrizLocal(points); provider = 'local-estimate'
  }

  const order = stops.length === 1 ? [0, 1] : ordenar(matrix, n)
  return { provider, order, matrix }
}
