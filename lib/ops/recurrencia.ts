// Helpers de recurrencia para Limpieza y Mantención (fuera de las rutas para
// no romper la validación de exports de Next.js en los archivos route.ts).

// Días entre cada ejecución según la recurrencia
const INTERVALO: Record<string, number> = { turno: 1, diaria: 1, semanal: 7, quincenal: 14, mensual: 30, trimestral: 90, semestral: 180, anual: 365 }

export function hoyCL(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' }).format(new Date())
}

function addDays(iso: string, n: number): string {
  const d = new Date(iso + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10)
}

// Próxima fecha en que toca la tarea. Si nunca se ha hecho → toca hoy.
export function proximaDe(ultimaFecha: string | null | undefined, rec: string): string {
  if (!ultimaFecha) return hoyCL()
  return addDays(String(ultimaFecha).slice(0, 10), INTERVALO[rec] ?? 30)
}

export function estadoDe(proxima: string): 'atrasado' | 'hoy' | 'ok' {
  const hoy = hoyCL()
  if (proxima < hoy) return 'atrasado'
  if (proxima === hoy) return 'hoy'
  return 'ok'
}
