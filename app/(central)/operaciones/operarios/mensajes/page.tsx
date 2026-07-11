'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Loader2, ArrowLeft, Plus, Trash2, Check } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'

type Row = Record<string, unknown>
const S = (v: unknown) => v === null || v === undefined ? '' : String(v)

const CONTEXTOS = [
  ['login', 'Bienvenida (al ingresar)'],
  ['inicio_tarea', 'Al iniciar una tarea'],
  ['fin_tarea', 'Al completar una tarea'],
  ['fin_jornada', 'Al finalizar la jornada'],
] as const

export default function MensajesOperarioPage() {
  const [loading, setLoading] = useState(true)
  const [msgs, setMsgs] = useState<Row[]>([])
  const [nuevoCtx, setNuevoCtx] = useState('login')
  const [nuevoTxt, setNuevoTxt] = useState('')
  const [busy, setBusy] = useState(false)

  const cargar = useCallback(async () => {
    const { data } = await supabase.from('op_mensajes').select('*').order('contexto').order('orden')
    setMsgs((data as Row[]) || [])
    setLoading(false)
  }, [])

  useEffect(() => { cargar() }, [cargar])

  async function toggle(id: unknown, activo: boolean) {
    await supabase.from('op_mensajes').update({ activo: !activo }).eq('id', id)
    cargar()
  }
  async function eliminar(id: unknown) {
    if (!confirm('¿Eliminar este mensaje?')) return
    await supabase.from('op_mensajes').delete().eq('id', id)
    cargar()
  }
  async function agregar() {
    if (!nuevoTxt.trim()) return
    setBusy(true)
    await supabase.from('op_mensajes').insert({ contexto: nuevoCtx, texto: nuevoTxt.trim(), activo: true })
    setNuevoTxt('')
    setBusy(false)
    cargar()
  }

  if (loading) return <div className="min-h-[60vh] flex items-center justify-center"><Loader2 className="w-6 h-6 text-[#1b2a4a] animate-spin" /></div>

  return (
    <div className="space-y-6 max-w-2xl">
      <Link href="/operaciones/operarios" className="flex items-center gap-1 text-sm text-gray-500 hover:text-[#1b2a4a]"><ArrowLeft size={15} /> Volver a operarios</Link>
      <div>
        <h1 className="text-2xl font-bold text-[#1a1a1a]">Mensajes motivadores</h1>
        <p className="text-sm text-gray-500 mt-0.5">Se muestran al azar en el portal del operario según el momento. Activa/desactiva o agrega los tuyos.</p>
      </div>

      <div className="noma-card !p-4 space-y-3">
        <div className="text-sm font-semibold text-[#1b2a4a]">Agregar mensaje</div>
        <div className="flex flex-col sm:flex-row gap-2">
          <select className="noma-input sm:w-56" value={nuevoCtx} onChange={e => setNuevoCtx(e.target.value)}>
            {CONTEXTOS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
          <input className="noma-input flex-1" placeholder="Escribe un mensaje corto y positivo…" value={nuevoTxt} onChange={e => setNuevoTxt(e.target.value)} />
          <button onClick={agregar} disabled={busy} className="noma-btn-primary text-sm flex items-center gap-1.5 justify-center">{busy ? <Loader2 size={14} className="animate-spin" /> : <Plus size={15} />} Agregar</button>
        </div>
      </div>

      {CONTEXTOS.map(([k, l]) => {
        const delCtx = msgs.filter(m => S(m.contexto) === k)
        return (
          <div key={k}>
            <div className="text-sm font-semibold text-[#1b2a4a] mb-2">{l}</div>
            {delCtx.length === 0 ? <p className="text-xs text-gray-400">Sin mensajes.</p> : (
              <div className="space-y-2">
                {delCtx.map(m => {
                  const activo = Boolean(m.activo)
                  return (
                    <div key={S(m.id)} className="noma-card !p-3 flex items-center gap-3">
                      <button onClick={() => toggle(m.id, activo)} className={`w-9 h-5 rounded-full relative flex-shrink-0 ${activo ? 'bg-green-500' : 'bg-gray-300'}`}>
                        <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${activo ? 'left-4' : 'left-0.5'}`} />
                      </button>
                      <span className={`flex-1 text-sm ${activo ? 'text-[#1a1a1a]' : 'text-gray-400 line-through'}`}>{S(m.texto)}</span>
                      {activo ? <Check size={14} className="text-green-500" /> : null}
                      <button onClick={() => eliminar(m.id)} className="text-gray-300 hover:text-red-500"><Trash2 size={15} /></button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
