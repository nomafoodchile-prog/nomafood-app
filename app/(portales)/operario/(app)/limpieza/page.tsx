'use client'

import { useCallback, useEffect, useState } from 'react'
import { Loader2, SprayCan, Clock, Check, ChevronDown, CheckCircle2 } from 'lucide-react'

interface Tarea { id: string; nombre: string; area: string; pasos: string[]; tiempo_estimado_min: number | null; proxima: string; estado: 'atrasado' | 'hoy' | 'ok' }

export default function OperarioLimpiezaPage() {
  const [loading, setLoading] = useState(true)
  const [tareas, setTareas] = useState<Tarea[]>([])
  const [abierta, setAbierta] = useState<string | null>(null)
  const [marcando, setMarcando] = useState<string | null>(null)

  const cargar = useCallback(async () => {
    try {
      const r = await fetch('/api/portal/operario/limpieza')
      const d = await r.json()
      setTareas(r.ok ? (d.tareas || []) : [])
    } catch { setTareas([]) }
    setLoading(false)
  }, [])
  useEffect(() => { cargar() }, [cargar])

  async function marcar(id: string) {
    setMarcando(id)
    try {
      const r = await fetch('/api/portal/operario/limpieza', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tarea_id: id }) })
      if (r.ok) setTareas(prev => prev.filter(t => t.id !== id))
      else alert('No se pudo registrar. Intenta de nuevo.')
    } catch { alert('Sin conexión. Intenta de nuevo.') }
    setMarcando(null)
  }

  if (loading) return <div className="min-h-[60vh] flex items-center justify-center"><Loader2 className="w-6 h-6 text-[#1b2a4a] animate-spin" /></div>

  return (
    <div>
      <header className="bg-[#1b2a4a] text-white px-5 pt-6 pb-5 rounded-b-3xl">
        <h1 className="text-lg font-semibold flex items-center gap-2"><SprayCan size={18} className="text-[#c9a24e]" /> Limpieza · hoy</h1>
        <p className="text-xs text-white/70">Tareas de aseo que te tocan hoy</p>
      </header>

      <div className="px-5 pt-4 space-y-3">
        {tareas.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <CheckCircle2 className="w-10 h-10 text-green-400 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-600">¡Todo al día!</p>
            <p className="text-xs">No hay limpieza pendiente por ahora.</p>
          </div>
        ) : tareas.map(t => (
          <div key={t.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <button onClick={() => setAbierta(abierta === t.id ? null : t.id)} className="w-full flex items-center justify-between gap-2 p-4 text-left">
              <div>
                <p className="font-semibold text-[#1a1a1a] text-sm">{t.nombre}</p>
                <p className="text-xs text-gray-500 flex items-center gap-2 mt-0.5">
                  {t.area}
                  {t.estado === 'atrasado' && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-100 text-red-700">Atrasada</span>}
                  {t.estado === 'hoy' && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700">Hoy</span>}
                </p>
              </div>
              <span className="flex items-center gap-1.5 flex-shrink-0 text-xs text-gray-400"><Clock size={13} /> {t.tiempo_estimado_min ? `${t.tiempo_estimado_min}m` : '—'} <ChevronDown size={15} className={`transition-transform ${abierta === t.id ? 'rotate-180' : ''}`} /></span>
            </button>
            {abierta === t.id && (
              <div className="px-4 pb-4">
                {t.pasos.length > 0 ? (
                  <ol className="list-decimal pl-5 text-sm text-gray-700 space-y-1.5 mb-3">{t.pasos.map((p, i) => <li key={i}>{p}</li>)}</ol>
                ) : <p className="text-xs text-gray-400 mb-3">Sin paso a paso registrado.</p>}
              </div>
            )}
            <div className="px-4 pb-4">
              <button onClick={() => marcar(t.id)} disabled={marcando === t.id} className="w-full flex items-center justify-center gap-2 bg-green-600 text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-green-700 disabled:opacity-60">
                {marcando === t.id ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />} Marcar hecha
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
