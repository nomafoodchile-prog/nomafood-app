'use client'

import { useCallback, useEffect, useState } from 'react'
import { Search, Loader2, RefreshCw, Plus, Check, X, PackageOpen } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'

interface Producto {
  id: string
  sku: string | null
  nombre: string
  categoria: string | null
  unidad: string | null
  precio: number
  stock_actual: number | null
  activo: boolean
}

interface NuevoProducto {
  nombre: string
  sku: string
  categoria: string
  unidad: string
  precio: string
}

const NUEVO_VACIO: NuevoProducto = { nombre: '', sku: '', categoria: '', unidad: 'un', precio: '' }

function clp(n: number) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n || 0)
}

export default function ProductosPage() {
  const [productos, setProductos] = useState<Producto[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [edits, setEdits] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState<Record<string, boolean>>({})
  const [error, setError] = useState<string | null>(null)
  const [agregando, setAgregando] = useState(false)
  const [nuevo, setNuevo] = useState<NuevoProducto>(NUEVO_VACIO)
  const [creando, setCreando] = useState(false)

  const cargar = useCallback(async () => {
    const { data } = await supabase
      .from('products')
      .select('id, sku, nombre, categoria, unidad, precio, stock_actual, activo')
      .order('categoria', { ascending: true })
      .order('nombre', { ascending: true })
    setProductos((data as unknown as Producto[]) || [])
    setLoading(false)
  }, [])

  useEffect(() => { cargar() }, [cargar])

  async function post(payload: Record<string, unknown>): Promise<boolean> {
    setError(null)
    const r = await fetch('/api/central/productos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const d = await r.json()
    if (!r.ok) { setError(d.error || 'No se pudo guardar'); return false }
    return true
  }

  async function guardarPrecio(p: Producto) {
    const nuevoPrecio = edits[p.id]
    if (nuevoPrecio === undefined || nuevoPrecio === '') return
    setSaving(s => ({ ...s, [p.id]: true }))
    const ok = await post({ action: 'update', id: p.id, precio: nuevoPrecio })
    if (ok) {
      setProductos(list => list.map(x => x.id === p.id ? { ...x, precio: Number(nuevoPrecio) } : x))
      setEdits(e => { const c = { ...e }; delete c[p.id]; return c })
    }
    setSaving(s => ({ ...s, [p.id]: false }))
  }

  async function toggleActivo(p: Producto) {
    setSaving(s => ({ ...s, [p.id]: true }))
    const ok = await post({ action: 'update', id: p.id, activo: !p.activo })
    if (ok) setProductos(list => list.map(x => x.id === p.id ? { ...x, activo: !x.activo } : x))
    setSaving(s => ({ ...s, [p.id]: false }))
  }

  async function crear() {
    if (!nuevo.nombre.trim() || !nuevo.precio) { setError('Nombre y precio son obligatorios'); return }
    setCreando(true)
    const ok = await post({ action: 'create', ...nuevo })
    setCreando(false)
    if (ok) { setNuevo(NUEVO_VACIO); setAgregando(false); cargar() }
  }

  const filtrados = productos.filter(p => {
    if (!search) return true
    const q = search.toLowerCase()
    return p.nombre.toLowerCase().includes(q) || (p.sku || '').toLowerCase().includes(q) || (p.categoria || '').toLowerCase().includes(q)
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1a1a1a]">Productos</h1>
          <p className="text-sm text-gray-500 mt-0.5">Lista de precios única · {productos.length} productos</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { setLoading(true); cargar() }} className="flex items-center gap-2 text-sm text-gray-600 border border-gray-200 rounded-lg px-3 py-2 hover:border-[#c9a24e] transition-colors">
            <RefreshCw size={15} /> Actualizar
          </button>
          <button onClick={() => setAgregando(v => !v)} className="noma-btn-primary flex items-center gap-2 text-sm">
            <Plus size={16} /> Agregar producto
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700">{error}</div>
      )}

      {/* Form nuevo producto */}
      {agregando && (
        <div className="noma-card !p-4">
          <div className="grid grid-cols-1 sm:grid-cols-6 gap-3">
            <input className="noma-input sm:col-span-2" placeholder="Nombre *" value={nuevo.nombre} onChange={e => setNuevo({ ...nuevo, nombre: e.target.value })} />
            <input className="noma-input" placeholder="SKU" value={nuevo.sku} onChange={e => setNuevo({ ...nuevo, sku: e.target.value })} />
            <input className="noma-input" placeholder="Categoría" value={nuevo.categoria} onChange={e => setNuevo({ ...nuevo, categoria: e.target.value })} />
            <input className="noma-input" placeholder="Unidad" value={nuevo.unidad} onChange={e => setNuevo({ ...nuevo, unidad: e.target.value })} />
            <input className="noma-input" type="number" placeholder="Precio *" value={nuevo.precio} onChange={e => setNuevo({ ...nuevo, precio: e.target.value })} />
          </div>
          <div className="flex gap-2 mt-3">
            <button onClick={crear} disabled={creando} className="noma-btn-primary flex items-center gap-2 text-sm">
              {creando ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />} Guardar producto
            </button>
            <button onClick={() => { setAgregando(false); setNuevo(NUEVO_VACIO); setError(null) }} className="text-sm text-gray-500 px-3">Cancelar</button>
          </div>
        </div>
      )}

      {/* Buscador */}
      <div className="noma-card !p-4">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="Buscar por nombre, SKU o categoría..." value={search} onChange={e => setSearch(e.target.value)} className="noma-input pl-9" />
        </div>
      </div>

      {/* Tabla */}
      <div className="noma-card !p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100 bg-gray-50/50">
              <tr>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wide">SKU</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wide">Producto</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wide hidden md:table-cell">Categoría</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wide">Precio (CLP)</th>
                <th className="text-center py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wide">Activo</th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wide">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={6} className="py-12 text-center"><Loader2 className="w-5 h-5 text-[#1b2a4a] animate-spin mx-auto" /></td></tr>
              ) : filtrados.length === 0 ? (
                <tr><td colSpan={6} className="py-12 text-center text-gray-400 text-sm"><PackageOpen className="w-8 h-8 text-gray-200 mx-auto mb-2" />Sin productos.</td></tr>
              ) : (
                filtrados.map(p => {
                  const editado = edits[p.id] !== undefined && edits[p.id] !== '' && Number(edits[p.id]) !== p.precio
                  return (
                    <tr key={p.id} className={`hover:bg-gray-50/50 transition-colors ${!p.activo ? 'opacity-50' : ''}`}>
                      <td className="py-3 px-4"><span className="font-mono text-xs text-gray-500">{p.sku || '—'}</span></td>
                      <td className="py-3 px-4 font-medium text-[#1a1a1a]">{p.nombre}<span className="text-gray-400 font-normal"> · {p.unidad || 'un'}</span></td>
                      <td className="py-3 px-4 text-gray-500 text-xs hidden md:table-cell">{p.categoria || '—'}</td>
                      <td className="py-3 px-4">
                        <input
                          type="number"
                          className="w-28 border border-gray-200 rounded-lg px-2 py-1 text-sm focus:border-[#c9a24e] focus:outline-none"
                          value={edits[p.id] ?? String(p.precio)}
                          onChange={e => setEdits(prev => ({ ...prev, [p.id]: e.target.value }))}
                        />
                        <span className="text-[11px] text-gray-400 ml-2">{clp(Number(edits[p.id] ?? p.precio))}</span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button onClick={() => toggleActivo(p)} className={`w-9 h-5 rounded-full relative transition-colors ${p.activo ? 'bg-green-500' : 'bg-gray-300'}`}>
                          <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${p.activo ? 'left-4' : 'left-0.5'}`} />
                        </button>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {editado ? (
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => guardarPrecio(p)} disabled={saving[p.id]} className="text-xs font-semibold bg-[#c9a24e] text-[#1b2a4a] px-2.5 py-1 rounded-lg flex items-center gap-1">
                              {saving[p.id] ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Guardar
                            </button>
                            <button onClick={() => setEdits(e => { const c = { ...e }; delete c[p.id]; return c })} className="text-gray-400 hover:text-gray-600"><X size={14} /></button>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-300">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
