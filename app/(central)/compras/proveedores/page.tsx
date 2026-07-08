'use client'

import { useCallback, useEffect, useState } from 'react'
import { Search, Loader2, Plus, ArrowLeft, Check, RefreshCw, Trash2, Star } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'

type Row = Record<string, unknown>
const S = (v: unknown) => v === null || v === undefined ? '' : String(v)
const clp = (n: unknown) => { const x = Number(n); return Number.isNaN(x) || !n ? '—' : new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(x) }

const ESTADOS = ['activo', 'pausado', 'bloqueado', 'archivado']
const ESTADO_CLR: Record<string, string> = { activo: 'bg-green-100 text-green-700', pausado: 'bg-amber-100 text-amber-700', bloqueado: 'bg-red-100 text-red-700', archivado: 'bg-gray-100 text-gray-500' }
const CONFIANZA = ['recomendado', 'normal', 'observacion', 'bloqueado']
const TABS = [
  { id: 'gen', label: 'General' },
  { id: 'cond', label: 'Condiciones' },
  { id: 'prod', label: 'Productos que provee' },
  { id: 'eval', label: 'Evaluación' },
  { id: 'hist', label: 'Historial de compras' },
]

export default function ProveedoresPage() {
  const [provs, setProvs] = useState<Row[]>([])
  const [vinculos, setVinculos] = useState<Row[]>([])
  const [productos, setProductos] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sel, setSel] = useState<Row | null>(null)
  const [tab, setTab] = useState('gen')
  const [nuevo, setNuevo] = useState<Row | null>(null)
  const [vinc, setVinc] = useState<Row | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const cargar = useCallback(async () => {
    const { data: p } = await supabase.from('proveedores').select('*').order('nombre')
    setProvs((p as Row[]) || [])
    const { data: v } = await supabase.from('proveedor_productos').select('id, proveedor_id, product_id, codigo_proveedor, unidad_compra, equivalencia_inventario, precio_referencial, ultimo_precio, fecha_ultimo_precio, cantidad_minima, plazo_entrega_dias, es_principal, es_alternativo, activo, producto:products(nombre)')
    setVinculos((v as Row[]) || [])
    const { data: pr } = await supabase.from('products').select('id, nombre, tipo_producto').in('tipo_producto', ['materia_prima', 'envase_insumo', 'reventa']).order('nombre')
    setProductos((pr as Row[]) || [])
    setLoading(false)
  }, [])

  useEffect(() => { cargar() }, [cargar])

  async function api(payload: Row): Promise<Row | null> {
    setError(null)
    const r = await fetch('/api/central/proveedores', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    const d = await r.json() as Row
    if (!r.ok) { setError(S(d.error) || 'Error'); return null }
    return d
  }

  async function crear() {
    if (!nuevo?.nombre) { setError('Nombre obligatorio'); return }
    setSaving(true)
    const d = await api({ action: 'crear_proveedor', ...nuevo })
    setSaving(false)
    if (d) { setNuevo(null); cargar() }
  }
  async function guardarProv() {
    if (!sel) return
    setSaving(true)
    const campos = ['nombre', 'razon_social', 'nombre_comercial', 'rut', 'giro', 'direccion', 'direccion_tributaria', 'comuna', 'ciudad', 'contacto', 'contacto_comercial', 'contacto_despacho', 'contacto_cobranza', 'telefono', 'whatsapp', 'email', 'email_pedidos', 'email_facturacion', 'sitio_web', 'estado', 'observaciones', 'forma_pago', 'plazo_pago', 'pedido_minimo', 'dias_despacho', 'horario_atencion', 'tiempo_entrega_dias', 'despacha_a_planta', 'requiere_retiro_chofer', 'emite_factura', 'permite_sin_factura', 'condiciones_especiales', 'eval_puntualidad', 'eval_calidad', 'eval_precio', 'eval_cumplimiento', 'incidencias', 'devoluciones', 'nivel_confianza', 'comentarios_evaluacion']
    const payload: Row = { action: 'actualizar_proveedor', id: sel.id }
    for (const k of campos) payload[k] = sel[k]
    const ok = await api(payload)
    setSaving(false)
    if (ok) { setError(null); cargar() }
  }
  async function vincularProd() {
    if (!sel || !vinc?.product_id) { setError('Elige un producto'); return }
    setSaving(true)
    const ok = await api({ action: 'vincular', proveedor_id: sel.id, ...vinc })
    setSaving(false)
    if (ok) { setVinc(null); cargar() }
  }
  async function quitarVinculo(id: unknown) {
    if (!confirm('¿Quitar este producto del proveedor?')) return
    const ok = await api({ action: 'eliminar_vinculo', id })
    if (ok) cargar()
  }

  const countProds = (id: unknown) => vinculos.filter(v => S(v.proveedor_id) === S(id)).length
  const filtrados = provs.filter(p => !search || [p.nombre, p.razon_social, p.contacto, p.rut].some(x => S(x).toLowerCase().includes(search.toLowerCase())))

  // ── helpers de campos (funciones, NO componentes: evita perder foco al tipear) ──
  const setF = (k: string, v: unknown) => setSel(s => s ? { ...s, [k]: v } : s)
  const fTxt = (k: string, label: string, full?: boolean) => (
    <div key={k} className={full ? 'sm:col-span-2 lg:col-span-3' : ''}>
      <label className="text-xs text-gray-500">{label}</label>
      <input className="noma-input mt-1" value={S(sel?.[k])} onChange={e => setF(k, e.target.value)} />
    </div>
  )
  const fNum = (k: string, label: string) => (
    <div key={k}><label className="text-xs text-gray-500">{label}</label><input type="number" className="noma-input mt-1" value={S(sel?.[k])} onChange={e => setF(k, e.target.value)} /></div>
  )
  const fTog = (k: string, label: string) => (
    <button key={k} type="button" onClick={() => setF(k, !sel?.[k])} className="flex items-center gap-2 text-sm text-gray-600">
      <span className={`w-9 h-5 rounded-full relative transition-colors ${sel?.[k] ? 'bg-green-500' : 'bg-gray-300'}`}><span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${sel?.[k] ? 'left-4' : 'left-0.5'}`} /></span>
      {label}
    </button>
  )

  if (sel) {
    const misProd = vinculos.filter(v => S(v.proveedor_id) === S(sel.id))
    const estado = S(sel.estado) || 'activo'
    return (
      <div className="space-y-4">
        <button onClick={() => { setSel(null); setTab('gen'); cargar() }} className="flex items-center gap-1 text-sm text-gray-500 hover:text-[#1b2a4a]"><ArrowLeft size={15} /> Volver a proveedores</button>
        {error && <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700">{error}</div>}

        <div className="noma-card !p-0 overflow-hidden">
          <div className="flex items-center gap-3 p-4 border-b border-gray-100">
            <div className="w-11 h-11 rounded-lg bg-[#f5efdf] flex items-center justify-center text-[#c9a24e] font-bold">{S(sel.nombre).slice(0, 2).toUpperCase()}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap"><span className="font-bold text-[#1b2a4a]">{S(sel.nombre)}</span><span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${ESTADO_CLR[estado]}`}>{estado}</span><span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">Confianza: {S(sel.nivel_confianza) || 'normal'}</span></div>
              <div className="text-xs text-gray-500 mt-0.5">{S(sel.giro) || 'Sin giro'} · provee {misProd.length} productos</div>
            </div>
            <button onClick={guardarProv} disabled={saving} className="noma-btn-primary text-sm flex items-center gap-2">{saving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />} Guardar</button>
          </div>
          <div className="flex gap-1 px-3 overflow-x-auto border-b border-gray-100">
            {TABS.map(t => <button key={t.id} onClick={() => setTab(t.id)} className={`px-3 py-2.5 text-sm whitespace-nowrap border-b-2 ${tab === t.id ? 'border-[#c9a24e] text-[#1b2a4a] font-medium' : 'border-transparent text-gray-500'}`}>{t.label}</button>)}
          </div>

          <div className="p-4">
            {tab === 'gen' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {fTxt('nombre', 'Nombre (etiqueta)')}
                {fTxt('razon_social', 'Razón social')}
                {fTxt('nombre_comercial', 'Nombre comercial')}
                {fTxt('rut', 'RUT')}
                {fTxt('giro', 'Giro')}
                {fTxt('sitio_web', 'Sitio web / catálogo')}
                {fTxt('direccion_tributaria', 'Dirección tributaria')}
                {fTxt('comuna', 'Comuna')}
                {fTxt('ciudad', 'Ciudad')}
                {fTxt('contacto_comercial', 'Contacto comercial')}
                {fTxt('contacto_despacho', 'Contacto despacho')}
                {fTxt('contacto_cobranza', 'Contacto cobranza')}
                {fTxt('telefono', 'Teléfono')}
                {fTxt('whatsapp', 'WhatsApp (para pedidos)')}
                <div><label className="text-xs text-gray-500">Estado</label><select className="noma-input mt-1" value={estado} onChange={e => setF('estado', e.target.value)}>{ESTADOS.map(x => <option key={x} value={x}>{x}</option>)}</select></div>
                {fTxt('email_pedidos', 'Email pedidos')}
                {fTxt('email_facturacion', 'Email facturación')}
                {fTxt('observaciones', 'Observaciones internas', true)}
              </div>
            )}
            {tab === 'cond' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div><label className="text-xs text-gray-500">Forma de pago</label><select className="noma-input mt-1" value={S(sel.forma_pago)} onChange={e => setF('forma_pago', e.target.value)}><option value="">—</option><option>Contado</option><option>Transferencia</option><option>Crédito</option><option>Contra entrega</option></select></div>
                  <div><label className="text-xs text-gray-500">Plazo de pago</label><select className="noma-input mt-1" value={S(sel.plazo_pago)} onChange={e => setF('plazo_pago', e.target.value)}><option value="">—</option><option>Inmediato</option><option>7 días</option><option>15 días</option><option>30 días</option><option>Otro</option></select></div>
                  {fNum('pedido_minimo', 'Pedido mínimo ($)')}
                  {fTxt('dias_despacho', 'Días de despacho')}
                  {fTxt('horario_atencion', 'Horario de atención')}
                  {fNum('tiempo_entrega_dias', 'Tiempo entrega (días)')}
                </div>
                <div className="flex flex-wrap gap-x-8 gap-y-3 pt-2">
                  {fTog('despacha_a_planta', 'Despacha a planta')}
                  {fTog('requiere_retiro_chofer', 'Requiere retiro por chofer')}
                  {fTog('emite_factura', 'Emite factura')}
                  {fTog('permite_sin_factura', 'Permite compra sin factura')}
                </div>
                <div><label className="text-xs text-gray-500">Condiciones especiales</label><textarea className="noma-input mt-1" rows={2} value={S(sel.condiciones_especiales)} onChange={e => setF('condiciones_especiales', e.target.value)} /></div>
              </div>
            )}
            {tab === 'prod' && (
              <div className="space-y-3">
                <div className="overflow-x-auto"><table className="w-full text-sm">
                  <thead className="bg-gray-50/50 text-gray-400 text-xs text-left"><tr><th className="py-2 px-3 font-medium">Producto</th><th className="py-2 px-3 font-medium">Código</th><th className="py-2 px-3 font-medium">U. compra</th><th className="py-2 px-3 font-medium">Equiv. inv.</th><th className="py-2 px-3 font-medium text-right">Precio ref.</th><th className="py-2 px-3 font-medium">Rol</th><th className="py-2 px-3"></th></tr></thead>
                  <tbody className="divide-y divide-gray-50">
                    {misProd.length === 0 ? <tr><td colSpan={7} className="py-6 text-center text-gray-400 text-xs">Aún no provee productos.</td></tr> : misProd.map(v => (
                      <tr key={S(v.id)}>
                        <td className="py-2 px-3 font-medium text-[#1a1a1a]">{S((v.producto as Row)?.nombre)}</td>
                        <td className="py-2 px-3 text-gray-500 font-mono text-xs">{S(v.codigo_proveedor) || '—'}</td>
                        <td className="py-2 px-3 text-gray-500">{S(v.unidad_compra) || '—'}</td>
                        <td className="py-2 px-3 text-gray-500">{S(v.equivalencia_inventario) || '—'}</td>
                        <td className="py-2 px-3 text-right">{clp(v.precio_referencial)}</td>
                        <td className="py-2 px-3">{v.es_principal ? <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 inline-flex items-center gap-1"><Star size={9} />Principal</span> : v.es_alternativo ? <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-100 text-green-700">Alternativo</span> : '—'}</td>
                        <td className="py-2 px-3 text-right"><button onClick={() => quitarVinculo(v.id)} className="text-gray-300 hover:text-red-500"><Trash2 size={14} /></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table></div>
                {vinc ? (
                  <div className="border border-gray-200 rounded-lg p-3 space-y-3 bg-gray-50/40">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="sm:col-span-3"><label className="text-xs text-gray-500">Producto del Maestro</label><select className="noma-input mt-1" value={S(vinc.product_id)} onChange={e => setVinc({ ...vinc, product_id: e.target.value })}><option value="">Selecciona…</option>{productos.map(p => <option key={S(p.id)} value={S(p.id)}>{S(p.nombre)}</option>)}</select></div>
                      <input className="noma-input" placeholder="Código proveedor" value={S(vinc.codigo_proveedor)} onChange={e => setVinc({ ...vinc, codigo_proveedor: e.target.value })} />
                      <input className="noma-input" placeholder="Unidad de compra" value={S(vinc.unidad_compra)} onChange={e => setVinc({ ...vinc, unidad_compra: e.target.value })} />
                      <input className="noma-input" placeholder="Equivalencia inventario" value={S(vinc.equivalencia_inventario)} onChange={e => setVinc({ ...vinc, equivalencia_inventario: e.target.value })} />
                      <input type="number" className="noma-input" placeholder="Precio referencial" value={S(vinc.precio_referencial)} onChange={e => setVinc({ ...vinc, precio_referencial: e.target.value })} />
                      <input type="number" className="noma-input" placeholder="Cantidad mínima" value={S(vinc.cantidad_minima)} onChange={e => setVinc({ ...vinc, cantidad_minima: e.target.value })} />
                      <input type="number" className="noma-input" placeholder="Días entrega" value={S(vinc.plazo_entrega_dias)} onChange={e => setVinc({ ...vinc, plazo_entrega_dias: e.target.value })} />
                    </div>
                    <div className="flex flex-wrap items-center gap-4">
                      <label className="flex items-center gap-2 text-sm text-gray-600"><input type="checkbox" checked={Boolean(vinc.es_principal)} onChange={e => setVinc({ ...vinc, es_principal: e.target.checked })} /> Principal</label>
                      <label className="flex items-center gap-2 text-sm text-gray-600"><input type="checkbox" checked={Boolean(vinc.es_alternativo)} onChange={e => setVinc({ ...vinc, es_alternativo: e.target.checked })} /> Alternativo</label>
                      <div className="flex-1" />
                      <button onClick={vincularProd} disabled={saving} className="noma-btn-primary text-sm flex items-center gap-2">{saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Vincular</button>
                      <button onClick={() => setVinc(null)} className="text-sm text-gray-500 px-2">Cancelar</button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => setVinc({})} className="flex items-center gap-1 text-sm text-[#c9a24e] font-medium"><Plus size={15} /> Vincular producto del Maestro</button>
                )}
                <p className="text-xs text-gray-400">Bidireccional: también aparece desde la ficha del producto. La equivalencia evita errores caja↔unidad.</p>
              </div>
            )}
            {tab === 'eval' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  {fNum('eval_puntualidad', 'Puntualidad (0-5)')}
                  {fNum('eval_calidad', 'Calidad (0-5)')}
                  {fNum('eval_precio', 'Precio (0-5)')}
                  {fNum('eval_cumplimiento', 'Cumplimiento (%)')}
                  {fNum('incidencias', 'Incidencias')}
                  {fNum('devoluciones', 'Devoluciones')}
                </div>
                <div className="max-w-xs"><label className="text-xs text-gray-500">Nivel de confianza</label><select className="noma-input mt-1" value={S(sel.nivel_confianza) || 'normal'} onChange={e => setF('nivel_confianza', e.target.value)}>{CONFIANZA.map(x => <option key={x} value={x}>{x}</option>)}</select></div>
                <div><label className="text-xs text-gray-500">Comentarios internos</label><textarea className="noma-input mt-1" rows={2} value={S(sel.comentarios_evaluacion)} onChange={e => setF('comentarios_evaluacion', e.target.value)} /></div>
                <p className="text-xs text-gray-400">Hoy manual. Con Recepción (P-C) se calcula solo: puntualidad, diferencias e incidencias.</p>
              </div>
            )}
            {tab === 'hist' && (
              <div className="py-10 text-center text-gray-400 text-sm">
                <p>El historial de compras y la variación de precios se activan con <strong>Recepción de mercadería (P-C)</strong>.</p>
                <p className="text-xs mt-1">Aquí verás compras, montos, estado y pendientes de recepción.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-2xl font-bold text-[#1a1a1a]">Proveedores</h1><p className="text-sm text-gray-500 mt-0.5">{provs.length} proveedores</p></div>
        <div className="flex gap-2">
          <button onClick={() => { setLoading(true); cargar() }} className="flex items-center gap-2 text-sm text-gray-600 border border-gray-200 rounded-lg px-3 py-2 hover:border-[#c9a24e]"><RefreshCw size={15} /> Actualizar</button>
          <button onClick={() => setNuevo({})} className="noma-btn-primary flex items-center gap-2 text-sm"><Plus size={16} /> Nuevo proveedor</button>
        </div>
      </div>
      {error && <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700">{error}</div>}
      {nuevo && (
        <div className="noma-card !p-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <input className="noma-input" placeholder="Nombre *" value={S(nuevo.nombre)} onChange={e => setNuevo({ ...nuevo, nombre: e.target.value })} />
            <input className="noma-input" placeholder="RUT" value={S(nuevo.rut)} onChange={e => setNuevo({ ...nuevo, rut: e.target.value })} />
            <input className="noma-input" placeholder="Contacto comercial" value={S(nuevo.contacto_comercial)} onChange={e => setNuevo({ ...nuevo, contacto_comercial: e.target.value })} />
            <input className="noma-input" placeholder="WhatsApp" value={S(nuevo.whatsapp)} onChange={e => setNuevo({ ...nuevo, whatsapp: e.target.value })} />
          </div>
          <div className="flex gap-2 mt-3"><button onClick={crear} disabled={saving} className="noma-btn-primary text-sm flex items-center gap-2">{saving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />} Crear</button><button onClick={() => { setNuevo(null); setError(null) }} className="text-sm text-gray-500 px-3">Cancelar</button></div>
        </div>
      )}
      <div className="noma-card !p-4"><div className="relative"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><input className="noma-input pl-9" placeholder="Buscar por nombre, razón social, contacto o RUT..." value={search} onChange={e => setSearch(e.target.value)} /></div></div>
      <div className="noma-card !p-0 overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-sm">
        <thead className="border-b border-gray-100 bg-gray-50/50"><tr>
          <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase">Proveedor</th><th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase hidden md:table-cell">Contacto</th><th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase hidden lg:table-cell">Confianza</th><th className="text-right py-3 px-4 text-xs font-semibold text-gray-400 uppercase">Productos</th><th className="text-center py-3 px-4 text-xs font-semibold text-gray-400 uppercase">Estado</th>
        </tr></thead>
        <tbody className="divide-y divide-gray-50">
          {loading ? <tr><td colSpan={5} className="py-12 text-center"><Loader2 className="w-5 h-5 text-[#1b2a4a] animate-spin mx-auto" /></td></tr>
          : filtrados.length === 0 ? <tr><td colSpan={5} className="py-12 text-center text-gray-400 text-sm">Sin proveedores. Crea el primero.</td></tr>
          : filtrados.map(p => { const est = S(p.estado) || 'activo'; return (
            <tr key={S(p.id)} onClick={() => { setSel(p); setTab('gen') }} className="hover:bg-gray-50 cursor-pointer">
              <td className="py-3 px-4 font-medium text-[#1a1a1a]">{S(p.nombre)}<div className="text-xs text-gray-400 font-normal">{S(p.rut) || S(p.giro)}</div></td>
              <td className="py-3 px-4 text-gray-500 text-xs hidden md:table-cell">{S(p.contacto_comercial) || S(p.contacto) || '—'}</td>
              <td className="py-3 px-4 text-gray-500 text-xs hidden lg:table-cell">{S(p.nivel_confianza) || 'normal'}</td>
              <td className="py-3 px-4 text-right">{countProds(p.id)}</td>
              <td className="py-3 px-4 text-center"><span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${ESTADO_CLR[est]}`}>{est}</span></td>
            </tr>
          )})}
        </tbody>
      </table></div></div>
    </div>
  )
}
