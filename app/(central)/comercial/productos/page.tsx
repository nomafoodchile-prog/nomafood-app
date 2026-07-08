'use client'

import { useCallback, useEffect, useState } from 'react'
import { Search, Loader2, RefreshCw, Plus, Check, ArrowLeft, ChevronDown, ChevronRight, FileText } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { ProveedoresProducto } from '@/components/central/ProveedoresProducto'

type Val = string | number | boolean | null
type Row = Record<string, Val | undefined>
type FT = 'text' | 'number' | 'textarea' | 'select' | 'toggle' | 'catalog'
interface FD { k: string; label: string; t: FT; opts?: string[]; cat?: string }
interface TabDef { id: string; label: string; fields: FD[]; tipos?: string[] }

const UNIDADES = ['unidad', 'bandeja', 'caja', 'bolsa', 'pack', 'kilo', 'litro', 'docena']
const TIPOS = ['terminado_fabricado', 'preelaboracion', 'materia_prima', 'envase_insumo', 'reventa', 'kit']
const CICLO = ['borrador', 'en_configuracion', 'listo_operar', 'descontinuado']
const RECETA_EST = ['no_asignada', 'borrador', 'aprobada', 'obsoleta']
const SELLABLE = ['terminado_fabricado', 'reventa', 'kit']
const PRODUCIBLE = ['terminado_fabricado', 'preelaboracion']

const LABELS: Record<string, string> = {
  terminado_fabricado: 'Producto terminado', preelaboracion: 'Preelaboración', materia_prima: 'Materia prima', envase_insumo: 'Envase / insumo', reventa: 'Reventa', kit: 'Kit / combo',
  borrador: 'Borrador', en_configuracion: 'En configuración', listo_operar: 'Listo para operar', descontinuado: 'Descontinuado / archivado',
  no_asignada: 'No asignada', aprobada: 'Aprobada', obsoleta: 'Obsoleta',
  stock: 'Producir para stock', contra_pedido: 'Contra pedido',
  ninguno: 'Ninguno', ean13: 'EAN-13', code128: 'Code 128', qr: 'QR',
}
const lbl = (v: string) => LABELS[v] || v

const TABS: TabDef[] = [
  { id: 'general', label: 'General', fields: [
    { k: 'nombre', label: 'Nombre comercial', t: 'text' },
    { k: 'sku', label: 'SKU único', t: 'text' },
    { k: 'categoria', label: 'Categoría', t: 'catalog', cat: 'categoria' },
    { k: 'subcategoria', label: 'Subcategoría', t: 'catalog', cat: 'subcategoria' },
    { k: 'tipo_producto', label: 'Tipo de producto', t: 'select', opts: TIPOS },
    { k: 'estado_ciclo', label: 'Ciclo de vida', t: 'select', opts: CICLO },
    { k: 'codigo_tipo', label: 'Tipo de código', t: 'select', opts: ['ninguno', 'ean13', 'code128', 'qr'] },
    { k: 'codigo_valor', label: 'Código (valor)', t: 'text' },
    { k: 'descripcion', label: 'Descripción comercial', t: 'textarea' },
    { k: 'activo', label: 'Activo comercial', t: 'toggle' },
    { k: 'visible_catalogo', label: 'Visible en catálogo', t: 'toggle' },
    { k: 'maneja_lote', label: 'Manejo de lote', t: 'toggle' },
    { k: 'maneja_vencimiento', label: 'Manejo de vencimiento', t: 'toggle' },
  ] },
  { id: 'venta', label: 'Venta', tipos: SELLABLE, fields: [
    { k: 'unidad_venta', label: 'Unidad de venta', t: 'select', opts: UNIDADES },
    { k: 'cantidad_por_unidad_venta', label: 'Cantidad por unidad de venta', t: 'number' },
    { k: 'unidad_inventario', label: 'Unidad de inventario', t: 'select', opts: UNIDADES },
    { k: 'precio', label: 'Precio neto (sin IVA)', t: 'number' },
    { k: 'pedido_minimo', label: 'Pedido mínimo', t: 'number' },
  ] },
  { id: 'prod', label: 'Producción', tipos: PRODUCIBLE, fields: [
    { k: 'receta_estado', label: 'Estado de receta', t: 'select', opts: RECETA_EST },
    { k: 'receta_version', label: 'Versión de receta', t: 'text' },
    { k: 'rendimiento_lote', label: 'Rendimiento por lote', t: 'number' },
    { k: 'rendimiento_unidad', label: 'Unidad del rendimiento', t: 'select', opts: UNIDADES },
    { k: 'tiempo_produccion_min', label: 'Tiempo por lote (min)', t: 'number' },
    { k: 'merma_esperada_pct', label: 'Merma esperada (%)', t: 'number' },
    { k: 'modalidad_produccion', label: 'Modalidad', t: 'select', opts: ['stock', 'contra_pedido'] },
    { k: 'area_responsable', label: 'Área responsable', t: 'catalog', cat: 'area' },
  ] },
  { id: 'inv', label: 'Inventario y calidad', fields: [
    { k: 'stock_min', label: 'Stock mínimo', t: 'number' },
    { k: 'stock_max', label: 'Stock máximo', t: 'number' },
    { k: 'punto_reposicion', label: 'Punto de reposición', t: 'number' },
    { k: 'ubicacion', label: 'Bodega / cámara / ubicación', t: 'catalog', cat: 'ubicacion' },
    { k: 'condicion_almacenamiento', label: 'Condición de almacenamiento', t: 'catalog', cat: 'condicion_almacenamiento' },
    { k: 'vida_util_dias', label: 'Vida útil (días)', t: 'number' },
    { k: 'dias_min_despacho', label: 'Días mín. para despacho', t: 'number' },
  ] },
  { id: 'pick', label: 'Picking', tipos: SELLABLE, fields: [
    { k: 'ubicacion_picking', label: 'Ubicación de picking', t: 'catalog', cat: 'ubicacion' },
    { k: 'tipo_embalaje', label: 'Tipo de embalaje', t: 'catalog', cat: 'tipo_embalaje' },
    { k: 'peso_aprox_kg', label: 'Peso aprox. (kg)', t: 'number' },
    { k: 'bultos_estimados', label: 'Bultos estimados', t: 'number' },
    { k: 'instrucciones_manipulacion', label: 'Instrucciones de manipulación', t: 'textarea' },
    { k: 'requiere_fechado', label: 'Requiere fechado', t: 'toggle' },
    { k: 'requiere_etiqueta', label: 'Requiere etiqueta', t: 'toggle' },
  ] },
  { id: 'costos', label: 'Costos', fields: [
    { k: 'costo_envase', label: 'Costo de envase', t: 'number' },
    { k: 'costo_mano_obra', label: 'Costo mano de obra', t: 'number' },
    { k: 'costo_receta', label: 'Costo desde receta', t: 'number' },
    { k: 'costo_total', label: 'Costo total', t: 'number' },
    { k: 'margen_bruto', label: 'Margen bruto', t: 'number' },
  ] },
  { id: 'prov', label: 'Proveedores', tipos: ['materia_prima', 'envase_insumo', 'reventa'], fields: [] },
]
const EDIT_KEYS: string[] = TABS.flatMap(t => t.fields.map(f => f.k))

function clp(n: number) { return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n || 0) }
function fechaHora(iso: string) { return new Date(iso).toLocaleString('es-CL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) }
function factorAuto(f: Row): number { const c = Number(f.cantidad_por_unidad_venta) || 1; return (f.unidad_venta && f.unidad_inventario && String(f.unidad_venta) !== String(f.unidad_inventario)) ? c : 1 }

function estados(f: Row) {
  const activo = !!f.activo
  const visible = activo && !!f.visible_catalogo
  const stock = Number(f.stock_actual) || 0
  const dispVenta = activo && (String(f.modalidad_produccion) === 'contra_pedido' || stock > 0)
  const producible = String(f.receta_estado) === 'aprobada' && Number(f.rendimiento_lote) > 0 && !!f.unidad_venta && !!f.modalidad_produccion
  return { activo, visible, dispVenta, producible }
}

function Pill({ kind, label }: { kind: 'ok' | 'no' | 'prov' | 'info'; label: string }) {
  const s: Record<string, { bg: string; c: string }> = { ok: { bg: '#EAF3DE', c: '#27500A' }, no: { bg: '#FCEBEB', c: '#A32D2D' }, prov: { bg: '#F1EFE8', c: '#5F5E5A' }, info: { bg: '#E6F1FB', c: '#0C447C' } }
  return <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: s[kind].bg, color: s[kind].c }}>{label}</span>
}

interface AuditRow { id: string; created_at: string; usuario_email: string | null; campo: string; valor_anterior: string | null; valor_nuevo: string | null }

export default function ProductosPage() {
  const [lista, setLista] = useState<Row[]>([])
  const [cats, setCats] = useState<Record<string, string[]>>({})
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sel, setSel] = useState<string | null>(null)
  const [form, setForm] = useState<Row>({})
  const [hist, setHist] = useState<AuditRow[]>([])
  const [showHist, setShowHist] = useState(false)
  const [tab, setTab] = useState('general')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState(false)
  const [nuevo, setNuevo] = useState<Row | null>(null)

  const cargarCats = useCallback(async () => {
    const { data } = await supabase.from('catalogos').select('tipo, valor').eq('activo', true).order('valor')
    const map: Record<string, string[]> = {}
    for (const r of (data as { tipo: string; valor: string }[] | null) || []) { (map[r.tipo] = map[r.tipo] || []).push(r.valor) }
    setCats(map)
  }, [])

  const cargarLista = useCallback(async () => {
    const { data } = await supabase.from('products').select('id, sku, nombre, tipo_producto, estado_ciclo, precio, activo, stock_actual, modalidad_produccion, visible_catalogo, receta_estado').order('categoria').order('nombre')
    setLista((data as Row[]) || [])
    setLoading(false)
  }, [])

  useEffect(() => { cargarCats(); cargarLista() }, [cargarCats, cargarLista])

  async function abrir(id: string) {
    setError(null); setOk(false); setTab('general'); setShowHist(false)
    const { data } = await supabase.from('products').select('*').eq('id', id).single()
    setForm((data as Row) || {}); setSel(id)
    const { data: h } = await supabase.from('product_audit_log').select('id, created_at, usuario_email, campo, valor_anterior, valor_nuevo').eq('product_id', id).order('created_at', { ascending: false }).limit(50)
    setHist((h as AuditRow[]) || [])
  }

  function set(k: string, v: Val) { setForm(p => ({ ...p, [k]: v })); setOk(false) }

  async function agregarCat(cat: string, k: string) {
    const v = (window.prompt('Nuevo valor para el catálogo:') || '').trim()
    if (!v) return
    const r = await fetch('/api/central/catalogos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tipo: cat, valor: v }) })
    if (r.ok) { await cargarCats(); set(k, v) } else { const d = await r.json(); setError(d.error || 'No se pudo agregar') }
  }

  async function guardar() {
    setSaving(true); setError(null); setOk(false)
    const fields: Record<string, Val> = {}
    for (const k of EDIT_KEYS) fields[k] = form[k] ?? null
    const r = await fetch('/api/central/productos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'update', id: sel, fields }) })
    const d = await r.json(); setSaving(false)
    if (!r.ok) { setError(d.error || 'No se pudo guardar'); return }
    setOk(true); if (sel) abrir(sel); cargarLista()
  }

  async function crear() {
    if (!nuevo) return
    if (!String(nuevo.nombre || '').trim() || !nuevo.precio) { setError('Nombre y precio son obligatorios'); return }
    setSaving(true); setError(null)
    const r = await fetch('/api/central/productos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'create', fields: nuevo }) })
    const d = await r.json(); setSaving(false)
    if (!r.ok) { setError(d.error || 'No se pudo crear'); return }
    setNuevo(null); await cargarLista(); if (d.id) abrir(d.id)
  }

  function campo(f: FD) {
    const v = form[f.k]
    if (f.t === 'toggle') return (
      <div key={f.k}><label className="text-xs text-gray-500">{f.label}</label>
        <div className="mt-2"><button onClick={() => set(f.k, !v)} className={`w-9 h-5 rounded-full relative transition-colors ${v ? 'bg-green-500' : 'bg-gray-300'}`}><span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${v ? 'left-4' : 'left-0.5'}`} /></button></div>
      </div>
    )
    if (f.t === 'catalog') return (
      <div key={f.k}><label className="text-xs text-gray-500">{f.label}</label>
        <select className="noma-input mt-1" value={String(v ?? '')} onChange={e => { if (e.target.value === '__nuevo__') { agregarCat(f.cat || '', f.k) } else set(f.k, e.target.value) }}>
          <option value="">—</option>
          {(cats[f.cat || ''] || []).map(o => <option key={o} value={o}>{o}</option>)}
          <option value="__nuevo__">+ Agregar nuevo…</option>
        </select>
      </div>
    )
    if (f.t === 'select') return (
      <div key={f.k}><label className="text-xs text-gray-500">{f.label}</label>
        <select className="noma-input mt-1" value={String(v ?? '')} onChange={e => set(f.k, e.target.value)}>
          <option value="">—</option>
          {(f.opts || []).map(o => <option key={o} value={o}>{lbl(o)}</option>)}
        </select>
      </div>
    )
    if (f.t === 'textarea') return <div key={f.k} className="sm:col-span-2 lg:col-span-3"><label className="text-xs text-gray-500">{f.label}</label><textarea rows={2} className="noma-input mt-1" value={String(v ?? '')} onChange={e => set(f.k, e.target.value)} /></div>
    return <div key={f.k}><label className="text-xs text-gray-500">{f.label}</label><input type={f.t === 'number' ? 'number' : 'text'} className="noma-input mt-1" value={String(v ?? '')} onChange={e => set(f.k, e.target.value)} /></div>
  }

  const tipoActual = String(form.tipo_producto || 'terminado_fabricado')
  const tabsVisibles = TABS.filter(t => !t.tipos || t.tipos.includes(tipoActual))
  const tabActual = tabsVisibles.find(t => t.id === tab) || tabsVisibles[0]
  const filtrados = lista.filter(p => !search || String(p.nombre || '').toLowerCase().includes(search.toLowerCase()) || String(p.sku || '').toLowerCase().includes(search.toLowerCase()))

  if (!sel) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div><h1 className="text-2xl font-bold text-[#1a1a1a]">Productos</h1><p className="text-sm text-gray-500 mt-0.5">Maestro de productos · {lista.length} productos</p></div>
          <div className="flex gap-2">
            <button onClick={() => { setLoading(true); cargarLista() }} className="flex items-center gap-2 text-sm text-gray-600 border border-gray-200 rounded-lg px-3 py-2 hover:border-[#c9a24e]"><RefreshCw size={15} /> Actualizar</button>
            <button onClick={() => setNuevo({ tipo_producto: 'terminado_fabricado' })} className="noma-btn-primary flex items-center gap-2 text-sm"><Plus size={16} /> Agregar producto</button>
          </div>
        </div>
        {error && <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700">{error}</div>}
        {nuevo && (
          <div className="noma-card !p-4">
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
              <input className="noma-input sm:col-span-2" placeholder="Nombre *" value={String(nuevo.nombre ?? '')} onChange={e => setNuevo({ ...nuevo, nombre: e.target.value })} />
              <input className="noma-input" placeholder="SKU" value={String(nuevo.sku ?? '')} onChange={e => setNuevo({ ...nuevo, sku: e.target.value })} />
              <select className="noma-input" value={String(nuevo.tipo_producto ?? 'terminado_fabricado')} onChange={e => setNuevo({ ...nuevo, tipo_producto: e.target.value })}>{TIPOS.map(t => <option key={t} value={t}>{lbl(t)}</option>)}</select>
              <input className="noma-input" type="number" placeholder="Precio neto *" value={String(nuevo.precio ?? '')} onChange={e => setNuevo({ ...nuevo, precio: e.target.value })} />
            </div>
            <div className="flex gap-2 mt-3">
              <button onClick={crear} disabled={saving} className="noma-btn-primary flex items-center gap-2 text-sm">{saving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />} Crear y abrir ficha</button>
              <button onClick={() => { setNuevo(null); setError(null) }} className="text-sm text-gray-500 px-3">Cancelar</button>
            </div>
          </div>
        )}
        <div className="noma-card !p-4"><div className="relative"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><input className="noma-input pl-9" placeholder="Buscar por nombre o SKU..." value={search} onChange={e => setSearch(e.target.value)} /></div></div>
        <div className="noma-card !p-0 overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-sm">
          <thead className="border-b border-gray-100 bg-gray-50/50"><tr>
            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase">SKU</th>
            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase">Producto</th>
            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase hidden md:table-cell">Tipo</th>
            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase hidden md:table-cell">Ciclo</th>
            <th className="text-right py-3 px-4 text-xs font-semibold text-gray-400 uppercase">Precio neto</th>
            <th className="text-center py-3 px-4 text-xs font-semibold text-gray-400 uppercase">Venta</th>
          </tr></thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? <tr><td colSpan={6} className="py-12 text-center"><Loader2 className="w-5 h-5 text-[#1b2a4a] animate-spin mx-auto" /></td></tr>
            : filtrados.map(p => { const st = estados(p); return (
              <tr key={String(p.id)} onClick={() => abrir(String(p.id))} className="hover:bg-gray-50 cursor-pointer">
                <td className="py-3 px-4"><span className="font-mono text-xs text-gray-500">{String(p.sku || '—')}</span></td>
                <td className="py-3 px-4 font-medium text-[#1a1a1a]">{String(p.nombre)}</td>
                <td className="py-3 px-4 text-gray-500 text-xs hidden md:table-cell">{lbl(String(p.tipo_producto))}</td>
                <td className="py-3 px-4 hidden md:table-cell"><Pill kind="info" label={lbl(String(p.estado_ciclo || 'borrador'))} /></td>
                <td className="py-3 px-4 text-right font-semibold">{clp(Number(p.precio))}</td>
                <td className="py-3 px-4 text-center"><Pill kind={st.dispVenta ? 'ok' : 'no'} label={st.dispVenta ? 'Disponible' : 'No disp.'} /></td>
              </tr>) })}
          </tbody>
        </table></div></div>
      </div>
    )
  }

  const st = estados(form)
  return (
    <div className="space-y-4">
      <button onClick={() => { setSel(null); cargarLista() }} className="flex items-center gap-1 text-sm text-gray-500 hover:text-[#1b2a4a]"><ArrowLeft size={15} /> Volver a productos</button>
      <div className="noma-card !p-0 overflow-hidden">
        <div className="flex gap-4 items-start p-4 border-b border-gray-100">
          <div className="w-14 h-14 rounded-lg bg-[#c9a24e]/15 flex items-center justify-center text-[#c9a24e] text-xl font-bold flex-shrink-0">{String(form.nombre || '?').charAt(0)}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap"><span className="font-semibold text-[#1b2a4a]">{String(form.nombre)}</span><span className="font-mono text-xs text-gray-500 bg-gray-50 px-2 py-0.5 rounded">{String(form.sku || '—')}</span><span className="text-xs text-gray-400">Marca NOMMA FOOD</span></div>
            <p className="text-[11px] text-gray-400 mt-1.5 mb-1">Estados calculados; picking y calidad son provisionales hasta el módulo Inventario por lotes</p>
            <div className="flex gap-1.5 flex-wrap">
              <Pill kind="info" label={`Ciclo: ${lbl(String(form.estado_ciclo || 'borrador'))}`} />
              <Pill kind={st.activo ? 'ok' : 'no'} label={st.activo ? 'Activo comercial' : 'Inactivo comercial'} />
              <Pill kind={st.visible ? 'ok' : 'no'} label={st.visible ? 'Visible en catálogo' : 'No visible'} />
              <Pill kind={st.dispVenta ? 'ok' : 'no'} label={st.dispVenta ? 'Disponible para venta' : 'No disponible venta'} />
              <Pill kind={st.producible ? 'ok' : 'no'} label={st.producible ? 'Producible' : 'No producible (sin receta aprobada)'} />
              <Pill kind="prov" label="Disponible picking: según lotes" />
              <Pill kind="prov" label="Calidad: según lotes" />
            </div>
          </div>
        </div>
        <div className="flex gap-1 px-3 pt-2 border-b border-gray-100 overflow-x-auto">
          {tabsVisibles.map(t => <button key={t.id} onClick={() => setTab(t.id)} className={`text-sm px-3 py-2 whitespace-nowrap border-b-2 ${tabActual?.id === t.id ? 'border-[#c9a24e] text-[#1b2a4a] font-medium' : 'border-transparent text-gray-500'}`}>{t.label}</button>)}
        </div>
        <div className="p-5">
          {error && <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700 mb-4">{error}</div>}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{(tabActual?.fields || []).map(f => campo(f))}</div>
          {tabActual?.id === 'venta' && (
            <div className="mt-4 space-y-2">
              <div className="px-3 py-2 bg-[#f5f0e8] rounded-lg text-sm text-[#1b2a4a]">Factor de conversión (automático): <strong>1 {String(form.unidad_venta || 'unidad venta')} = {factorAuto(form)} {String(form.unidad_inventario || 'unidad inv.')}</strong></div>
              <div className="px-3 py-2 bg-[#eef1f6] rounded-lg text-sm text-[#1b2a4a]">Precio con IVA (19%): <strong>{clp(Math.round(Number(form.precio || 0) * 1.19))}</strong></div>
            </div>
          )}
          {tabActual?.id === 'prod' && (
            <div className="mt-4 flex items-center gap-3">
              <button disabled className="flex items-center gap-2 text-sm text-gray-400 border border-gray-200 rounded-lg px-3 py-2 cursor-not-allowed"><FileText size={15} /> Ver receta</button>
              <span className="text-xs text-gray-400">Se habilita al construir el módulo Recetas. El estado producible requiere receta aprobada.</span>
            </div>
          )}
          {tabActual?.id === 'inv' && <div className="mt-4 text-xs text-gray-500 bg-[#f5f0e8] rounded-lg px-3 py-2">El estado de calidad real (disponible / retenido / bloqueado) vendrá de los lotes del módulo Inventario. Aquí se definen las políticas.</div>}
          {tabActual?.id === 'prov' && sel && <ProveedoresProducto productId={sel} />}
        </div>
        <div className="border-t border-gray-100">
          <button onClick={() => setShowHist(s => !s)} className="w-full flex items-center gap-2 px-5 py-3 text-sm text-gray-600 hover:bg-gray-50">{showHist ? <ChevronDown size={15} /> : <ChevronRight size={15} />} Historial de cambios ({hist.length})</button>
          {showHist && (
            <div className="px-5 pb-4 overflow-x-auto">
              {hist.length === 0 ? <p className="text-sm text-gray-400">Sin cambios registrados.</p> : (
                <table className="w-full text-xs"><thead><tr className="text-gray-400 text-left"><th className="py-1 pr-3 font-normal">Fecha</th><th className="py-1 pr-3 font-normal">Usuario</th><th className="py-1 pr-3 font-normal">Campo</th><th className="py-1 pr-3 font-normal">Antes</th><th className="py-1 font-normal">Después</th></tr></thead>
                <tbody>{hist.map(h => <tr key={h.id} className="border-t border-gray-50"><td className="py-1.5 pr-3 whitespace-nowrap">{fechaHora(h.created_at)}</td><td className="py-1.5 pr-3 text-gray-500">{h.usuario_email || '—'}</td><td className="py-1.5 pr-3">{h.campo}</td><td className="py-1.5 pr-3 text-gray-400">{h.valor_anterior ?? '—'}</td><td className="py-1.5 text-[#1b2a4a]">{h.valor_nuevo ?? '—'}</td></tr>)}</tbody></table>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-gray-100">
          {ok && <span className="text-sm text-green-600 flex items-center gap-1 mr-auto"><Check size={15} /> Guardado</span>}
          <button onClick={() => { setSel(null); cargarLista() }} className="text-sm text-gray-500 px-3">Cancelar</button>
          <button onClick={guardar} disabled={saving} className="noma-btn-primary flex items-center gap-2 text-sm">{saving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />} Guardar cambios</button>
        </div>
      </div>
    </div>
  )
}
