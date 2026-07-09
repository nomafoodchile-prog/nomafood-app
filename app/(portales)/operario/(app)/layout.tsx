'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Home, ClipboardList, ChefHat, CalendarDays, User, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'

const NAV = [
  { href: '/operario', label: 'Inicio', icon: Home },
  { href: '/operario/tareas', label: 'Tareas', icon: ClipboardList },
  { href: '/operario/produccion', label: 'Producir', icon: ChefHat },
  { href: '/operario/asistencia', label: 'Asistencia', icon: CalendarDays },
  { href: '/operario/perfil', label: 'Perfil', icon: User },
]

export default function OperarioAppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let active = true
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      if (!data.session) router.replace('/operario/login')
      else setReady(true)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session) router.replace('/operario/login')
    })
    return () => { active = false; sub.subscription.unsubscribe() }
  }, [router])

  if (!ready) {
    return (
      <div className="min-h-screen bg-[#f7f6f2] flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-[#1b2a4a] animate-spin" />
      </div>
    )
  }

  const isActive = (href: string) =>
    href === '/operario' ? pathname === '/operario' : pathname.startsWith(href)

  return (
    <div className="min-h-screen bg-[#f7f6f2] flex flex-col">
      <main className="flex-1 pb-20 max-w-md w-full mx-auto">{children}</main>

      <nav className="fixed bottom-0 inset-x-0 bg-[#1b2a4a] text-white">
        <div className="max-w-md mx-auto flex justify-around py-2.5 px-2">
          {NAV.map(item => {
            const active = isActive(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-1 text-[11px] ${active ? 'text-[#c9a24e]' : 'text-white/60'}`}
              >
                <item.icon size={21} />
                {item.label}
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
