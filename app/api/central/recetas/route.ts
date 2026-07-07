import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase/auth-server'
import { createServerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

const CENTRAL_ROLES = ['SuperAdmin', 'Administracion', 'Gerencia', 'EncargadoProduccion']

async function getAuth() {
  const { data: { user } } = await getServerSupabase().auth.getUser()
  if (!user) return null
  const { data: p } = await createServerClient().from('profiles').select('role').eq('id', user.id).maybeSingle()
  const role = (p?.role as string | undefined) || ''
  return CENTRAL_ROLES.includes(role) ? { id: user.id, email: user.email ?? null, role } : null
}

type J = Record<string, unknown>
const num = (v: unknown): number | null => { if (v === '' || v === null || v === undefined) return null; const n = Number(v); return Number.isNaN(n) ? null : n }

export async function POST(req: NextRequest) {
  const auth = await getAuth()
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  let body: J = {}
  try { body = await req.json() as J } catch { /* sin body */ }
  const action = String(body.action || '')
  const db = createServerClient()

  // Crear receta (+ versión 1 borrador)
  if (action === 'crear_receta') {
    const nombre = String(body.nombre || '').trim()
    if (!nombre) return NextResponse.json({ error: 'El nombre es obligatorio' }, { status: 400 })
    const { data: rec, error: e1 } = await db.from('recetas').insert({
      nombre,
      codigo: body.codigo ? String(body.codigo).trim() : null,
      product_id: body.product_id ? String(body.product_id) : null,
      tipo_receta: body.tipo_receta ? String(body.tipo_receta) : 'producto_terminado',
      area: body.area ? String(body.area) : null,
      created_by: auth.id,
    }).select('id').single()
    if (e1) return NextResponse.json({ error: e1.message }, { status: 500 })
    const { data: ver, error: e2 } = await db.from('receta_versiones').insert({ receta_id: rec.id, version: 1, estado: 'borrador', created_by: auth.id }).select('id').single()
    if (e2) return NextResponse.json({ error: e2.message }, { status: 500 })
    return NextResponse.json({ ok: true, receta_id: rec.id, version_id: ver.id })
  }

  // Cargar una versión bloqueada si está aprobada
  async function versionEstado(versionId: string): Promise<string | null> {
    const { data } = await db.from('receta_versiones').select('estado').eq('id', versionId).maybeSingle()
    return (data?.estado as string | undefined) ?? null
  }

  // Guardar campos de la versión (rendimiento, tiempos, calidad)
  if (action === 'guardar_version') {
    const versionId = String(body.version_id || '')
    if (!versionId) return NextResponse.json({ error: 'Falta la versión' }, { status: 400 })
    if (await versionEstado(versionId) === 'aprobada') return NextResponse.json({ error: 'Una versión aprobada no se edita: crea una nueva versión.' }, { status: 409 })
    const f = (body.fields || {}) as J
    const patch: J = {
      rendimiento_cantidad: num(f.rendimiento_cantidad), rendimiento_unidad: f.rendimiento_unidad ? String(f.rendimiento_unidad) : null,
      porcion_estandar_g: num(f.porcion_estandar_g),
      tiempo_trabajo_min: num(f.tiempo_trabajo_min), tiempo_reposo_min: num(f.tiempo_reposo_min),
      operarios_ideal: num(f.operarios_ideal), merma_operativa_pct: num(f.merma_operativa_pct),
      requiere_lote: Boolean(f.requiere_lote), requiere_vencimiento: Boolean(f.requiere_vencimiento),
      requiere_fechado: Boolean(f.requiere_fechado), requiere_etiqueta: Boolean(f.requiere_etiqueta),
      condicion_almacenamiento: f.condicion_almacenamiento ? String(f.condicion_almacenamiento) : null,
      vida_util_dias: num(f.vida_util_dias), temperatura_objetivo: num(f.temperatura_objetivo),
      dias_min_despacho: num(f.dias_min_despacho), alergenos: f.alergenos ? String(f.alergenos) : null,
      criterios_retencion: f.criterios_retencion ? String(f.criterios_retencion) : null,
      costo_hora_mo: num(f.costo_hora_mo), updated_at: new Date().toISOString(),
    }
    const { error } = await db.from('receta_versiones').update(patch).eq('id', versionId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    await db.from('receta_audit_log').insert({ version_id: versionId, usuario_id: auth.id, usuario_email: auth.email, campo: 'version', valor_nuevo: 'guardada' })
    return NextResponse.json({ ok: true })
  }

  // Reemplazar ingredientes de la versión (solo del Maestro)
  if (action === 'guardar_ingredientes') {
    const versionId = String(body.version_id || '')
    if (!versionId) return NextResponse.json({ error: 'Falta la versión' }, { status: 400 })
    if (await versionEstado(versionId) === 'aprobada') return NextResponse.json({ error: 'Versión aprobada: crea una nueva versión.' }, { status: 409 })
    const items = Array.isArray(body.ingredientes) ? body.ingredientes as J[] : []
    await db.from('receta_ingredientes').delete().eq('version_id', versionId)
    if (items.length) {
      const rows = items.map((it, i) => ({
        version_id: versionId, producto_id: String(it.producto_id), tipo_componente: it.tipo_componente ? String(it.tipo_componente) : 'materia_prima',
        cantidad: num(it.cantidad) ?? 0, unidad: it.unidad ? String(it.unidad) : null, merma_pct: num(it.merma_pct) ?? 0,
        obligatorio: it.obligatorio === false ? false : true, observacion: it.observacion ? String(it.observacion) : null, orden: i,
      }))
      const { error } = await db.from('receta_ingredientes').insert(rows)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    }
    await db.from('receta_audit_log').insert({ version_id: versionId, usuario_id: auth.id, usuario_email: auth.email, campo: 'ingredientes', valor_nuevo: String(items.length) + ' líneas' })
    return NextResponse.json({ ok: true })
  }

  // Reemplazar pasos
  if (action === 'guardar_pasos') {
    const versionId = String(body.version_id || '')
    if (!versionId) return NextResponse.json({ error: 'Falta la versión' }, { status: 400 })
    if (await versionEstado(versionId) === 'aprobada') return NextResponse.json({ error: 'Versión aprobada: crea una nueva versión.' }, { status: 409 })
    const pasos = Array.isArray(body.pasos) ? body.pasos as J[] : []
    await db.from('receta_pasos').delete().eq('version_id', versionId)
    if (pasos.length) {
      const rows = pasos.map((p, i) => ({
        version_id: versionId, numero: i + 1, instruccion: p.instruccion ? String(p.instruccion) : null,
        tiempo_min: num(p.tiempo_min), area: p.area ? String(p.area) : null, control_calidad: p.control_calidad ? String(p.control_calidad) : null,
        riesgo: p.riesgo ? String(p.riesgo) : null, registro_operario: p.registro_operario ? String(p.registro_operario) : null,
        justificacion: p.justificacion ? String(p.justificacion) : null, orden: i,
      }))
      const { error } = await db.from('receta_pasos').insert(rows)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    }
    await db.from('receta_audit_log').insert({ version_id: versionId, usuario_id: auth.id, usuario_email: auth.email, campo: 'pasos', valor_nuevo: String(pasos.length) + ' pasos' })
    return NextResponse.json({ ok: true })
  }

  // Nueva versión (copia ingredientes + pasos de la última)
  if (action === 'nueva_version') {
    const recetaId = String(body.receta_id || '')
    if (!recetaId) return NextResponse.json({ error: 'Falta la receta' }, { status: 400 })
    const { data: last } = await db.from('receta_versiones').select('*').eq('receta_id', recetaId).order('version', { ascending: false }).limit(1).maybeSingle()
    const nextV = ((last?.version as number | undefined) ?? 0) + 1
    const base = (last || {}) as J
    const { data: nv, error } = await db.from('receta_versiones').insert({
      receta_id: recetaId, version: nextV, estado: 'borrador', created_by: auth.id,
      rendimiento_cantidad: base.rendimiento_cantidad ?? null, rendimiento_unidad: base.rendimiento_unidad ?? null,
      tiempo_trabajo_min: base.tiempo_trabajo_min ?? null, tiempo_reposo_min: base.tiempo_reposo_min ?? null,
      operarios_ideal: base.operarios_ideal ?? null, merma_operativa_pct: base.merma_operativa_pct ?? null,
      condicion_almacenamiento: base.condicion_almacenamiento ?? null, vida_util_dias: base.vida_util_dias ?? null,
      motivo_cambio: body.motivo ? String(body.motivo) : null, costo_hora_mo: base.costo_hora_mo ?? null,
    }).select('id').single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (last) {
      const { data: ings } = await db.from('receta_ingredientes').select('*').eq('version_id', last.id)
      for (const it of (ings as J[] | null) || []) {
        await db.from('receta_ingredientes').insert({ version_id: nv.id, producto_id: it.producto_id, tipo_componente: it.tipo_componente, cantidad: it.cantidad, unidad: it.unidad, merma_pct: it.merma_pct, obligatorio: it.obligatorio, observacion: it.observacion, orden: it.orden })
      }
      const { data: pas } = await db.from('receta_pasos').select('*').eq('version_id', last.id)
      for (const p of (pas as J[] | null) || []) {
        await db.from('receta_pasos').insert({ version_id: nv.id, numero: p.numero, instruccion: p.instruccion, tiempo_min: p.tiempo_min, area: p.area, control_calidad: p.control_calidad, riesgo: p.riesgo, registro_operario: p.registro_operario, orden: p.orden })
      }
    }
    return NextResponse.json({ ok: true, version_id: nv.id, version: nextV })
  }

  // Aprobar: valida y congela snapshot de costos
  if (action === 'aprobar') {
    const versionId = String(body.version_id || '')
    if (!versionId) return NextResponse.json({ error: 'Falta la versión' }, { status: 400 })
    const { data: ver } = await db.from('receta_versiones').select('*').eq('id', versionId).maybeSingle()
    if (!ver) return NextResponse.json({ error: 'Versión no encontrada' }, { status: 404 })
    const { data: rec } = await db.from('recetas').select('*').eq('id', ver.receta_id).maybeSingle()
    const { data: ings } = await db.from('receta_ingredientes').select('*').eq('version_id', versionId)
    const { data: pasos } = await db.from('receta_pasos').select('*').eq('version_id', versionId)
    const ingList = (ings as J[] | null) || []
    const pasoList = (pasos as J[] | null) || []

    const errores: string[] = []
    if (!rec?.product_id) errores.push('Falta el producto asociado')
    if (!num(ver.rendimiento_cantidad) || !ver.rendimiento_unidad) errores.push('Rendimiento o unidad inválidos')
    if (ingList.length === 0) errores.push('No hay ingredientes')
    if (pasoList.length === 0 || pasoList.some(p => !p.instruccion)) errores.push('Hay pasos incompletos')

    // Costos + validación de ingredientes
    const ids = ingList.map(i => String(i.producto_id))
    const prodMap = new Map<string, J>()
    if (ids.length) {
      const { data: prods } = await db.from('products').select('id, nombre, activo, estado_calidad, precio, unidad_inventario, cantidad_por_unidad_venta').in('id', ids)
      for (const p of (prods as J[] | null) || []) prodMap.set(String(p.id), p)
    }
    let costoMp = 0, costoPre = 0, costoEnv = 0
    for (const it of ingList) {
      const p = prodMap.get(String(it.producto_id))
      if (!p) { errores.push('Ingrediente sin producto válido'); continue }
      if (p.activo === false) errores.push(`Ingrediente inactivo: ${String(p.nombre)}`)
      if (p.estado_calidad === 'bloqueado') errores.push(`Ingrediente bloqueado: ${String(p.nombre)}`)
      if (num(p.precio) === null) errores.push(`Ingrediente sin costo: ${String(p.nombre)}`)
      if (!it.unidad) errores.push(`Falta unidad en un ingrediente`)
      const costoLinea = (num(p.precio) ?? 0) * (num(it.cantidad) ?? 0)
      const tc = String(it.tipo_componente)
      if (tc === 'envase' || tc === 'etiqueta') costoEnv += costoLinea
      else if (tc === 'preelaboracion' || tc === 'receta') costoPre += costoLinea
      else costoMp += costoLinea
    }

    if (errores.length) return NextResponse.json({ error: 'No se puede aprobar', detalles: errores }, { status: 400 })

    const subtotal = costoMp + costoPre + costoEnv
    const costoMerma = subtotal * ((num(ver.merma_operativa_pct) ?? 0) / 100)
    const horasHombre = ((num(ver.tiempo_trabajo_min) ?? 0) * (num(ver.operarios_ideal) ?? 1)) / 60
    const costoMo = horasHombre * (num(ver.costo_hora_mo) ?? 0)
    const total = subtotal + costoMerma + costoMo
    const rend = num(ver.rendimiento_cantidad) ?? 1
    const costoUnidadBase = rend > 0 ? total / rend : total
    const prod = rec?.product_id ? prodMap.get(String(rec.product_id)) : null
    const porVenta = num(prod?.cantidad_por_unidad_venta) ?? 1
    const costoUnidadVenta = costoUnidadBase * porVenta

    // Congelar snapshot de costos por ingrediente
    for (const it of ingList) {
      const p = prodMap.get(String(it.producto_id))
      const cu = num(p?.precio) ?? 0
      await db.from('receta_ingredientes').update({ costo_unitario_snap: cu, costo_total_snap: cu * (num(it.cantidad) ?? 0) }).eq('id', it.id)
    }

    // Obsoletar la aprobada anterior de esta receta
    await db.from('receta_versiones').update({ estado: 'obsoleta' }).eq('receta_id', ver.receta_id).eq('estado', 'aprobada')

    const nowIso = new Date().toISOString()
    await db.from('receta_versiones').update({
      estado: 'aprobada', aprobado_por: auth.id, aprobado_at: nowIso, vigente_desde: nowIso,
      costo_mp: costoMp, costo_preelab: costoPre, costo_envases: costoEnv, costo_merma: costoMerma,
      costo_mano_obra: costoMo, costo_total_lote: total, costo_unidad_base: costoUnidadBase, costo_unidad_venta: costoUnidadVenta,
    }).eq('id', versionId)

    await db.from('recetas').update({ version_activa_id: versionId }).eq('id', ver.receta_id)
    if (rec?.product_id) await db.from('products').update({ receta_id: ver.receta_id, receta_estado: 'aprobada', receta_version: String(ver.version) }).eq('id', rec.product_id)
    await db.from('receta_audit_log').insert({ receta_id: ver.receta_id, version_id: versionId, usuario_id: auth.id, usuario_email: auth.email, campo: 'estado', valor_anterior: String(ver.estado), valor_nuevo: 'aprobada' })

    return NextResponse.json({ ok: true, costo_total_lote: Math.round(total), costo_unidad_base: Math.round(costoUnidadBase) })
  }

  return NextResponse.json({ error: 'Acción inválida' }, { status: 400 })
}
