'use client'

import { Bell, ChevronRight } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { useTranslation } from '@/lib/hooks/useTranslation'

const routeLabels: Record<string, string> = {
  dashboard: 'Dashboard',
  operaciones: 'Operaciones',
  pedidos: 'Pedidos',
  produccion: 'Producción',
  tareas: 'Tareas',
  inventario: 'Inventario',
  despachos: 'Despachos',
  limpieza: 'Limpieza',
  mantencion: 'Mantención',
  comercial: 'Comercial',
  productos: 'Productos',
  clientes: 'Clientes',
  campanas: 'Campañas',
  compras: 'Compras',
  proveedores: 'Proveedores',
  finanzas: 'Finanzas',
  caja: 'Caja',
  cobranza: 'Cobranza',
  costos: 'Costos',
  balance: 'Balance',
  personas: 'Personas',
  usuarios: 'Usuarios',
  accesos: 'Accesos',
}

export function Header() {
  const pathname = usePathname()
  const { locale, changeLocale } = useTranslation()

  const segments = pathname.split('/').filter(Boolean)
  const breadcrumbs = segments.map(s => routeLabels[s] || s)

  return (
    <header className="bg-white border-b border-gray-100 px-4 lg:px-6 py-3 flex items-center gap-4">
      {/* Spacer for mobile hamburger */}
      <div className="w-9 lg:hidden" />

      {/* Breadcrumb */}
      <nav className="flex-1 flex items-center gap-1.5 text-sm min-w-0">
        <span className="text-gray-400 text-xs">Noma Food</span>
        {breadcrumbs.map((crumb, i) => (
          <span key={i} className="flex items-center gap-1.5">
            <ChevronRight size={12} className="text-gray-300 flex-shrink-0" />
            <span
              className={
                i === breadcrumbs.length - 1
                  ? 'font-semibold text-[#1a1a1a] text-sm truncate'
                  : 'text-gray-500 text-xs truncate'
              }
            >
              {crumb}
            </span>
          </span>
        ))}
      </nav>

      {/* Language selector */}
      <div className="hidden sm:flex items-center gap-1 bg-gray-50 rounded-lg p-1">
        {(['es', 'en'] as const).map(l => (
          <button
            key={l}
            onClick={() => changeLocale(l)}
            className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
              locale === l
                ? 'bg-[#c9a84c] text-[#0f0f0f]'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {l === 'es' ? 'ES' : 'EN'}
          </button>
        ))}
      </div>

      {/* Notification bell */}
      <button className="relative w-9 h-9 rounded-lg bg-gray-50 flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors">
        <Bell size={16} />
        <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white" />
      </button>

      {/* User avatar */}
      <div className="w-9 h-9 rounded-full bg-[#c9a84c]/20 border-2 border-[#c9a84c]/40 flex items-center justify-center text-[#c9a84c] text-xs font-black cursor-pointer hover:border-[#c9a84c] transition-colors">
        AD
      </div>
    </header>
  )
}
