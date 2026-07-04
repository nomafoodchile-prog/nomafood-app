'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, X } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { armAudioUnlock, notify } from '@/lib/notify'

interface Row {
  id: string; tipo: string; comentario: string | null; estado_resolucion: string; created_at: string
  driver: { nombre: string } | null
  pedido: { numero_pedido: string } | null
}
interface Alerta { id: string; tipo: string; comentario: string | null; driver: string | null; pedido: string | null }

/**
 * Vigila incidencias entrantes en toda la app central: al llegar una nueva,
 * suena fuerte y abre una ventana modal "INCIDENCIA" con acceso directo.
 * Montado en el layout central, funciona en cualquier pantalla.
 */
export function IncidenciaAlert() {
  const router = useRouter()
  const [alerta, setAlerta] = useState<Alerta | null>(null)
  const known = useRef<Set<string>>(new Set())
  const primed = useRef(false)

  const revisar = useCallback(async () => {
    const { data } = await supabase.from('incidencias')
      .select('id, tipo, comentario, estado_resolucion, created_at, driver:drivers(nombre), pedido:mayorista_pedidos(numero_pedido)')
      .in('estado_resolucion', ['abierta', 'en_revision'])
      .order('created_at', { ascending: false })
    const list = (data as unknown as Row[]) || []
    if (primed.current) {
      const nueva = list.find(i => !known.current.has(i.id))
      if (nueva) {
        notify(true)
        setAlerta({ id: nueva.id, tipo: nueva.tipo, comentario: nueva.comentario, driver: nueva.driver?.nombre ?? null, pedido: nueva.pedido?.numero_pedido ?? null })
      }
    }
    known.current = new Set(list.map(i => i.id))
    primed.current = true
  }, [])

  useEffect(() => { armAudioUnlock(); revisar() }, [revisar])
  useEffect(() => {
    const ch = supabase.channel('central-inc-alert')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'incidencias' }, () => revisar())
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [revisar])

  if (!alerta) return null

  return (
    <div className="fixed inset-0 z-[1000] bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-soft max-w-sm w-full overflow-hidden animate-[nfpop_.15s_ease-out]">
        <div className="bg-[#c0392b] text-white px-5 py-3 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 animate-pulse" />
          <span className="font-bold tracking-widest">¡INCIDENCIA!</span>
          <button onClick={() => setAlerta(null)} className="ml-auto text-white/80 hover:text-white"><X size={18} /></button>
        </div>
        <div className="p-5">
          <p className="text-sm font-semibold text-[#1b2a4a] capitalize">{alerta.tipo.replace(/_/g, ' ')}</p>
          {alerta.comentario && <p className="text-sm text-gray-600 mt-1">{alerta.comentario}</p>}
          <p className="text-xs text-gray-400 mt-2">{alerta.driver || 'Chofer'}{alerta.pedido ? ` · ${alerta.pedido}` : ''}</p>
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => { setAlerta(null); router.push('/operaciones/monitoreo') }}
              className="flex-1 bg-[#c9a24e] hover:bg-[#b8923f] text-[#1b2a4a] font-semibold py-2.5 rounded-xl transition-colors">
              Ver incidencia
            </button>
            <button onClick={() => setAlerta(null)} className="px-4 border border-gray-200 text-gray-500 rounded-xl hover:bg-gray-50">
              Cerrar
            </button>
          </div>
        </div>
      </div>
      <style>{`@keyframes nfpop{from{transform:scale(.9);opacity:0}to{transform:scale(1);opacity:1}}`}</style>
    </div>
  )
}
