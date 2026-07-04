'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { MessageCircle, Loader2, Megaphone, Sprout, Check, Phone } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'

interface Msg { id: string; tipo: string; texto: string; created_at: string; leido: boolean; recibido_at: string | null }

const CENTRAL_TEL = process.env.NEXT_PUBLIC_CENTRAL_PHONE || '+56967493679'

function cuando(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('es-CL', { day: '2-digit', month: 'short' }) + ' · ' + d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })
}
function hhmm(iso: string) {
  return new Date(iso).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })
}
const ICON: Record<string, React.ElementType> = { alerta: Megaphone, aviso: Megaphone, motivacional: Sprout, sistema: MessageCircle, chat: MessageCircle }

// Beep + vibración al llegar un mensaje nuevo
function avisar() {
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (AC) {
      const ctx = new AC()
      const o = ctx.createOscillator(), g = ctx.createGain()
      o.connect(g); g.connect(ctx.destination)
      o.type = 'sine'; o.frequency.value = 880
      g.gain.setValueAtTime(0.0001, ctx.currentTime)
      g.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 0.02)
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.4)
      o.start(); o.stop(ctx.currentTime + 0.42)
      setTimeout(() => ctx.close(), 700)
    }
  } catch { /* audio bloqueado hasta interacción del usuario */ }
  try { navigator.vibrate?.([200, 100, 200]) } catch { /* sin soporte */ }
}

export default function MensajesPage() {
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [loading, setLoading] = useState(true)
  const [driverId, setDriverId] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const knownIds = useRef<Set<string>>(new Set())
  const primed = useRef(false)

  const cargar = useCallback(async () => {
    const { data: d } = await supabase.from('drivers').select('id').limit(1).maybeSingle()
    if (!d) { setLoading(false); return }
    setDriverId(d.id)
    const { data } = await supabase.from('driver_messages')
      .select('id, tipo, texto, created_at, leido, recibido_at')
      .eq('driver_id', d.id).order('created_at', { ascending: false })
    const list = (data as Msg[]) || []
    // Sonar solo con mensajes realmente nuevos (no en la primera carga)
    if (primed.current && list.some(m => !knownIds.current.has(m.id))) avisar()
    knownIds.current = new Set(list.map(m => m.id))
    primed.current = true
    setMsgs(list)
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

  async function recibir(id: string) {
    setBusy(id)
    await supabase.rpc('marcar_mensaje_recibido', { p_id: id })
    await cargar()
    setBusy(null)
  }

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
            const nuevo = !m.recibido_at
            return (
              <div key={m.id} className={`bg-white rounded-2xl border p-4 ${nuevo ? 'border-[#c9a24e]/50 ring-1 ring-[#c9a24e]/20' : 'border-gray-100'}`}>
                <div className="flex gap-3">
                  <span className="w-9 h-9 rounded-full bg-[#eef1f6] flex items-center justify-center flex-shrink-0"><Icon className="w-4 h-4 text-[#c9a24e]" /></span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs font-semibold text-[#1b2a4a]">Central Nomma</span>
                      <span className="text-[11px] text-gray-400">{cuando(m.created_at)}</span>
                    </div>
                    <p className="text-sm text-gray-700">{m.texto}</p>
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  {nuevo ? (
                    <button onClick={() => recibir(m.id)} disabled={busy === m.id}
                      className="flex-1 bg-[#c9a24e] hover:bg-[#b8923f] text-[#1b2a4a] text-sm font-semibold py-2.5 rounded-xl flex items-center justify-center gap-1.5 disabled:opacity-60">
                      {busy === m.id ? <Loader2 size={15} className="animate-spin" /> : <Check size={16} />} Recibido
                    </button>
                  ) : (
                    <span className="flex-1 text-center text-xs text-green-700 font-medium py-2.5 flex items-center justify-center gap-1">
                      <Check size={14} /> Recibido {hhmm(m.recibido_at as string)}
                    </span>
                  )}
                  <a href={`tel:${CENTRAL_TEL}`}
                    className="flex-1 border border-gray-200 text-[#1b2a4a] text-sm font-semibold py-2.5 rounded-xl flex items-center justify-center gap-1.5">
                    <Phone size={16} /> Llamar a la central
                  </a>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
