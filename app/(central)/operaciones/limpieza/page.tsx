'use client'

import { useState } from 'react'
import { Plus, X, CheckCircle, Clock, AlertTriangle, ClipboardList } from 'lucide-react'

type Estado = 'Al día' | 'Pendiente' | 'Atrasado'
type Frecuencia = 'Diaria' | 'Semanal' | 'Mensual'

interface TareaLimpieza {
  id: string
  area: string
  tarea: string
  frecuencia: Frecuencia
  ultimaLimpieza: string
  proximaLimpieza: string
  responsable: string
  estado: Estado
  notas?: string
}

const initialTareas: TareaLimpieza[] = [
  {
    id: 'lim-001',
    area: 'Cocina producción',
    tarea: 'Limpieza de ollas de producción',
    frecuencia: 'Diaria',
    ultimaLimpieza: '2026-06-29',
    proximaLimpieza: '2026-06-30',
    responsable: 'Carmen López',
    estado: 'Al día',
    notas: 'Usar detergente neutro y agua caliente a 80°C',
  },
  {
    id: 'lim-002',
    area: 'Mesones de trabajo',
    tarea: 'Desinfección de mesones de acero inoxidable',
    frecuencia: 'Diaria',
    ultimaLimpieza: '2026-06-29',
    proximaLimpieza: '2026-06-30',
    responsable: 'Andrés Muñoz',
    estado: 'Al día',
    notas: 'Aplicar solución de hipoclorito al 0,1%',
  },
  {
    id: 'lim-003',
    area: 'Cámara frigorífica',
    tarea: 'Limpieza y desinfección cámara fría',
    frecuencia: 'Semanal',
    ultimaLimpieza: '2026-06-23',
    proximaLimpieza: '2026-06-30',
    responsable: 'Patricia Soto',
    estado: 'Pendiente',
    notas: 'Revisar sellos y drenajes antes de limpiar',
  },
  {
    id: 'lim-004',
    area: 'Área envasado',
    tarea: 'Desengrase de equipos de envasado',
    frecuencia: 'Semanal',
    ultimaLimpieza: '2026-06-15',
    proximaLimpieza: '2026-06-22',
    responsable: 'Rodrigo Farías',
    estado: 'Atrasado',
    notas: 'Desconectar máquina antes de limpiar',
  },
  {
    id: 'lim-005',
    area: 'Almacén',
    tarea: 'Limpieza de estanterías y suelo almacén',
    frecuencia: 'Semanal',
    ultimaLimpieza: '2026-06-24',
    proximaLimpieza: '2026-07-01',
    responsable: 'Valentina Reyes',
    estado: 'Al día',
  },
  {
    id: 'lim-006',
    area: 'Baños y vestidores',
    tarea: 'Desinfección completa de baños del personal',
    frecuencia: 'Diaria',
    ultimaLimpieza: '2026-06-28',
    proximaLimpieza: '2026-06-29',
    responsable: 'Carmen López',
    estado: 'Atrasado',
    notas: 'Registrar temperatura y niveles de cloro',
  },
  {
    id: 'lim-007',
    area: 'Mezcladora industrial',
    tarea: 'Limpieza profunda mezcladora planetaria',
    frecuencia: 'Semanal',
    ultimaLimpieza: '2026-06-25',
    proximaLimpieza: '2026-07-02',
    responsable: 'Andrés Muñoz',
    estado: 'Al día',
    notas: 'Desmontar piezas y remojar en solución alcalina',
  },
  {
    id: 'lim-008',
    area: 'Área despacho',
    tarea: 'Limpieza de zona de despacho y carga',
    frecuencia: 'Semanal',
    ultimaLimpieza: '2026-06-24',
    proximaLimpieza: '2026-07-01',
    responsable: 'Rodrigo Farías',
    estado: 'Al día',
  },
  {
    id: 'lim-009',
    area: 'Extractor y ventilación',
    tarea: 'Limpieza de filtros extractor de gases cocina',
    frecuencia: 'Mensual',
    ultimaLimpieza: '2026-05-30',
    proximaLimpieza: '2026-06-30',
    responsable: 'Patricia Soto',
    estado: 'Pendiente',
    notas: 'Reemplazar filtros si presentan daño',
  },
  {
    id: 'lim-010',
    area: 'Trampa de grasa',
    tarea: 'Vaciado y limpieza trampa de grasas',
    frecuencia: 'Mensual',
    ultimaLimpieza: '2026-05-20',
    proximaLimpieza: '2026-06-20',
    responsable: 'Andrés Muñoz',
    estado: 'Atrasado',
    notas: 'Empresa externa Ecoclean realiza el servicio',
  },
]

const areas = ['Cocina producción', 'Mesones de trabajo', 'Cámara frigorífica', 'Área envasado', 'Almacén', 'Baños y vestidores', 'Mezcladora industrial', 'Área despacho', 'Extractor y ventilación', 'Trampa de grasa']

function estadoBadge(estado: Estado) {
  if (estado === 'Al día') return <span className="noma-badge-green">Al día</span>
  if (estado === 'Pendiente') return <span className="noma-badge-gold">Pendiente</span>
  return <span className="noma-badge-red">Atrasado</span>
}

export default function LimpiezaPage() {
  const [tareas, setTareas] = useState<TareaLimpieza[]>(initialTareas)
  const [showForm, setShowForm] = useState(false)
  const [filtroEstado, setFiltroEstado] = useState<'Todos' | Estado>('Todos')
  const [form, setForm] = useState({
    area: '',
    tarea: '',
    frecuencia: 'Diaria' as Frecuencia,
    ultimaLimpieza: new Date().toISOString().split('T')[0],
    proximaLimpieza: '',
    responsable: '',
    estado: 'Al día' as Estado,
    notas: '',
  })

  const totalTareas = tareas.length
  const alDia = tareas.filter(t => t.estado === 'Al día').length
  const pendientes = tareas.filter(t => t.estado === 'Pendiente').length
  const atrasadas = tareas.filter(t => t.estado === 'Atrasado').length

  const filtradas = tareas.filter(t => filtroEstado === 'Todos' || t.estado === filtroEstado)

  const handleSubmit = (ev: React.FormEvent) => {
    ev.preventDefault()
    const nueva: TareaLimpieza = {
      id: `lim-${Date.now()}`,
      ...form,
    }
    setTareas(prev => [nueva, ...prev])
    setShowForm(false)
    setForm({
      area: '',
      tarea: '',
      frecuencia: 'Diaria',
      ultimaLimpieza: new Date().toISOString().split('T')[0],
      proximaLimpieza: '',
      responsable: '',
      estado: 'Al día',
      notas: '',
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1a1a1a]">Limpieza y Sanitización</h1>
          <p className="text-sm text-gray-500 mt-0.5">Control de tareas de limpieza — Planta Noma Food</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="noma-btn-primary text-sm flex items-center gap-2"
        >
          <Plus size={16} />
          Registrar limpieza
        </button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="noma-card bg-gradient-to-br from-[#0f0f0f] to-gray-800 text-white">
          <div className="w-9 h-9 bg-[#c9a84c]/20 rounded-xl flex items-center justify-center mb-3">
            <ClipboardList size={16} className="text-[#c9a84c]" />
          </div>
          <p className="text-xs text-gray-400">Total tareas</p>
          <p className="text-2xl font-bold text-[#c9a84c]">{totalTareas}</p>
        </div>
        <div className="noma-card border-l-4 border-green-400">
          <div className="w-9 h-9 bg-green-50 rounded-xl flex items-center justify-center mb-3">
            <CheckCircle size={16} className="text-green-600" />
          </div>
          <p className="text-xs text-gray-500">Al día</p>
          <p className="text-2xl font-bold text-green-600">{alDia}</p>
        </div>
        <div className="noma-card border-l-4 border-[#c9a84c]">
          <div className="w-9 h-9 bg-amber-50 rounded-xl flex items-center justify-center mb-3">
            <Clock size={16} className="text-[#c9a84c]" />
          </div>
          <p className="text-xs text-gray-500">Pendientes</p>
          <p className="text-2xl font-bold text-[#c9a84c]">{pendientes}</p>
        </div>
        <div className="noma-card border-l-4 border-red-400">
          <div className="w-9 h-9 bg-red-50 rounded-xl flex items-center justify-center mb-3">
            <AlertTriangle size={16} className="text-red-500" />
          </div>
          <p className="text-xs text-gray-500">Atrasadas</p>
          <p className="text-2xl font-bold text-red-600">{atrasadas}</p>
        </div>
      </div>

      {/* Tabla */}
      <div className="noma-card !p-0 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between flex-wrap gap-2">
          <h2 className="font-bold text-[#1a1a1a]">Programa de limpieza</h2>
          <div className="flex items-center gap-1 bg-gray-50 rounded-lg p-1">
            {(['Todos', 'Al día', 'Pendiente', 'Atrasado'] as const).map(e => (
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
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wide">Área</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wide">Tarea</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wide hidden sm:table-cell">Frecuencia</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wide hidden md:table-cell">Última</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wide hidden md:table-cell">Próxima</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wide hidden lg:table-cell">Responsable</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wide">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtradas.map(tarea => (
                <tr key={tarea.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="py-3 px-4">
                    <span className="font-medium text-[#1a1a1a] text-xs">{tarea.area}</span>
                  </td>
                  <td className="py-3 px-4">
                    <p className="font-medium text-[#1a1a1a]">{tarea.tarea}</p>
                    {tarea.notas && <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{tarea.notas}</p>}
                  </td>
                  <td className="py-3 px-4 hidden sm:table-cell">
                    <span className="noma-badge-blue">{tarea.frecuencia}</span>
                  </td>
                  <td className="py-3 px-4 text-xs text-gray-500 hidden md:table-cell">
                    {new Date(tarea.ultimaLimpieza).toLocaleDateString('es-CL')}
                  </td>
                  <td className="py-3 px-4 text-xs hidden md:table-cell">
                    <span className={tarea.estado === 'Atrasado' ? 'text-red-600 font-semibold' : 'text-gray-500'}>
                      {new Date(tarea.proximaLimpieza).toLocaleDateString('es-CL')}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-xs text-gray-600 hidden lg:table-cell">{tarea.responsable}</td>
                  <td className="py-3 px-4">{estadoBadge(tarea.estado)}</td>
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
              <h3 className="font-bold text-[#1a1a1a]">Registrar limpieza</h3>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Área</label>
                <select value={form.area} onChange={e => setForm(f => ({ ...f, area: e.target.value }))} className="noma-input" required>
                  <option value="">Seleccionar área...</option>
                  {areas.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Tarea</label>
                <input
                  type="text"
                  value={form.tarea}
                  onChange={e => setForm(f => ({ ...f, tarea: e.target.value }))}
                  className="noma-input"
                  placeholder="Descripción de la tarea de limpieza"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Frecuencia</label>
                  <select value={form.frecuencia} onChange={e => setForm(f => ({ ...f, frecuencia: e.target.value as Frecuencia }))} className="noma-input">
                    <option value="Diaria">Diaria</option>
                    <option value="Semanal">Semanal</option>
                    <option value="Mensual">Mensual</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Estado</label>
                  <select value={form.estado} onChange={e => setForm(f => ({ ...f, estado: e.target.value as Estado }))} className="noma-input">
                    <option value="Al día">Al día</option>
                    <option value="Pendiente">Pendiente</option>
                    <option value="Atrasado">Atrasado</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Última limpieza</label>
                  <input type="date" value={form.ultimaLimpieza} onChange={e => setForm(f => ({ ...f, ultimaLimpieza: e.target.value }))} className="noma-input" required />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Próxima limpieza</label>
                  <input type="date" value={form.proximaLimpieza} onChange={e => setForm(f => ({ ...f, proximaLimpieza: e.target.value }))} className="noma-input" required />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Responsable</label>
                <input type="text" value={form.responsable} onChange={e => setForm(f => ({ ...f, responsable: e.target.value }))} className="noma-input" placeholder="Nombre del responsable" required />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Notas (opcional)</label>
                <textarea value={form.notas} onChange={e => setForm(f => ({ ...f, notas: e.target.value }))} className="noma-input resize-none" rows={2} placeholder="Observaciones o instrucciones especiales" />
              </div>

              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2 rounded-lg border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
                  Cancelar
                </button>
                <button type="submit" className="flex-1 noma-btn-primary">
                  Registrar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
