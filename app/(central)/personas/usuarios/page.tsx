'use client'

import { Info, UserPlus } from 'lucide-react'

type Rol = 'Gerencia' | 'Administracion' | 'EncargadoProduccion' | 'Operario' | 'Armado' | 'Chofer'

interface Usuario {
  id: string
  nombre: string
  email: string
  rol: Rol
  ultimoAcceso: string
  activo: boolean
}

const usuarios: Usuario[] = [
  { id: 'U001', nombre: 'Patricio Álvarez', email: 'patricio@nomafood.cl', rol: 'Gerencia', ultimoAcceso: '2026-06-30T09:15:00', activo: true },
  { id: 'U002', nombre: 'Andrea Morales', email: 'andrea@nomafood.cl', rol: 'Administracion', ultimoAcceso: '2026-06-30T08:42:00', activo: true },
  { id: 'U003', nombre: 'Camila Reyes', email: 'camila@nomafood.cl', rol: 'Administracion', ultimoAcceso: '2026-06-29T17:30:00', activo: true },
  { id: 'U004', nombre: 'Felipe Soto', email: 'felipe@nomafood.cl', rol: 'EncargadoProduccion', ultimoAcceso: '2026-06-30T07:00:00', activo: true },
  { id: 'U005', nombre: 'Rosa Mansilla', email: 'rosa@nomafood.cl', rol: 'Operario', ultimoAcceso: '2026-06-28T16:00:00', activo: true },
  { id: 'U006', nombre: 'Jorge Herrera', email: 'jorge@nomafood.cl', rol: 'Operario', ultimoAcceso: '2026-06-27T15:45:00', activo: true },
  { id: 'U007', nombre: 'Valentina Núñez', email: 'valentina@nomafood.cl', rol: 'Armado', ultimoAcceso: '2026-06-30T08:00:00', activo: true },
  { id: 'U008', nombre: 'Luis Contreras', email: 'luis@nomafood.cl', rol: 'Chofer', ultimoAcceso: '2026-06-30T06:30:00', activo: true },
  { id: 'U009', nombre: 'Carolina Pérez', email: 'carolina@nomafood.cl', rol: 'Armado', ultimoAcceso: '2026-06-20T12:00:00', activo: false },
]

const rolBadge: Record<Rol, string> = {
  Gerencia: 'noma-badge-gold',
  Administracion: 'noma-badge-blue',
  EncargadoProduccion: 'noma-badge-blue',
  Operario: 'noma-badge-gray',
  Armado: 'noma-badge-gray',
  Chofer: 'noma-badge-green',
}

const rolLabel: Record<Rol, string> = {
  Gerencia: 'Gerencia',
  Administracion: 'Administración',
  EncargadoProduccion: 'Encargado Producción',
  Operario: 'Operario',
  Armado: 'Armado',
  Chofer: 'Chofer',
}

function formatUltimoAcceso(iso: string): string {
  const d = new Date(iso)
  const hoy = new Date('2026-06-30')
  const diff = Math.floor((hoy.getTime() - d.getTime()) / (1000 * 60 * 60 * 24))
  if (diff === 0) return `Hoy ${d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}`
  if (diff === 1) return 'Ayer'
  return `Hace ${diff} días`
}

export default function UsuariosPage() {
  const activos = usuarios.filter(u => u.activo).length
  const inactivos = usuarios.filter(u => !u.activo).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1a1a1a]">Usuarios</h1>
          <p className="text-sm text-gray-500 mt-0.5">Equipo Noma Food — {usuarios.length} usuarios registrados</p>
        </div>
        <div className="relative group">
          <button
            disabled
            className="noma-btn-primary text-sm flex items-center gap-2 opacity-50 cursor-not-allowed"
          >
            <UserPlus size={16} />
            Invitar usuario
          </button>
          <div className="absolute right-0 top-full mt-2 bg-[#1a1a1a] text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-lg">
            Se gestiona en Supabase Authentication
          </div>
        </div>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 bg-[#c9a84c]/10 border border-[#c9a84c]/30 rounded-xl px-4 py-3">
        <Info size={16} className="text-[#c9a84c] mt-0.5 flex-shrink-0" />
        <p className="text-sm text-[#8a6e2a]">
          Los usuarios se gestionan directamente en <strong>Supabase Authentication</strong>. Para agregar, desactivar o cambiar roles, accede al panel de Supabase con tu cuenta de administrador.
        </p>
      </div>

      {/* Summary chips */}
      <div className="flex gap-3">
        <div className="noma-card !p-3 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-400" />
          <span className="text-sm font-semibold text-gray-700">{activos} activos</span>
        </div>
        <div className="noma-card !p-3 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-gray-300" />
          <span className="text-sm font-semibold text-gray-700">{inactivos} inactivos</span>
        </div>
      </div>

      {/* Table */}
      <div className="noma-card !p-0 overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h2 className="font-bold text-[#1a1a1a]">Lista de usuarios</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50/50 border-b border-gray-100">
              <tr>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wide">Nombre</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wide hidden sm:table-cell">Email</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wide">Rol</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wide hidden md:table-cell">Último acceso</th>
                <th className="text-center py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wide">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {usuarios.map(u => (
                <tr key={u.id} className={`hover:bg-gray-50/50 transition-colors ${!u.activo ? 'opacity-50' : ''}`}>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-[#c9a84c]/20 flex items-center justify-center text-xs font-bold text-[#8a6e2a] flex-shrink-0">
                        {u.nombre.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </div>
                      <span className="font-medium text-[#1a1a1a]">{u.nombre}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-xs text-gray-500 hidden sm:table-cell">{u.email}</td>
                  <td className="py-3 px-4">
                    <span className={rolBadge[u.rol]}>{rolLabel[u.rol]}</span>
                  </td>
                  <td className="py-3 px-4 text-xs text-gray-500 hidden md:table-cell">
                    {formatUltimoAcceso(u.ultimoAcceso)}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {u.activo ? (
                      <span className="noma-badge-green">Activo</span>
                    ) : (
                      <span className="noma-badge-gray">Inactivo</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
