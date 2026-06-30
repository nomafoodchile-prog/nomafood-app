'use client'

import { useState } from 'react'
import { Plus, X, Mail, Send, FileText, Users, BarChart2, MessageSquare } from 'lucide-react'

type Canal = 'Email' | 'WhatsApp'
type EstadoCampana = 'Borrador' | 'Programada' | 'Enviada'

interface Campana {
  id: string
  nombre: string
  asunto?: string
  canal: Canal
  estado: EstadoCampana
  destinatarios: number
  tasaApertura?: number
  fechaEnvio?: string
  descripcion?: string
  segmento?: string
}

const initialCampanas: Campana[] = [
  {
    id: 'c-001',
    nombre: 'Newsletter Junio 2026',
    asunto: 'Novedades del mes: nuevos quesos y temporada de invierno',
    canal: 'Email',
    estado: 'Enviada',
    destinatarios: 342,
    tasaApertura: 38.4,
    fechaEnvio: '2026-06-10',
    descripcion: 'Newsletter mensual con novedades de productos y tips de cocina vegana',
    segmento: 'Todos los contactos',
  },
  {
    id: 'c-002',
    nombre: 'Oferta Temporada Invierno',
    asunto: '¡Calientate con nuestros productos! 15% de descuento esta semana',
    canal: 'Email',
    estado: 'Enviada',
    destinatarios: 215,
    tasaApertura: 44.2,
    fechaEnvio: '2026-06-17',
    descripcion: 'Promoción especial de invierno con descuento para mayoristas activos',
    segmento: 'Mayoristas activos',
  },
  {
    id: 'c-003',
    nombre: 'Bienvenida Nuevos Mayoristas',
    asunto: 'Bienvenido a la familia Noma Food — Tu guía de inicio',
    canal: 'Email',
    estado: 'Enviada',
    destinatarios: 28,
    tasaApertura: 71.4,
    fechaEnvio: '2026-06-22',
    descripcion: 'Email de bienvenida automático para nuevos clientes mayoristas',
    segmento: 'Nuevos mayoristas',
  },
  {
    id: 'c-004',
    nombre: 'WhatsApp — Lanzamiento Queso Maduro',
    canal: 'WhatsApp',
    estado: 'Enviada',
    destinatarios: 87,
    tasaApertura: 91.2,
    fechaEnvio: '2026-06-25',
    descripcion: 'Anuncio del nuevo queso maduro de anacardo por WhatsApp Business',
    segmento: 'Restaurantes y tiendas',
  },
  {
    id: 'c-005',
    nombre: 'Newsletter Julio 2026',
    asunto: 'Julio llega con sabores nuevos — Te contamos todo',
    canal: 'Email',
    estado: 'Programada',
    destinatarios: 358,
    fechaEnvio: '2026-07-08',
    descripcion: 'Newsletter mensual de julio con nuevos productos y recetas',
    segmento: 'Todos los contactos',
  },
  {
    id: 'c-006',
    nombre: 'Reactivación clientes inactivos',
    asunto: '¿Sigues por aquí? Tenemos algo especial para ti',
    canal: 'Email',
    estado: 'Borrador',
    destinatarios: 0,
    descripcion: 'Campaña para reactivar clientes sin pedidos en los últimos 60 días',
    segmento: 'Clientes inactivos',
  },
  {
    id: 'c-007',
    nombre: 'Feria Vegana Santiago — Invitación',
    canal: 'WhatsApp',
    estado: 'Borrador',
    destinatarios: 0,
    descripcion: 'Invitación a clientes clave para visitar el stand de Noma Food en la feria',
    segmento: 'Clientes VIP',
  },
]

function estadoBadge(estado: EstadoCampana) {
  if (estado === 'Enviada') return <span className="noma-badge-green">Enviada</span>
  if (estado === 'Programada') return <span className="noma-badge-blue">Programada</span>
  return <span className="noma-badge-gray">Borrador</span>
}

function canalIcon(canal: Canal) {
  if (canal === 'WhatsApp') return <MessageSquare size={14} className="text-green-600" />
  return <Mail size={14} className="text-blue-500" />
}

export default function CampanasPage() {
  const [campanas, setCampanas] = useState<Campana[]>(initialCampanas)
  const [showForm, setShowForm] = useState(false)
  const [filtroEstado, setFiltroEstado] = useState<'Todos' | EstadoCampana>('Todos')
  const [form, setForm] = useState({
    nombre: '',
    asunto: '',
    canal: 'Email' as Canal,
    estado: 'Borrador' as EstadoCampana,
    destinatarios: '',
    fechaEnvio: '',
    descripcion: '',
    segmento: '',
  })

  const enviadas = campanas.filter(c => c.estado === 'Enviada').length
  const programadas = campanas.filter(c => c.estado === 'Programada').length
  const borradores = campanas.filter(c => c.estado === 'Borrador').length
  const tasasEnviadas = campanas.filter(c => c.tasaApertura !== undefined)
  const promApertura = tasasEnviadas.length > 0
    ? (tasasEnviadas.reduce((s, c) => s + (c.tasaApertura ?? 0), 0) / tasasEnviadas.length).toFixed(1)
    : '0'

  const filtradas = campanas.filter(c => filtroEstado === 'Todos' || c.estado === filtroEstado)

  const handleSubmit = (ev: React.FormEvent) => {
    ev.preventDefault()
    const nueva: Campana = {
      id: `c-${Date.now()}`,
      ...form,
      destinatarios: Number(form.destinatarios) || 0,
    }
    setCampanas(prev => [nueva, ...prev])
    setShowForm(false)
    setForm({ nombre: '', asunto: '', canal: 'Email', estado: 'Borrador', destinatarios: '', fechaEnvio: '', descripcion: '', segmento: '' })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1a1a1a]">Campañas</h1>
          <p className="text-sm text-gray-500 mt-0.5">Email marketing y comunicaciones — Alma Libre Grupo SpA</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="noma-btn-primary text-sm flex items-center gap-2"
        >
          <Plus size={16} />
          Nueva campaña
        </button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="noma-card bg-gradient-to-br from-[#0f0f0f] to-gray-800 text-white">
          <div className="w-9 h-9 bg-[#c9a84c]/20 rounded-xl flex items-center justify-center mb-3">
            <Send size={16} className="text-[#c9a84c]" />
          </div>
          <p className="text-xs text-gray-400">Total campañas</p>
          <p className="text-2xl font-bold text-[#c9a84c]">{campanas.length}</p>
        </div>
        <div className="noma-card border-l-4 border-green-400">
          <div className="w-9 h-9 bg-green-50 rounded-xl flex items-center justify-center mb-3">
            <Send size={16} className="text-green-600" />
          </div>
          <p className="text-xs text-gray-500">Enviadas</p>
          <p className="text-2xl font-bold text-green-600">{enviadas}</p>
        </div>
        <div className="noma-card border-l-4 border-blue-400">
          <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center mb-3">
            <FileText size={16} className="text-blue-500" />
          </div>
          <p className="text-xs text-gray-500">Programadas</p>
          <p className="text-2xl font-bold text-blue-600">{programadas}</p>
        </div>
        <div className="noma-card border-l-4 border-[#c9a84c]">
          <div className="w-9 h-9 bg-amber-50 rounded-xl flex items-center justify-center mb-3">
            <BarChart2 size={16} className="text-[#c9a84c]" />
          </div>
          <p className="text-xs text-gray-500">Prom. apertura</p>
          <p className="text-2xl font-bold text-[#c9a84c]">{promApertura}%</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-1 bg-gray-50 rounded-lg p-1 self-start w-fit">
        {(['Todos', 'Enviada', 'Programada', 'Borrador'] as const).map(e => (
          <button
            key={e}
            onClick={() => setFiltroEstado(e)}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              filtroEstado === e
                ? 'bg-[#c9a84c] text-[#0f0f0f]'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {e}
          </button>
        ))}
      </div>

      {/* Cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtradas.map(c => (
          <div key={c.id} className="noma-card hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${c.canal === 'WhatsApp' ? 'bg-green-50' : 'bg-blue-50'}`}>
                  {canalIcon(c.canal)}
                </div>
                <span className="text-xs font-medium text-gray-500">{c.canal}</span>
              </div>
              {estadoBadge(c.estado)}
            </div>

            <h3 className="font-bold text-[#1a1a1a] mb-1">{c.nombre}</h3>
            {c.asunto && <p className="text-xs text-gray-500 mb-2 line-clamp-1 italic">{c.asunto}</p>}
            {c.descripcion && <p className="text-xs text-gray-500 mb-3 line-clamp-2">{c.descripcion}</p>}

            {c.segmento && (
              <div className="flex items-center gap-1.5 mb-3">
                <Users size={12} className="text-gray-400" />
                <span className="text-xs text-gray-500">{c.segmento}</span>
              </div>
            )}

            <div className="border-t border-gray-100 pt-3 mt-auto">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {c.destinatarios > 0 && (
                    <div className="text-center">
                      <p className="text-xs text-gray-400">Destinatarios</p>
                      <p className="font-bold text-[#1a1a1a] text-sm">{c.destinatarios.toLocaleString('es-CL')}</p>
                    </div>
                  )}
                  {c.tasaApertura !== undefined && (
                    <div className="text-center">
                      <p className="text-xs text-gray-400">Apertura</p>
                      <p className="font-bold text-green-600 text-sm">{c.tasaApertura}%</p>
                    </div>
                  )}
                </div>
                {c.fechaEnvio && (
                  <p className="text-xs text-gray-400">
                    {c.estado === 'Programada' ? 'Programado:' : 'Enviado:'}{' '}
                    {new Date(c.fechaEnvio).toLocaleDateString('es-CL')}
                  </p>
                )}
              </div>
              {c.tasaApertura !== undefined && (
                <div className="mt-2">
                  <div className="w-full bg-gray-100 rounded-full h-1.5">
                    <div
                      className="h-1.5 rounded-full bg-green-400"
                      style={{ width: `${Math.min(c.tasaApertura, 100)}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {filtradas.length === 0 && (
        <div className="noma-card text-center py-12">
          <Send size={32} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">No hay campañas en este estado</p>
          <p className="text-sm text-gray-400 mt-1">Crea una nueva campaña para comenzar</p>
        </div>
      )}

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-[#1a1a1a]">Nueva campaña</h3>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Nombre de la campaña</label>
                <input type="text" value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} className="noma-input" placeholder="ej: Newsletter Julio 2026" required />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Canal</label>
                  <select value={form.canal} onChange={e => setForm(f => ({ ...f, canal: e.target.value as Canal }))} className="noma-input">
                    <option value="Email">Email</option>
                    <option value="WhatsApp">WhatsApp</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Estado</label>
                  <select value={form.estado} onChange={e => setForm(f => ({ ...f, estado: e.target.value as EstadoCampana }))} className="noma-input">
                    <option value="Borrador">Borrador</option>
                    <option value="Programada">Programada</option>
                    <option value="Enviada">Enviada</option>
                  </select>
                </div>
              </div>

              {form.canal === 'Email' && (
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Asunto del email</label>
                  <input type="text" value={form.asunto} onChange={e => setForm(f => ({ ...f, asunto: e.target.value }))} className="noma-input" placeholder="Línea de asunto del email" />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Descripción</label>
                <textarea value={form.descripcion} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))} className="noma-input resize-none" rows={2} placeholder="Descripción interna de la campaña" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Segmento</label>
                  <input type="text" value={form.segmento} onChange={e => setForm(f => ({ ...f, segmento: e.target.value }))} className="noma-input" placeholder="ej: Mayoristas activos" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Fecha de envío</label>
                  <input type="date" value={form.fechaEnvio} onChange={e => setForm(f => ({ ...f, fechaEnvio: e.target.value }))} className="noma-input" />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2 rounded-lg border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
                  Cancelar
                </button>
                <button type="submit" className="flex-1 noma-btn-primary">
                  Crear campaña
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
