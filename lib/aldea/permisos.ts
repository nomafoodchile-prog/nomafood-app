// Contexto Aldea del usuario logueado: organización, si es admin, y sucursales que puede ver.
// db = cliente service-role (createServerClient()).
export async function contextoAldea(db: any, userId: string): Promise<
  { organizacion_id: string; esAdmin: boolean; sucursales: Set<string> } | null
> {
  const { data: vinculos } = await db.from('mayorista_usuarios')
    .select('organizacion_id, mayorista_id, rol').eq('profile_id', userId).eq('activo', true)
  if (!vinculos || vinculos.length === 0) return null

  const esAdmin = vinculos.some((v: any) => v.rol === 'admin_general')
  const organizacion_id = vinculos[0].organizacion_id

  let ids: string[]
  if (esAdmin) {
    const { data } = await db.from('mayoristas')
      .select('id').eq('organizacion_id', organizacion_id).eq('es_sucursal', true).eq('activo', true)
    ids = (data || []).map((m: any) => m.id)
  } else {
    ids = vinculos.map((v: any) => v.mayorista_id).filter(Boolean)
  }
  return { organizacion_id, esAdmin, sucursales: new Set(ids) }
}
