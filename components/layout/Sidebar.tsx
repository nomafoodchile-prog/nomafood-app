'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import {
  LayoutDashboard,
  ClipboardList,
  ChefHat,
  CheckSquare,
  Package,
  Truck,
  SprayCan,
  Wrench,
  ShoppingBag,
  Tag,
  Users,
  Megaphone,
  ShoppingCart,
  Building2,
  DollarSign,
  CreditCard,
  TrendingUp,
  BarChart3,
  UserCircle,
  Shield,
  ChevronDown,
  ChevronRight,
  LogOut,
  X,
  Menu,
  Activity,
} from 'lucide-react'
import { Logo } from './Logo'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

type NavItem = {
  label: string
  href?: string
  icon: React.ElementType
  children?: NavItem[]
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  {
    label: 'Operaciones',
    icon: ChefHat,
    children: [
      { label: 'Pedidos', href: '/operaciones/pedidos', icon: ClipboardList },
      { label: 'ProducciÃ³n', href: '/operaciones/produccion', icon: ChefHat },
      { label: 'Tareas', href: '/operaciones/tareas', icon: CheckSquare },
      { label: 'Inventario', href: '/operaciones/inventario', icon: Package },
      { label: 'Despachos', href: '/operaciones/despachos', icon: Truck },
      { label: 'Limpieza', href: '/operaciones/limpieza', icon: SprayCan },
      { label: 'MantenciÃ³n', href: '/operaciones/mantencion', icon: Wrench },
    ],
  },
  {
    label: 'Comercial',
    icon: ShoppingBag,
    children: [
      { label: 'Productos', href: '/comercial/productos', icon: Tag },
      { label: 'Clientes', href: '/comercial/clientes', icon: Users },
      { label: 'CampaÃ±as', href: '/comercial/campanas', icon: Megaphone },
    ],
  },
  {
    label: 'Compras',
    icon: ShoppingCart,
    children: [
      { label: 'Proveedores', href: '/compras/proveedores', icon: Building2 },
    ],
  },
  {
    label: 'Finanzas',
    icon: DollarSign,
    children: [
      { label: 'Caja', href: '/finanzas/caja', icon: CreditCard },
      { label: 'Cobranza', href: '/finanzas/cobranza', icon: TrendingUp },
      { label: 'Costos', href: '/finanzas/costos', icon: BarChart3 },
      { label: 'Balance', href: '/finanzas/balance', icon: BarChart3 },
    ],
  },
  {
    label: 'Personas',
    icon: UserCircle,
    children: [
      { label: 'Usuarios', href: '/personas/usuarios', icon: Users },
      { label: 'Accesos', href: '/personas/accesos', icon: Shield },
    ],
  },
  {
    label: 'Gerencia',
    icon: Activity,
    children: [
      { label: 'Marcha Blanca', href: '/gerencia/marcha-blanca', icon: Activity },
    ],
  },
]

function NavGroup({ item, pathname, onNavigate }: { item: NavItem; pathname: string; onNavigate?: () => void }) {
  const isChildActive = item.children?.some(c => c.href && pathname.startsWith(c.href))
  const [open, setOpen] = useState(isChildActive ?? false)

  if (!item.children) {
    const active = item.href ? pathname === item.href : false
    return (
      <Link
        href={item.href!}
        onClick={onNavigate}
        className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-all ${
          active
            ? 'border-l-2 border-[#c9a84c] text-[#c9a84c] bg-white/5 pl-[14px]'
            : 'text-gray-400 hover:text-white hover:bg-white/5'
        }`}
      >
        <item.icon size={16} className="flex-shrink-0" />
        <span>{item.label}</span>
      </Link>
    )
  }

  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-all ${
          isChildActive ? 'text-[#c9a84c]' : 'text-gray-400 hover:text-white hover:bg-white/5'
        }`}
      >
        <item.icon size={16} className="flex-shrink-0" />
        <span className="flex-1 text-left">{item.label}</span>
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
      </button>
      {open && (
        <div className="ml-7 mt-0.5 space-y-0.5 border-l border-white/10 pl-3">
          {item.children.map(child => {
            const active = child.href ? pathname.startsWith(child.href) : false
            return (
              <Link
                key={child.href}
                href={child.href!}
                onClick={onNavigate}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-all ${
                  active
                    ? 'text-[#c9a84c] bg-white/5 font-semibold'
                    : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
                }`}
              >
                <child.icon size={13} className="flex-shrink-0" />
                <span>{child.label}</span>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const SidebarContent = ({ onNavigate }: { onNavigate?: () => void }) => (
    <div className="flex flex-col h-full bg-[#0f0f0f] text-white">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-white/10">
        <div className="w-9 h-9 bg-[#c9a84c] rounded-lg flex items-center justify-center font-black text-[#0f0f0f] text-sm flex-shrink-0">
          NF
        </div>
        <div>
          <p className="text-sm font-bold text-white leading-tight">Noma Food</p>
          <p className="text-[10px] text-gray-500 leading-tight">Alma Libre Grupo SpA</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {navItems.map(item => (
          <NavGroup key={item.label} item={item} pathname={pathname} onNavigate={onNavigate} />
        ))}
      </nav>

      {/* User info + logout */}
      <div className="border-t border-white/10 px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#c9a84c]/20 border border-[#c9a84c]/40 flex items-center justify-center text-[#c9a84c] text-xs font-bold flex-shrink-0">
            NF
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-white truncate">Administrador</p>
            <p className="text-[10px] text-gray-500 truncate">nomafood.cl</p>
          </div>
          <button
            onClick={handleLogout}
            className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-400/10 transition-colors"
            title="Cerrar sesiÃ³n"
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-60 flex-shrink-0 h-screen sticky top-0">
        <SidebarContent />
      </aside>

      {/* Mobile Hamburger */}
      <button
        className="lg:hidden fixed top-3 left-3 z-50 w-9 h-9 bg-[#0f0f0f] text-white rounded-lg flex items-center justify-center shadow-lg"
        onClick={() => setMobileOpen(true)}
      >
        <Menu size={18} />
      </button>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative w-72 h-full shadow-2xl">
            <button
              className="absolute top-4 right-4 z-10 text-gray-400 hover:text-white"
              onClick={() => setMobileOpen(false)}
            >
              <X size={20} />
            </button>
            <SidebarContent onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}
    </>
  )
}
