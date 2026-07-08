'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'

interface Notif { id: string; prioridad: string; area: string | null; titulo: string }

export function AlertasDashboard() {
  const [items, setItems] = useState<Notif[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    supabase.from('notificaciones').select('id, prioridad, area, titulo')
      .neq('estado', 'resuelta').order('created_at', { ascending: false }).limit(6)
      .then(({ data }) => { setItems((data as Notif[]) || []); setLoaded(true) })
  }, [])

  if (loaded && items.length === 0) return <p className="text-sm text-gray-400 text-center py-4">Sin alertas activas</p>

  return (
    <div className="space-y-3">
      {items.map(n => (
        <Link key={n.id} href="/operaciones/inventario" className="flex items-center gap-3 group">
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${n.prioridad === 'critica' ? 'bg-red-500' : n.prioridad === 'alta' ? 'bg-amber-500' : 'bg-blue-400'}`} />
          <span className="text-sm text-gray-700 flex-1 group-hover:text-[#1b2a4a] min-w-0 truncate">{n.titulo}</span>
          <span className="text-[11px] text-gray-400 hidden sm:block">{n.area || ''}</span>
          <ChevronRight size={15} className="text-gray-300 flex-shrink-0" />
        </Link>
      ))}
    </div>
  )
}
