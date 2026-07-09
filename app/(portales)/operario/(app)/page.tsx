'use client'

import { useCallback, useEffect, useState } from 'react'
import { Loader2, Play, Square, Clock, LogIn } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'

type Row = Record<string, unknown>
const S = (v: unknown) => v === null || v === undefined ? '' : String(v)
const hhmm = (v: unknown) => v ? new Date(String(v)).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }) : '—'
const hoy = () => new Date().toLocaleDateString('en-CA') // YYYY-MM-DD local

const ESTADO_LBL: Record<string, string> = { no_iniciado: 'No iniciado', en_turno: 'En turno', pausado: 'Pausado', finalizado: 'Finalizado' }
const ESTADO_CLR: Record<string, string> = { no_iniciado: 'bg-gray-400', en_turno: 'bg-green-500', pausado: 'bg-amber-500', finalizado: 'bg-[#1b2a4a]' }

function transcurrido(desde: string | null, hasta: string | null): string {
  if (!desde) return '00:00'
  const fin = hasta ? new Date(hasta).getTime() : Date.now()
  const min = Math.max(0, Math.floor((fin - new Date(desde).getTime()) / 60000))
  return `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`
}

const BARRAS = [
  { k: 'Tareas', ayuda: 'tareas completadas' },
  { k: 'Tiempo', ayuda: 'estimado vs real' },
  { k: 'Calidad', ayuda: 'checklist y mermas' },
  { k: 'Asistencia', ayuda: 'atrasos y faltas' },
  { k: 'Producción', ayuda: 'producido vs asignado' },
]

export default function OperarioInicioPage() {
  const [loading, setLoading] = useState(true)
  const [uid, setUid] = useState<string | null>(null)
  const [profile, setProfile] = useState<Row | null>(null)
  const [operario, setOperario] = useState<Row | null>(null)
  const [jornada, setJornada] = useState<Row | null>(null)
  const [saludo, setSaludo] = useState('')
  const [busy, setBusy] = useState(false)
  const [tick, setTick] = useState(0)

  const cargar = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setUid(user.id)
    const [{ data: p }, { data: op }, { data: j }, { data: msgs }] = await Promise.all([
      supabase.from('profiles').select('full_name, role').eq('id', user.id).maybeSingle(),
      supabase.from('operarios').select('area, turno_default, activo').eq('profile_id', user.id).maybeSingle(),
      supabase.from('op_jornadas').select('*').eq('operario_id', user.id).eq('fecha', hoy()).maybeSingle(),
      supabase.from('op_mensajes').select('texto').eq('contexto', 'login').eq('activo', true),
    ])
    setProfile((p as Row) || null)
    setOperario((op as Row) || null)
    setJornada((j as Row) || null)
    const lista = (msgs as { texto: string }[]) || []
    if (lista.length) setSaludo(lista[Math.floor(Math.random() * lista.length)].texto)
    setLoading(false)
  }, [])

  useEffect(() => { cargar() }, [cargar])

  // Reloj para el tiempo trabajado en vivo
  useEffect(() => {
    if (S(jornada?.estado) !== 'en_turno') return
    const t = setInterval(() => setTick(x => x + 1), 30000)
    return () => clearInterval(t)
  }, [jornada])

  async function iniciarJornada() {
    if (!uid) return
    setBusy(true)
    const { data } = await supabase.from('op_jornadas').insert({
      operario_id: uid, fecha: hoy(), hora_inicio: new Date().toISOString(), estado: 'en_turno',
    }).select('*').single()
    if (data) setJornada(data as Row)
    setBusy(false)
  }
  async function finalizarJornada() {
    if (!jornada?.id) return
    setBusy(true)
    const { data } = await supabase.from('op_jornadas').update({
      hora_fin: new Date().toISOString(), estado: 'finalizado', updated_at: new Date().toISOString(),
    }).eq('id', jornada.id).select('*').single()
    if (data) setJornada(data as Row)
    setBusy(false)
  }

  if (loading) return <div className="min-h-[60vh] flex items-center justify-center"><Loader2 className="w-6 h-6 text-[#1b2a4a] animate-spin" /></div>

  const nombre = S(profile?.full_name).split(' ')[0] || 'operario'
  const estado = jornada ? S(jornada.estado) : 'no_iniciado'
  const enTurno = estado === 'en_turno'
  const finalizada = estado === 'finalizado'
  void tick // fuerza el re-render del tiempo trabajado

  if (!operario) {
    return (
      <div className="p-5">
        <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center mt-8">
          <p className="text-[#1b2a4a] font-semibold">Aún no tienes perfil de operario</p>
          <p className="text-sm text-gray-500 mt-2">Pide a la Central que active tu acceso de operario para ver tus tareas.</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <header className="bg-[#1b2a4a] text-white px-5 pt-6 pb-5 rounded-b-3xl">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-[#c9a24e] text-[#1b2a4a] flex items-center justify-center font-bold">
            {S(profile?.full_name).slice(0, 2).toUpperCase() || 'OP'}
          </div>
          <div className="flex-1">
            <div className="font-semibold">Hola, {nombre}</div>
            <div className="text-xs text-white/70">{S(operario.area) || 'Sin área'}{operario.turno_default ? ` · Turno ${S(operario.turno_default)}` : ''}</div>
          </div>
          <span className="text-[11px] px-2.5 py-1 rounded-full flex items-center gap-1.5 bg-white/10">
            <span className={`w-2 h-2 rounded-full ${ESTADO_CLR[estado]}`} />{ESTADO_LBL[estado]}
          </span>
        </div>
        {saludo && <div className="mt-4 bg-white/10 rounded-xl px-3 py-2.5 text-sm">{saludo}</div>}
      </header>

      <div className="px-5 -mt-3 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-xl border border-gray-100 p-3">
            <div className="text-[11px] text-gray-500 flex items-center gap-1"><LogIn size={12} /> Ingreso</div>
            <div className="text-lg font-semibold text-[#1b2a4a]">{hhmm(jornada?.hora_inicio)}</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-3">
            <div className="text-[11px] text-gray-500 flex items-center gap-1"><Clock size={12} /> Trabajado</div>
            <div className="text-lg font-semibold text-[#1b2a4a]">{transcurrido(S(jornada?.hora_inicio) || null, finalizada ? S(jornada?.hora_fin) : null)}</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <div className="text-xs text-gray-500 mb-3">Cumplimiento de hoy</div>
          <div className="space-y-2.5">
            {BARRAS.map(b => (
              <div key={b.k}>
                <div className="flex justify-between text-xs text-gray-600"><span>{b.k}</span><span className="text-gray-400">— {b.ayuda}</span></div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden mt-1"><div className="h-full bg-gray-200" style={{ width: '0%' }} /></div>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-gray-400 mt-3">Las barras se activan cuando tengas tareas asignadas.</p>
        </div>

        {!jornada && (
          <button onClick={iniciarJornada} disabled={busy} className="w-full bg-[#c9a24e] text-[#1b2a4a] font-semibold rounded-2xl py-4 flex items-center justify-center gap-2 disabled:opacity-60">
            {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play size={20} />} Iniciar jornada
          </button>
        )}
        {enTurno && (
          <button onClick={finalizarJornada} disabled={busy} className="w-full bg-[#c0392b] text-white font-semibold rounded-2xl py-4 flex items-center justify-center gap-2 disabled:opacity-60">
            {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <Square size={20} />} Finalizar jornada
          </button>
        )}
        {finalizada && (
          <div className="bg-green-50 border border-green-200 text-green-800 rounded-2xl py-4 text-center text-sm font-medium">
            Jornada finalizada a las {hhmm(jornada?.hora_fin)}. ¡Gracias por tu trabajo!
          </div>
        )}
      </div>
    </div>
  )
}
