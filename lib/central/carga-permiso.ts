// Quién puede usar "Cargar datos" en el Portal Operario.
// La lista de autorizados se guarda en app_config (clave/valor), sin columnas nuevas.
import { createServerClient } from '@/lib/supabase/server'

type DB = ReturnType<typeof createServerClient>
export const CLAVE_CARGA = 'operarios_carga_datos'

export async function idsAutorizados(db: DB): Promise<string[]> {
  const { data } = await db.from('app_config').select('valor').eq('clave', CLAVE_CARGA).maybeSingle()
  const v = (data as { valor: unknown } | null)?.valor
  if (!v) return []
  try {
    const arr = typeof v === 'string' ? JSON.parse(v) : v
    return Array.isArray(arr) ? arr.map(String).filter(Boolean) : []
  } catch { return [] }
}

export async function guardarAutorizados(db: DB, ids: string[]): Promise<void> {
  const limpio = Array.from(new Set(ids.map(String).filter(Boolean)))
  // upsert sin depender de constraint única: update y si no existía, insert
  const valor = JSON.stringify(limpio)
  const { data, error: eUpd } = await db.from('app_config').update({ valor }).eq('clave', CLAVE_CARGA).select('clave')
  if (eUpd) throw new Error('No se pudo guardar la configuración (revisa la tabla app_config). ' + eUpd.message)
  if (!data || data.length === 0) {
    const { error: eIns } = await db.from('app_config').insert({ clave: CLAVE_CARGA, valor })
    if (eIns) throw new Error('No se pudo guardar la configuración (revisa la tabla app_config). ' + eIns.message)
  }
}

export async function esAutorizado(db: DB, userId: string): Promise<boolean> {
  return (await idsAutorizados(db)).includes(userId)
}
