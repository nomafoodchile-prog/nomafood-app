'use client'

import { useCallback, useEffect, useState } from 'react'
import { Search, Loader2, Plus, ArrowLeft, Trash2, ShieldCheck, GitBranch } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'

type Row = Record<string, unknown>
const TIPOS = ['producto_terminado', 'preelaboracion', 'base', 'salsa', 'masa', 'relleno', 'proteina', 'kit']
const TIPO_LBL: Record<string, string> = { producto_terminado: 'Producto terminado', preelaboracion: 'Preelaboración', base: 'Base', salsa: 'Salsa', masa: 'Masa', relleno: 'Relleno', proteina: 'Proteína vegana', kit: 'Kit / combo' }
const EST_LBL: Record<string, string> = { borrador: 'Borrador', en_revision: 'En revisión', aprobada: 'Aprobada', obsoleta: 'Obsoleta', archivada: 'Archivada' }
const UNIDADES = ['unidad', 'kilo', 'litro', 'gramo', 'bandeja', 'caja', 'pack']
const TIPO_COMP = ['materia_prima', 'preelaboracion', 'receta', 'envase', 'etiqueta', 'insumo']
const COMP_LBL: Record<string, string> = { materia_prima: 'Materia prima', preelaboracion: 'Preelaboración', receta: 'Otra receta', envase: 'Envase', etiqueta: 'Etiqueta', insumo: 'Insumo' }

const clp = (n: number) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(Math.round(n || 0))
const S = (v: unknown) => v === null || v === undefined ? '' : String(v)
const N = (v: unknown) => { const n = Number(v); return Number.isNaN(n) ? 0 : n }

function estadoPill(e: string) {
  const c: Record<string, string> = { aprobada: 'bg-green-100 text-green-700', en_revision: 'bg-amber-100 text-amber-700', borrador: 'bg-gray-100 text-gray-600', obsoleta: 'bg-gray-100 text-gray-400', archivada: 'bg-gray-100 text-gray-400' }
  return c[e] || 'bg-gray-100 text-gray-600'
}

export default function RecetasPage() {
  const [lista, setLista] = useState<Row[]>([])
  const [products, setProducts] = useState<Row[]>([])
  const [areas, setAreas] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sel, setSel] = useState<string | null>(null)
  const [receta, setReceta] = useState<Row>({})
  const [version, setVersion] = useState<Row>({})
  const [versiones, setVersiones] = useState<Row[]>([])
  const [ings, setIngs] = useState<Row[]>([])
  const [pasos, setPasos] = useState<Row[]>([])
  const [tab, setTab] = useState('general')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string[] | null>(null)

  const prodById = (id: unknown) => products.find(p => S(p.id) === S(id))

  const cargarLista = useCallback(async () => {
    const { data } = await supabase.from('recetas').select('id, codigo, nombre, tipo_receta, area, product_id, version_activa_id, producto:products(nombre), version:receta_versiones!fk_recetas_version_activa(estado, version, rendimiento_cantidad, rendimiento_unidad)').order('created_at', { ascending: false })
    setLista((data as Row[]) || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    cargarLista()
    supabase.from('products').select('id, nombre, tipo_producto, precio, unidad_inventario, activo, estado_calidad, cantidad_por_unidad_venta').order('nombre').then(({ data }) => setProducts((data as Row[]) || []))
    supabase.from('catalogos').select('valor').eq('tipo', 'area').eq('activo', true).order('valor').then(({ data }) => setAreas(((data as Row[]) || []).map(r => S(r.valor))))
  }, [cargarLista])

  async function abrir(id: string) {
    setMsg(null); setErr(null); setTab('general')
    const { data: rec } = await supabase.from('recetas').select('*').eq('id', id).single()
    setReceta((rec as Row) || {}); setSel(id)
    const { data: vers } = await supabase.from('receta_versiones').select('*').eq('receta_id', id).order('version', { ascending: false })
    const vlist = (vers as Row[]) || []
    setVersiones(vlist)
    const activa = vlist.find(v => S(v.id) === S((rec as Row)?.version_activa_id)) || vlist[0] || {}
    cargarVersion(S(activa.id))
  }

  async function cargarVersion(versionId: string) {
    if (!versionId) { setVersion({}); setIngs([]); setPasos([]); return }
    const { data: v } = await supabase.from('receta_versiones').select('*').eq('id', versionId).single()
    setVersion((v as Row) || {})
    const { data: i } = await supabase.from('receta_ingredientes').select('*').eq('version_id', versionId).order('orden')
    setIngs((i as Row[]) || [])
    const { data: p } = await supabase.from('receta_pasos').select('*').eq('version_id', versionId).order('orden')
    setPasos((p as Row[]) || [])
  }

  async function api(payload: Row): Promise<Row | null> {
    setErr(null); setMsg(null)
    const r = await fetch('/api/central/recetas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    const d = await r.json() as Row
    if (!r.ok) { setErr(Array.isArray(d.detalles) ? d.detalles as string[] : [S(d.error) || 'Error']); return null }
    return d
  }

  async function crearReceta() {
    setSaving(true)
    const d = await api({ action: 'crear_receta', nombre: 'Nueva receta', tipo_receta: 'producto_terminado' })
    setSaving(false)
    if (d) { await cargarLista(); abrir(S(d.receta_id)) }
  }

  const aprobada = S(version.estado) === 'aprobada'

  async function guardarVersion() {
    setSaving(true)
    await api({ action: 'guardar_version', version_id: version.id, fields: version })
    setSaving(false); setMsg('Guardado')
  }
  async function guardarIngs() {
    setSaving(true)
    await api({ action: 'guardar_ingredientes', version_id: version.id, ingredientes: ings })
    setSaving(false); setMsg('Ingredientes guardados')
  }
  async function guardarPasos() {
    setSaving(true)
    await api({ action: 'guardar_pasos', version_id: version.id, pasos })
    setSaving(false); setMsg('Pasos guardados')
  }
  async function aprobar() {
    setSaving(true)
    await guardarVersion(); await guardarIngs(); await guardarPasos()
    const d = await api({ action: 'aprobar', version_id: version.id })
    setSaving(false)
    if (d) { setMsg('Receta aprobada'); abrir(sel as string); cargarLista() }
  }
  async function nuevaVersion() {
    setSaving(true)
    const d = await api({ action: 'nueva_version', receta_id: sel, motivo: 'Nueva versión' })
    setSaving(false)
    if (d) abrir(sel as string)
  }

  const setV = (k: string, v: unknown) => setVersion(p => ({ ...p, [k]: v }))
  const setR = (k: string, v: unknown) => setReceta(p => ({ ...p, [k]: v }))

  // Costos en vivo
  let cMp = 0, cPre = 0, cEnv = 0
  for (const it of ings) {
    const p = prodById(it.producto_id)
    const c = N(p?.precio) * N(it.cantidad)
    const tc = S(it.tipo_componente)
    if (tc === 'envase' || tc === 'etiqueta') cEnv += c
    else if (tc === 'preelaboracion' || tc === 'receta') cPre += c
    else cMp += c
  }
  const subtotal = cMp + cPre + cEnv
  const cMerma = subtotal * (N(version.merma_operativa_pct) / 100)
  const horasHombre = (N(version.tiempo_trabajo_min) * (N(version.operarios_ideal) || 1)) / 60
  const cMo = horasHombre * N(version.costo_hora_mo)
  const total = subtotal + cMerma + cMo
  const rend = N(version.rendimiento_cantidad) || 1
  const cUnidadBase = total / rend
  const prodAsoc = prodById(receta.product_id)
  const porVenta = N(prodAsoc?.cantidad_por_unidad_venta) || 1
  const tPorUnidad = rend > 0 ? N(version.tiempo_trabajo_min) / rend : 0
  const bandejas = porVenta > 1 ? Math.ceil(rend / porVenta) : 0
  const espaciosLibres = bandejas > 0 ? bandejas * porVenta - rend : 0

  const filtrados = lista.filter(r => !search || S(r.nombre).toLowerCase().includes(search.toLowerCase()) || S(r.codigo).toLowerCase().includes(search.toLowerCase()))

  if (!sel) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div><h1 className="text-2xl font-bold text-[#1a1a1a]">Recetas y formulaciones</h1><p className="text-sm text-gray-500 mt-0.5">{lista.length} recetas · Producción</p></div>
          <button onClick={crearReceta} disabled={saving} className="noma-btn-primary flex items-center gap-2 text-sm"><Plus size={16} /> Nueva receta</button>
        </div>
        {err && <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700">{err.join(' · ')}</div>}
        <div className="noma-card !p-4"><div className="relative"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><input className="noma-input pl-9" placeholder="Buscar receta o código..." value={search} onChange={e => setSearch(e.target.value)} /></div></div>
        <div className="noma-card !p-0 overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-sm">
          <thead className="border-b border-gray-100 bg-gray-50/50"><tr>
            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase">Código</th><th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase">Receta</th><th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase hidden md:table-cell">Producto</th><th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase hidden md:table-cell">Tipo</th><th className="text-center py-3 px-4 text-xs font-semibold text-gray-400 uppercase">Estado</th>
          </tr></thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? <tr><td colSpan={5} className="py-12 text-center"><Loader2 className="w-5 h-5 text-[#1b2a4a] animate-spin mx-auto" /></td></tr>
            : filtrados.length === 0 ? <tr><td colSpan={5} className="py-12 text-center text-gray-400 text-sm">Aún no hay recetas. Crea la primera.</td></tr>
            : filtrados.map(r => {
              const v = (r.version as Row) || {}
              return (
                <tr key={S(r.id)} onClick={() => abrir(S(r.id))} className="hover:bg-gray-50 cursor-pointer">
                  <td className="py-3 px-4"><span className="font-mono text-xs text-gray-500">{S(r.codigo) || '—'}</span></td>
                  <td className="py-3 px-4 font-medium text-[#1a1a1a]">{S(r.nombre)}</td>
                  <td className="py-3 px-4 text-gray-500 text-xs hidden md:table-cell">{S((r.producto as Row)?.nombre) || '—'}</td>
                  <td className="py-3 px-4 text-gray-500 text-xs hidden md:table-cell">{TIPO_LBL[S(r.tipo_receta)] || '—'}</td>
                  <td className="py-3 px-4 text-center"><span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${estadoPill(S(v.estado) || 'borrador')}`}>{EST_LBL[S(v.estado)] || 'Borrador'}</span></td>
                </tr>)
            })}
          </tbody>
        </table></div></div>
      </div>
    )
  }

  const tabs = [['general', 'General'], ['rend', 'Rendimiento'], ['ing', 'Ingredientes'], ['pasos', 'Paso a paso'], ['cal', 'Calidad'], ['cost', 'Costos'], ['ver', 'Versiones']]

  return (
    <div className="space-y-4">
      <button onClick={() => { setSel(null); cargarLista() }} className="flex items-center gap-1 text-sm text-gray-500 hover:text-[#1b2a4a]"><ArrowLeft size={15} /> Volver a recetas</button>
      <div className="noma-card !p-0 overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-[#1b2a4a]">{S(receta.nombre)}</span>
            <span className="font-mono text-xs text-gray-500 bg-gray-50 px-2 py-0.5 rounded">{S(receta.codigo) || 's/código'}</span>
            <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${estadoPill(S(version.estado) || 'borrador')}`}>{EST_LBL[S(version.estado)] || 'Borrador'} · v{S(version.version) || '1'}</span>
            {aprobada && <span className="text-[11px] text-gray-400">Aprobada no se edita · crea nueva versión</span>}
          </div>
        </div>
        <div className="flex gap-1 px-3 pt-2 border-b border-gray-100 overflow-x-auto">
          {tabs.map(([id, label]) => <button key={id} onClick={() => setTab(id)} className={`text-sm px-3 py-2 whitespace-nowrap border-b-2 ${tab === id ? 'border-[#c9a24e] text-[#1b2a4a] font-medium' : 'border-transparent text-gray-500'}`}>{label}</button>)}
        </div>

        <div className="p-5">
          {msg && <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-sm text-green-700 mb-4">{msg}</div>}
          {err && <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700 mb-4"><strong>No se pudo:</strong><ul className="list-disc ml-5 mt-1">{err.map((e, i) => <li key={i}>{e}</li>)}</ul></div>}

          {tab === 'general' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div><label className="text-xs text-gray-500">Nombre de receta</label><input className="noma-input mt-1" value={S(receta.nombre)} disabled={aprobada} onChange={e => setR('nombre', e.target.value)} /></div>
              <div><label className="text-xs text-gray-500">Código</label><input className="noma-input mt-1 font-mono" value={S(receta.codigo)} disabled={aprobada} onChange={e => setR('codigo', e.target.value)} /></div>
              <div><label className="text-xs text-gray-500">Producto asociado (Maestro)</label><select className="noma-input mt-1" value={S(receta.product_id)} disabled={aprobada} onChange={e => setR('product_id', e.target.value)}><option value="">—</option>{products.map(p => <option key={S(p.id)} value={S(p.id)}>{S(p.nombre)}</option>)}</select></div>
              <div><label className="text-xs text-gray-500">Tipo de receta</label><select className="noma-input mt-1" value={S(receta.tipo_receta)} disabled={aprobada} onChange={e => setR('tipo_receta', e.target.value)}>{TIPOS.map(t => <option key={t} value={t}>{TIPO_LBL[t]}</option>)}</select></div>
              <div><label className="text-xs text-gray-500">Área responsable</label><select className="noma-input mt-1" value={S(receta.area)} disabled={aprobada} onChange={e => setR('area', e.target.value)}><option value="">—</option>{areas.map(a => <option key={a} value={a}>{a}</option>)}</select></div>
              <div className="sm:col-span-2 lg:col-span-3"><label className="text-xs text-gray-500">Descripción / observaciones</label><textarea rows={2} className="noma-input mt-1" value={S(receta.descripcion)} disabled={aprobada} onChange={e => setR('descripcion', e.target.value)} /></div>
              <div className="sm:col-span-2 lg:col-span-3"><button onClick={async () => { setSaving(true); await supabase.from('recetas').update({ nombre: receta.nombre, codigo: receta.codigo || null, product_id: receta.product_id || null, tipo_receta: receta.tipo_receta, area: receta.area || null, descripcion: receta.descripcion || null }).eq('id', sel as string); setSaving(false); setMsg('General guardado'); cargarLista() }} disabled={aprobada || saving} className="noma-btn-primary text-sm">Guardar general</button></div>
            </div>
          )}

          {tab === 'rend' && (
            <div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[['rendimiento_cantidad', 'Rendimiento (cantidad)', 'number'], ['rendimiento_unidad', 'Unidad de rendimiento', 'sel'], ['porcion_estandar_g', 'Porción estándar (g)', 'number'], ['tiempo_trabajo_min', 'Tiempo de trabajo efectivo (min)', 'number'], ['tiempo_reposo_min', 'Reposo / enfriado (min)', 'number'], ['operarios_ideal', 'Operarios ideales', 'number'], ['merma_operativa_pct', 'Merma operativa por lote (%)', 'number'], ['costo_hora_mo', 'Costo hora mano de obra', 'number']].map(([k, lbl, t]) => (
                  <div key={k}><label className="text-xs text-gray-500">{lbl}</label>{t === 'sel' ? <select className="noma-input mt-1" value={S(version[k])} disabled={aprobada} onChange={e => setV(k, e.target.value)}><option value="">—</option>{UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}</select> : <input type="number" className="noma-input mt-1" value={S(version[k])} disabled={aprobada} onChange={e => setV(k, e.target.value)} />}</div>
                ))}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                <div className="bg-gray-50 rounded-lg p-3"><div className="text-[11px] text-gray-500">Horas-hombre</div><div className="font-semibold">{horasHombre.toFixed(1)} h-h</div></div>
                <div className="bg-gray-50 rounded-lg p-3"><div className="text-[11px] text-gray-500">Tiempo por unidad</div><div className="font-semibold">{tPorUnidad.toFixed(2)} min</div></div>
                <div className="bg-gray-50 rounded-lg p-3"><div className="text-[11px] text-gray-500">Transcurrido total</div><div className="font-semibold">{N(version.tiempo_trabajo_min) + N(version.tiempo_reposo_min)} min</div></div>
                <div className="bg-gray-50 rounded-lg p-3"><div className="text-[11px] text-gray-500">Empaque ({porVenta}/venta)</div><div className="font-semibold">{bandejas || '—'}{bandejas ? ' env.' : ''}</div></div>
              </div>
              {espaciosLibres > 0 && <div className="mt-2 px-3 py-2 bg-amber-50 rounded-lg text-xs text-amber-700">{rend} unidades → {bandejas} envases con <strong>{espaciosLibres} espacios libres</strong>. Revisa tamaño de lote o empaque.</div>}
              <button onClick={guardarVersion} disabled={aprobada || saving} className="noma-btn-primary text-sm mt-4">Guardar rendimiento</button>
            </div>
          )}

          {tab === 'ing' && (
            <div>
              <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-gray-400 text-left text-xs uppercase"><th className="py-2 pr-2">Componente (Maestro)</th><th className="py-2 pr-2">Tipo</th><th className="py-2 pr-2">Cant.</th><th className="py-2 pr-2">Unidad</th><th className="py-2 pr-2">Merma%</th><th className="py-2 pr-2 text-right">Costo</th><th></th></tr></thead>
              <tbody>{ings.map((it, i) => { const p = prodById(it.producto_id); return (
                <tr key={i} className="border-t border-gray-50">
                  <td className="py-1.5 pr-2"><select className="noma-input !h-8" value={S(it.producto_id)} disabled={aprobada} onChange={e => setIngs(a => a.map((x, j) => j === i ? { ...x, producto_id: e.target.value } : x))}><option value="">—</option>{products.map(pr => <option key={S(pr.id)} value={S(pr.id)}>{S(pr.nombre)}</option>)}</select></td>
                  <td className="py-1.5 pr-2"><select className="noma-input !h-8" value={S(it.tipo_componente)} disabled={aprobada} onChange={e => setIngs(a => a.map((x, j) => j === i ? { ...x, tipo_componente: e.target.value } : x))}>{TIPO_COMP.map(t => <option key={t} value={t}>{COMP_LBL[t]}</option>)}</select></td>
                  <td className="py-1.5 pr-2"><input type="number" className="noma-input !h-8 w-16" value={S(it.cantidad)} disabled={aprobada} onChange={e => setIngs(a => a.map((x, j) => j === i ? { ...x, cantidad: e.target.value } : x))} /></td>
                  <td className="py-1.5 pr-2"><select className="noma-input !h-8" value={S(it.unidad)} disabled={aprobada} onChange={e => setIngs(a => a.map((x, j) => j === i ? { ...x, unidad: e.target.value } : x))}><option value="">—</option>{UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}</select></td>
                  <td className="py-1.5 pr-2"><input type="number" className="noma-input !h-8 w-14" value={S(it.merma_pct)} disabled={aprobada} onChange={e => setIngs(a => a.map((x, j) => j === i ? { ...x, merma_pct: e.target.value } : x))} /></td>
                  <td className="py-1.5 pr-2 text-right">{clp(N(p?.precio) * N(it.cantidad))}</td>
                  <td className="py-1.5">{!aprobada && <button onClick={() => setIngs(a => a.filter((_, j) => j !== i))} className="text-gray-400 hover:text-red-500"><Trash2 size={14} /></button>}</td>
                </tr>) })}</tbody></table></div>
              {!aprobada && <div className="flex gap-2 mt-3"><button onClick={() => setIngs(a => [...a, { producto_id: '', tipo_componente: 'materia_prima', cantidad: 1, unidad: 'kilo', merma_pct: 0 }])} className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 hover:border-[#c9a24e]"><Plus size={14} className="inline" /> Agregar ingrediente</button><button onClick={guardarIngs} disabled={saving} className="noma-btn-primary text-sm">Guardar ingredientes</button></div>}
              <p className="text-[11px] text-gray-400 mt-2">Solo productos del Maestro. Costos automáticos (precio × cantidad).</p>
            </div>
          )}

          {tab === 'pasos' && (
            <div className="space-y-2">
              {pasos.map((p, i) => (
                <div key={i} className="border border-gray-100 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2"><span className="w-6 h-6 rounded-full bg-[#eef1f6] text-[#1b2a4a] flex items-center justify-center text-xs">{i + 1}</span>{!aprobada && <button onClick={() => setPasos(a => a.filter((_, j) => j !== i))} className="ml-auto text-gray-400 hover:text-red-500"><Trash2 size={14} /></button>}</div>
                  <textarea rows={2} className="noma-input" placeholder="Instrucción..." value={S(p.instruccion)} disabled={aprobada} onChange={e => setPasos(a => a.map((x, j) => j === i ? { ...x, instruccion: e.target.value } : x))} />
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
                    <input type="number" className="noma-input !h-8" placeholder="min" value={S(p.tiempo_min)} disabled={aprobada} onChange={e => setPasos(a => a.map((x, j) => j === i ? { ...x, tiempo_min: e.target.value } : x))} />
                    <input className="noma-input !h-8" placeholder="Área" value={S(p.area)} disabled={aprobada} onChange={e => setPasos(a => a.map((x, j) => j === i ? { ...x, area: e.target.value } : x))} />
                    <input className="noma-input !h-8" placeholder="Control calidad" value={S(p.control_calidad)} disabled={aprobada} onChange={e => setPasos(a => a.map((x, j) => j === i ? { ...x, control_calidad: e.target.value } : x))} />
                    <input className="noma-input !h-8" placeholder="Registra operario" value={S(p.registro_operario)} disabled={aprobada} onChange={e => setPasos(a => a.map((x, j) => j === i ? { ...x, registro_operario: e.target.value } : x))} />
                  </div>
                </div>
              ))}
              {!aprobada && <div className="flex gap-2"><button onClick={() => setPasos(a => [...a, { instruccion: '' }])} className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 hover:border-[#c9a24e]"><Plus size={14} className="inline" /> Agregar paso</button><button onClick={guardarPasos} disabled={saving} className="noma-btn-primary text-sm">Guardar pasos</button></div>}
            </div>
          )}

          {tab === 'cal' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[['requiere_lote', 'Requiere lote'], ['requiere_vencimiento', 'Requiere vencimiento'], ['requiere_fechado', 'Requiere fechado'], ['requiere_etiqueta', 'Requiere etiqueta']].map(([k, lbl]) => (
                <div key={k}><label className="text-xs text-gray-500">{lbl}</label><div className="mt-2"><button onClick={() => !aprobada && setV(k, !version[k])} className={`w-9 h-5 rounded-full relative ${version[k] ? 'bg-green-500' : 'bg-gray-300'}`}><span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${version[k] ? 'left-4' : 'left-0.5'}`} /></button></div></div>
              ))}
              <div><label className="text-xs text-gray-500">Condición almacenamiento</label><select className="noma-input mt-1" value={S(version.condicion_almacenamiento)} disabled={aprobada} onChange={e => setV('condicion_almacenamiento', e.target.value)}><option value="">—</option><option>ambiente</option><option>refrigerado</option><option>congelado</option></select></div>
              <div><label className="text-xs text-gray-500">Vida útil (días)</label><input type="number" className="noma-input mt-1" value={S(version.vida_util_dias)} disabled={aprobada} onChange={e => setV('vida_util_dias', e.target.value)} /></div>
              <div><label className="text-xs text-gray-500">Temperatura objetivo (°C)</label><input type="number" className="noma-input mt-1" value={S(version.temperatura_objetivo)} disabled={aprobada} onChange={e => setV('temperatura_objetivo', e.target.value)} /></div>
              <div><label className="text-xs text-gray-500">Días mín. despacho</label><input type="number" className="noma-input mt-1" value={S(version.dias_min_despacho)} disabled={aprobada} onChange={e => setV('dias_min_despacho', e.target.value)} /></div>
              <div className="sm:col-span-2"><label className="text-xs text-gray-500">Alérgenos / advertencias</label><input className="noma-input mt-1" value={S(version.alergenos)} disabled={aprobada} onChange={e => setV('alergenos', e.target.value)} /></div>
              <div className="sm:col-span-2 lg:col-span-3"><button onClick={guardarVersion} disabled={aprobada || saving} className="noma-btn-primary text-sm">Guardar calidad</button></div>
            </div>
          )}

          {tab === 'cost' && (
            <table className="w-full text-sm"><tbody>
              <tr className="border-b border-gray-100"><td className="py-2 text-gray-500">Materias primas</td><td className="py-2 text-right">{clp(cMp)}</td></tr>
              <tr className="border-b border-gray-100"><td className="py-2 text-gray-500">Preelaboraciones</td><td className="py-2 text-right">{clp(cPre)}</td></tr>
              <tr className="border-b border-gray-100"><td className="py-2 text-gray-500">Envases y etiquetas</td><td className="py-2 text-right">{clp(cEnv)}</td></tr>
              <tr className="border-b border-gray-100"><td className="py-2 text-gray-500">Merma valorizada</td><td className="py-2 text-right">{clp(cMerma)}</td></tr>
              <tr className="border-b border-gray-100"><td className="py-2 text-gray-500">Mano de obra ({horasHombre.toFixed(1)} h-h)</td><td className="py-2 text-right">{clp(cMo)}</td></tr>
              <tr className="border-b border-gray-100"><td className="py-2 font-medium">Costo total por lote</td><td className="py-2 text-right font-medium">{clp(total)}</td></tr>
              <tr className="border-b border-gray-100"><td className="py-2 text-gray-500">Costo por unidad base</td><td className="py-2 text-right">{clp(cUnidadBase)}</td></tr>
              <tr><td className="py-2 text-gray-500">Costo por unidad de venta (×{porVenta})</td><td className="py-2 text-right">{clp(cUnidadBase * porVenta)}</td></tr>
            </tbody></table>
          )}

          {tab === 'ver' && (
            <div>
              <table className="w-full text-sm"><thead><tr className="text-gray-400 text-left text-xs"><th className="py-2">v.</th><th className="py-2">Estado</th><th className="py-2">Motivo</th><th></th></tr></thead>
              <tbody>{versiones.map(v => (
                <tr key={S(v.id)} className="border-t border-gray-50"><td className="py-2">v{S(v.version)}</td><td className="py-2"><span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${estadoPill(S(v.estado))}`}>{EST_LBL[S(v.estado)]}</span></td><td className="py-2 text-gray-500">{S(v.motivo_cambio) || '—'}</td><td className="py-2 text-right">{S(v.id) !== S(version.id) && <button onClick={() => cargarVersion(S(v.id))} className="text-xs text-[#c9a24e] underline">Ver</button>}</td></tr>
              ))}</tbody></table>
              <p className="text-[11px] text-gray-400 mt-2">Una versión aprobada no se edita: se crea una nueva. Solo una aprobada activa por producto.</p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-gray-100">
          {aprobada
            ? <button onClick={nuevaVersion} disabled={saving} className="noma-btn-primary flex items-center gap-2 text-sm"><GitBranch size={15} /> Crear nueva versión</button>
            : <button onClick={aprobar} disabled={saving} className="noma-btn-primary flex items-center gap-2 text-sm">{saving ? <Loader2 size={15} className="animate-spin" /> : <ShieldCheck size={15} />} Aprobar receta</button>}
        </div>
      </div>
    </div>
  )
}
