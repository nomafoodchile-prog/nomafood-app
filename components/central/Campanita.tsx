'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Bell, Volume2, VolumeX, Check } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'

interface Notif { id: string; tipo: string; prioridad: string; area: string | null; titulo: string; mensaje: string | null; accion_sugerida: string | null; estado: string; created_at: string }

const PRIO_C: Record<string, string> = { critica: 'bg-red-100 text-red-700', alta: 'bg-amber-100 text-amber-700', media: 'bg-blue-100 text-blue-700', baja: 'bg-gray-100 text-gray-600' }

function beep() {
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    const ctx = new AC()
    const o = ctx.createOscillator(); const g = ctx.createGain()
    o.connect(g); g.connect(ctx.destination); o.type = 'sine'; o.frequency.value = 880
    g.gain.setValueAtTime(0.15, ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)
    o.start(); o.stop(ctx.currentTime + 0.4)
  } catch { /* silencio */ }
}

export function Campanita() {
  const [open, setOpen] = useState(false)
  const [notifs, setNotifs] = useState<Notif[]>([])
  const [sonido, setSonido] = useState(true)
  const lastUrg = useRef(0)

  useEffect(() => { setSonido(localStorage.getItem('noma-alert-sound') !== 'off') }, [])

  const cargar = useCallback(async () => {
    const { data } = await supabase.from('notificaciones').select('id, tipo, prioridad, area, titulo, mensaje, accion_sugerida, estado, created_at').neq('estado', 'resuelta').order('created_at', { ascending: false }).limit(30)
    const list = (data as Notif[]) || []
    const urg = list.filter(n => n.estado === 'nueva' && (n.prioridad === 'critica' || n.prioridad === 'alta')).length
    if (urg > lastUrg.current && localStorage.getItem('noma-alert-sound') !== 'off') beep()
    lastUrg.current = urg
    setNotifs(list)
  }, [])

  const generar = useCallback(async () => {
    const last = Number(localStorage.getItem('noma-alert-gen') || '0')
    if (Date.now() - last < 90000) return
    localStorage.setItem('noma-alert-gen', String(Date.now()))
    try { await fetch('/api/central/alertas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'generar' }) }) } catch { /* red */ }
  }, [])

  useEffect(() => {
    let vivo = true
    const ciclo = async () => { await generar(); if (vivo) cargar() }
    ciclo()
    const t = setInterval(ciclo, 60000)
    return () => { vivo = false; clearInterval(t) }
  }, [generar, cargar])

  async function toggleAbrir() {
    const abriendo = !open
    setOpen(abriendo)
    if (abriendo && notifs.some(n => n.estado === 'nueva')) {
      await fetch('/api/central/alertas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'marcar_vistas' }) })
      cargar()
    }
  }
  async function resolver(id: string) {
    await fetch('/api/central/alertas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'estado', id, estado: 'resuelta' }) })
    cargar()
  }
  function toggleSonido() {
    const n = !sonido; setSonido(n); localStorage.setItem('noma-alert-sound', n ? 'on' : 'off')
  }

  const nuevas = notifs.filter(n => n.estado === 'nueva').length

  return (
    <div className="relative">
      <button onClick={toggleAbrir} className="relative w-9 h-9 rounded-lg bg-gray-50 flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors" aria-label="Notificaciones">
        <Bell size={16} />
        {nuevas > 0 && <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-white">{nuevas}</span>}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl border border-gray-200 shadow-lg z-40 overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
              <Bell size={15} /><span className="text-sm font-semibold text-[#1b2a4a]">Notificaciones</span>
              {nuevas > 0 && <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-700">{nuevas} nuevas</span>}
              <button onClick={toggleSonido} className="ml-auto text-gray-400 hover:text-gray-600" aria-label="Sonido">{sonido ? <Volume2 size={16} /> : <VolumeX size={16} />}</button>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {notifs.length === 0 ? <p className="text-sm text-gray-400 text-center py-8">Sin alertas. Todo en orden.</p>
                : notifs.map(n => (
                  <div key={n.id} className={`px-4 py-3 border-b border-gray-50 ${n.estado === 'nueva' ? 'bg-amber-50/40' : ''}`}>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${PRIO_C[n.prioridad] || ''}`}>{n.prioridad}</span>
                      <span className="text-[11px] text-gray-400">{n.area || ''}</span>
                      <button onClick={() => resolver(n.id)} className="ml-auto text-gray-300 hover:text-green-600" aria-label="Resolver"><Check size={14} /></button>
                    </div>
                    <div className="text-sm text-[#1b2a4a] mt-1">{n.titulo}</div>
                    {n.accion_sugerida && <div className="text-[11px] text-gray-500 mt-0.5">Sugerido: {n.accion_sugerida}</div>}
                  </div>
                ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
