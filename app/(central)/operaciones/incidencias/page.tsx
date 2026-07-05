'use client'

import { useCallback, useEffect, useState } from 'react'
import { AlertTriangle, Loader2, Image as ImageIcon, Check, User, RefreshCw } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'

interface Row {
  id: string; tipo: string; comentario: string | null; foto_url: string | null
  estado_resolucion: string; resolved_at: string | null; respuesta_central: string | null; created_at: string
  driver: { nombre: string } | null
  pedido: { numero_pedido: string } | null
}
const TIPO_L: Record<string, string> = {
  cliente_ausente: 'Cliente ausente', direccion_incorrecta: 'Dirección incorrecta', producto_danado: 'Producto dañado',
  cliente_rechaza: 'Cliente rechaza', rechazo: 'Rechazo', retraso: 'Retraso', vehiculo_averiado: 'Vehículo averiado',
  problema_transito: 'Problema de tránsito', problema_pago: 'Problema de pago', no_entregado: 'No entregado', otro: 'Otro',
}
const EST: Record<string, string> = { abierta: 'noma-badge-red', en_revision: 'noma-badge-gold', resuelta: 'noma-badge-green' }
const EST_L: Record<string, string> = { abierta: 'Abierta', en_revision: 'En revisión', resuelta: 'Resuelta' }
function cuando(iso: string) { return new Date(iso).toLocaleString('es-CL', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) }
function tipoL(t: string) { return TIPO_L[t] || t.replace(/_/g, ' ') }

const PERIODOS: { label: string; dias: number }[] = [
  { label: 'Hoy', dias: 1 }, { label: '7 días', dias: 7 }, { label: '30 días', dias: 30 }, { label: 'Todas', dias: 0 },
]
const ESTADOS: { label: string; v: string }[] = [
  { label: 'Todas', v: 'todas' }, { label: 'Abiertas', v: 'abierta' }, { label: 'En revisión', v: 'en_revision' }, { label: 'Resueltas', v: 'resuelta' },
]

export default function IncidenciasRepo() {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [fEstado, setFEstado] = useState('todas')
  const [fDias, setFDias] = useState(7)
  const [busy, setBusy] = useState<string | null>(null)

  const cargar = useCallback(async () => {
    const { data } = await supabase.from('incidencias')
      .select('id, tipo, comentario, foto_url, estado_resolucion, resolved_at, respuesta_central, created_at, driver:drivers(nombre), pedido:mayorista_pedidos(numero_pedido)')
      .order('created_at', { ascending: false }).limit(300)
    setRows((data as unknown as Row[]) || [])
    setLoading(false)
  }, [])
  useEffect(() => { cargar() }, [cargar])
  useEffect(() => {
    const ch = supabase.channel('central-inc-repo')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'incidencias' }, () => cargar())
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [cargar])

  async function cerrar(id: string) {
    setBusy(id)
    await supabase.rpc('resolver_incidencia', { p_incidencia_id: id, p_estado: 'resuelta' })
    await cargar(); setBusy(null)
  }
  async function verFoto(path: string) {
    const { data } = await supabase.storage.from('incidencias').createSignedUrl(path, 3600)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank')
  }

  const desde = fDias ? Date.now() - fDias * 86400000 : 0
  const enPeriodo = rows.filter(r => new Date(r.created_at).getTime() >= desde)
  const filtradas = enPeriodo.filter(r => fEstado === 'todas' || r.estado_resolucion === fEstado)
  const nAbiertas = enPeriodo.filter(r => r.estado_resolucion === 'abierta').length
  const nRevision = enPeriodo.filter(r => r.estado_resolucion === 'en_revision').length
  const nResueltas = enPeriodo.filter(r => r.estado_resolucion === 'resuelta').length

  if (loading) return <div className="min-h-[60vh] flex items-center justify-center"><Loader2 className="w-6 h-6 text-[#1b2a4a] animate-spin" /></div>

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1b2a4a] flex items-center gap-2"><AlertTriangle className="w-6 h-6 text-[#c9a24e]" /> Incidencias — historial</h1>
          <p className="text-sm text-gray-500 mt-0.5">Repositorio de todas las incidencias reportadas, con evidencia y resolución.</p>
        </div>
        <button onClick={cargar} className="flex items-center gap-1.5 text-xs font-medium text-[#1b2a4a] border border-gray-200 bg-white px-3 py-1.5 rounded-full hover:bg-gray-50"><RefreshCw size={13} /> Actualizar</button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl shadow-card p-4"><p className="text-2xl font-bold text-[#c0392b]">{nAbiertas}</p><p className="text-xs text-gray-500">Abiertas</p></div>
        <div className="bg-white rounded-2xl shadow-card p-4"><p className="text-2xl font-bold text-[#c9a24e]">{nRevision}</p><p className="text-xs text-gray-500">En revisión</p></div>
        <div className="bg-white rounded-2xl shadow-card p-4"><p className="text-2xl font-bold text-green-600">{nResueltas}</p><p className="text-xs text-gray-500">Resueltas</p></div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2">
        {ESTADOS.map(e => (
          <button key={e.v} onClick={() => setFEstado(e.v)}
            className={`text-xs font-medium px-3 py-1.5 rounded-full border ${fEstado === e.v ? 'bg-[#1b2a4a] text-white border-[#1b2a4a]' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>{e.label}</button>
        ))}
        <span className="w-px h-5 bg-gray-200 mx-1" />
        {PERIODOS.map(p => (
          <button key={p.dias} onClick={() => setFDias(p.dias)}
            className={`text-xs font-medium px-3 py-1.5 rounded-full border ${fDias === p.dias ? 'bg-[#c9a24e] text-[#1b2a4a] border-[#c9a24e]' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>{p.label}</button>
        ))}
      </div>

      {/* Lista */}
      {filtradas.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-card p-10 text-center text-sm text-gray-400">No hay incidencias con estos filtros.</div>
      ) : (
        <div className="space-y-3">
          {filtradas.map(r => (
            <div key={r.id} className="bg-white rounded-2xl shadow-card p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="noma-badge-red">{tipoL(r.tipo)}</span>
                <span className={EST[r.estado_resolucion] || 'noma-badge-gray'}>{EST_L[r.estado_resolucion] || r.estado_resolucion}</span>
                <span className="text-[11px] text-gray-400 ml-auto">{cuando(r.created_at)}</span>
              </div>
              {r.comentario && <p className="text-sm text-gray-800 mt-2">{r.comentario}</p>}
              <p className="text-xs text-gray-500 mt-1.5 flex items-center gap-1">
                <User size={12} />{r.driver?.nombre || 'Chofer'}
                {r.pedido?.numero_pedido && <span className="text-gray-400">· {r.pedido.numero_pedido}</span>}
              </p>
              {r.respuesta_central && <p className="text-xs text-[#1b2a4a] mt-2 bg-[#eef1f6] rounded-lg px-3 py-1.5">Central: {r.respuesta_central}</p>}
              {r.resolved_at && <p className="text-[11px] text-green-600 mt-1">Resuelta {cuando(r.resolved_at)}</p>}
              <div className="flex items-center gap-2 mt-3">
                {r.foto_url && (
                  <button onClick={() => verFoto(r.foto_url!)} className="text-xs font-medium text-[#1b2a4a] border border-gray-200 px-2.5 py-1.5 rounded-lg hover:bg-gray-50 flex items-center gap-1"><ImageIcon size={13} /> Ver foto</button>
                )}
                {r.estado_resolucion !== 'resuelta' && (
                  <button onClick={() => cerrar(r.id)} disabled={busy === r.id}
                    className="text-xs font-semibold bg-[#c9a24e] hover:bg-[#b8923f] text-[#1b2a4a] px-2.5 py-1.5 rounded-lg flex items-center gap-1 disabled:opacity-60">
                    {busy === r.id ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Cerrar
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
