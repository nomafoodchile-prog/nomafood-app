'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, ArrowRight } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'

interface Notif { id: string; prioridad: string; area: string | null; titulo: string; accion_sugerida: string | null }

const PRIO_C: Record<string, string> = { critica: 'bg-red-100 text-red-700', alta: 'bg-amber-100 text-amber-700' }

export function AlertasDashboard() {
  const [items, setItems] = useState<Notif[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    supabase.from('notificaciones').select('id, prioridad, area, titulo, accion_sugerida')
      .in('prioridad', ['critica', 'alta']).neq('estado', 'resuelta')
      .order('created_at', { ascending: false }).limit(5)
      .then(({ data }) => { setItems((data as Notif[]) || []); setLoaded(true) })
  }, [])

  if (!loaded || items.length === 0) return null

  return (
    <div className="bg-white rounded-2xl border border-amber-200 p-4 mb-6">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle size={18} className="text-amber-500" />
        <span className="font-semibold text-[#1b2a4a]">Alertas y pendientes</span>
        <span className="text-xs text-gray-400 ml-auto">{items.length} activas</span>
      </div>
      <div className="space-y-2">
        {items.map(n => (
          <div key={n.id} className="flex items-center gap-3 py-1.5">
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${PRIO_C[n.prioridad] || 'bg-gray-100 text-gray-600'}`}>{n.prioridad}</span>
            <span className="text-sm text-[#1a1a1a] flex-1 min-w-0 truncate">{n.titulo}</span>
            <span className="text-xs text-gray-400 hidden sm:block">{n.area || ''}</span>
            <ArrowRight size={14} className="text-gray-300" />
          </div>
        ))}
      </div>
    </div>
  )
}
