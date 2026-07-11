'use client'

import { useCallback, useEffect, useState } from 'react'
import { Loader2, FileSpreadsheet, Mail, ShieldAlert, Send } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'

type Row = Record<string, unknown>
const S = (v: unknown) => v === null || v === undefined ? '' : String(v)
const N = (v: unknown) => { const n = Number(v); return Number.isNaN(n) ? 0 : n }
const mesActual = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' }).format(new Date()).slice(0, 7)
const VER = ['SuperAdmin', 'Administracion', 'Gerencia', 'Contador']
const HEAD = ['Trabajador', 'Área', 'Días', 'Horas', 'Atrasos', 'Min atraso', 'Faltas justif.', 'Faltas injustif.']

export default function RemuneracionesPage() {
  const [loading, setLoading] = useState(true)
  const [role, setRole] = useState('')
  const [mes, setMes] = useState(mesActual())
  const [filas, setFilas] = useState<Row[]>([])
  const [error, setError] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [enviar, setEnviar] = useState<{ email: string } | null>(null)
  const [busy, setBusy] = useState(false)

  const cargar = useCallback(async (m: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }
    const { data: p } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
    const r = S((p as Row)?.role); setRole(r)
    if (!VER.includes(r)) { setLoading(false); return }
    const res = await fetch('/api/central/finanzas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'remuneraciones', mes: m }) })
    const d = await res.json() as Row
    setFilas((d.filas as Row[]) || [])
    setLoading(false)
  }, [])

  useEffect(() => { cargar(mes) }, [cargar, mes])

  function csvContent(): string {
    const rows = filas.map(f => [S(f.nombre), S(f.area), N(f.dias), N(f.horas), N(f.atrasos), N(f.atraso_min), N(f.faltas_justificadas), N(f.faltas_injustificadas)])
    return [['Remuneraciones', mes], [], HEAD, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\r\n')
  }
  function descargar() {
    const blob = new Blob(['﻿' + csvContent()], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `remuneraciones-${mes}.csv`; a.click()
    URL.revokeObjectURL(url)
  }
  function abrirEnviar() {
    const guardado = typeof localStorage !== 'undefined' ? localStorage.getItem('noma-contador-email') || '' : ''
    setEnviar({ email: guardado }); setError(null)
  }
  async function confirmarEnvio() {
    if (!enviar?.email) { setError('Escribe el correo del contador'); return }
    setBusy(true); setError(null)
    try { localStorage.setItem('noma-contador-email', enviar.email) } catch { /* ignore */ }
    const res = await fetch('/api/central/finanzas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'enviar_contador', email: enviar.email, csv: csvContent(), mes }) })
    const d = await res.json() as Row
    setBusy(false)
    if (!res.ok) { setError(S(d.error) || 'Error'); return }
    setEnviar(null); setMsg(`Consolidado enviado al contador (${enviar.email}).`)
  }

  if (loading) return <div className="min-h-[60vh] flex items-center justify-center"><Loader2 className="w-6 h-6 text-[#1b2a4a] animate-spin" /></div>
  if (!VER.includes(role)) return (
    <div className="p-6"><div className="noma-card text-center py-12 max-w-md mx-auto">
      <ShieldAlert className="w-9 h-9 mx-auto text-gray-300 mb-3" />
      <p className="font-semibold text-[#1b2a4a]">Acceso restringido</p>
      <p className="text-sm text-gray-500 mt-1">Solo Administración, Gerencia y Contador pueden ver Finanzas.</p>
    </div></div>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-2xl font-bold text-[#1a1a1a]">Contabilidad · Remuneraciones</h1><p className="text-sm text-gray-500 mt-0.5">Consolidado mensual por trabajador (desde asistencia)</p></div>
        <div className="flex gap-2 items-center flex-wrap">
          <input type="month" className="noma-input" value={mes} onChange={e => setMes(e.target.value)} />
          <button onClick={descargar} className="flex items-center gap-2 text-sm text-gray-600 border border-gray-200 rounded-lg px-3 py-2 hover:border-[#c9a24e]"><FileSpreadsheet size={15} /> Excel</button>
          <button onClick={abrirEnviar} className="noma-btn-primary flex items-center gap-2 text-sm"><Mail size={15} /> Enviar al contador</button>
        </div>
      </div>
      {error ? <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700">{error}</div> : null}
      {msg ? <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-sm text-green-800">{msg}</div> : null}

      <div className="noma-card !p-0 overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-sm">
        <thead className="bg-gray-50/50 text-gray-400 text-xs text-left"><tr>
          <th className="py-2.5 px-3 font-medium">Trabajador</th><th className="py-2.5 px-3 font-medium">Área</th>
          <th className="py-2.5 px-3 font-medium text-center">Días</th><th className="py-2.5 px-3 font-medium text-center">Horas</th>
          <th className="py-2.5 px-3 font-medium text-center">Atrasos</th><th className="py-2.5 px-3 font-medium text-center">Min</th>
          <th className="py-2.5 px-3 font-medium text-center">F. justif.</th><th className="py-2.5 px-3 font-medium text-center">F. injustif.</th>
        </tr></thead>
        <tbody className="divide-y divide-gray-50">
          {filas.length === 0 ? <tr><td colSpan={8} className="py-10 text-center text-gray-400 text-sm">Sin datos de asistencia para el mes. Registra jornadas o carga la asistencia.</td></tr>
          : filas.map((f, i) => (
            <tr key={i}>
              <td className="py-2.5 px-3 font-medium text-[#1a1a1a]">{S(f.nombre)}</td>
              <td className="py-2.5 px-3 text-gray-500">{S(f.area) || '—'}</td>
              <td className="py-2.5 px-3 text-center">{N(f.dias)}</td>
              <td className="py-2.5 px-3 text-center">{N(f.horas)}</td>
              <td className={`py-2.5 px-3 text-center ${N(f.atrasos) > 0 ? 'text-amber-600' : ''}`}>{N(f.atrasos)}</td>
              <td className="py-2.5 px-3 text-center text-gray-500">{N(f.atraso_min)}</td>
              <td className="py-2.5 px-3 text-center">{N(f.faltas_justificadas)}</td>
              <td className={`py-2.5 px-3 text-center ${N(f.faltas_injustificadas) > 0 ? 'text-red-600 font-medium' : ''}`}>{N(f.faltas_injustificadas)}</td>
            </tr>
          ))}
        </tbody>
      </table></div></div>

      <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 text-xs text-gray-500">
        El sistema entrega los datos; el <strong>contador</strong> genera las liquidaciones. Integración con <strong>GeoVictoria</strong> proyectada: cuando se conecte, la asistencia se llena sola.
      </div>

      {enviar ? (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50" onClick={() => setEnviar(null)}>
          <div className="bg-white rounded-2xl p-5 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-[#1b2a4a] mb-1">Enviar al contador</h3>
            <p className="text-xs text-gray-500 mb-3">Se preparará el consolidado de <strong>{mes}</strong> ({filas.length} trabajadores) y se enviará por correo. Nada se envía sin tu confirmación.</p>
            <div className="text-xs text-gray-500 mb-1">Correo del contador</div>
            <input className="noma-input" type="email" value={enviar.email} onChange={e => setEnviar({ email: e.target.value })} placeholder="contador@ejemplo.cl" />
            {error ? <div className="text-xs text-red-600 mt-2">{error}</div> : null}
            <div className="flex gap-2 mt-4">
              <button onClick={descargar} className="flex-1 text-sm border border-gray-200 rounded-lg py-2.5 flex items-center justify-center gap-2 text-gray-600"><FileSpreadsheet size={15} /> Descargar Excel</button>
              <button onClick={confirmarEnvio} disabled={busy} className="flex-1 noma-btn-primary text-sm flex items-center justify-center gap-2">{busy ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />} Confirmar y enviar</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
