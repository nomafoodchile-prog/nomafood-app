'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Home, Package, ShoppingCart, MessageCircle, User, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'

const NAV = [
  { href: '/chofer', label: 'Inicio', icon: Home },
  { href: '/chofer/entregas', label: 'Entregas', icon: Package },
  { href: '/chofer/compras', label: 'Compras', icon: ShoppingCart },
  { href: '/chofer/mensajes', label: 'Mensajes', icon: MessageCircle },
  { href: '/chofer/perfil', label: 'Perfil', icon: User },
]

export default function ChoferAppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let active = true
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      if (!data.session) {
        router.replace('/chofer/login')
      } else {
        setReady(true)
      }
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session) router.replace('/chofer/login')
    })
    return () => { active = false; sub.subscription.unsubscribe() }
  }, [router])

  if (!ready) {
    return (
      <div className="min-h-screen bg-[#f7f6f2] flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-[#1f3d2c] animate-spin" />
      </div>
    )
  }

  const isActive = (href: string) =>
    href === '/chofer' ? pathname === '/chofer' : pathname.startsWith(href)

  return (
    <div className="min-h-screen bg-[#f7f6f2] flex flex-col">
      <main className="flex-1 pb-20 max-w-md w-full mx-auto">{children}</main>

      <nav className="fixed bottom-0 inset-x-0 bg-[#1f3d2c] text-white">
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
