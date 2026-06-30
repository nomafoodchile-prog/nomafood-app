'use client'

import { useState } from 'react'
import { Plus, X, Search, Package } from 'lucide-react'

type EstadoProducto = 'Activo' | 'Pausado' | 'Agotado'
type Categoria = 'Quesos veganos' | 'Carnes vegetales' | 'Lácteos vegetales' | 'Untables' | 'Snacks' | 'Fermentados'

interface Producto {
  id: string
  codigo: string
  nombre: string
  categoria: Categoria
  precio: number
  unidad: string
  estado: EstadoProducto
  descripcion?: string
}

function clp(n: number) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n)
}

const initialProductos: Producto[] = [
  { id: 'p-001', codigo: 'QA-001', nombre: 'Queso Crema de Anacardo Natural', categoria: 'Quesos veganos', precio: 4900, unidad: 'Tarro 250g', estado: 'Activo', descripcion: 'Queso crema fermentado elaborado con anacardos orgánicos' },
  { id: 'p-002', codigo: 'QA-002', nombre: 'Queso Crema de Anacardo Hierbas', categoria: 'Quesos veganos', precio: 5200, unidad: 'Tarro 250g', estado: 'Activo', descripcion: 'Con albahaca, orégano y ciboulette deshidratado' },
  { id: 'p-003', codigo: 'QA-003', nombre: 'Queso Maduro de Anacardo', categoria: 'Quesos veganos', precio: 7800, unidad: 'Pieza 180g', estado: 'Activo', descripcion: 'Madurado por 30 días, corteza de carbón activado' },
  { id: 'p-004', codigo: 'CV-001', nombre: 'Hamburguesa de Lentejas y Remolacha', categoria: 'Carnes vegetales', precio: 5600, unidad: 'Pack 2 uds.', estado: 'Activo', descripcion: 'Alta en proteínas, sin conservantes artificiales' },
  { id: 'p-005', codigo: 'CV-002', nombre: 'Chorizo de Soya Ahumado', categoria: 'Carnes vegetales', precio: 4800, unidad: 'Pack 3 uds.', estado: 'Activo', descripcion: 'Ahumado artesanal con leña de manzano' },
  { id: 'p-006', codigo: 'CV-003', nombre: 'Filete de Seitán a las Hierbas', categoria: 'Carnes vegetales', precio: 6200, unidad: 'Pack 200g', estado: 'Pausado', descripcion: 'Gluten vital de trigo artesanal con especias mediterráneas' },
  { id: 'p-007', codigo: 'LV-001', nombre: 'Leche de Avena Barista', categoria: 'Lácteos vegetales', precio: 2900, unidad: 'Botella 1L', estado: 'Activo', descripcion: 'Formulada para espumar perfectamente en café' },
  { id: 'p-008', codigo: 'LV-002', nombre: 'Yogur de Coco Natural', categoria: 'Lácteos vegetales', precio: 3200, unidad: 'Tarro 400g', estado: 'Activo', descripcion: 'Fermentado con probióticos vivos, sin azúcar añadida' },
  { id: 'p-009', codigo: 'LV-003', nombre: 'Crema de Coco para Cocinar', categoria: 'Lácteos vegetales', precio: 2400, unidad: 'Tetrapak 200ml', estado: 'Activo' },
  { id: 'p-010', codigo: 'UT-001', nombre: 'Mantequilla de Maní Tostado', categoria: 'Untables', precio: 3800, unidad: 'Frasco 350g', estado: 'Activo', descripcion: 'Tostado artesanal, sin aceite de palma ni conservantes' },
  { id: 'p-011', codigo: 'UT-002', nombre: 'Paté de Garbanzos Ahumados', categoria: 'Untables', precio: 3100, unidad: 'Tarro 220g', estado: 'Activo', descripcion: 'Con limón, ajo y pimentón ahumado' },
  { id: 'p-012', codigo: 'SN-001', nombre: 'Chips de Garbanzos Cúrcuma', categoria: 'Snacks', precio: 1900, unidad: 'Bolsa 100g', estado: 'Activo', descripcion: 'Horneados, sin aceite añadido' },
  { id: 'p-013', codigo: 'SN-002', nombre: 'Granola Cacao y Quinoa', categoria: 'Snacks', precio: 4200, unidad: 'Bolsa 350g', estado: 'Agotado', descripcion: 'Sin azúcar refinada, endulzada con dátiles' },
  { id: 'p-014', codigo: 'FE-001', nombre: 'Kéfir de Agua Jengibre y Limón', categoria: 'Fermentados', precio: 2800, unidad: 'Botella 500ml', estado: 'Activo', descripcion: 'Probiótico natural fermentado 48h' },
]

const categorias: Categoria[] = ['Quesos veganos', 'Carnes vegetales', 'Lácteos vegetales', 'Untables', 'Snacks', 'Fermentados']
const unidades = ['Tarro 250g', 'Tarro 400g', 'Pieza 180g', 'Pack 2 uds.', 'Pack 3 uds.', 'Pack 200g', 'Botella 1L', 'Botella 500ml', 'Frasco 350g', 'Bolsa 100g', 'Bolsa 350g', 'Tetrapak 200ml', 'Kilo']

function estadoBadge(estado: EstadoProducto) {
  if (estado === 'Activo') return <span className="noma-badge-green">Activo</span>
  if (estado === 'Pausado') return <span className="noma-badge-gold">Pausado</span>
  return <span className="noma-badge-red">Agotado</span>
}

export default function ProductosPage() {
  const [productos, setProductos] = useState<Producto[]>(initialProductos)
  const [showForm, setShowForm] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [filtroCategoria, setFiltroCategoria] = useState<'Todos' | Categoria>('Todos')
  const [form, setForm] = useState({
    codigo: '',
    nombre: '',
    categoria: 'Quesos veganos' as Categoria,
    precio: '',
    unidad: 'Tarro 250g',
    estado: 'Activo' as EstadoProducto,
    descripcion: '',
  })

  const filtrados = productos.filter(p => {
    const matchBusqueda = p.nombre.toLowerCase().includes(busqueda.toLowerCase()) || p.codigo.toLowerCase().includes(busqueda.toLowerCase())
    const matchCategoria = filtroCategoria === 'Todos' || p.categoria === filtroCategoria
    return matchBusqueda && matchCategoria
  })

  const activos = productos.filter(p => p.estado === 'Activo').length
  const pausados = productos.filter(p => p.estado === 'Pausado').length
  const agotados = productos.filter(p => p.estado === 'Agotado').length

  const handleSubmit = (ev: React.FormEvent) => {
    ev.preventDefault()
    const nuevo: Producto = {
      id: `p-${Date.now()}`,
      ...form,
      precio: Number(form.precio),
    }
    setProductos(prev => [nuevo, ...prev])
    setShowForm(false)
    setForm({ codigo: '', nombre: '', categoria: 'Quesos veganos', precio: '', unidad: 'Tarro 250g', estado: 'Activo', descripcion: '' })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1a1a1a]">Catálogo de Productos</h1>
          <p className="text-sm text-gray-500 mt-0.5">Productos disponibles para mayoristas — Alma Libre Grupo SpA</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="noma-btn-primary text-sm flex items-center gap-2"
        >
          <Plus size={16} />
          Nuevo producto
        </button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="noma-card bg-gradient-to-br from-[#0f0f0f] to-gray-800 text-white">
          <div className="w-9 h-9 bg-[#c9a84c]/20 rounded-xl flex items-center justify-center mb-3">
            <Package size={16} className="text-[#c9a84c]" />
          </div>
          <p className="text-xs text-gray-400">Total productos</p>
          <p className="text-2xl font-bold text-[#c9a84c]">{productos.length}</p>
        </div>
        <div className="noma-card border-l-4 border-green-400">
          <p className="text-xs text-gray-500 mb-1">Activos</p>
          <p className="text-2xl font-bold text-green-600">{activos}</p>
        </div>
        <div className="noma-card border-l-4 border-[#c9a84c]">
          <p className="text-xs text-gray-500 mb-1">Pausados</p>
          <p className="text-2xl font-bold text-[#c9a84c]">{pausados}</p>
        </div>
        <div className="noma-card border-l-4 border-red-400">
          <p className="text-xs text-gray-500 mb-1">Agotados</p>
          <p className="text-2xl font-bold text-red-600">{agotados}</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre o código..."
            className="noma-input pl-9"
          />
        </div>
        <select
          value={filtroCategoria}
          onChange={e => setFiltroCategoria(e.target.value as 'Todos' | Categoria)}
          className="noma-input sm:w-52"
        >
          <option value="Todos">Todas las categorías</option>
          {categorias.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Tabla */}
      <div className="noma-card !p-0 overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h2 className="font-bold text-[#1a1a1a]">
            {filtrados.length} producto{filtrados.length !== 1 ? 's' : ''}
            {filtroCategoria !== 'Todos' && ` — ${filtroCategoria}`}
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50/50 border-b border-gray-100">
              <tr>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wide">Código</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wide">Nombre</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wide hidden md:table-cell">Categoría</th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wide">Precio</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wide hidden sm:table-cell">Unidad</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wide">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtrados.map(p => (
                <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="py-3 px-4">
                    <span className="font-mono text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{p.codigo}</span>
                  </td>
                  <td className="py-3 px-4">
                    <p className="font-medium text-[#1a1a1a]">{p.nombre}</p>
                    {p.descripcion && <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{p.descripcion}</p>}
                  </td>
                  <td className="py-3 px-4 hidden md:table-cell">
                    <span className="noma-badge-blue">{p.categoria}</span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className="font-bold text-[#1a1a1a]">{clp(p.precio)}</span>
                  </td>
                  <td className="py-3 px-4 text-xs text-gray-500 hidden sm:table-cell">{p.unidad}</td>
                  <td className="py-3 px-4">{estadoBadge(p.estado)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-[#1a1a1a]">Nuevo producto</h3>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Código</label>
                  <input type="text" value={form.codigo} onChange={e => setForm(f => ({ ...f, codigo: e.target.value }))} className="noma-input" placeholder="ej: QA-005" required />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Estado</label>
                  <select value={form.estado} onChange={e => setForm(f => ({ ...f, estado: e.target.value as EstadoProducto }))} className="noma-input">
                    <option value="Activo">Activo</option>
                    <option value="Pausado">Pausado</option>
                    <option value="Agotado">Agotado</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Nombre del producto</label>
                <input type="text" value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} className="noma-input" placeholder="Nombre completo del producto" required />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Categoría</label>
                  <select value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value as Categoria }))} className="noma-input">
                    {categorias.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Unidad de venta</label>
                  <select value={form.unidad} onChange={e => setForm(f => ({ ...f, unidad: e.target.value }))} className="noma-input">
                    {unidades.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Precio (CLP)</label>
                <input type="number" value={form.precio} onChange={e => setForm(f => ({ ...f, precio: e.target.value }))} className="noma-input" placeholder="0" min="1" required />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Descripción (opcional)</label>
                <textarea value={form.descripcion} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))} className="noma-input resize-none" rows={2} placeholder="Descripción breve del producto" />
              </div>

              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2 rounded-lg border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
                  Cancelar
                </button>
                <button type="submit" className="flex-1 noma-btn-primary">
                  Guardar producto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
