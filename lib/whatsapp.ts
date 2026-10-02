// Utilidades de WhatsApp (Fase 1: enlaces wa.me, gratis).
// A futuro, el envío automático por la API oficial de Meta reutiliza el patrón
// de app/api/mayoristas/enviar-acceso/route.ts.

// Normaliza un teléfono chileno a formato internacional sin "+": 569XXXXXXXX.
export function normalizarTelefonoCL(raw: string | null | undefined): string | null {
  let d = String(raw || '').replace(/[^0-9]/g, '')
  if (!d) return null
  if (d.startsWith('56')) {
    // ya trae código país
  } else if (d.length === 9 && d.startsWith('9')) {
    d = '56' + d                 // 9XXXXXXXX → 569XXXXXXXX
  } else if (d.length === 8) {
    d = '569' + d                // XXXXXXXX (sin 9) → 569XXXXXXXX
  } else {
    d = '56' + d                 // último recurso
  }
  if (d.length < 10 || d.length > 12) return null
  return d
}

export interface PlantillaVars {
  nombre?: string | null
  pedido?: string | number | null
  marca?: string | null
  eta?: string | null
  minutos?: string | number | null
  fecha_despacho?: string | null
  chofer?: string | null
}

// Reemplaza {variables} en el texto de la plantilla.
export function llenarPlantilla(texto: string, v: PlantillaVars): string {
  const nombre = (v.nombre || '').trim()
  const primer = nombre.split(/\s+/)[0] || nombre
  const map: Record<string, string> = {
    '{nombre}': nombre || 'cliente',
    '{primer_nombre}': primer || 'cliente',
    '{pedido}': v.pedido != null ? String(v.pedido) : '',
    '{marca}': v.marca || '',
    '{ETA}': v.eta || '',
    '{eta}': v.eta || '',
    '{X}': v.minutos != null ? String(v.minutos) : '',
    '{minutos}': v.minutos != null ? String(v.minutos) : '',
    '{fecha_despacho}': v.fecha_despacho || '',
    '{chofer}': v.chofer || '',
  }
  return String(texto || '').replace(/\{[a-zA-Z_]+\}/g, m => (m in map ? map[m] : m))
}

// Arma el enlace wa.me con el mensaje prellenado.
export function waLink(telefono: string | null | undefined, texto: string): string {
  const tel = normalizarTelefonoCL(telefono)
  const base = tel ? `https://wa.me/${tel}` : 'https://wa.me/'
  return `${base}?text=${encodeURIComponent(texto)}`
}

export const TIPOS_MENSAJE = [
  { tipo: 'recibido', label: 'Pedido recibido' },
  { tipo: 'programado', label: 'Programado a ruta' },
  { tipo: 'salio', label: 'Salió a ruta' },
  { tipo: 'cerca', label: 'Tu pedido está cerca' },
  { tipo: 'entregado', label: 'Entregado' },
  { tipo: 'incidencia', label: 'Incidencia' },
] as const
