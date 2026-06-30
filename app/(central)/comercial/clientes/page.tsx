'use client'

import { useState } from 'react'
import { Plus, X, Search, Users, TrendingUp, AlertCircle, Building2 } from 'lucide-react'

type TipoCliente = 'Mayorista' | 'Restaurant' | 'Tienda'
type EstadoCliente = 'Activo' | 'Inactivo'

interface Cliente {
  id: string
  empresa: string
  rut: string
  email: string
  telefono: string
  ciudad: string
  tipo: TipoCliente
  saldoPendiente: number
  estado: EstadoCliente
  contacto?: string
}

function clp(n: number) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n)
}

const initialClientes: Cliente[] = [
  {
    id: 'cl-001',
    empresa: 'Distribuidora Verde SpA',
    rut: '76.123.456-7',
    email: 'compras@distribuidoraverde.cl',
    telefono: '+56 9 8123 4567',
    ciudad: 'Santiago',
    tipo: 'Mayorista',
    saldoPendiente: 284000,
    estado: 'Activo',
    contacto: 'Sofía Herrera',
  },
  {
    id: 'cl-002',
    empresa: 'Restaurant Raíces',
    rut: '77.234.567-8',
    email: 'chef@raicesrestaurant.cl',
    telefono: '+56 9 7234 5678',
    ciudad: 'Santiago',
    tipo: 'Restaurant',
    saldoPendiente: 0,
    estado: 'Activo',
    contacto: 'Marco Antúnez',
  },
  {
    id: 'cl-003',
    empresa: 'Tienda Natural Equilibrio',
    rut: '78.345.678-9',
    email: 'info@equilibrio.cl',
    telefono: '+56 9 6345 6789',
    ciudad: 'Providencia',
    tipo: 'Tienda',
    saldoPendiente: 156000,
    estado: 'Activo',
    contacto: 'Ana Vega',
  },
  {
    id: 'cl-004',
    empresa: 'Orgánica del Sur Ltda.',
    rut: '79.456.789-0',
    email: 'pedidos@organicadelsur.cl',
    telefono: '+56 9 5456 7890',
    ciudad: 'Ñuñoa',
    tipo: 'Mayorista',
    saldoPendiente: 0,
    estado: 'Activo',
    contacto: 'Beatriz Morales',
  },
  {
    id: 'cl-005',
    empresa: 'El Tazón Verde',
    rut: '80.567.890-1',
    email: 'hola@eltazonverde.cl',
    telefono: '+56 9 4567 8901',
    ciudad: 'Las Condes',
    tipo: 'Restaurant',
    saldoPendiente: 98000,
    estado: 'Activo',
    contacto: 'Lucas Pino',
  },
  {
    id: 'cl-006',
    empresa: 'Supermercado Mundo Verde',
    rut: '81.678.901-2',
    email: 'compradores@mundoverde.cl',
    telefono: '+56 9 3678 9012',
    ciudad: 'Vitacura',
    tipo: 'Tienda',
    saldoPendiente: 0,
    estado: 'Activo',
    contacto: 'Daniela Castro',
  },
  {
    id: 'cl-007',
    empresa: 'Café Consciente',
    rut: '82.789.012-3',
    email: 'cafeconscciente@gmail.com',
    telefono: '+56 9 2789 0123',
    ciudad: 'Barrio Italia',
    tipo: 'Restaurant',
    saldoPendiente: 47500,
    estado: 'Activo',
    contacto: 'Felipe Rojas',
  },
  {
    id: 'cl-008',
    empresa: 'La Proveedora Vegana',
    rut: '83.890.123-4',
    email: 'logistica@laproveedoravegana.cl',
    telefono: '+56 9 1890 1234',
    ciudad: 'Santiago Centro',
    tipo: 'Mayorista',
    saldoPendiente: 512000,
    estado: 'Activo',
    contacto: 'Roberto Fuentes',
  },
  {
    id: 'cl-009',
    empresa: 'Bienestar Shop',
    rut: '84.901.234-5',
    email: 'tienda@bienestarshopp.cl',
    telefono: '+56 9 0901 2345',
    ciudad: 'Maipú',
    tipo: 'Tienda',
    saldoPendiente: 0,
    estado: 'Inactivo',
    contacto: 'Carolina Pérez',
  },
  {
    id: 'cl-010',
    empresa: 'Food Hall Veggie',
    rut: '85.012.345-6',
    email: 'info@foodhallveggie.cl',
    telefono: '+56 9 9012 3456',
    ciudad: 'Providencia',
    tipo: 'Tienda',
    saldoPendiente: 0,
    estado: 'Activo',
    contacto: 'Ignacio Soto',
  },
  {
    id: 'cl-011',
    empresa: 'Restaurante Semilla',
    rut: '86.123.456-7',
    email: 'reservas@semillabcn.cl',
    telefono: '+56 9 8123 3456',
    ciudad: 'Bellavista',
    tipo: 'Restaurant',
    saldoPendiente: 189000,
    estado: 'Activo',
    contacto: 'Valentina Torres',
  },
  {
    id: 'cl-012',
    empresa: 'Granel & Co.',
    rut: '87.234.567-8',
    email: 'compras@granelco.cl',
    telefono: '+56 9 7234 3456',
    ciudad: 'Ñuñoa',
    tipo: 'Tienda',
    saldoPendiente: 65000,
    estado: 'Inactivo',
    contacto: 'Patricio Díaz',
  },
]

function tipoBadge(tipo: TipoCliente) {
  if (tipo === 'Mayorista') return <span className="noma-badge-gold">Mayorista</span>
  if (tipo === 'Restaurant') return <span className="noma-badge-blue">Restaurant</span>
  return <span className="noma-badge-gray">Tienda</span>
}

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>(initialClientes)
  const [showForm, setShowForm] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [filtroTipo, setFiltroTipo] = useState<'Todos' | TipoCliente>('Todos')
  const [form, setForm] = useState({
    empresa: '',
    rut: '',
    email: '',
    telefono: '',
    ciudad: '',
    tipo: 'Tienda' as TipoCliente,
    saldoPendiente: '',
    estado: 'Activo' as EstadoCliente,
    contacto: '',
  })

  const filtrados = clientes.filter(c => {
    const matchBusqueda = c.empresa.toLowerCase().includes(busqueda.toLowerCase()) ||
      c.email.toLowerCase().includes(busqueda.toLowerCase()) ||
      c.rut.includes(busqueda)
    const matchTipo = filtroTipo === 'Todos' || c.tipo === filtroTipo
    return matchBusqueda && matchTipo
  })

  const activos = clientes.filter(c => c.estado === 'Activo').length
  const totalSaldo = clientes.reduce((s, c) => s + c.saldoPendiente, 0)
  const conSaldo = clientes.filter(c => c.saldoPendiente > 0).length

  const handleSubmit = (ev: React.FormEvent) => {
    ev.preventDefault()
    const nuevo: Cliente = {
      id: `cl-${Date.now()}`,
      ...form,
      saldoPendiente: Number(form.saldoPendiente) || 0,
    }
    setClientes(prev => [nuevo, ...prev])
    setShowForm(false)
    setForm({ empresa: '', rut: '', email: '', telefono: '', ciudad: '', tipo: 'Tienda', saldoPendiente: '', estado: 'Activo', contacto: '' })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1a1a1a]">Clientes</h1>
          <p className="text-sm text-gray-500 mt-0.5">Gestión de clientes y cuentas — Alma Libre Grupo SpA</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="noma-btn-primary text-sm flex items-center gap-2"
        >
          <Plus size={16} />
          Nuevo cliente
        </button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="noma-card bg-gradient-to-br from-[#0f0f0f] to-gray-800 text-white">
          <div className="w-9 h-9 bg-[#c9a84c]/20 rounded-xl flex items-center justify-center mb-3">
            <Users size={16} className="text-[#c9a84c]" />
          </div>
          <p className="text-xs text-gray-400">Total clientes</p>
          <p className="text-2xl font-bold text-[#c9a84c]">{clientes.length}</p>
        </div>
        <div className="noma-card border-l-4 border-green-400">
          <div className="w-9 h-9 bg-green-50 rounded-xl flex items-center justify-center mb-3">
            <Building2 size={16} className="text-green-600" />
          </div>
          <p className="text-xs text-gray-500">Activos</p>
          <p className="text-2xl font-bold text-green-600">{activos}</p>
        </div>
        <div className="noma-card border-l-4 border-red-400">
          <div className="w-9 h-9 bg-red-50 rounded-xl flex items-center justify-center mb-3">
            <AlertCircle size={16} className="text-red-500" />
          </div>
          <p className="text-xs text-gray-500">Con saldo pendiente</p>
          <p className="text-2xl font-bold text-red-600">{conSaldo}</p>
        </div>
        <div className="noma-card border-l-4 border-[#c9a84c]">
          <div className="w-9 h-9 bg-amber-50 rounded-xl flex items-center justify-center mb-3">
            <TrendingUp size={16} className="text-[#c9a84c]" />
          </div>
          <p className="text-xs text-gray-500">Total por cobrar</p>
          <p className="text-lg font-bold text-[#c9a84c]">{clp(totalSaldo)}</p>
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
            placeholder="Buscar pos empresa, RUT o email..."
            className="noma-input pl-9"
          />
        </div>
        <div className="flex items-center gap-1 bg-gray-50 rounded-lg p-1 self-start">
          {(['Todos', 'Mayorista', 'Restaurant', 'Tienda'] as const).map(t => (
            <button
              key={t}
              onClick={() => setFiltroTipo(t)}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                filtroTipo === t
                  ? 'bg-[#c9a84c] text-[#0f0f0f]'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Tabla */}
      <div className="noma-card !p-0 overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h2 className="font-bold text-[#1a1a1a]">{filtrados.length} cliente{filtrados.length !== 1 ? 's' : ''}</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50/50 border-b border-gray-100">
              <tr>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wide">Empresa</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wide hidden md:table-cell">RUT</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wide hidden sm:table-cell">Email</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wide hidden lg:table-cell">Ciudad</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wide">Tipo</th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wide">Saldo</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wide hidden sm:table-cell">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtrados.map(c => (
                <tr key={c.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="py-3 px-4">
                    <p className="font-medium text-[#1a1a1a]">{c.empresa}</p>
                    {c.contacto && <p className="text-xs text-gray-400">{c.contacto} · {c.telefono}</p>}
                  </td>
                  <td className="py-3 px-4 text-xs text-gray-500 hidden md:table-cell font-mono">{c.rut}</td>
                  <td className="py-3 px-4 text-xs text-gray-500 hidden sm:table-cell">{c.email}</td>
                  <td className="py-3 px-4 text-xs text-gray-500 hidden lg:table-cell">{c.ciudad}</td>
                  <td className="py-3 px-4">{tipoBadge(c.tipo)}</td>
                  <td className="py-3 px-4 text-right">
                    {c.saldoPendiente > 0 ? (
                      <span className="font-bold text-red-600">{clp(c.saldoPendiente)}</span>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                  <td className="py-3 px-4 hidden sm:table-cell">
                    {c.estado === 'Activo'
                      ? <span className="noma-badge-green">Activo</span>
                      : <span className="noma-badge-gray">Inactivo</span>
                    }
                  </td>
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
              <h3 className="font-bold text-[#1a1a1a]">Nuevo cliente</h3>
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
                  <input type="text" value={form.rut} onChange={e => setForm(f => ({ ...f, rut: e.target.value }))} className="noma-input" placeholder="76.123.456-7" required />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Tipo</label>
                  <select value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value as TipoCliente }))} className="noma-input">
                    <option value="Mayorista">Mayorista</option>
                    <option value="Restaurant">Restaurant</option>
                    <option value="Tienda">Tienda</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Email</label>
                <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="noma-input" placeholder="compras@empresa.cl" required />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Teléfono</label>
                  <input type="tel" value={form.telefono} onChange={e => setForm(f => ({ ...f, telefono: e.target.value }))} className="noma-input" placeholder="+56 9 1234 5678" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Ciudad</label>
                  <input type="text" value={form.ciudad} onChange={e => setForm(f => ({ ...f, ciudad: e.target.value }))} className="noma-input" placeholder="Santiago" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Contacto principal</label>
                  <input type="text" value={form.contacto} onChange={e => setForm(f => ({ ...f, contacto: e.target.value }))} className="noma-input" placeholder="Nombre contacto" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Estado</label>
                  <select value={form.estado} onChange={e => setForm(f => ({ ...f, estado: e.target.value as EstadoCliente }))} className="noma-input">
                    <option value="Activo">Activo</option>
                    <option value="Inactivo">Inactivo</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2 rounded-lg border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
                  Cancelar
                </button>
                <button type="submit" className="flex-1 noma-btn-primary">
                  Guardar cliente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
