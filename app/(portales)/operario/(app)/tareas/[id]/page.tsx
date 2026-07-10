'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Loader2, ArrowLeft, Play, Pause, Flag, Camera, Check, Lock, AlertTriangle } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'

type Row = Record<string, unknown>
const S = (v: unknown) => v === null || v === undefined ? '' : String(v)
const N = (v: unknown) => { const n = Number(v); return Number.isNaN(n) ? 0 : n }
const TIPO_LBL: Record<string, string> = { produccion: 'Producción', preelaboracion: 'Preelaboración', limpieza: 'Limpieza', apoyo: 'Apoyo', orden: 'Orden', revision: 'Revisión', especial: 'Especial' }
const CALIDADES = [['aprobado', 'Aprobado'], ['con_observacion', 'Con observación'], ['retenido', 'Retenido'], ['rechazado', 'Rechazado']] as const
const esProd = (tipo: string) => tipo === 'produccion' || tipo === 'preelaboracion'
const inC = 'w-full px-2.5 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-[#1b2a4a]'
const tplTipo = (tipo: string) => (tipo === 'produccion' || tipo === 'preelaboracion' || tipo === 'limpieza') ? tipo : 'general'

function minutosReales(eventos: Row[], incluirAhora: boolean): number {
  let total = 0, start: number | null = null
  for (const e of eventos) {
    const ts = new Date(S(e.ts)).getTime()
    if (S(e.tipo) === 'inicio' || S(e.tipo) === 'reanudacion') start = ts
    else if ((S(e.tipo) === 'pausa' || S(e.tipo) === 'fin') && start != null) { total += ts - start; start = null }
  }
  if (start != null && incluirAhora) total += Date.now() - start
  return Math.max(0, Math.round(total / 60000))
}

export default function OperarioTareaDetalle() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [uid, setUid] = useState<string | null>(null)
  const [tarea, setTarea] = useState<Row | null>(null)
  const [eventos, setEventos] = useState<Row[]>([])
  const [checklist, setChecklist] = useState<{ clave: string; texto: string }[]>([])
  const [bodegas, setBodegas] = useState<Row[]>([])
  const [busy, setBusy] = useState(false)
  const [cerrando, setCerrando] = useState(false)
  const [tick, setTick] = useState(0)
  const [error, setError] = useState<string | null>(null)

  // Receta / pasos (O-C)
  const [rvers, setRvers] = useState<Row | null>(null)
  const [pasos, setPasos] = useState<Row[]>([])
  const [hechos, setHechos] = useState<Record<number, boolean>>({})
  const [regPaso, setRegPaso] = useState<Record<number, string>>({})

  // Estado del formulario de cierre
  const [chk, setChk] = useState<Record<string, boolean>>({})
  const [foto, setFoto] = useState<{ nombre: string; url: string } | null>(null)
  const [fotoRemota, setFotoRemota] = useState<string | null>(null)
  const [subiendo, setSubiendo] = useState(false)
  const [f, setF] = useState<Row>({ calidad_resultado: 'aprobado' })

  const cargar = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setUid(user.id)
    const { data: t } = await supabase.from('op_tareas').select('*').eq('id', id).maybeSingle()
    setTarea((t as Row) || null)
    const { data: ev } = await supabase.from('op_tarea_eventos').select('*').eq('tarea_id', id).order('ts', { ascending: true })
    setEventos((ev as Row[]) || [])
    const tipo = tplTipo(S((t as Row)?.tipo))
    const { data: tpl } = await supabase.from('op_checklist_templates').select('items').eq('tipo', tipo).maybeSingle()
    setChecklist(((tpl as Row)?.items as { clave: string; texto: string }[]) || [])
    if (esProd(S((t as Row)?.tipo))) {
      const { data: b } = await supabase.from('bodegas').select('id, nombre, tipo').order('nombre')
      setBodegas((b as Row[]) || [])
    }
    // Receta aprobada + pasos (O-C)
    const rvId = S((t as Row)?.receta_version_id)
    if (rvId) {
      const [{ data: rv }, { data: ps }, { data: hp }] = await Promise.all([
        supabase.from('receta_versiones').select('rendimiento_cantidad, rendimiento_unidad, vida_util_dias, condicion_almacenamiento').eq('id', rvId).maybeSingle(),
        supabase.from('receta_pasos').select('*').eq('version_id', rvId).order('numero', { ascending: true }),
        supabase.from('op_produccion_pasos').select('numero').eq('tarea_id', id),
      ])
      setRvers((rv as Row) || null)
      setPasos((ps as Row[]) || [])
      const done: Record<number, boolean> = {}
      for (const r of (hp as Row[] | null) || []) done[Number(r.numero)] = true
      setHechos(done)
    }
    setLoading(false)
  }, [id])

  useEffect(() => { cargar() }, [cargar])

  useEffect(() => {
    if (S(tarea?.estado) !== 'en_proceso') return
    const iv = setInterval(() => setTick(x => x + 1), 30000)
    return () => clearInterval(iv)
  }, [tarea])

  async function evento(tipo: string, motivo?: string) {
    if (!uid) return
    await supabase.from('op_tarea_eventos').insert({ tarea_id: id, operario_id: uid, tipo, motivo: motivo || null })
    const { data: ev } = await supabase.from('op_tarea_eventos').select('*').eq('tarea_id', id).order('ts', { ascending: true })
    setEventos((ev as Row[]) || [])
  }
  async function setEstado(estado: string) {
    const { data } = await supabase.from('op_tareas').update({ estado, updated_at: new Date().toISOString() }).eq('id', id).select('*').single()
    if (data) setTarea(data as Row)
  }

  async function iniciar() { setBusy(true); await evento('inicio'); await setEstado('en_proceso'); setBusy(false) }
  async function pausar() {
    const motivo = window.prompt('Motivo de la pausa (ej: falta insumo, colación, máquina):') || ''
    if (!motivo.trim()) return
    setBusy(true); await evento('pausa', motivo.trim()); await setEstado('pausada'); setBusy(false)
  }
  async function reanudar() { setBusy(true); await evento('reanudacion'); await setEstado('en_proceso'); setBusy(false) }

  async function onFoto(ev: React.ChangeEvent<HTMLInputElement>) {
    const file = ev.target.files?.[0]
    if (!file || !uid) return
    setFoto({ nombre: file.name, url: URL.createObjectURL(file) })
    setSubiendo(true); setFotoRemota(null)
    const path = `${uid}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
    const { error: eUp } = await supabase.storage.from('evidencias').upload(path, file, { upsert: true })
    if (!eUp) {
      const { data } = supabase.storage.from('evidencias').getPublicUrl(path)
      setFotoRemota(data.publicUrl)
    }
    setSubiendo(false)
  }

  async function marcarPaso(numero: number, instruccion: string, tiempo: number, control: string) {
    if (!uid) return
    await supabase.from('op_produccion_pasos').insert({
      tarea_id: id, operario_id: uid, numero, instruccion, tiempo_min: tiempo || null,
      control_calidad: control || null, registro: regPaso[numero] ? { valor: regPaso[numero] } : null,
    })
    setHechos(h => ({ ...h, [numero]: true }))
  }

  // Vencimiento sugerido según vida útil de la receta
  useEffect(() => {
    const vd = Number(rvers?.vida_util_dias)
    if (!f.fecha_elaboracion || !vd) return
    const d = new Date(String(f.fecha_elaboracion) + 'T00:00:00')
    d.setDate(d.getDate() + vd)
    const iso = d.toISOString().slice(0, 10)
    setF(prev => prev.fecha_vencimiento ? prev : { ...prev, fecha_vencimiento: iso })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [f.fecha_elaboracion, rvers])

  // Validación de cierre
  const tipo = S(tarea?.tipo)
  const prod = esProd(tipo)
  const pasosPendientes = prod ? pasos.filter(p => !hechos[Number(p.numero)]).length : 0
  const faltan: string[] = []
  if (pasosPendientes > 0) faltan.push(`${pasosPendientes} paso(s) de la receta`)
  const checklistCompleto = checklist.every(i => chk[i.clave])
  if (!checklistCompleto) faltan.push('checklist')
  if (!foto) faltan.push('foto final')
  if (subiendo) faltan.push('subida de la foto')
  if (prod) {
    if (!f.cantidad_producida && f.cantidad_producida !== 0) faltan.push('cantidad producida')
    if (f.merma === undefined || f.merma === '') faltan.push('merma')
    if (N(f.merma) > 0 && !f.merma_motivo) faltan.push('motivo de merma')
    if (!f.fecha_elaboracion) faltan.push('fecha de elaboración')
    if (!f.fecha_vencimiento) faltan.push('fecha de vencimiento')
    if (!f.ubicacion_bodega_id) faltan.push('ubicación destino')
  }
  const calidad = S(f.calidad_resultado)
  if (prod && calidad !== 'aprobado' && (!f.calidad_motivo || !f.calidad_comentario)) faltan.push('motivo y comentario de calidad')
  const puedeCerrar = faltan.length === 0

  async function finalizar() {
    if (!uid || !tarea || !puedeCerrar) return
    setBusy(true); setError(null)
    await evento('fin')
    const { data: evFull } = await supabase.from('op_tarea_eventos').select('*').eq('tarea_id', id).order('ts', { ascending: true })
    const real = minutosReales((evFull as Row[]) || eventos, false)
    const { error: eIns } = await supabase.from('op_tarea_cierre').insert({
      tarea_id: id, operario_id: uid,
      tiempo_estimado_min: N(tarea.tiempo_estimado_min), tiempo_real_min: real,
      checklist_respuestas: chk, evidencia_cargada: true, evidencia_nombre: foto?.nombre || null, evidencia_url: fotoRemota,
      cantidad_producida: prod ? N(f.cantidad_producida) : null,
      cantidad_rechazada: prod ? N(f.cantidad_rechazada) : null,
      merma: prod ? N(f.merma) : null, merma_motivo: prod ? (S(f.merma_motivo) || null) : null,
      fecha_elaboracion: prod ? (f.fecha_elaboracion || null) : null,
      fecha_vencimiento: prod ? (f.fecha_vencimiento || null) : null,
      ubicacion_bodega_id: prod ? (f.ubicacion_bodega_id || null) : null,
      calidad_resultado: prod ? calidad : null,
      calidad_motivo: prod && calidad !== 'aprobado' ? S(f.calidad_motivo) : null,
      calidad_comentario: prod && calidad !== 'aprobado' ? S(f.calidad_comentario) : null,
      observaciones: S(f.observaciones) || null,
    })
    if (eIns) { setError(eIns.message); setBusy(false); return }
    const estadoFinal = calidad === 'rechazado' ? 'rechazada_calidad' : 'finalizada'
    await supabase.from('op_tareas').update({ estado: estadoFinal, updated_at: new Date().toISOString() }).eq('id', id)
    // Alerta a la Central si retenido/rechazado
    if (prod && (calidad === 'retenido' || calidad === 'rechazado')) {
      await supabase.from('notificaciones').insert({
        tipo: 'calidad_produccion', prioridad: 'alta', area: 'Producción',
        titulo: `Producción ${calidad}: ${S(tarea.titulo)}`,
        mensaje: `${S(f.calidad_motivo)} — ${S(f.calidad_comentario)}`,
        clave: `calidad:${id}`, estado: 'nueva',
      }).then(() => {}, () => {})
    }
    setBusy(false)
    router.push('/operario/tareas')
    router.refresh()
  }

  if (loading) return <div className="min-h-[60vh] flex items-center justify-center"><Loader2 className="w-6 h-6 text-[#1b2a4a] animate-spin" /></div>
  if (!tarea) return <div className="p-6 text-center text-gray-500">Tarea no encontrada.</div>

  const estado = S(tarea.estado)
  const finalizada = ['finalizada', 'rechazada_calidad', 'finalizada_incidencia'].includes(estado)
  void tick
  const realMin = minutosReales(eventos, estado === 'en_proceso')

  return (
    <div className="pb-6">
      <header className="bg-[#1b2a4a] text-white px-5 pt-5 pb-5 rounded-b-3xl">
        <button onClick={() => router.push('/operario/tareas')} className="flex items-center gap-1 text-sm text-white/80 mb-2"><ArrowLeft size={16} /> Mis tareas</button>
        <div className="font-semibold text-lg">{S(tarea.titulo)}</div>
        <div className="text-xs text-white/70">{TIPO_LBL[tipo]} · {S(tarea.area)} · est. {S(tarea.tiempo_estimado_min)}m</div>
      </header>

      <div className="px-5 -mt-3 space-y-4">
        {error && <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2 text-sm text-red-700">{error}</div>}

        {tarea.instrucciones ? <div className="bg-white rounded-2xl border border-gray-100 p-4 text-sm text-gray-700">{S(tarea.instrucciones)}</div> : null}

        {!finalizada && (
          <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
            <div className="text-[11px] text-gray-500">Tiempo real / estimado</div>
            <div className="text-2xl font-bold text-[#1b2a4a]">{realMin}m <span className="text-sm font-normal text-gray-400">/ {S(tarea.tiempo_estimado_min)}m</span></div>
            <div className="flex gap-2 mt-3">
              {estado === 'pendiente' && <button onClick={iniciar} disabled={busy} className="flex-1 bg-[#c9a24e] text-[#1b2a4a] font-semibold rounded-xl py-3 flex items-center justify-center gap-2"><Play size={18} /> Iniciar</button>}
              {estado === 'en_proceso' && <>
                <button onClick={pausar} disabled={busy} className="flex-1 bg-white border border-gray-200 rounded-xl py-3 flex items-center justify-center gap-2 text-gray-700"><Pause size={18} /> Pausar</button>
                <button onClick={() => setCerrando(true)} disabled={pasosPendientes > 0} className={`flex-1 rounded-xl py-3 flex items-center justify-center gap-2 font-semibold ${pasosPendientes > 0 ? 'bg-gray-100 text-gray-400' : 'bg-[#c9a24e] text-[#1b2a4a]'}`}>{pasosPendientes > 0 ? <Lock size={18} /> : <Flag size={18} />} Finalizar</button>
              </>}
              {estado === 'pausada' && <button onClick={reanudar} disabled={busy} className="flex-1 bg-[#c9a24e] text-[#1b2a4a] font-semibold rounded-xl py-3 flex items-center justify-center gap-2"><Play size={18} /> Reanudar</button>}
            </div>
          </div>
        )}

        {!finalizada && !cerrando && prod && pasos.length > 0 && estado === 'en_proceso' && (
          <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="font-semibold text-[#1b2a4a]">Paso a paso · receta aprobada</div>
              <span className="text-xs text-gray-500">{pasos.length - pasosPendientes}/{pasos.length}</span>
            </div>
            {rvers ? <div className="text-xs text-gray-500">Rinde {S(rvers.rendimiento_cantidad)}{S(rvers.rendimiento_unidad)} · vida útil {S(rvers.vida_util_dias)} días</div> : null}
            {pasos.map(p => {
              const num = Number(p.numero); const hecho = hechos[num]
              return (
                <div key={S(p.id)} className={`rounded-xl border p-3 ${hecho ? 'border-green-200 bg-green-50/50' : 'border-gray-200'}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-[#1b2a4a]">Paso {num}</span>
                    <span className="text-[11px] text-gray-400">{S(p.tiempo_min)} min</span>
                  </div>
                  <p className="text-sm text-gray-700 mt-1">{S(p.instruccion)}</p>
                  {p.control_calidad ? <div className="mt-2 text-xs bg-amber-50 text-amber-700 rounded-lg px-2.5 py-1.5"><span className="font-medium">Control:</span> {S(p.control_calidad)}</div> : null}
                  {hecho ? (
                    <div className="mt-1.5 text-xs text-green-700 flex items-center gap-1"><Check size={12} /> Completado{regPaso[num] ? ` · ${regPaso[num]}` : ''}</div>
                  ) : (
                    <div className="mt-2 flex gap-2">
                      {p.registro_operario ? <input className={inC} placeholder={S(p.registro_operario)} value={regPaso[num] || ''} onChange={e => setRegPaso(r => ({ ...r, [num]: e.target.value }))} /> : null}
                      <button onClick={() => marcarPaso(num, S(p.instruccion), Number(p.tiempo_min), S(p.control_calidad))} className="bg-[#c9a24e] text-[#1b2a4a] text-sm font-medium rounded-xl px-4 whitespace-nowrap">Listo</button>
                    </div>
                  )}
                </div>
              )
            })}
            {pasosPendientes === 0 && <div className="text-xs text-green-700 text-center">Pasos completos. Ya puedes finalizar.</div>}
          </div>
        )}

        {finalizada && (
          <div className="bg-green-50 border border-green-200 text-green-800 rounded-2xl p-4 text-center text-sm font-medium">
            Tarea {estado === 'rechazada_calidad' ? 'cerrada (rechazada por calidad)' : 'finalizada'}. Tiempo real: {realMin}m.
          </div>
        )}

        {cerrando && !finalizada && (
          <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-4">
            <div className="font-semibold text-[#1b2a4a]">Finalizar tarea</div>

            {prod && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <Campo label="Producida *"><input type="number" className={inC} value={S(f.cantidad_producida)} onChange={e => setF({ ...f, cantidad_producida: e.target.value })} /></Campo>
                  <Campo label="Rechazada"><input type="number" className={inC} value={S(f.cantidad_rechazada)} onChange={e => setF({ ...f, cantidad_rechazada: e.target.value })} /></Campo>
                  <Campo label="Merma *"><input type="number" className={inC} value={S(f.merma)} onChange={e => setF({ ...f, merma: e.target.value })} /></Campo>
                  <Campo label="Motivo merma"><input className={inC} value={S(f.merma_motivo)} onChange={e => setF({ ...f, merma_motivo: e.target.value })} placeholder={N(f.merma) > 0 ? 'Obligatorio' : '—'} /></Campo>
                  <Campo label="Elaboración *"><input type="date" className={inC} value={S(f.fecha_elaboracion)} onChange={e => setF({ ...f, fecha_elaboracion: e.target.value })} /></Campo>
                  <Campo label="Vencimiento *"><input type="date" className={inC} value={S(f.fecha_vencimiento)} onChange={e => setF({ ...f, fecha_vencimiento: e.target.value })} /></Campo>
                </div>
                {rvers?.vida_util_dias ? <div className="text-[11px] text-blue-700 bg-blue-50 rounded-lg px-2.5 py-1.5">Vida útil {S(rvers.vida_util_dias)} días → vencimiento sugerido calculado desde la elaboración. Ajusta solo si corresponde.</div> : null}
                <Campo label="Ubicación final *">
                  <select className={inC} value={S(f.ubicacion_bodega_id)} onChange={e => setF({ ...f, ubicacion_bodega_id: e.target.value })}>
                    <option value="">— Selecciona cámara/bodega —</option>
                    {bodegas.map(b => <option key={S(b.id)} value={S(b.id)}>{S(b.nombre)}</option>)}
                  </select>
                </Campo>
                <div>
                  <div className="text-xs text-gray-500 mb-1.5">Resultado de calidad *</div>
                  <div className="flex flex-wrap gap-2">
                    {CALIDADES.map(([k, l]) => (
                      <button key={k} onClick={() => setF({ ...f, calidad_resultado: k })} className={`text-xs px-3 py-1.5 rounded-full ${calidad === k ? 'bg-[#1b2a4a] text-white' : 'bg-gray-100 text-gray-600'}`}>{l}</button>
                    ))}
                  </div>
                  {calidad !== 'aprobado' && (
                    <div className="mt-2 space-y-2 bg-amber-50 border border-amber-200 rounded-xl p-2.5">
                      <input className={inC} placeholder="Motivo *" value={S(f.calidad_motivo)} onChange={e => setF({ ...f, calidad_motivo: e.target.value })} />
                      <textarea className={inC} rows={2} placeholder="Comentario obligatorio *" value={S(f.calidad_comentario)} onChange={e => setF({ ...f, calidad_comentario: e.target.value })} />
                      <div className="text-[11px] text-amber-700">Se envía alerta inmediata a la Central. Retenido no libera el lote; Rechazado no ingresa como disponible.</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div>
              <div className="text-xs text-gray-500 mb-1.5">Checklist obligatorio</div>
              <div className="space-y-1.5">
                {checklist.map(i => (
                  <button key={i.clave} onClick={() => setChk({ ...chk, [i.clave]: !chk[i.clave] })} className="flex items-center gap-2.5 w-full text-left text-sm">
                    <span className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 ${chk[i.clave] ? 'bg-green-500 text-white' : 'bg-gray-100 border border-gray-200'}`}>{chk[i.clave] && <Check size={13} />}</span>
                    <span className={chk[i.clave] ? 'text-gray-800' : 'text-gray-500'}>{i.texto}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="text-xs text-gray-500 mb-1.5">Foto final obligatoria *</div>
              <div className="flex items-center gap-3">
                {foto ? <img src={foto.url} alt="evidencia" className="w-16 h-16 rounded-lg object-cover border border-gray-200" /> :
                  <div className="w-16 h-16 rounded-lg border border-dashed border-gray-300 flex items-center justify-center text-gray-300"><Camera size={20} /></div>}
                <div className="flex-1">
                  <label className="block bg-white border border-gray-200 rounded-xl py-3 text-center text-sm text-gray-700 cursor-pointer">
                    <Camera size={16} className="inline mr-1" /> {foto ? 'Reemplazar foto' : 'Tomar / subir foto'}
                    <input type="file" accept="image/*" capture="environment" className="hidden" onChange={onFoto} />
                  </label>
                  {subiendo ? <div className="text-[11px] text-gray-500 mt-1 flex items-center gap-1"><Loader2 size={11} className="animate-spin" /> Subiendo…</div>
                    : fotoRemota ? <div className="text-[11px] text-green-600 mt-1">Foto guardada</div>
                    : foto ? <div className="text-[11px] text-amber-600 mt-1">Foto local (se guardará al finalizar)</div> : null}
                </div>
              </div>
            </div>

            <Campo label="Observaciones"><textarea className={inC} rows={2} value={S(f.observaciones)} onChange={e => setF({ ...f, observaciones: e.target.value })} /></Campo>

            {!puedeCerrar && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2 text-xs text-red-700 flex gap-2"><Lock size={14} className="flex-shrink-0 mt-0.5" /> No puedes finalizar: falta {faltan.join(', ')}.</div>
            )}
            <button onClick={finalizar} disabled={!puedeCerrar || busy} className={`w-full rounded-2xl py-4 font-semibold flex items-center justify-center gap-2 ${puedeCerrar ? 'bg-[#c9a24e] text-[#1b2a4a]' : 'bg-gray-100 text-gray-400'}`}>
              {busy ? <Loader2 size={18} className="animate-spin" /> : puedeCerrar ? <Flag size={18} /> : <Lock size={18} />} {puedeCerrar ? 'Finalizar tarea' : 'Finalizar (bloqueado)'}
            </button>
          </div>
        )}

        {eventos.some(e => S(e.tipo) === 'pausa') && !finalizada && (
          <div className="bg-white rounded-2xl border border-gray-100 p-3 text-xs text-gray-500 flex items-start gap-2">
            <AlertTriangle size={14} className="text-amber-500 flex-shrink-0 mt-0.5" />
            Pausas registradas: {eventos.filter(e => S(e.tipo) === 'pausa').map(e => S(e.motivo)).join(' · ')}
          </div>
        )}
      </div>
    </div>
  )
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><div className="text-[11px] text-gray-500 mb-1">{label}</div>{children}</div>
}
