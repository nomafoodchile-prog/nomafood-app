'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { MessageCircle, Loader2, Send, Check, User, CheckCheck } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'

interface Driver { id: string; nombre: string }
interface Msg { id: string; texto: string; tipo: string; created_at: string; leido: boolean; recibido_at: string | null }
function hhmm(iso: string) { return new Date(iso).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }) }
function fecha(iso: string) { return new Date(iso).toLocaleDateString('es-CL', { day: '2-digit', month: 'short' }) }

const SEEN_KEY = 'central_msgs_seen'

export default function MensajesCentral() {
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [sel, setSel] = useState<string | null>(null)
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [pendientes, setPendientes] = useState<Record<string, number>>({})
  const [texto, setTexto] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const finRef = useRef<HTMLDivElement>(null)

  // Al abrir esta pantalla, marca las novedades como vistas
  useEffect(() => { try { localStorage.setItem(SEEN_KEY, new Date().toISOString()) } catch {} }, [])

  const cargarDrivers = useCallback(async () => {
    const { data } = await supabase.from('drivers').select('id, nombre').eq('activo', true).order('nombre')
    const list = (data as Driver[]) || []
    setDrivers(list)
    setSel(s => s ?? list[0]?.id ?? null)
    // pendientes de acuse por chofer
    const { data: pend } = await supabase.from('driver_messages').select('driver_id, recibido_at').is('recibido_at', null)
    const map: Record<string, number> = {}
    for (const m of (pend as { driver_id: string }[]) || []) map[m.driver_id] = (map[m.driver_id] || 0) + 1
    setPendientes(map)
    setLoading(false)
  }, [])

  const cargarMsgs = useCallback(async (did: string) => {
    const { data } = await supabase.from('driver_messages')
      .select('id, texto, tipo, created_at, leido, recibido_at')
      .eq('driver_id', did).order('created_at', { ascending: true })
    setMsgs((data as Msg[]) || [])
    setTimeout(() => finRef.current?.scrollIntoView({ behavior: 'smooth' }), 60)
  }, [])

  useEffect(() => { cargarDrivers() }, [cargarDrivers])
  useEffect(() => { if (sel) cargarMsgs(sel) }, [sel, cargarMsgs])
  useEffect(() => {
    const ch = supabase.channel('central-msgs-page')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'driver_messages' }, () => { cargarDrivers(); if (sel) cargarMsgs(sel) })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [sel, cargarDrivers, cargarMsgs])

  async function enviar() {
    if (!sel || !texto.trim()) return
    setSending(true)
    const { error } = await supabase.rpc('enviar_mensaje_chofer', { p_driver_id: sel, p_texto: texto.trim(), p_tipo: 'alerta' })
    if (!error) { setTexto(''); await cargarMsgs(sel) }
    setSending(false)
  }

  if (loading) return <div className="min-h-[60vh] flex items-center justify-center"><Loader2 className="w-6 h-6 text-[#1b2a4a] animate-spin" /></div>

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-[#1b2a4a] flex items-center gap-2"><MessageCircle className="w-6 h-6 text-[#c9a24e]" /> Mensajes a choferes</h1>
        <p className="text-sm text-gray-500 mt-0.5">Envía instrucciones y revisa el acuse de recibo. Historial completo por chofer.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Choferes */}
        <div className="bg-white rounded-2xl shadow-card p-3 h-fit">
          <p className="text-xs font-semibold text-gray-400 px-2 mb-1">Choferes</p>
          {drivers.map(d => (
            <button key={d.id} onClick={() => setSel(d.id)}
              className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-left ${sel === d.id ? 'bg-[#eef1f6]' : 'hover:bg-gray-50'}`}>
              <span className="w-8 h-8 rounded-full bg-[#1b2a4a]/10 flex items-center justify-center flex-shrink-0"><User size={15} className="text-[#1b2a4a]" /></span>
              <span className="flex-1 text-sm font-medium text-[#1b2a4a] truncate">{d.nombre}</span>
              {pendientes[d.id] > 0 && <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-[#c9a24e] text-[#1b2a4a] text-[10px] font-bold flex items-center justify-center">{pendientes[d.id]}</span>}
            </button>
          ))}
          {drivers.length === 0 && <p className="text-xs text-gray-400 px-2 py-3">No hay choferes activos.</p>}
        </div>

        {/* Conversación */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-card flex flex-col" style={{ minHeight: '60vh' }}>
          <div className="flex-1 overflow-y-auto p-4 space-y-2" style={{ maxHeight: '60vh' }}>
            {msgs.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-gray-400 py-10">
                <MessageCircle className="w-10 h-10 mb-2 text-gray-200" />
                <p className="text-sm">Sin mensajes con este chofer todavía.</p>
              </div>
            ) : msgs.map(m => (
              <div key={m.id} className="flex justify-end">
                <div className="max-w-[80%] bg-[#1b2a4a] text-white rounded-2xl rounded-br-sm px-3.5 py-2">
                  <p className="text-sm">{m.texto}</p>
                  <p className="text-[10px] text-white/60 mt-1 flex items-center justify-end gap-1">
                    {fecha(m.created_at)} {hhmm(m.created_at)}
                    {m.recibido_at
                      ? <span className="text-green-300 flex items-center gap-0.5"><CheckCheck size={12} /> Recibido {hhmm(m.recibido_at)}</span>
                      : <span className="flex items-center gap-0.5"><Check size={12} /> Enviado</span>}
                  </p>
                </div>
              </div>
            ))}
            <div ref={finRef} />
          </div>

          <div className="border-t border-gray-100 p-3 flex items-end gap-2">
            <textarea value={texto} onChange={e => setTexto(e.target.value)} rows={1} placeholder="Escribe una instrucción…"
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar() } }}
              className="flex-1 resize-none px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#c9a24e]" />
            <button onClick={enviar} disabled={sending || !texto.trim() || !sel}
              className="bg-[#c9a24e] hover:bg-[#b8923f] text-[#1b2a4a] font-semibold px-4 py-2.5 rounded-xl flex items-center gap-1.5 disabled:opacity-50">
              {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} Enviar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
