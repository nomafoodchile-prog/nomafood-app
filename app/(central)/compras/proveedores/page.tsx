'use client'

import { useState } from 'react'
import { Plus, X, Search, ChevronDown, ChevronUp, Truck, CheckCircle, XCircle } from 'lucide-react'

type CondicionPago = '30 días' | '60 días' | 'Contado'
type EstadoProveedor = 'Activo' | 'Inactivo'

interface Proveedor {
  id: string
  empresa: string
  rut: string
  rubro: string
  contacto: string
  telefono: string
  email: string
  condicionPago: CondicionPago
  estado: EstadoProveedor
  ciudad?: string
  direccion?: string
  notas?: string
}

const rubros = [
  'Legumbres y granos', 'Frutos secos', 'Aceites y grasas', 'Envases y packaging',
  'Especias y condimentos', 'Leches vegetales base', 'Frutas y verduras',
  'Insumos de limpieza', 'Equipamiento', 'Fermentos y cultivos',
]

const initialProveedores: Proveedor[] = [
  {
    id: 'pv-001',
    empresa: 'Legumbres del Valle SpA',
    rut: '76.543.210-1',
    rubro: 'Legumbres y granos',
    contacto: 'Jorge Valenzuela',
    telefono: '+56 9 8765 4321',
    email: 'ventas@legumbresdelvalle.cl',
    condicionPago: '30 días',
    estado: 'Activo',
    ciudad: 'San Felipe',
    notas: 'Principal proveedor de lentejas, garbanzos y porotos. Entrega cada lunes.',
  },
  {
    id: 'pv-002',
    empresa: 'Frutos del Sol Chile',
    rut: '77.654.321-2',
    rubro: 'Frutos secos',
    contacto: 'Marcela Cifuentes',
    telefono: '+56 9 7654 3210',
    email: 'pedidos@frutosdelsol.cl',
    condicionPago: '30 días',
    estado: 'Activo',
    ciudad: 'Santiago',
    notas: 'Anacardos, almendras y maní orgánico certificado. Materia prima principal.',
  },
  {
    id: 'pv-003',
    empresa: 'AceitesCorp Ltda.',
    rut: '78.765.432-3',
    rubro: 'Aceites y grasas',
    contacto: 'Pablo Muñoz',
    telefono: '+56 9 6543 2100',
    email: 'comercial@aceitescorp.cl',
    condicionPago: 'Contado',
    estado: 'Activo',
    ciudad: 'Valparaíso',
    notas: 'Aceite de coco, girasol y oliva en tambores de 200L.',
  },
  {
    id: 'pv-004',
    empresa: 'PackSolution Chile',
    rut: '79.876.543-4',
    rubro: 'Envases y packaging',
    contacto: 'Alejandra Ríos',
    telefono: '+56 9 5432 1000',
    email: 'ventas@packsolution.cl',
    condicionPago: '60 días',
    estado: 'Activo',
    ciudad: 'Santiago',
    direccion: 'Av. Vicuña Mackenna 1234, San Joaquín',
    notas: 'Tarros de vidrio, tapas y etiquetas. Pedido mínimo 500 unidades.',
  },
  {
    id: 'pv-005',
    empresa: 'Especias Naturales del Sur',
    rut: '80.987.654-5',
    rubro: 'Especias y condimentos',
    contacto: 'Sergio Flores',
    telefono: '+56 9 4321 0000',
    email: 'info@especiasnaturales.cl',
    condicionPago: 'Contado',
    estado: 'Activo',
    ciudad: 'Temuco',
    notas: 'Especias orgánicas a granel, incluye cúrcuma, comino y pimentón ahumado.',
  },
  {
    id: 'pv-006',
    empresa: 'Avena Bio SpA',
    rut: '81.098.765-6',
    rubro: 'Leches vegetales base',
    contacto: 'Camila Sáez',
    telefono: '+56 9 3210 9999',
    email: 'compras@avenabio.cl',
    condicionPago: '30 días',
    estado: 'Activo',
    ciudad: 'Los Ángeles',
    notas: 'Avena en hojuelas y harina de avena certificada sin gluten.',
  },
  {
    id: 'pv-007',
    empresa: 'Hortalizas Orgánicas Lo Ovalle',
    rut: '82.109.876-7',
    rubro: 'Frutas y verduras',
    contacto: 'Luis Ovalle',
    telefono: '+56 9 2109 8888',
    email: 'loovalle@gmail.com',
    condicionPago: 'Contado',
    estado: 'Activo',
    ciudad: 'Colina',
    notas: 'Proveedor local orgánico. Remolacha, zanahoria y espinacas. Entrega miércoles.',
  },
  {
    id: 'pv-008',
    empresa: 'CleanPro Industrial',
    rut: '83.210.987-8',
    rubro: 'Insumos de limpieza',
    contacto: 'Francisca Lagos',
    telefono: '+56 9 1098 7777',
    email: 'clientes@cleanpro.cl',
    condicionPago: '30 días',
    estado: 'Activo',
    ciudad: 'Santiago',
    notas: 'Detergentes y desinfectantes de grado alimentario aprobados por ISP.',
  },
  {
    id: 'pv-009',
    empresa: 'Fermentos Chile Ltda.',
    rut: '84.321.098-9',
    rubro: 'Fermentos y cultivos',
    contacto: 'Daniela Núñez',
    telefono: '+56 9 0987 6666',
    email: 'lab@fermentoschile.cl',
    condicionPago: '30 días',
    estado: 'Inactivo',
    ciudad: 'Valdivia',
    notas: 'Cultivos lácticos y levaduras para fermentados. En evaluación de nuevas alternativas.',
  },
]

export default function ProveedoresPage() {
  const [proveedores, setProveedores] = useState<Proveedor[]>(initialProveedores)
  const [showForm, setShowForm] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [filtroRubro, setFiltroRubro] = useState('Todos')
  const [expandido, setExpandido] = useState<string | null>(null)
  const [form, setForm] = useState({
    empresa: '',
    rut: '',
    rubro: 'Legumbres y granos',
    contacto: '',
    telefono: '',
    email: '',
    condicionPago: '30 días' as CondicionPago,
    estado: 'Activo' as EstadoProveedor,
    ciudad: '',
    direccion: '',
    notas: '',
  })

  const rubrosUsados = ['Todos', ...Array.from(new Set(proveedores.map(p => p.rubro)))]

  const filtrados = proveedores.filter(p => {
    const matchBusqueda =
      p.empresa.toLowerCase().includes(busqueda.toLowerCase()) ||
      p.rubro.toLowerCase().includes(busqueda.toLowerCase()) ||
      p.contacto.toLowerCase().includes(busqueda.toLowerCase())
    const matchRubro = filtroRubro === 'Todos' || p.rubro === filtroRubro
    return matchBusqueda && matchRubro
  })

  const activos = proveedores.filter(p => p.estado === 'Activo').length
  const inactivos = proveedores.filter(p => p.estado === 'Inactivo').length

  const handleSubmit = (ev: React.FormEvent) => {
    ev.preventDefault()
    const nuevo: Proveedor = {
      id: `pv-${Date.now()}`,
      ...form,
    }
    setProveedores(prev => [nuevo, ...prev])
    setShowForm(false)
    setForm({ empresa: '', rut: '', rubro: 'Legumbres y granos', contacto: '', telefono: '', email: '', condicionPago: '30 días', estado: 'Activo', ciudad: '', direccion: '', notas: '' })
  }

  const toggleExpandir = (id: string) => {
    setExpandido(prev => prev === id ? null : id)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1a1a1a]">Proveedores</h1>
          <p className="text-sm text-gray-500 mt-0.5">Gestión de proveedores — Compras Noma Food</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="noma-btn-primary text-sm flex items-center gap-2"
        >
          <Plus size={16} />
          Nuevo proveedor
        </button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="noma-card bg-gradient-to-br from-[#0f0f0f] to-gray-800 text-white">
          <div className="w-9 h-9 bg-[#c9a84c]/20 rounded-xl flex items-center justify-center mb-3">
            <Truck size={16} className="text-[#c9a84c]" />
          </div>
          <p className="text-xs text-gray-400">Total proveedores</p>
          <p className="text-2xl font-bold text-[#c9a84c]">{proveedores.length}</p>
        </div>
        <div className="noma-card border-l-4 border-green-400">
          <div className="w-9 h-9 bg-green-50 rounded-xl flex items-center justify-center mb-3">
            <CheckCircle size={16} className="text-green-600" />
          </div>
          <p className="text-xs text-gray-500">Activos</p>
          <p className="text-2xl font-bold text-green-600">{activos}</p>
        </div>
        <div className="noma-card border-l-4 border-gray-300">
          <div className="w-9 h-9 bg-gray-50 rounded-xl flex items-center justify-center mb-3">
            <XCircle size={16} className="text-gray-400" />
          </div>
          <p className="text-xs text-gray-500">Inactivos</p>
          <p className="text-2xl font-bold text-gray-500">{inactivos}</p>
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
            placeholder="Buscar pos empresa, rubro o contacto..."
            className="noma-input pl-9"
          />
        </div>
        <select
          value={filtroRubro}
          onChange={e => setFiltroRubro(e.target.value)}
          className="noma-input sm:w-56"
        >
          {rubrosUsados.map(r => <option key={r} value={r}>{r === 'Todos' ? 'Todos los rubros' : r}</option>)}
        </select>
      </div>

      {/* Lista con expansión */}
      <div className="noma-card !p-0 overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h2 className="font-bold text-[#1a1a1a]">{filtrados.length} proveedor{filtrados.length !== 1 ? 'es' : ''}</h2>
        </div>
        <div className="divide-y divide-gray-50">
          {filtrados.map(p => (
            <div key={p.id}>
              {/* Fila principal */}
              <button
                type="button"
                onClick={() => toggleExpandir(p.id)}
                className="w-full text-left hover:bg-gray-50/50 transition-colors"
              >
                <div className="flex items-center gap-4 px-4 py-3">
                  <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-4 gap-2 items-center">
                    <div className="sm:col-span-1">
                      <p className="font-medium text-[#1a1a1a] truncate">{p.empresa}</p>
                      <p className="text-xs text-gray-400 font-mono">{p.rut}</p>
                    </div>
                    <div className="hidden sm:block">
                      <span className="noma-badge-blue">{p.rubro}</span>
                    </div>
                    <div className="hidden sm:block text-xs text-gray-500">
                      <p>{p.contacto}</p>
                      <p className="text-gray-400">{p.ciudad}</p>
                    </div>
                    <div className="hidden sm:flex items-center gap-2">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        p.condicionPago === 'Contado' ? 'bg-green-50 text-green-700' : 'bg-blue-50 text-blue-700'
                      }`}>
                        {p.condicionPago}
                      </span>
                      {p.estado === 'Activo'
                        ? <span className="noma-badge-green">Activo</span>
                        : <span className="noma-badge-gray">Inactivo</span>
                      }
                    </div>
                  </div>
                  <div className="text-gray-400 flex-shrink-0">
                    {expandido === p.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>
                </div>
              </button>

              {/* Detalle expandido */}
              {expandido === p.id && (
                <div className="px-4 pb-4 bg-[#f5f0e8]/30 border-t border-gray-100">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
                    <div>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Contacto</p>
                      <p className="text-sm font-medium text-[#1a1a1a]">{p.contacto}</p>
                      <p className="text-sm text-gray-500">{p.telefono}</p>
                      <a href={`mailto:${p.email}`} className="text-sm text-[#c9a84c] hover:underline">{p.email}</a>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Detalles</p>
                      {p.ciudad && <p className="text-sm text-gray-500"><span className="font-medium text-[#1a1a1a]">Ciudad:</span> {p.ciudad}</p>}
                      {p.direccion && <p className="text-sm text-gray-500"><span className="font-medium text-[#1a1a1a]">Dirección:</span> {p.direccion}</p>}
                      <p className="text-sm text-gray-500"><span className="font-medium text-[#1a1a1a]">Condición:</span> {p.condicionPago}</p>
                      <p className="text-sm text-gray-500"><span className="font-medium text-[#1a1a1a]">Rubro:</span> {p.rubro}</p>
                    </div>
                    {p.notas && (
                      <div>
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Notas</p>
                        <p className="text-sm text-gray-500 leading-relaxed">{p.notas}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-[#1a1a1a]">Nuevo proveedor</h3>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Nombre empresa</label>
                <input type="text" value={form.empresa} onChange={e => setForm(f => ({ ...f, empresa: e.target.value }))} className="noma-input" placeholder="Razón social" required />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">RUT</label>
                  <input type="text" value={form.rut} onChange={e => setForm(f => ({ ...f, rut: e.target.value }))} className="noma-input" placeholder="76.543.210-1" required />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Rubro</label>
                  <select value={form.rubro} onChange={e => setForm(f => ({ ...f, rubro: e.target.value }))} className="noma-input">
                    {rubros.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Contacto principal</label>
                  <input type="text" value={form.contacto} onChange={e => setForm(f => ({ ...f, contacto: e.target.value }))} className="noma-input" placeholder="Nombre" required />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Teléfono</label>
                  <input type="tel" value={form.telefono} onChange={e => setForm(f => ({ ...f, telefono: e.target.value }))} className="noma-input" placeholder="+56 9 1234 5678" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Email</label>
                <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="noma-input" placeholder="ventas@empresa.cl" required />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Condición de pago</label>
                  <select value={form.condicionPago} onChange={e => setForm(f => ({ ...f, condicionPago: e.target.value as CondicionPago }))} className="noma-input">
                    <option value="Contado">Contado</option>
                    <option value="30 días">30 días</option>
                    <option value="60 días">60 días</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Ciudad</label>
                  <input type="text" value={form.ciudad} onChange={e => setForm(f => ({ ...f, ciudad: e.target.value }))} className="noma-input" placeholder="Santiago" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Notas (opcional)</label>
                <textarea value={form.notas} onChange={e => setForm(f => ({ ...f, notas: e.target.value }))} className="noma-input resize-none" rows={2} placeholder="Notas sobre el proveedor, condiciones especiales, etc." />
              </div>

              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2 rounded-lg border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
                  Cancelar
                </button>
                <button type="submit" className="flex-1 noma-btn-primary">
                  Guardar proveedor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
