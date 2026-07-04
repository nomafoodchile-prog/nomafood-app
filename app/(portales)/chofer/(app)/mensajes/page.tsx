'use client'

import { useEffect, useState, useCallback } from 'react'
import { MessageCircle, Loader2, Megaphone, Sprout } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'

interface Msg { id: string; tipo: string; texto: string; created_at: string; leido: boolean }
function cuando(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('es-CL', { day: '2-digit', month: 'short' }) + ' · ' + d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })
}
const ICON: Record<string, React.ElementType> = { aviso: Megaphone, motivacional: Sprout, sistema: MessageCircle, chat: MessageCircle }

export default function MensajesPage() {
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [loading, setLoading] = useState(true)
  const [driverId, setDriverId] = useState<string | null>(null)

  const cargar = useCallback(async () => {
    const { data: d } = await supabase.from('drivers').select('id').limit(1).maybeSingle()
    if (!d) { setLoading(false); return }
    setDriverId(d.id)
    const { data } = await supabase.from('driver_messages').select('id, tipo, texto, created_at, leido').eq('driver_id', d.id).order('created_at', { ascending: false })
    setMsgs((data as Msg[]) || [])
    setLoading(false)
  }, [])
  useEffect(() => { cargar() }, [cargar])
  useEffect(() => {
    if (!driverId) return
    const ch = supabase.channel('mensajes-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'driver_messages', filter: `driver_id=eq.${driverId}` }, () => cargar())
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [driverId, cargar])

  return (
    <div>
      <div className="bg-[#1b2a4a] text-white px-5 py-4"><h1 className="text-lg font-semibold text-center">Avisos de la Central</h1></div>
      {loading ? (
        <div className="py-16 flex justify-center"><Loader2 className="w-6 h-6 text-[#1b2a4a] animate-spin" /></div>
      ) : msgs.length === 0 ? (
        <div className="px-5 py-16 flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-full bg-[#eef1f6] flex items-center justify-center mb-3"><MessageCircle className="w-7 h-7 text-[#1b2a4a]" /></div>
          <p className="font-semibold text-gray-800">Sin avisos por ahora</p>
          <p className="text-sm text-gray-500 mt-1 max-w-xs">Aquí llegarán los avisos y mensajes de la Central según tu ruta.</p>
        </div>
      ) : (
        <div className="px-5 py-4 space-y-3">
          {msgs.map(m => {
            const Icon = ICON[m.tipo] || MessageCircle
            return (
              <div key={m.id} className="bg-white rounded-2xl border border-gray-100 p-4 flex gap-3">
                <span className="w-9 h-9 rounded-full bg-[#eef1f6] flex items-center justify-center flex-shrink-0"><Icon className="w-4 h-4 text-[#c9a24e]" /></span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-xs font-semibold text-[#1b2a4a]">Central Nomma</span>
                    <span className="text-[11px] text-gray-400">{cuando(m.created_at)}</span>
                  </div>
                  <p className="text-sm text-gray-700">{m.texto}</p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
