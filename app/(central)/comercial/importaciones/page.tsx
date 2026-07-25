'use client'

import { useEffect, useState } from 'react'
import { Ship, RefreshCw, Phone, Mail } from 'lucide-react'

type Sol = {
  id: string; numero: string; tipo: string | null; rubro: string | null
  descripcion: string | null; cantidad_estimada: string | null; presupuesto: string | null
  nombre: string; empresa: string | null; telefono: string | null; email: string | null
  comentario: string | null; estado: string; created_at: string
}

const ESTADOS = ['nueva', 'en_proceso', 'cotizada', 'cerrada', 'descartada']
const ESTADO_LABEL: Record<string, string> = { nueva: 'Nueva', en_proceso: 'En proceso', cotizada: 'Cotizada', cerrada: 'Cerrada', descartada: 'Descartada' }
const ESTADO_COLOR: Record<string, string> = {
  nueva: 'bg-blue-100 text-blue-700', en_proceso: 'bg-amber-100 text-amber-700',
  cotizada: 'bg-purple-100 text-purple-700', cerrada: 'bg-green-100 text-green-700',
  descartada: 'bg-gray-100 text-gray-500',
}
const fecha = (s: string) => { try { return new Date(s).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' }) } catch { return s } }

export default function ImportacionesPage() {
  const [sols, setSols] = useState<Sol[]>([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState('todas')

  const load = () => {
    setLoading(true)
    fetch('/api/central/importaciones')
      .then(r => r.json())
      .then(j => setSols(j.solicitudes || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  const cambiar = async (id: string, estado: string) => {
    setSols(prev => prev.map(s => s.id === id ? { ...s, estado } : s))
    await fetch('/api/central/importaciones', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, estado }) }).catch(() => {})
  }

  const visibles = filtro === 'todas' ? sols : sols.filter(s => s.estado === filtro)
  const nuevas = sols.filter(s => s.estado === 'nueva').length

  return (
    <div className="p-5 lg:p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-bold text-[#16233f] flex items-center gap-2"><Ship className="text-[#c9a24e]" size={24} /> Importaciones</h1>
        <button onClick={load} className="p-2 rounded-lg text-gray-500 hover:bg-gray-100" title="Actualizar"><RefreshCw size={16} /></button>
      </div>
      <p className="text-sm text-gray-500 mb-5">Solicitudes del canal "Importa desde China" · {nuevas} nueva{nuevas !== 1 ? 's' : ''}</p>

      <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
        {['todas', ...ESTADOS].map(e => (
          <button key={e} onClick={() => setFiltro(e)} className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium ${filtro === e ? 'bg-[#16233f] text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}>
            {e === 'todas' ? 'Todas' : ESTADO_LABEL[e]}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-gray-400 text-sm">Cargando…</p>
      ) : visibles.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center">
          <Ship className="mx-auto text-gray-300 mb-3" size={40} />
          <p className="font-semibold text-[#16233f]">Sin solicitudes {filtro !== 'todas' ? `(${ESTADO_LABEL[filtro]})` : 'todavía'}</p>
          <p className="text-sm text-gray-500 mt-1">Aquí llegarán las solicitudes que la gente envíe desde la landing.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4 items-start">
          {visibles.map(s => (
            <div key={s.id} className="bg-white border border-gray-200 rounded-2xl p-4">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <p className="font-semibold text-[#16233f]">{s.nombre}{s.empresa ? <span className="text-gray-400 font-normal"> · {s.empresa}</span> : null}</p>
                  <p className="text-xs text-gray-400">{s.numero} · {fecha(s.created_at)}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${ESTADO_COLOR[s.estado] || 'bg-gray-100 text-gray-600'}`}>{ESTADO_LABEL[s.estado] || s.estado}</span>
              </div>

              <div className="flex flex-wrap gap-2 mb-2">
                {s.tipo ? <span className="text-xs bg-[#c9a24e]/15 text-[#8a6d1f] px-2 py-0.5 rounded-full">{s.tipo}</span> : null}
                {s.rubro ? <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{s.rubro}</span> : null}
              </div>

              <p className="text-sm text-gray-700 leading-relaxed mb-2">{s.descripcion}</p>

              <div className="text-xs text-gray-500 space-y-0.5 mb-3">
                {s.cantidad_estimada ? <p>Cantidad: {s.cantidad_estimada}</p> : null}
                {s.presupuesto ? <p>Presupuesto: {s.presupuesto}</p> : null}
                {s.comentario ? <p className="text-gray-400">“{s.comentario}”</p> : null}
              </div>

              <div className="flex flex-wrap gap-3 text-xs text-[#16233f] border-t border-gray-100 pt-3 mb-3">
                {s.telefono ? <a href={`tel:${s.telefono}`} className="inline-flex items-center gap-1 hover:text-[#c9a24e]"><Phone size={13} /> {s.telefono}</a> : null}
                {s.email ? <a href={`mailto:${s.email}`} className="inline-flex items-center gap-1 hover:text-[#c9a24e]"><Mail size={13} /> {s.email}</a> : null}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">Estado:</span>
                <select value={s.estado} onChange={e => cambiar(s.id, e.target.value)} className="text-xs border border-gray-200 rounded-lg px-2 py-1 outline-none focus:border-[#c9a24e]">
                  {ESTADOS.map(e => <option key={e} value={e}>{ESTADO_LABEL[e]}</option>)}
                </select>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
