'use client'

import { useCallback, useEffect, useState } from 'react'
import { Loader2, RefreshCw, Plus, Trash2, ArrowLeft, PackageCheck } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'

type Row = Record<string, unknown>
const S = (v: unknown) => v === null || v === undefined ? '' : String(v)
const N = (v: unknown) => { const n = Number(v); return Number.isNaN(n) ? 0 : n }
const fecha = (v: unknown) => v ? new Date(String(v)).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: '2-digit' }) : '—'

interface Linea { product_id: string; cantidad_pedida: string; cantidad_recibida: string; lote_codigo: string; fecha_vencimiento: string; precio_unitario: string; estado_calidad: string; unidad: string }
const nuevaLinea = (): Linea => ({ product_id: '', cantidad_pedida: '', cantidad_recibida: '', lote_codigo: '', fecha_vencimiento: '', precio_unitario: '', estado_calidad: 'disponible', unidad: '' })

export default function RecepcionPage() {
  const [recs, setRecs] = useState<Row[]>([])
  const [provs, setProvs] = useState<Row[]>([])
  const [bodegas, setBodegas] = useState<Row[]>([])
  const [productos, setProductos] = useState<Row[]>([])
  const [sols, setSols] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [nuevo, setNuevo] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)

  // form
  const [proveedorId, setProveedorId] = useState('')
  const [solicitudId, setSolicitudId] = useState('')
  const [bodegaId, setBodegaId] = useState('')
  const [obs, setObs] = useState('')
  const [lineas, setLineas] = useState<Linea[]>([nuevaLinea()])

  const cargar = useCallback(async () => {
    const [r, p, b, pr, sc] = await Promise.all([
      supabase.from('recepciones').select('*, proveedor:proveedores(nombre), bodega:bodegas(nombre)').order('created_at', { ascending: false }).limit(100),
      supabase.from('proveedores').select('id, nombre, estado').order('nombre'),
      supabase.from('bodegas').select('id, nombre, tipo').order('nombre'),
      supabase.from('products').select('id, nombre, unidad_inventario').in('tipo_producto', ['materia_prima', 'envase_insumo', 'reventa']).order('nombre'),
      supabase.from('solicitudes_compra').select('id, numero, proveedor_id, estado').in('estado', ['aprobada', 'comprada']),
    ])
    setRecs((r.data as Row[]) || [])
    setProvs((p.data as Row[]) || [])
    setBodegas((b.data as Row[]) || [])
    setProductos((pr.data as Row[]) || [])
    setSols((sc.data as Row[]) || [])
    setLoading(false)
  }, [])

  useEffect(() => { cargar() }, [cargar])

  function resetForm() {
    setProveedorId(''); setSolicitudId(''); setBodegaId(''); setObs(''); setLineas([nuevaLinea()]); setError(null)
  }

  async function prefillDesdeSolicitud(id: string) {
    setSolicitudId(id)
    if (!id) return
    const { data } = await supabase.from('solicitud_compra_items').select('*, producto:products(unidad_inventario)').eq('solicitud_id', id)
    const its = (data as Row[]) || []
    if (its.length) setLineas(its.map(i => ({ ...nuevaLinea(), product_id: S(i.product_id), cantidad_pedida: S(i.cantidad_sugerida), cantidad_recibida: S(i.cantidad_sugerida), unidad: S(i.unidad_compra) || S((i.producto as Row)?.unidad_inventario) })))
  }

  const setLinea = (idx: number, k: keyof Linea, v: string) => setLineas(ls => ls.map((l, i) => i === idx ? { ...l, [k]: v } : l))

  async function guardar() {
    setError(null)
    if (!proveedorId) { setError('Elige el proveedor'); return }
    if (!bodegaId) { setError('Elige la bodega/cámara de destino'); return }
    const items = lineas.filter(l => l.product_id && N(l.cantidad_recibida) > 0)
    if (items.length === 0) { setError('Agrega al menos una línea con producto y cantidad'); return }
    setSaving(true)
    const r = await fetch('/api/central/recepciones', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'crear', proveedor_id: proveedorId, solicitud_id: solicitudId || null, bodega_id: bodegaId, observaciones: obs, items }),
    })
    const d = await r.json() as Row
    setSaving(false)
    if (!r.ok) { setError(S(d.error) || 'Error'); return }
    setOk(`Recepción ${S(d.numero)} registrada. Stock ingresado al inventario.`)
    setNuevo(false); resetForm(); cargar()
    setTimeout(() => setOk(null), 5000)
  }

  const solsProv = sols.filter(s => S(s.proveedor_id) === proveedorId)

  // ── Nueva recepción ──
  if (nuevo) {
    return (
      <div className="space-y-4">
        <button onClick={() => { setNuevo(false); resetForm() }} className="flex items-center gap-1 text-sm text-gray-500 hover:text-[#1b2a4a]"><ArrowLeft size={15} /> Volver</button>
        <h1 className="text-2xl font-bold text-[#1a1a1a]">Nueva recepción de mercadería</h1>
        {error && <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700">{error}</div>}

        <div className="noma-card space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div><label className="text-xs text-gray-500">Proveedor *</label><select className="noma-input mt-1" value={proveedorId} onChange={e => { setProveedorId(e.target.value); setSolicitudId('') }}><option value="">Selecciona…</option>{provs.map(p => <option key={S(p.id)} value={S(p.id)}>{S(p.nombre)}</option>)}</select></div>
            <div><label className="text-xs text-gray-500">Solicitud (opcional)</label><select className="noma-input mt-1" value={solicitudId} onChange={e => prefillDesdeSolicitud(e.target.value)} disabled={!proveedorId}><option value="">Sin solicitud</option>{solsProv.map(s => <option key={S(s.id)} value={S(s.id)}>{S(s.numero)} · {S(s.estado)}</option>)}</select></div>
            <div><label className="text-xs text-gray-500">Bodega / cámara destino *</label><select className="noma-input mt-1" value={bodegaId} onChange={e => setBodegaId(e.target.value)}><option value="">Selecciona…</option>{bodegas.map(b => <option key={S(b.id)} value={S(b.id)}>{S(b.nombre)} ({S(b.tipo)})</option>)}</select></div>
          </div>

          <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead className="text-gray-400 text-xs text-left"><tr><th className="py-2 px-2 font-medium min-w-[180px]">Producto</th><th className="py-2 px-2 font-medium">Pedido</th><th className="py-2 px-2 font-medium">Recibido *</th><th className="py-2 px-2 font-medium">Lote</th><th className="py-2 px-2 font-medium">Vencimiento</th><th className="py-2 px-2 font-medium">Precio unit.</th><th className="py-2 px-2 font-medium">Calidad</th><th className="py-2 px-2"></th></tr></thead>
            <tbody>
              {lineas.map((l, i) => (
                <tr key={i} className="border-t border-gray-50">
                  <td className="py-1.5 px-2"><select className="noma-input !py-1.5" value={l.product_id} onChange={e => setLinea(i, 'product_id', e.target.value)}><option value="">Producto…</option>{productos.map(p => <option key={S(p.id)} value={S(p.id)}>{S(p.nombre)}</option>)}</select></td>
                  <td className="py-1.5 px-2"><input className="noma-input !py-1.5 w-20" type="number" value={l.cantidad_pedida} onChange={e => setLinea(i, 'cantidad_pedida', e.target.value)} /></td>
                  <td className="py-1.5 px-2"><input className="noma-input !py-1.5 w-20" type="number" value={l.cantidad_recibida} onChange={e => setLinea(i, 'cantidad_recibida', e.target.value)} /></td>
                  <td className="py-1.5 px-2"><input className="noma-input !py-1.5 w-24" value={l.lote_codigo} onChange={e => setLinea(i, 'lote_codigo', e.target.value)} /></td>
                  <td className="py-1.5 px-2"><input className="noma-input !py-1.5" type="date" value={l.fecha_vencimiento} onChange={e => setLinea(i, 'fecha_vencimiento', e.target.value)} /></td>
                  <td className="py-1.5 px-2"><input className="noma-input !py-1.5 w-24" type="number" value={l.precio_unitario} onChange={e => setLinea(i, 'precio_unitario', e.target.value)} /></td>
                  <td className="py-1.5 px-2"><select className="noma-input !py-1.5" value={l.estado_calidad} onChange={e => setLinea(i, 'estado_calidad', e.target.value)}><option value="disponible">Disponible</option><option value="retenido">Retenido</option><option value="bloqueado">Bloqueado</option></select></td>
                  <td className="py-1.5 px-2 text-right">{lineas.length > 1 && <button onClick={() => setLineas(ls => ls.filter((_, x) => x !== i))} className="text-gray-300 hover:text-red-500"><Trash2 size={14} /></button>}</td>
                </tr>
              ))}
            </tbody>
          </table></div>
          <button onClick={() => setLineas(ls => [...ls, nuevaLinea()])} className="flex items-center gap-1 text-sm text-[#c9a24e] font-medium"><Plus size={15} /> Agregar línea</button>

          <div><label className="text-xs text-gray-500">Observaciones</label><textarea className="noma-input mt-1" rows={2} value={obs} onChange={e => setObs(e.target.value)} /></div>

          <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
            <button onClick={guardar} disabled={saving} className="noma-btn-primary text-sm flex items-center gap-2">{saving ? <Loader2 size={15} className="animate-spin" /> : <PackageCheck size={16} />} Registrar recepción</button>
            <button onClick={() => { setNuevo(false); resetForm() }} className="text-sm text-gray-500 px-3">Cancelar</button>
            <span className="text-xs text-gray-400 ml-auto">Cada línea genera un lote y una <strong>entrada por compra</strong> en inventario.</span>
          </div>
        </div>
      </div>
    )
  }

  // ── Lista ──
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-2xl font-bold text-[#1a1a1a]">Recepción de mercadería</h1><p className="text-sm text-gray-500 mt-0.5">Ingreso controlado de compras al inventario (entrada por compra)</p></div>
        <div className="flex gap-2">
          <button onClick={() => { setLoading(true); cargar() }} className="flex items-center gap-2 text-sm text-gray-600 border border-gray-200 rounded-lg px-3 py-2 hover:border-[#c9a24e]"><RefreshCw size={15} /> Actualizar</button>
          <button onClick={() => { resetForm(); setNuevo(true) }} className="noma-btn-primary flex items-center gap-2 text-sm"><Plus size={16} /> Nueva recepción</button>
        </div>
      </div>
      {ok && <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-sm text-green-800">{ok}</div>}

      <div className="noma-card !p-0 overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-sm">
        <thead className="border-b border-gray-100 bg-gray-50/50"><tr>
          <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase">Recepción</th>
          <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase">Proveedor</th>
          <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase hidden md:table-cell">Bodega</th>
          <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase">Fecha</th>
        </tr></thead>
        <tbody className="divide-y divide-gray-50">
          {loading ? <tr><td colSpan={4} className="py-12 text-center"><Loader2 className="w-5 h-5 text-[#1b2a4a] animate-spin mx-auto" /></td></tr>
          : recs.length === 0 ? <tr><td colSpan={4} className="py-12 text-center text-gray-400 text-sm">Sin recepciones aún. Usa <strong>Nueva recepción</strong>.</td></tr>
          : recs.map(r => (
            <tr key={S(r.id)} className="hover:bg-gray-50">
              <td className="py-3 px-4 font-mono font-medium text-[#1b2a4a]">{S(r.numero)}</td>
              <td className="py-3 px-4 text-[#1a1a1a]">{S((r.proveedor as Row)?.nombre)}</td>
              <td className="py-3 px-4 text-gray-500 text-xs hidden md:table-cell">{S((r.bodega as Row)?.nombre)}</td>
              <td className="py-3 px-4 text-gray-500 text-xs">{fecha(r.created_at)}</td>
            </tr>
          ))}
        </tbody>
      </table></div></div>
    </div>
  )
}
