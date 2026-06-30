'use client'

import { ShieldCheck, Info } from 'lucide-react'

type Rol = 'Gerencia' | 'Administración' | 'Enc. Producción' | 'Operario' | 'Armado' | 'Chofer'

interface Modulo {
  nombre: string
  descripcion: string
  accesos: Record<Rol, boolean>
}

const roles: Rol[] = ['Gerencia', 'Administración', 'Enc. Producción', 'Operario', 'Armado', 'Chofer']

const modulos: Modulo[] = [
  {
    nombre: 'Dashboard',
    descripcion: 'Resumen general',
    accesos: { Gerencia: true, 'Administración': true, 'Enc. Producción': true, Operario: false, Armado: false, Chofer: false },
  },
  {
    nombre: 'Pedidos',
    descripcion: 'Gestión de órdenes',
    accesos: { Gerencia: true, 'Administración': true, 'Enc. Producción': true, Operario: false, Armado: true, Chofer: false },
  },
  {
    nombre: 'Producción',
    descripcion: 'Planificación y ordenes de producción',
    accesos: { Gerencia: true, 'Administración': true, 'Enc. Producción': true, Operario: true, Armado: true, Chofer: false },
  },
  {
    nombre: 'Inventario',
    descripcion: 'Stock e insumos',
    accesos: { Gerencia: true, 'Administración': true, 'Enc. Producción': true, Operario: true, Armado: false, Chofer: false },
  },
  {
    nombre: 'Despachos',
    descripcion: 'Repartos y entregas',
    accesos: { Gerencia: true, 'Administración': true, 'Enc. Producción': false, Operario: false, Armado: false, Chofer: true },
  },
  {
    nombre: 'Clientes',
    descripcion: 'Fichas de clientes',
    accesos: { Gerencia: true, 'Administración': true, 'Enc. Producción': false, Operario: false, Armado: false, Chofer: false },
  },
  {
    nombre: 'Finanzas — Caja',
    descripcion: 'Movimientos de caja',
    accesos: { Gerencia: true, 'Administración': true, 'Enc. Producción': false, Operario: false, Armado: false, Chofer: false },
  },
  {
    nombre: 'Finanzas — Cobranza',
    descripcion: 'Cuentas por cobrar',
    accesos: { Gerencia: true, 'Administración': true, 'Enc. Producción': false, Operario: false, Armado: false, Chofer: false },
  },
  {
    nombre: 'Finanzas — Costos',
    descripcion: 'Análisis de costos',
    accesos: { Gerencia: true, 'Administración': false, 'Enc. Producción': false, Operario: false, Armado: false, Chofer: false },
  },
  {
    nombre: 'Personas — Usuarios',
    descripcion: 'Listado del equipo',
    accesos: { Gerencia: true, 'Administración': true, 'Enc. Producción': false, Operario: false, Armado: false, Chofer: false },
  },
  {
    nombre: 'Personas — Accesos',
    descripcion: 'Matriz de permisos',
    accesos: { Gerencia: true, 'Administración': true, 'Enc. Producción': false, Operario: false, Armado: false, Chofer: false },
  },
  {
    nombre: 'Reportes',
    descripcion: 'Informes y exportaciones',
    accesos: { Gerencia: true, 'Administración': true, 'Enc. Producción': false, Operario: false, Armado: false, Chofer: false },
  },
]

const rolHeaderColor: Record<Rol, string> = {
  Gerencia: 'text-[#c9a84c]',
  'Administración': 'text-blue-600',
  'Enc. Producción': 'text-blue-500',
  Operario: 'text-gray-500',
  Armado: 'text-gray-500',
  Chofer: 'text-green-600',
}

export default function AccesosPage() {
  const totalAccesos = modulos.reduce((acc, m) => {
    roles.forEach(r => { if (m.accesos[r]) acc++ })
    return acc
  }, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1a1a1a]">Control de Accesos</h1>
          <p className="text-sm text-gray-500 mt-0.5">Matriz de permisos por rol</p>
        </div>
        <div className="w-10 h-10 bg-[#c9a84c]/10 rounded-xl flex items-center justify-center">
          <ShieldCheck size={20} className="text-[#c9a84c]" />
        </div>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
        <Info size={16} className="text-blue-500 mt-0.5 flex-shrink-0" />
        <p className="text-sm text-blue-700">
          Matriz de permisos por rol — esta vista es <strong>solo informativa</strong>. Contacta a <strong>Gerencia</strong> para solicitar modificaciones de acceso.
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {roles.map(rol => {
          const count = modulos.filter(m => m.accesos[rol]).length
          const pct = Math.round((count / modulos.length) * 100)
          return (
            <div key={rol} className="noma-card !p-3">
              <p className={`text-xs font-bold mb-1 ${rolHeaderColor[rol]}`}>{rol}</p>
              <p className="text-lg font-bold text-[#1a1a1a]">{count}/{modulos.length}</p>
              <p className="text-xs text-gray-400">módulos ({pct}%)</p>
              <div className="w-full bg-gray-100 rounded-full h-1.5 mt-2">
                <div className="h-1.5 rounded-full bg-[#c9a84c]" style={{ width: `${pct}%` }} />
              </div>
            </div>
          )
        })}
      </div>

      {/* Matrix table */}
      <div className="noma-card !p-0 overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h2 className="font-bold text-[#1a1a1a]">Permisos por módulo</h2>
          <p className="text-xs text-gray-400 mt-0.5">{totalAccesos} permisos activos en total</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50/50 border-b border-gray-100">
              <tr>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wide min-w-[180px]">
                  Módulo
                </th>
                {roles.map(rol => (
                  <th key={rol} className={`text-center py-3 px-3 text-xs font-semibold uppercase tracking-wide ${rolHeaderColor[rol]}`}>
                    {rol}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {modulos.map(modulo => (
                <tr key={modulo.nombre} className="hover:bg-gray-50/50 transition-colors">
                  <td className="py-3 px-4">
                    <p className="font-medium text-[#1a1a1a] text-sm">{modulo.nombre}</p>
                    <p className="text-xs text-gray-400">{modulo.descripcion}</p>
                  </td>
                  {roles.map(rol => (
                    <td key={rol} className="py-3 px-3 text-center">
                      {modulo.accesos[rol] ? (
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-100">
                          <span className="text-green-600 font-bold text-sm">✓</span>
                        </span>
                      ) : (
                        <span className="text-gray-300 font-bold text-base">—</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Legend */}
      <div className="noma-card !p-4">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Descripción de roles</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div className="flex items-start gap-2">
            <span className="noma-badge-gold mt-0.5">Gerencia</span>
            <p className="text-xs text-gray-500">Acceso completo a todos los módulos</p>
          </div>
          <div className="flex items-start gap-2">
            <span className="noma-badge-blue mt-0.5">Administración</span>
            <p className="text-xs text-gray-500">Gestión operativa y financiera (sin costos)</p>
          </div>
          <div className="flex items-start gap-2">
            <span className="noma-badge-blue mt-0.5">Enc. Producción</span>
            <p className="text-xs text-gray-500">Producción, inventario y pedidos</p>
          </div>
          <div className="flex items-start gap-2">
            <span className="noma-badge-gray mt-0.5">Operario</span>
            <p className="text-xs text-gray-500">Producción e inventario únicamente</p>
          </div>
          <div className="flex items-start gap-2">
            <span className="noma-badge-gray mt-0.5">Armado</span>
            <p className="text-xs text-gray-500">Pedidos y módulo de armado</p>
          </div>
          <div className="flex items-start gap-2">
            <span className="noma-badge-green mt-0.5">Chofer</span>
            <p className="text-xs text-gray-500">Solo módulo de despachos</p>
          </div>
        </div>
      </div>
    </div>
  )
}
