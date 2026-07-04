'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Home, Package, ShoppingCart, MessageCircle, User, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { armAudioUnlock, notify } from '@/lib/notify'

const NAV = [
  { href: '/chofer', label: 'Inicio', icon: Home },
  { href: '/chofer/entregas', label: 'Entregas', icon: Package },
  { href: '/chofer/compras', label: 'Compras', icon: ShoppingCart },
  { href: '/chofer/mensajes', label: 'Mensajes', icon: MessageCircle, key: 'mensajes' },
  { href: '/chofer/perfil', label: 'Perfil', icon: User },
]

export default function ChoferAppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [ready, setReady] = useState(false)
  const [driverId, setDriverId] = useState<string | null>(null)
  const [sinLeer, setSinLeer] = useState(0)
  const conocidos = useRef<Set<string>>(new Set())
  const primed = useRef(false)

  // Auth
  useEffect(() => {
    let active = true
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      if (!data.session) router.replace('/chofer/login')
      else setReady(true)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session) router.replace('/chofer/login')
    })
    return () => { active = false; sub.subscription.unsubscribe() }
  }, [router])

  // Desbloqueo de audio al primer toque
  useEffect(() => armAudioUnlock(), [])

  // Mensajes sin leer + aviso sonoro global
  const cargarMsgs = useCallback(async (did: string) => {
    const { data } = await supabase.from('driver_messages')
      .select('id, leido').eq('driver_id', did).order('created_at', { ascending: false })
    const list = (data as { id: string; leido: boolean }[]) || []
    const nuevos = primed.current && list.some(m => !conocidos.current.has(m.id))
    if (nuevos) notify(false)
    conocidos.current = new Set(list.map(m => m.id))
    primed.current = true
    setSinLeer(list.filter(m => !m.leido).length)
  }, [])

  useEffect(() => {
    if (!ready) return
    supabase.from('drivers').select('id').limit(1).maybeSingle().then(({ data }) => {
      if (data?.id) { setDriverId(data.id); cargarMsgs(data.id) }
    })
  }, [ready, cargarMsgs])

  useEffect(() => {
    if (!driverId) return
    const ch = supabase.channel('chofer-msg-badge')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'driver_messages', filter: `driver_id=eq.${driverId}` }, () => cargarMsgs(driverId))
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [driverId, cargarMsgs])

  // Reportar GPS del chofer a la Central en tiempo real
  useEffect(() => {
    if (!driverId || typeof navigator === 'undefined' || !navigator.geolocation) return
    let last = 0
    const watchId = navigator.geolocation.watchPosition(
      pos => {
        const now = Date.now()
        if (now - last < 5000) return // como máximo cada 5s
        last = now
        const { latitude, longitude, speed, heading } = pos.coords
        supabase.from('driver_positions').upsert({
          driver_id: driverId,
          lat: latitude,
          lng: longitude,
          velocidad: speed != null && speed >= 0 ? Math.round(speed * 3.6) : null, // m/s → km/h
          heading: heading ?? null,
          updated_at: new Date().toISOString(),
        }).then(() => {})
      },
      () => { /* permiso denegado o sin señal */ },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 }
    )
    return () => navigator.geolocation.clearWatch(watchId)
  }, [driverId])

  if (!ready) {
    return (
      <div className="min-h-screen bg-[#f7f6f2] flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-[#1b2a4a] animate-spin" />
      </div>
    )
  }

  const isActive = (href: string) =>
    href === '/chofer' ? pathname === '/chofer' : pathname.startsWith(href)

  return (
    <div className="min-h-screen bg-[#f7f6f2] flex flex-col">
      <main className="flex-1 pb-20 max-w-md w-full mx-auto">{children}</main>

      <nav className="fixed bottom-0 inset-x-0 bg-[#1b2a4a] text-white">
        <div className="max-w-md mx-auto flex justify-around py-2.5 px-2">
          {NAV.map(item => {
            const active = isActive(item.href)
            const badge = item.key === 'mensajes' && sinLeer > 0
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative flex flex-col items-center gap-1 text-[11px] ${active ? 'text-[#c9a24e]' : 'text-white/60'}`}
              >
                <span className="relative">
                  <item.icon size={21} />
                  {badge && (
                    <span className="absolute -top-2 -right-2.5 min-w-[17px] h-[17px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-[#1b2a4a] animate-pulse">
                      {sinLeer > 9 ? '9+' : sinLeer}
                    </span>
                  )}
                </span>
                {item.label}
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
