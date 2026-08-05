'use client'

import { useState, useEffect, useCallback } from 'react'
import { Loader2, MapPin, Check, X, Clock } from 'lucide-react'

interface Dir { id: string; cliente: string; alias: string | null; direccion: string; comuna: string | null; contacto: string | null; telefono: string | null; estado: string; created_at: string }

const EST: Record<string, { l: string; c: string }> = {
  pendiente: { l: 'En revisión', c: 'bg-amber-100 text-amber-700' },
  aprobada:  { l: 'Aprobada',    c: 'bg-green-100 text-green-700' },
  rechazada: { l: 'Rechazada',   c: 'bg-red-100 text-red-700' },
}

export default function DireccionesPage() {
  const [dirs, setDirs] = useState<Dir[]>([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState<'pendiente' | 'aprobada' | 'rechazada' | 'todas'>('pendiente')
  const [actuando, setActuando] = useState<string | null>(null)

  const cargar = useCallback(async () => {
    setLoading(true)
    try { const r = await fetch('/api/central/direcciones'); const d = await r.json(); setDirs(r.ok ? (d.direcciones || []) : []) }
    catch { setDirs([]) }
    setLoading(false)
  }, [])
  useEffect(() => { cargar() }, [cargar])

  async function actuar(id: string, estado: string) {
    setActuando(id)
    try {
      await fetch('/api/central/direcciones', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, estado }) })
      await cargar()
    } catch { alert('No se pudo actualizar') }
    setActuando(null)
  }

  const vis = dirs.filter(d => filtro === 'todas' || d.estado === filtro)
  const pendientes = dirs.filter(d => d.estado === 'pendiente').length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1a1a1a]">Direcciones de despacho</h1>
        <p className="text-sm text-gray-500 mt-0.5">Aprueba las direcciones que proponen los clientes para poder despacharles.</p>
      </div>

      <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        {([['pendiente', `Por revisar${pendientes ? ` (${pendientes})` : ''}`], ['aprobada', 'Aprobadas'], ['rechazada', 'Rechazadas'], ['todas', 'Todas']] as const).map(([k, l]) => (
          <button key={k} onClick={() => setFiltro(k)} className={`px-3 py-1.5 rounded-md text-xs font-semibold ${filtro === k ? 'bg-white text-[#1b2a4a] shadow-sm' : 'text-gray-500'}`}>{l}</button>
        ))}
      </div>

      {loading ? (
        <div className="py-16 text-center"><Loader2 className="w-6 h-6 text-[#1b2a4a] animate-spin mx-auto" /></div>
      ) : vis.length === 0 ? (
        <div className="noma-card text-center py-14 text-gray-400 text-sm">
          <MapPin className="w-8 h-8 text-gray-200 mx-auto mb-2" />
          {filtro === 'pendiente' ? 'No hay direcciones por revisar.' : 'Sin direcciones en esta vista.'}
        </div>
      ) : (
        <div className="space-y-3">
          {vis.map(d => (
            <div key={d.id} className="noma-card flex items-start justify-between gap-4 flex-wrap">
              <div className="flex items-start gap-3">
                <MapPin size={18} className="text-[#c9a24e] mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-[#1a1a1a]">{d.cliente} {d.alias && <span className="text-xs font-normal text-gray-400">· {d.alias}</span>}</p>
                  <p className="text-sm text-gray-600">{d.direccion}{d.comuna ? `, ${d.comuna}` : ''}</p>
                  {(d.contacto || d.telefono) && <p className="text-xs text-gray-400 mt-0.5">{d.contacto}{d.contacto && d.telefono ? ' · ' : ''}{d.telefono}</p>}
                  <span className={`inline-block mt-2 text-[10px] font-bold px-2 py-0.5 rounded-full ${EST[d.estado]?.c || 'bg-gray-100 text-gray-600'}`}>{EST[d.estado]?.l || d.estado}</span>
                </div>
              </div>
              <div className="flex gap-2">
                {d.estado !== 'aprobada' && (
                  <button onClick={() => actuar(d.id, 'aprobada')} disabled={actuando === d.id} className="text-xs font-semibold flex items-center gap-1.5 bg-green-600 text-white rounded-lg px-3 py-1.5 hover:bg-green-700 disabled:opacity-60"><Check size={13} /> Aprobar</button>
                )}
                {d.estado !== 'rechazada' && (
                  <button onClick={() => actuar(d.id, 'rechazada')} disabled={actuando === d.id} className="text-xs font-semibold flex items-center gap-1.5 border border-gray-200 text-gray-600 rounded-lg px-3 py-1.5 hover:border-red-300 hover:text-red-600 disabled:opacity-60"><X size={13} /> Rechazar</button>
                )}
                {d.estado === 'rechazada' && (
                  <button onClick={() => actuar(d.id, 'pendiente')} disabled={actuando === d.id} className="text-xs font-semibold flex items-center gap-1.5 border border-gray-200 text-gray-500 rounded-lg px-3 py-1.5 hover:border-[#c9a24e] disabled:opacity-60"><Clock size={13} /> Reabrir</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
