'use client'

import { useState } from 'react'
import { Plus, X, Wrench, AlertCircle, Clock, CheckCircle2 } from 'lucide-react'

type TipoMantencion = 'Preventiva' | 'Correctiva' | 'Urgente'
type Prioridad = 'Alta' | 'Media' | 'Baja'
type EstadoMantencion = 'Pendiente' | 'En curso' | 'Completado'

interface Solicitud {
  id: string
  equipo: string
  tipo: TipoMantencion
  descripcion: string
  prioridad: Prioridad
  asignado: string
  estado: EstadoMantencion
  fechaReporte: string
  notas?: string
}

const initialSolicitudes: Solicitud[] = [
  {
    id: 'mnt-001',
    equipo: 'Compresor cámara fría',
    tipo: 'Preventiva',
    descripcion: 'Revisión general del compresor, cambio de filtros y lubricación',
    prioridad: 'Media',
    asignado: 'Técnico Fríos del Sur',
    estado: 'Pendiente',
    fechaReporte: '2026-06-25',
    notas: 'Programar fuera de horario de producción',
  },
  {
    id: 'mnt-002',
    equipo: 'Mezcladora planetaria',
    tipo: 'Correctiva',
    descripcion: 'Cambio de correa de transmisión, presenta desgaste visible y ruido anormal',
    prioridad: 'Alta',
    asignado: 'Rodrigo Farías',
    estado: 'En curso',
    fechaReporte: '2026-06-27',
    notas: 'Correa de repuesto solicitada a proveedor',
  },
  {
    id: 'mnt-003',
    equipo: 'Selladora de envasado',
    tipo: 'Correctiva',
    descripcion: 'Reparación de resistencia calefactora, no sella correctamente',
    prioridad: 'Alta',
    asignado: 'Técnico Empack Chile',
    estado: 'En curso',
    fechaReporte: '2026-06-28',
  },
  {
    id: 'mnt-004',
    equipo: 'Bomba de vacío',
    tipo: 'Preventiva',
    descripcion: 'Mantenimiento preventivo semestral, revisión de aceite y sellos',
    prioridad: 'Baja',
    asignado: 'Andrés Muñoz',
    estado: 'Completado',
    fechaReporte: '2026-06-20',
    notas: 'Completado sin inconvenientes',
  },
  {
    id: 'mnt-005',
    equipo: 'Caldera de vapor',
    tipo: 'Urgente',
    descripcion: 'Fuga de vapor detectada en válvula de seguridad, requiere atención inmediata',
    prioridad: 'Alta',
    asignado: 'Técnico TermoChile SpA',
    estado: 'Completado',
    fechaReporte: '2026-06-15',
    notas: 'Válvula reemplazada, sistema operativo',
  },
  {
    id: 'mnt-006',
    equipo: 'Cortadora industrial',
    tipo: 'Preventiva',
    descripcion: 'Afilado y calibración de cuchillas de corte',
    prioridad: 'Media',
    asignado: 'Carmen López',
    estado: 'Pendiente',
    fechaReporte: '2026-06-29',
  },
  {
    id: 'mnt-007',
    equipo: 'Sistema eléctrico tablero principal',
    tipo: 'Preventiva',
    descripcion: 'Revisación anual de tablero eléctrico, ajuste de conexiones y medición de cargas',
    prioridad: 'Media',
    asignado: 'Electricista Víctor Parra',
    estado: 'Pendiente',
    fechaReporte: '2026-06-28',
    notas: 'Coordinar con empresa eléctrica para corte programado',
  },
  {
    id: 'mnt-008',
    equipo: 'Deshidratador industrial',
    tipo: 'Correctiva',
    descripcion: 'Reparación del ventilador interno, motor presenta vibración excesiva',
    prioridad: 'Media',
    asignado: 'Rodrigo Farías',
    estado: 'En curso',
    fechaReporte: '2026-06-26',
  },
  {
    id: 'mnt-009',
    equipo: 'Montacargas manual',
    tipo: 'Preventiva',
    descripcion: 'Revisión de hidráulica y sistema de elevación, mantenimiento trimestral',
    prioridad: 'Baja',
    asignado: 'Andrés Muñoz',
    estado: 'Completado',
    fechaReporte: '2026-06-10',
  },
  {
    id: 'mnt-010',
    equipo: 'Extractor cocina',
    tipo: 'Correctiva',
    descripcion: 'Motor del extractor principal no enciende, revisión eléctrica urgente',
    prioridad: 'Alta',
    asignado: 'Electricista Víctor Parra',
    estado: 'Pendiente',
    fechaReporte: '2026-06-30',
    notas: 'Producción afectada, priorizar',
  },
]

const equipos = [
  'Compresor cámara fría', 'Mezcladora planetaria', 'Selladora de envasado',
  'Bomba de vacío', 'Caldera de vapor', 'Cortadora industrial',
  'Sistema eléctrico tablero principal', 'Deshidratador industrial',
  'Montacargas manual', 'Extractor cocina', 'Horno industrial', 'Etiquetadora automática',
]

function prioridadBadge(prioridad: Prioridad) {
  if (prioridad === 'Alta') return <span className="noma-badge-red">Alta</span>
  if (prioridad === 'Media') return <span className="noma-badge-gold">Media</span>
  return <span className="noma-badge-gray">Baja</span>
}

function estadoBadge(estado: EstadoMantencion) {
  if (estado === 'Completado') return <span className="noma-badge-green">Completado</span>
  if (estado === 'En curso') return <span className="noma-badge-blue">En curso</span>
  return <span className="noma-badge-gray">Pendiente</span>
}

function tipoBadge(tipo: TipoMantencion) {
  if (tipo === 'Urgente') return <span className="noma-badge-red">{tipo}</span>
  if (tipo === 'Correctiva') return <span className="noma-badge-gold">{tipo}</span>
  return <span className="noma-badge-blue">{tipo}</span>
}

export default function MantencionPage() {
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>(initialSolicitudes)
  const [showForm, setShowForm] = useState(false)
  const [filtroEstado, setFiltroEstado] = useState<'Todos' | EstadoMantencion>('Todos')
  const [form, setForm] = useState({
    equipo: '',
    tipo: 'Preventiva' as TipoMantencion,
    descripcion: '',
    prioridad: 'Media' as Prioridad,
    asignado: '',
    estado: 'Pendiente' as EstadoMantencion,
    fechaReporte: new Date().toISOString().split('T')[0],
    notas: '',
  })

  const pendientes = solicitudes.filter(s => s.estado === 'Pendiente').length
  const enCurso = solicitudes.filter(s => s.estado === 'En curso').length
  const completados = solicitudes.filter(s => s.estado === 'Completado').length
  const urgentes = solicitudes.filter(s => s.tipo === 'Urgente' && s.estado !== 'Completado').length

  const filtradas = solicitudes.filter(s => filtroEstado === 'Todos' || s.estado === filtroEstado)

  const handleSubmit = (ev: React.FormEvent) => {
    ev.preventDefault()
    const nueva: Solicitud = {
      id: `mnt-${Date.now()}`,
      ...form,
    }
    setSolicitudes(prev => [nueva, ...prev])
    setShowForm(false)
    setForm({
      equipo: '',
      tipo: 'Preventiva',
      descripcion: '',
      prioridad: 'Media',
      asignado: '',
      estado: 'Pendiente',
      fechaReporte: new Date().toISOString().split('T')[0],
      notas: '',
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1a1a1a]">Mantención</h1>
          <p className="text-sm text-gray-500 mt-0.5">Gestión de mantenimiento de equipos — Planta Noma Food</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="noma-btn-primary text-sm flex items-center gap-2"
        >
          <Plus size={16} />
          Nueva solicitud
        </button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="noma-card border-l-4 border-gray-300">
          <div className="w-9 h-9 bg-gray-50 rounded-xl flex items-center justify-center mb-3">
            <Clock size={16} className="text-gray-500" />
          </div>
          <p className="text-xs text-gray-500">Pendientes</p>
          <p className="text-2xl font-bold text-gray-700">{pendientes}</p>
        </div>
        <div className="noma-card border-l-4 border-blue-400">
          <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center mb-3">
            <Wrench size={16} className="text-blue-500" />
          </div>
          <p className="text-xs text-gray-500">En curso</p>
          <p className="text-2xl font-bold text-blue-600">{enCurso}</p>
        </div>
        <div className="noma-card border-l-4 border-green-400">
          <div className="w-9 h-9 bg-green-50 rounded-xl flex items-center justify-center mb-3">
            <CheckCircle2 size={16} className="text-green-600" />
          </div>
          <p className="text-xs text-gray-500">Completados</p>
          <p className="text-2xl font-bold text-green-600">{completados}</p>
        </div>
        <div className="noma-card border-l-4 border-red-400">
          <div className="w-9 h-9 bg-red-50 rounded-xl flex items-center justify-center mb-3">
            <AlertCircle size={16} className="text-red-500" />
          </div>
          <p className="text-xs text-gray-500">Urgentes activos</p>
          <p className="text-2xl font-bold text-red-600">{urgentes}</p>
        </div>
      </div>

      {/* Tabla */}
      <div className="noma-card !p-0 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between flex-wrap gap-2">
          <h2 className="font-bold text-[#1a1a1a]">Solicitudes de mantención</h2>
          <div className="flex items-center gap-1 bg-gray-50 rounded-lg p-1">
            {(['Todos', 'Pendiente', 'En curso', 'Completado'] as const).map(e => (
              <button
                key={e}
                onClick={() => setFiltroEstado(e)}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                  filtroEstado === e
                    ? 'bg-[#c9a84c] text-[#0f0f0f]'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {e}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50/50 border-b border-gray-100">
              <tr>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wide">Equipo</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wide hidden sm:table-cell">Tipo</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wide">Descripción</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wide">Prioridad</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wide hidden md:table-cell">Asignado</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wide">Estado</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wide hidden lg:table-cell">Fecha</th>
              </tr>
            </thead>
            <tbody className="divide-y\n                            divide-gray-50">
              {filtradas.map(s => (
                <tr key={s.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="py-3 px-4">
                    <p className="font-medium text-[#1a1a1a]">{s.equipo}</p>
                  </td>
                  <td className="py-3 px-4 hidden sm:table-cell">{tipoBadge(s.tipo)}</td>
                  <td className="py-3 px-4">
                    <p className="text-gray-600 text-xs line-clamp-2 max-w-xs">{s.descripcion}</p>
                    {s.notas && <p className="text-xs text-gray-400 mt-0.5 italic line-clamp-1">{s.notas}</p>}
                  </td>
                  <td className="py-3 px-4">{prioridadBadge(s.prioridad)}</td>
                  <td className="py-3 px-4 text-xs text-gray-600 hidden md:table-cell">{s.asignado}</td>
                  <td className="py-3 px-4">{estadoBadge(s.estado)}</td>
                  <td className="py-3 px-4 text-xs text-gray-500 hidden lg:table-cell">
                    {new Date(s.fechaReporte).toLocaleDateString('es-CL')}
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
              <h3 className="font-bold text-[#1a1a1a]">Nueva solicitud de mantención</h3>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bw-gray-100">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Equipo</label>
                <select value={form.equipo} onChange={e => setForm(f => ({ ...f, equipo: e.target.value }))} className="noma-input" required>
                  <option value="">Seleccionar equipo...</option>
                  {equipos.map(eq => <option key={eq} value={eq}>{eq}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Tipo</label>
                  <select value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value as TipoMantencion }))} className="noma-input">
                    <option value="Preventiva">Preventiva</option>
                    <option value="Correctiva">Correctiva</option>
                    <option value="Urgente">Urgente</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Prioridad</label>
                  <select value={form.prioridad} onChange={e => setForm(f => ({ ...f, prioridad: e.target.value as Prioridad }))} className="noma-input">
                    <option value="Alta">Alta</option>
                    <option value="Media">Media</option>
                    <option value="Baja">Baja</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Descripción</label>
                <textarea
                  value={form.descripcion}
                  onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
                  className="noma-input resize-none"
                  rows={3}
                  placeholder="Describe el problema o trabajo a realizar"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Asignado a</label>
                  <input type="text" value={form.asignado} onChange={e => setForm(f => ({ ...f, asignado: e.target.value }))} className="noma-input" placeholder="Técnico o empresa" required />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Estado inicial</label>
                  <select value={form.estado} onChange={e => setForm(f => ({ ...f, estado: e.target.value as EstadoMantencion }))} className="noma-input">
                    <option value="Pendiente">Pendiente</option>
                    <option value="En curso">En curso</option>
                    <option value="Completado">Completado</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Fecha de reporte</label>
                <input type="date" value={form.fechaReporte} onChange={e => setForm(f => ({ ...f, fechaReporte: e.target.value }))} className="noma-input" required />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Notas adicionales</label>
                <textarea value={form.notas} onChange={e => setForm(f => ({ ...f, notas: e.target.value }))} className="noma-input resize-none" rows={2} placeholder="Observaciones adicionales" />
              </div>

              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2 rounded-lg border border-gray-200 text-sm font-semibold text-gray-600 hover:bv-gray-50 transition-colors">
                  Cancelar
                </button>
                <button type="submit" className="flex-1 noma-btn-primary">
                  Crear solicitud
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
