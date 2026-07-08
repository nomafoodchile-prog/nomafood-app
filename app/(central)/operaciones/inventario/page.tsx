'use client'

import { useCallback, useEffect, useState } from 'react'
import { Search, Loader2, Plus, ArrowLeft, Check, RefreshCw, PackagePlus } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'

type Row = Record<string, unknown>
const S = (v: unknown) => v === null || v === undefined ? '' : String(v)
const N = (v: unknown) => { const n = Number(v); return Number.isNaN(n) ? 0 : n }
const clp = (n: number) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(Math.round(n || 0))
const fecha = (v: unknown) => v ? new Date(S(v)).toLocaleDateString('es-CL') : '—'

const MOVS: [string, string][] = [
  ['entrada_compra', 'Entrada por compra'], ['entrada_produccion', 'Entrada por producción'], ['salida_consumo', 'Salida por consumo'], ['salida_venta', 'Salida por venta/despacho'],
  ['reserva', 'Reserva por pedido'], ['liberacion_reserva', 'Liberación de reserva'], ['merma', 'Merma'], ['ajuste_positivo', 'Ajuste positivo'], ['ajuste_negativo', 'Ajuste negativo'],
  ['traspaso', 'Traspaso'], ['retencion', 'Retención calidad'], ['liberacion_calidad', 'Liberación calidad'], ['bloqueo', 'Bloqueo'], ['desbloqueo', 'Desbloqueo'],
]
const MOV_LBL: Record<string, string> = Object.fromEntries(MOVS)
const EST_C: Record<string, string> = { disponible: 'bg-green-100 text-green-700', retenido: 'bg-amber-100 text-amber-700', bloqueado: 'bg-red-100 text-red-700', vencido: 'bg-red-100 text-red-700', agotado: 'bg-gray-100 text-gray-400' }
const UNIDADES = ['unidad', 'kilo', 'litro', 'gramo', 'bandeja', 'caja', 'pack']

function neto(l: Row) { return N(l.stock_disponible) - N(l.stock_reservado) - N(l.stock_retenido) - N(l.stock_bloqueado) }

export default function InventarioPage() {
  const [lotes, setLotes] = useState<Row[]>([])
  const [products, setProducts] = useState<Row[]>([])
  const [bodegas, setBodegas] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [fEstado, setFEstado] = useState('todos')
  const [sel, setSel] = useState<Row | null>(null)
  const [movs, setMovs] = useState<Row[]>([])
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [nuevoLote, setNuevoLote] = useState<Row | null>(null)
  const [mov, setMov] = useState<Row>({ tipo_movimiento: 'entrada_compra' })

  const prodById = (id: unknown) => products.find(p => S(p.id) === S(id))

  const cargar = useCallback(async () => {
    const { data } = await supabase.from('inventario_lotes').select('*, producto:products(nombre, tipo_producto, precio, stock_min), bodega:bodegas(nombre)').order('created_at', { ascending: false })
    setLotes((data as Row[]) || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    cargar()
    supabase.from('products').select('id, nombre, tipo_producto, precio, unidad_inventario').order('nombre').then(({ data }) => setProducts((data as Row[]) || []))
    supabase.from('bodegas').select('id, nombre').eq('activo', true).order('nombre').then(({ data }) => setBodegas((data as Row[]) || []))
  }, [cargar])

  async function abrir(l: Row) {
    setSel(l); setError(null); setOk(null); setMov({ tipo_movimiento: 'entrada_compra' })
    const { data } = await supabase.from('inventario_movimientos').select('*').eq('lote_id', S(l.id)).order('created_at', { ascending: false }).limit(50)
    setMovs((data as Row[]) || [])
  }

  async function api(payload: Row): Promise<Row | null> {
    setError(null); setOk(null)
    const r = await fetch('/api/central/inventario', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    const d = await r.json() as Row
    if (!r.ok) { setError(S(d.error) || 'Error'); return null }
    return d
  }

  async function crearLote() {
    if (!nuevoLote?.product_id) { setError('Elige un producto'); return }
    setSaving(true)
    const d = await api({ action: 'crear_lote', ...nuevoLote })
    setSaving(false)
    if (d) { setNuevoLote(null); setOk('Lote creado'); cargar() }
  }

  async function registrarMov() {
    if (!sel) return
    setSaving(true)
    const d = await api({ action: 'movimiento', lote_id: sel.id, ...mov })
    setSaving(false)
    if (d) { setOk('Movimiento registrado'); setMov({ tipo_movimiento: 'entrada_compra' }); abrir({ ...sel }); const { data } = await supabase.from('inventario_lotes').select('*, producto:products(nombre, tipo_producto, precio, stock_min), bodega:bodegas(nombre)').eq('id', S(sel.id)).single(); setSel(data as Row); cargar() }
  }

  const filtrados = lotes.filter(l => {
    const p = l.producto as Row | null
    const ms = !search || S(p?.nombre).toLowerCase().includes(search.toLowerCase()) || S(l.lote_codigo).toLowerCase().includes(search.toLowerCase())
    const me = fEstado === 'todos' || S(l.estado) === fEstado
    return ms && me
  })

  const valorInv = lotes.reduce((s, l) => s + N(l.stock_disponible) * N((l.producto as Row)?.precio), 0)
  const bajos = lotes.filter(l => { const p = l.producto as Row | null; return p?.stock_min !== null && neto(l) < N(p?.stock_min) && neto(l) >= 0 }).length
  const hoy = new Date(); const en7 = new Date(hoy.getTime() + 7 * 86400000)
  const porVencer = lotes.filter(l => l.fecha_vencimiento && new Date(S(l.fecha_vencimiento)) <= en7 && S(l.estado) !== 'agotado').length
  const bloqueados = lotes.filter(l => S(l.estado) === 'bloqueado').length

  // ── Detalle de lote ──────────────────────────────────────────
  if (sel) {
    const p = sel.producto as Row | null
    return (
      <div className="space-y-4">
        <button onClick={() => { setSel(null); cargar() }} className="flex items-center gap-1 text-sm text-gray-500 hover:text-[#1b2a4a]"><ArrowLeft size={15} /> Volver a inventario</button>
        {error && <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700">{error}</div>}
        {ok && <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-sm text-green-700">{ok}</div>}
        <div className="noma-card">
          <div className="flex items-center gap-2 flex-wrap mb-3">
            <span className="font-semibold text-[#1b2a4a]">{S(p?.nombre)}</span>
            <span className="font-mono text-xs text-gray-500 bg-gray-50 px-2 py-0.5 rounded">{S(sel.lote_codigo) || 's/lote'}</span>
            <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${EST_C[S(sel.estado)] || 'bg-gray-100 text-gray-600'}`}>{S(sel.estado)}</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-gray-50 rounded-lg p-3"><div className="text-[11px] text-gray-500">Disponible</div><div className="font-semibold">{N(sel.stock_disponible)} {S(sel.unidad)}</div></div>
            <div className="bg-gray-50 rounded-lg p-3"><div className="text-[11px] text-gray-500">Reservado</div><div className="font-semibold">{N(sel.stock_reservado)}</div></div>
            <div className="bg-gray-50 rounded-lg p-3"><div className="text-[11px] text-gray-500">Retenido / Bloqueado</div><div className="font-semibold">{N(sel.stock_retenido)} / {N(sel.stock_bloqueado)}</div></div>
            <div className="bg-gray-50 rounded-lg p-3"><div className="text-[11px] text-gray-500">Neto disponible</div><div className="font-semibold text-green-700">{neto(sel)}</div></div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3 text-xs text-gray-500">
            <div>Bodega: <span className="text-gray-800">{S((sel.bodega as Row)?.nombre) || '—'}</span></div>
            <div>Elaboración: <span className="text-gray-800">{fecha(sel.fecha_elaboracion)}</span></div>
            <div>Vence: <span className="text-gray-800">{fecha(sel.fecha_vencimiento)}</span></div>
            <div>Unidad: <span className="text-gray-800">{S(sel.unidad) || '—'}</span></div>
          </div>
        </div>

        <div className="noma-card">
          <h3 className="text-sm font-semibold text-[#1b2a4a] mb-3 flex items-center gap-2"><PackagePlus size={16} /> Registrar movimiento</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div><label className="text-xs text-gray-500">Tipo</label><select className="noma-input mt-1" value={S(mov.tipo_movimiento)} onChange={e => setMov({ ...mov, tipo_movimiento: e.target.value })}>{MOVS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
            <div><label className="text-xs text-gray-500">Cantidad</label><input type="number" className="noma-input mt-1" value={S(mov.cantidad)} onChange={e => setMov({ ...mov, cantidad: e.target.value })} /></div>
            <div><label className="text-xs text-gray-500">Motivo *</label><input className="noma-input mt-1" value={S(mov.motivo)} onChange={e => setMov({ ...mov, motivo: e.target.value })} placeholder="Obligatorio" /></div>
            {S(mov.tipo_movimiento) === 'traspaso' && <div><label className="text-xs text-gray-500">Bodega destino</label><select className="noma-input mt-1" value={S(mov.bodega_destino_id)} onChange={e => setMov({ ...mov, bodega_destino_id: e.target.value })}><option value="">—</option>{bodegas.map(b => <option key={S(b.id)} value={S(b.id)}>{S(b.nombre)}</option>)}</select></div>}
            <div className="sm:col-span-2 lg:col-span-3"><input className="noma-input" value={S(mov.observacion)} onChange={e => setMov({ ...mov, observacion: e.target.value })} placeholder="Observación (opcional)" /></div>
          </div>
          <button onClick={registrarMov} disabled={saving} className="noma-btn-primary text-sm mt-3 flex items-center gap-2">{saving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />} Registrar</button>
          <p className="text-[11px] text-gray-400 mt-2">Motivo obligatorio · sin stock negativo salvo SuperAdmin · no se saca de lotes vencidos/bloqueados/retenidos sin permiso.</p>
        </div>

        <div className="noma-card !p-0 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 text-sm font-semibold text-[#1b2a4a]">Historial de movimientos</div>
          <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-gray-50/50"><tr className="text-gray-400 text-xs text-left"><th className="py-2 px-4 font-medium">Fecha</th><th className="py-2 px-4 font-medium">Tipo</th><th className="py-2 px-4 font-medium text-right">Cant.</th><th className="py-2 px-4 font-medium">Motivo</th><th className="py-2 px-4 font-medium">Usuario</th></tr></thead>
          <tbody className="divide-y divide-gray-50">{movs.length === 0 ? <tr><td colSpan={5} className="py-6 text-center text-gray-400 text-xs">Sin movimientos.</td></tr> : movs.map(m => (
            <tr key={S(m.id)}><td className="py-2 px-4 whitespace-nowrap text-xs">{new Date(S(m.created_at)).toLocaleString('es-CL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</td><td className="py-2 px-4">{MOV_LBL[S(m.tipo_movimiento)] || S(m.tipo_movimiento)}</td><td className="py-2 px-4 text-right">{N(m.cantidad)}</td><td className="py-2 px-4 text-gray-500">{S(m.motivo)}</td><td className="py-2 px-4 text-gray-500 text-xs">{S(m.usuario_email) || '—'}</td></tr>
          ))}</tbody></table></div>
        </div>
      </div>
    )
  }

  // ── Lista ─────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-2xl font-bold text-[#1a1a1a]">Inventario por lotes</h1><p className="text-sm text-gray-500 mt-0.5">{lotes.length} lotes</p></div>
        <div className="flex gap-2">
          <button onClick={() => { setLoading(true); cargar() }} className="flex items-center gap-2 text-sm text-gray-600 border border-gray-200 rounded-lg px-3 py-2 hover:border-[#c9a24e]"><RefreshCw size={15} /> Actualizar</button>
          <button onClick={() => setNuevoLote({ unidad: 'kilo' })} className="noma-btn-primary flex items-center gap-2 text-sm"><Plus size={16} /> Nuevo lote</button>
        </div>
      </div>
      {error && <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700">{error}</div>}
      {ok && <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-sm text-green-700">{ok}</div>}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-gray-100 p-4"><div className="text-xs text-gray-500">Valor inventario</div><div className="text-xl font-bold text-[#1b2a4a]">{clp(valorInv)}</div></div>
        <div className="bg-white rounded-xl border border-gray-100 p-4"><div className="text-xs text-gray-500">Stock bajo</div><div className="text-xl font-bold text-amber-600">{bajos}</div></div>
        <div className="bg-white rounded-xl border border-gray-100 p-4"><div className="text-xs text-gray-500">Por vencer (7d)</div><div className="text-xl font-bold text-amber-600">{porVencer}</div></div>
        <div className="bg-white rounded-xl border border-gray-100 p-4"><div className="text-xs text-gray-500">Bloqueados</div><div className="text-xl font-bold text-red-600">{bloqueados}</div></div>
      </div>

      {nuevoLote && (
        <div className="noma-card !p-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="sm:col-span-2"><label className="text-xs text-gray-500">Producto *</label><select className="noma-input mt-1" value={S(nuevoLote.product_id)} onChange={e => setNuevoLote({ ...nuevoLote, product_id: e.target.value })}><option value="">—</option>{products.map(p => <option key={S(p.id)} value={S(p.id)}>{S(p.nombre)}</option>)}</select></div>
            <div><label className="text-xs text-gray-500">Código lote</label><input className="noma-input mt-1" value={S(nuevoLote.lote_codigo)} onChange={e => setNuevoLote({ ...nuevoLote, lote_codigo: e.target.value })} /></div>
            <div><label className="text-xs text-gray-500">Unidad</label><select className="noma-input mt-1" value={S(nuevoLote.unidad)} onChange={e => setNuevoLote({ ...nuevoLote, unidad: e.target.value })}>{UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}</select></div>
            <div><label className="text-xs text-gray-500">Bodega</label><select className="noma-input mt-1" value={S(nuevoLote.bodega_id)} onChange={e => setNuevoLote({ ...nuevoLote, bodega_id: e.target.value })}><option value="">—</option>{bodegas.map(b => <option key={S(b.id)} value={S(b.id)}>{S(b.nombre)}</option>)}</select></div>
            <div><label className="text-xs text-gray-500">Stock inicial</label><input type="number" className="noma-input mt-1" value={S(nuevoLote.stock_inicial)} onChange={e => setNuevoLote({ ...nuevoLote, stock_inicial: e.target.value })} /></div>
            <div><label className="text-xs text-gray-500">Elaboración</label><input type="date" className="noma-input mt-1" value={S(nuevoLote.fecha_elaboracion)} onChange={e => setNuevoLote({ ...nuevoLote, fecha_elaboracion: e.target.value })} /></div>
            <div><label className="text-xs text-gray-500">Vencimiento</label><input type="date" className="noma-input mt-1" value={S(nuevoLote.fecha_vencimiento)} onChange={e => setNuevoLote({ ...nuevoLote, fecha_vencimiento: e.target.value })} /></div>
          </div>
          <div className="flex gap-2 mt-3"><button onClick={crearLote} disabled={saving} className="noma-btn-primary text-sm flex items-center gap-2">{saving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />} Crear lote</button><button onClick={() => { setNuevoLote(null); setError(null) }} className="text-sm text-gray-500 px-3">Cancelar</button></div>
        </div>
      )}

      <div className="noma-card !p-4"><div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><input className="noma-input pl-9" placeholder="Buscar producto o lote..." value={search} onChange={e => setSearch(e.target.value)} /></div>
        <select className="noma-input sm:w-48" value={fEstado} onChange={e => setFEstado(e.target.value)}><option value="todos">Todos los estados</option><option value="disponible">Disponible</option><option value="retenido">Retenido</option><option value="bloqueado">Bloqueado</option><option value="vencido">Vencido</option><option value="agotado">Agotado</option></select>
      </div></div>

      <div className="noma-card !p-0 overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-sm">
        <thead className="border-b border-gray-100 bg-gray-50/50"><tr>
          <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase">Producto</th><th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase hidden md:table-cell">Lote</th><th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase hidden lg:table-cell">Bodega</th><th className="text-right py-3 px-4 text-xs font-semibold text-gray-400 uppercase">Disp.</th><th className="text-right py-3 px-4 text-xs font-semibold text-gray-400 uppercase hidden sm:table-cell">Neto</th><th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase hidden lg:table-cell">Vence</th><th className="text-center py-3 px-4 text-xs font-semibold text-gray-400 uppercase">Estado</th>
        </tr></thead>
        <tbody className="divide-y divide-gray-50">
          {loading ? <tr><td colSpan={7} className="py-12 text-center"><Loader2 className="w-5 h-5 text-[#1b2a4a] animate-spin mx-auto" /></td></tr>
          : filtrados.length === 0 ? <tr><td colSpan={7} className="py-12 text-center text-gray-400 text-sm">Sin lotes. Crea el primero con &quot;Nuevo lote&quot;.</td></tr>
          : filtrados.map(l => { const p = l.producto as Row | null; return (
            <tr key={S(l.id)} onClick={() => abrir(l)} className="hover:bg-gray-50 cursor-pointer">
              <td className="py-3 px-4 font-medium text-[#1a1a1a]">{S(p?.nombre)}</td>
              <td className="py-3 px-4 text-gray-500 text-xs font-mono hidden md:table-cell">{S(l.lote_codigo) || '—'}</td>
              <td className="py-3 px-4 text-gray-500 text-xs hidden lg:table-cell">{S((l.bodega as Row)?.nombre) || '—'}</td>
              <td className="py-3 px-4 text-right">{N(l.stock_disponible)} {S(l.unidad)}</td>
              <td className="py-3 px-4 text-right hidden sm:table-cell font-medium">{neto(l)}</td>
              <td className="py-3 px-4 text-gray-500 text-xs hidden lg:table-cell">{fecha(l.fecha_vencimiento)}</td>
              <td className="py-3 px-4 text-center"><span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${EST_C[S(l.estado)] || 'bg-gray-100 text-gray-600'}`}>{S(l.estado)}</span></td>
            </tr>) })}
        </tbody>
      </table></div></div>
    </div>
  )
}
