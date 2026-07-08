'use client'

import { useCallback, useEffect, useState } from 'react'
import { Search, Loader2, Plus, ArrowLeft, Check, RefreshCw } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'

type Row = Record<string, unknown>
const S = (v: unknown) => v === null || v === undefined ? '' : String(v)
const clp = (n: unknown) => { const x = Number(n); return Number.isNaN(x) || !n ? '—' : new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(x) }

export default function ProveedoresPage() {
  const [provs, setProvs] = useState<Row[]>([])
  const [vinculos, setVinculos] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sel, setSel] = useState<Row | null>(null)
  const [nuevo, setNuevo] = useState<Row | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const cargar = useCallback(async () => {
    const { data: p } = await supabase.from('proveedores').select('*').order('nombre')
    setProvs((p as Row[]) || [])
    const { data: v } = await supabase.from('proveedor_productos').select('proveedor_id, codigo_proveedor, unidad_compra, precio_referencial, producto:products(nombre)')
    setVinculos((v as Row[]) || [])
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
    const ok = await api({ action: 'actualizar_proveedor', id: sel.id, nombre: sel.nombre, contacto: sel.contacto, telefono: sel.telefono, email: sel.email, direccion: sel.direccion, activo: sel.activo })
    setSaving(false)
    if (ok) { setError(null); cargar() }
  }

  const countProds = (id: unknown) => vinculos.filter(v => S(v.proveedor_id) === S(id)).length
  const filtrados = provs.filter(p => !search || S(p.nombre).toLowerCase().includes(search.toLowerCase()) || S(p.contacto).toLowerCase().includes(search.toLowerCase()))

  if (sel) {
    const misProd = vinculos.filter(v => S(v.proveedor_id) === S(sel.id))
    return (
      <div className="space-y-4">
        <button onClick={() => { setSel(null); cargar() }} className="flex items-center gap-1 text-sm text-gray-500 hover:text-[#1b2a4a]"><ArrowLeft size={15} /> Volver a proveedores</button>
        {error && <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700">{error}</div>}
        <div className="noma-card">
          <h2 className="text-lg font-bold text-[#1b2a4a] mb-4">{S(sel.nombre)}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div><label className="text-xs text-gray-500">Nombre</label><input className="noma-input mt-1" value={S(sel.nombre)} onChange={e => setSel({ ...sel, nombre: e.target.value })} /></div>
            <div><label className="text-xs text-gray-500">Contacto</label><input className="noma-input mt-1" value={S(sel.contacto)} onChange={e => setSel({ ...sel, contacto: e.target.value })} /></div>
            <div><label className="text-xs text-gray-500">Teléfono</label><input className="noma-input mt-1" value={S(sel.telefono)} onChange={e => setSel({ ...sel, telefono: e.target.value })} /></div>
            <div><label className="text-xs text-gray-500">Email</label><input className="noma-input mt-1" value={S(sel.email)} onChange={e => setSel({ ...sel, email: e.target.value })} /></div>
            <div className="sm:col-span-2"><label className="text-xs text-gray-500">Dirección</label><input className="noma-input mt-1" value={S(sel.direccion)} onChange={e => setSel({ ...sel, direccion: e.target.value })} /></div>
            <div><label className="text-xs text-gray-500">Activo</label><div className="mt-2"><button onClick={() => setSel({ ...sel, activo: !sel.activo })} className={`w-9 h-5 rounded-full relative ${sel.activo ? 'bg-green-500' : 'bg-gray-300'}`}><span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${sel.activo ? 'left-4' : 'left-0.5'}`} /></button></div></div>
          </div>
          <button onClick={guardarProv} disabled={saving} className="noma-btn-primary text-sm mt-4 flex items-center gap-2">{saving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />} Guardar</button>
        </div>
        <div className="noma-card !p-0 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 text-sm font-semibold text-[#1b2a4a]">Productos que provee ({misProd.length})</div>
          <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-gray-50/50"><tr className="text-gray-400 text-xs text-left"><th className="py-2 px-4 font-medium">Producto</th><th className="py-2 px-4 font-medium">Código</th><th className="py-2 px-4 font-medium">U. compra</th><th className="py-2 px-4 font-medium text-right">Precio ref.</th></tr></thead>
          <tbody className="divide-y divide-gray-50">{misProd.length === 0 ? <tr><td colSpan={4} className="py-6 text-center text-gray-400 text-xs">Aún no provee productos. Vincúlalo desde la ficha del producto.</td></tr> : misProd.map((v, i) => (
            <tr key={i}><td className="py-2 px-4 font-medium text-[#1a1a1a]">{S((v.producto as Row)?.nombre)}</td><td className="py-2 px-4 text-gray-500 font-mono text-xs">{S(v.codigo_proveedor) || '—'}</td><td className="py-2 px-4 text-gray-500">{S(v.unidad_compra) || '—'}</td><td className="py-2 px-4 text-right">{clp(v.precio_referencial)}</td></tr>
          ))}</tbody></table></div>
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
            <input className="noma-input" placeholder="Contacto" value={S(nuevo.contacto)} onChange={e => setNuevo({ ...nuevo, contacto: e.target.value })} />
            <input className="noma-input" placeholder="Teléfono" value={S(nuevo.telefono)} onChange={e => setNuevo({ ...nuevo, telefono: e.target.value })} />
            <input className="noma-input" placeholder="Email" value={S(nuevo.email)} onChange={e => setNuevo({ ...nuevo, email: e.target.value })} />
          </div>
          <div className="flex gap-2 mt-3"><button onClick={crear} disabled={saving} className="noma-btn-primary text-sm flex items-center gap-2">{saving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />} Crear</button><button onClick={() => { setNuevo(null); setError(null) }} className="text-sm text-gray-500 px-3">Cancelar</button></div>
        </div>
      )}
      <div className="noma-card !p-4"><div className="relative"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><input className="noma-input pl-9" placeholder="Buscar proveedor o contacto..." value={search} onChange={e => setSearch(e.target.value)} /></div></div>
      <div className="noma-card !p-0 overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-sm">
        <thead className="border-b border-gray-100 bg-gray-50/50"><tr>
          <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase">Proveedor</th><th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase hidden md:table-cell">Contacto</th><th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase hidden md:table-cell">Teléfono</th><th className="text-right py-3 px-4 text-xs font-semibold text-gray-400 uppercase">Productos</th><th className="text-center py-3 px-4 text-xs font-semibold text-gray-400 uppercase">Activo</th>
        </tr></thead>
        <tbody className="divide-y divide-gray-50">
          {loading ? <tr><td colSpan={5} className="py-12 text-center"><Loader2 className="w-5 h-5 text-[#1b2a4a] animate-spin mx-auto" /></td></tr>
          : filtrados.length === 0 ? <tr><td colSpan={5} className="py-12 text-center text-gray-400 text-sm">Sin proveedores. Crea el primero.</td></tr>
          : filtrados.map(p => (
            <tr key={S(p.id)} onClick={() => setSel(p)} className="hover:bg-gray-50 cursor-pointer">
              <td className="py-3 px-4 font-medium text-[#1a1a1a]">{S(p.nombre)}</td>
              <td className="py-3 px-4 text-gray-500 text-xs hidden md:table-cell">{S(p.contacto) || '—'}</td>
              <td className="py-3 px-4 text-gray-500 text-xs hidden md:table-cell">{S(p.telefono) || '—'}</td>
              <td className="py-3 px-4 text-right">{countProds(p.id)}</td>
              <td className="py-3 px-4 text-center"><span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${p.activo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{p.activo ? 'Activo' : 'Inactivo'}</span></td>
            </tr>
          ))}
        </tbody>
      </table></div></div>
    </div>
  )
}
