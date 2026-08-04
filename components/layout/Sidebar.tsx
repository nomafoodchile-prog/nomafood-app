'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect, useRef, useCallback } from 'react'
import {
  LayoutDashboard,
  ClipboardList,
  ChefHat,
  Package,
  SprayCan,
  Wrench,
  ShoppingBag,
  Tag,
  Users,
  ShoppingCart,
  Building2,
  DollarSign,
  CreditCard,
  Megaphone,
  UserCircle,
  Shield,
  ChevronDown,
  ChevronRight,
  LogOut,
  X,
  Menu,
  Radio,
  MessageCircle,
  AlertTriangle,
  BarChart3,
  Ship,
} from 'lucide-react'
import { Logo } from './Logo'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { notify, armAudioUnlock } from '@/lib/notify'

const SEEN_KEY = 'central_msgs_seen'

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
      { label: 'Monitoreo en vivo', href: '/operaciones/monitoreo', icon: Radio },
      { label: 'Incidencias', href: '/operaciones/incidencias', icon: AlertTriangle },
      { label: 'Mensajes a choferes', href: '/operaciones/mensajes', icon: MessageCircle },
      { label: 'Recetas y formulaciones', href: '/operaciones/produccion/recetas', icon: ClipboardList },
      { label: 'Operarios', href: '/operaciones/operarios', icon: Users },
      { label: 'Inventario', href: '/operaciones/inventario', icon: Package },
      { label: 'Limpieza', href: '/operaciones/limpieza', icon: SprayCan },
      { label: 'Mantención', href: '/operaciones/mantencion', icon: Wrench },
    ],
  },
  {
    label: 'Comercial',
    icon: ShoppingBag,
    children: [
      { label: 'Solicitudes de acceso', href: '/comercial/solicitudes', icon: UserCircle },
      { label: 'Productos', href: '/comercial/productos', icon: Tag },
      { label: 'Clientes', href: '/comercial/clientes', icon: Users },
      { label: 'Campañas', href: '/comercial/campanas', icon: Megaphone },
      { label: 'Importaciones', href: '/comercial/importaciones', icon: Ship },
      { label: 'Analítica web', href: '/comercial/analitica', icon: BarChart3 },
    ],
  },
  {
    label: 'Compras',
    icon: ShoppingCart,
    children: [
      { label: 'En curso', href: '/compras/en-curso', icon: ShoppingCart },
      { label: 'Solicitudes de compra', href: '/compras/solicitudes', icon: ClipboardList },
      { label: 'Recepción de mercadería', href: '/compras/recepcion', icon: Package },
      { label: 'Proveedores', href: '/compras/proveedores', icon: Building2 },
    ],
  },
  {
    label: 'Finanzas',
    icon: DollarSign,
    children: [
      { label: 'Caja', href: '/finanzas/caja', icon: CreditCard },
      { label: 'Estado de resultados', href: '/finanzas/estado-resultados', icon: DollarSign },
      { label: 'Cartolas del banco', href: '/finanzas/cartolas', icon: ClipboardList },
      { label: 'Remuneraciones', href: '/finanzas/remuneraciones', icon: Users },
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
]

function Badge({ n }: { n: number }) {
  return <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">{n > 9 ? '9+' : n}</span>
}

function NavGroup({ item, pathname, onNavigate, badges }: { item: NavItem; pathname: string; onNavigate?: () => void; badges?: Record<string, number> }) {
  const isChildActive = item.children?.some(c => c.href && pathname.startsWith(c.href))
  const [open, setOpen] = useState(isChildActive ?? false)
  const grupoBadge = item.children?.reduce((s, c) => s + (c.href ? badges?.[c.href] || 0 : 0), 0) || 0

  if (!item.children) {
    const active = item.href ? pathname === item.href : false
    return (
      <Link
        href={item.href!}
        onClick={onNavigate}
        className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-all ${
          active
            ? 'border-l-2 border-[#c9a24e] text-[#c9a24e] bg-white/5 pl-[14px]'
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
          isChildActive ? 'text-[#c9a24e]' : 'text-gray-400 hover:text-white hover:bg-white/5'
        }`}
      >
        <item.icon size={16} className="flex-shrink-0" />
        <span className="flex-1 text-left">{item.label}</span>
        {!open && grupoBadge > 0 && <Badge n={grupoBadge} />}
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
                    ? 'text-[#c9a24e] bg-white/5 font-semibold'
                    : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
                }`}
              >
                <child.icon size={13} className="flex-shrink-0" />
                <span className="flex-1">{child.label}</span>
                {child.href && badges?.[child.href] ? <Badge n={badges[child.href]} /> : null}
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
  const [novedadesMsg, setNovedadesMsg] = useState(0)
  const conocidos = useRef<Map<string, string | null>>(new Map())
  const primed = useRef(false)

  // Novedades de mensajería: suena cuando un chofer confirma "Recibido" y cuenta
  // los acuses posteriores a la última vez que se abrió la bandeja.
  const recomputar = useCallback(async () => {
    const seen = (typeof localStorage !== 'undefined' && localStorage.getItem(SEEN_KEY)) || '1970-01-01'
    const { data } = await supabase.from('driver_messages').select('id, recibido_at')
    const list = (data as { id: string; recibido_at: string | null }[]) || []
    if (primed.current) {
      const nuevoAcuse = list.some(m => m.recibido_at && conocidos.current.has(m.id) && !conocidos.current.get(m.id))
      if (nuevoAcuse) notify(false)
    }
    conocidos.current = new Map(list.map(m => [m.id, m.recibido_at]))
    primed.current = true
    setNovedadesMsg(list.filter(m => m.recibido_at && m.recibido_at > seen).length)
  }, [])

  useEffect(() => {
    armAudioUnlock()
    recomputar()
    const ch = supabase.channel('sidebar-msg-acks')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'driver_messages' }, () => recomputar())
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [recomputar])

  useEffect(() => {
    if (pathname === '/operaciones/mensajes') {
      try { localStorage.setItem(SEEN_KEY, new Date().toISOString()) } catch {}
      setNovedadesMsg(0)
    }
  }, [pathname])

  // Solicitudes de acceso mayorista: badge de "nuevas" + sonido al entrar una
  const [nuevasSol, setNuevasSol] = useState(0)
  const solIds = useRef<Set<string>>(new Set())
  const solPrimed = useRef(false)
  const recomputarSol = useCallback(async () => {
    const { data } = await supabase.from('access_requests').select('id, estado')
    const list = (data as { id: string; estado: string }[]) || []
    if (solPrimed.current && list.some(s => s.estado === 'nueva' && !solIds.current.has(s.id))) notify(true)
    solIds.current = new Set(list.map(s => s.id))
    solPrimed.current = true
    setNuevasSol(list.filter(s => s.estado === 'nueva').length)
  }, [])
  useEffect(() => {
    recomputarSol()
    const ch = supabase.channel('sidebar-solicitudes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'access_requests' }, () => recomputarSol())
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [recomputarSol])

  const badges = { '/operaciones/mensajes': novedadesMsg, '/comercial/solicitudes': nuevasSol }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const SidebarContent = ({ onNavigate }: { onNavigate?: () => void }) => (
    <div className="flex flex-col h-full bg-[#1b2a4a] text-white">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-white/10">
        <div className="w-9 h-9 bg-[#c9a24e] rounded-lg flex items-center justify-center font-black text-[#1b2a4a] text-sm flex-shrink-0">
          NF
        </div>
        <div>
          <p className="text-sm font-bold text-white leading-tight">NOMMA FOOD</p>
          <p className="text-[10px] text-gray-500 leading-tight">Alma Libre Grupo SpA</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {navItems.map(item => (
          <NavGroup key={item.label} item={item} pathname={pathname} onNavigate={onNavigate} badges={badges} />
        ))}
      </nav>

      {/* User info + logout */}
      <div className="border-t border-white/10 px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#c9a24e]/20 border border-[#c9a24e]/40 flex items-center justify-center text-[#c9a24e] text-xs font-bold flex-shrink-0">
            NF
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-white truncate">Administrador</p>
            <p className="text-[10px] text-gray-500 truncate">nomafood.cl</p>
          </div>
          <button
            onClick={handleLogout}
            className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-400/10 transition-colors"
            title="Cerrar sesión"
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
        className="lg:hidden fixed top-3 left-3 z-50 w-9 h-9 bg-[#1b2a4a] text-white rounded-lg flex items-center justify-center shadow-lg"
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
