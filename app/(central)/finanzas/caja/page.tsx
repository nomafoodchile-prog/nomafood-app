'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Loader2, Plus, RefreshCw, Lock, Ban, Paperclip, FileCheck, X, Pencil, ShieldAlert } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'

type Row = Record<string, unknown>
const S = (v: unknown) => v === null || v === undefined ? '' : String(v)
const N = (v: unknown) => { const n = Number(v); return Number.isNaN(n) ? 0 : n }
const clp = (n: number) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n)
const hoyCl = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' }).format(new Date())
const fmt = (v: unknown) => v ? new Date(String(v) + 'T00:00:00').toLocaleDateString('es-CL', { day: '2-digit', month: 'short' }) : '—'

const VER = ['SuperAdmin', 'Administracion', 'Gerencia', 'Contador']
const EDITAR = ['SuperAdmin', 'Administracion', 'Gerencia']
const REABRIR = ['SuperAdmin', 'Administracion']
const CAT_EGRESO = ['Materia prima', 'Envases', 'Arriendo', 'Sueldos', 'Servicios básicos', 'Mantención', 'Delivery/transporte', 'Impuestos', 'Contador', 'Otros']
const CAT_INGRESO = ['Ventas', 'Otros ingresos']
const MEDIOS = ['Efectivo', 'Transferencia', 'Mercado Pago', 'Tarjeta', 'Otro']
const ORIGEN: Record<string, { l: string; c: string }> = {
  mercado_pago: { l: 'Mercado Pago', c: 'bg-blue-50 text-blue-700' }, compra: { l: 'Compra', c: 'bg-amber-50 text-amber-700' },
  manual: { l: 'Manual', c: 'bg-gray-100 text-gray-500' }, banco: { l: 'Banco', c: 'bg-violet-50 text-violet-700' },
}
const ESTADO: Record<string, { l: string; c: string }> = {
  pendiente: { l: 'Pendiente', c: 'bg-gray-100 text-gray-500' }, conciliado: { l: 'Conciliado', c: 'bg-green-100 text-green-700' },
  anulado: { l: 'Anulado', c: 'bg-red-100 text-red-600' },
}

export default function CajaPage() {
  const [loading, setLoading] = useState(true)
  const [role, setRole] = useState('')
  const [movs, setMovs] = useState<Row[]>([])
  const [cierres, setCierres] = useState<Row[]>([])
  const [error, setError] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [fil, setFil] = useState<Row>({ desde: hoyCl().slice(0, 8) + '01', hasta: hoyCl(), tipo: '', origen: '', estado: '' })
  const [form, setForm] = useState<Row | null>(null)
  const [arqueo, setArqueo] = useState<Row | null>(null)

  const puedeEditar = EDITAR.includes(role)
  const puedeVer = VER.includes(role)

  const cargar = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }
    const { data: p } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
    const r = S((p as Row)?.role); setRole(r)
    if (!VER.includes(r)) { setLoading(false); return }
    const [{ data: m }, { data: c }] = await Promise.all([
      supabase.from('fin_movimientos').select('*').order('fecha', { ascending: false }).order('created_at', { ascending: false }).limit(500),
      supabase.from('fin_cierres_caja').select('*').order('fecha', { ascending: false }).limit(120),
    ])
    setMovs((m as Row[]) || [])
    setCierres((c as Row[]) || [])
    setLoading(false)
  }, [])

  useEffect(() => { cargar() }, [cargar])

  const cerradas = useMemo(() => new Set(cierres.filter(c => S(c.estado) === 'cerrado').map(c => S(c.fecha))), [cierres])
  const hoyCerrada = cerradas.has(hoyCl())

  async function api(payload: Row): Promise<Row | null> {
    setError(null)
    const r = await fetch('/api/central/finanzas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    const d = await r.json() as Row
    if (!r.ok) { setError(S(d.error) || 'Error'); return null }
    return d
  }

  const vis = useMemo(() => movs.filter(m => {
    if (S(fil.desde) && S(m.fecha) < S(fil.desde)) return false
    if (S(fil.hasta) && S(m.fecha) > S(fil.hasta)) return false
    if (fil.tipo && S(m.tipo) !== S(fil.tipo)) return false
    if (fil.origen && S(m.origen) !== S(fil.origen)) return false
    if (fil.estado && S(m.estado) !== S(fil.estado)) return false
    return true
  }), [movs, fil])

  const kpi = useMemo(() => {
    const act = vis.filter(m => !m.anulado)
    const ing = act.filter(m => S(m.tipo) === 'ingreso').reduce((a, m) => a + N(m.monto), 0)
    const egr = act.filter(m => S(m.tipo) === 'egreso').reduce((a, m) => a + N(m.monto), 0)
    return { ing, egr, saldo: ing - egr, pend: act.filter(m => S(m.estado) === 'pendiente').length }
  }, [vis])

  async function sincronizar() {
    setBusy(true); setMsg(null)
    const d = await api({ action: 'sincronizar' })
    setBusy(false)
    if (d) { setMsg(`${N(d.creados)} movimiento(s) importado(s) de pagos y compras.`); cargar() }
  }
  async function guardarMov() {
    if (!form) return
    if (N(form.monto) <= 0) { setError('El monto debe ser mayor a 0'); return }
    const editando = Boolean(form.id)
    if (editando && !form.motivo) { setError('Indica el motivo del cambio'); return }
    setBusy(true)
    let comprobante_url = S(form.comprobante_url) || null
    if (form.file instanceof File) {
      const f = form.file as File
      const path = `${Date.now()}-${f.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
      const { error: eUp } = await supabase.storage.from('comprobantes').upload(path, f, { upsert: true })
      if (!eUp) comprobante_url = supabase.storage.from('comprobantes').getPublicUrl(path).data.publicUrl
    }
    const ok = await api(editando
      ? { action: 'editar', id: form.id, motivo: form.motivo, categoria: form.categoria, descripcion: form.descripcion, medio: form.medio, monto: form.monto }
      : { action: 'crear', fecha: form.fecha, tipo: form.tipo, categoria: form.categoria, descripcion: form.descripcion, medio: form.medio, monto: form.monto, comprobante_url })
    setBusy(false)
    if (ok) { setForm(null); cargar() }
  }
  async function anular(m: Row) {
    const motivo = window.prompt(`Motivo de anulación de "${S(m.descripcion)}":`) || ''
    if (!motivo.trim()) return
    const ok = await api({ action: 'anular', id: m.id, motivo: motivo.trim() })
    if (ok) cargar()
  }
  async function cerrarCaja() {
    if (!arqueo) return
    setBusy(true)
    const d = await api({ action: 'cerrar_caja', fecha: hoyCl(), ...arqueo })
    setBusy(false)
    if (d) { setArqueo(null); setMsg(`Caja cerrada. Diferencia: ${clp(N(d.diferencia))}.`); cargar() }
  }
  async function reabrir(fecha: string) {
    const motivo = window.prompt('Motivo de reapertura de la caja:') || ''
    if (!motivo.trim()) return
    const ok = await api({ action: 'reabrir', fecha, motivo: motivo.trim() })
    if (ok) { setMsg('Caja reabierta.'); cargar() }
  }

  if (loading) return <div className="min-h-[60vh] flex items-center justify-center"><Loader2 className="w-6 h-6 text-[#1b2a4a] animate-spin" /></div>

  if (!puedeVer) return (
    <div className="p-6"><div className="noma-card text-center py-12 max-w-md mx-auto">
      <ShieldAlert className="w-9 h-9 mx-auto text-gray-300 mb-3" />
      <p className="font-semibold text-[#1b2a4a]">Acceso restringido</p>
      <p className="text-sm text-gray-500 mt-1">Solo Administración, Gerencia y Contador pueden ver la Caja.</p>
    </div></div>
  )

  const cats = S(form?.tipo) === 'ingreso' ? CAT_INGRESO : CAT_EGRESO

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-2xl font-bold text-[#1a1a1a]">Caja</h1><p className="text-sm text-gray-500 mt-0.5">Ingresos y egresos · {role === 'Contador' ? 'solo lectura' : 'operativa'}</p></div>
        <div className="flex gap-2 flex-wrap">
          {puedeEditar ? <button onClick={sincronizar} disabled={busy} className="flex items-center gap-2 text-sm text-gray-600 border border-gray-200 rounded-lg px-3 py-2 hover:border-[#c9a24e]"><RefreshCw size={15} className={busy ? 'animate-spin' : ''} /> Sincronizar</button> : null}
          {puedeEditar && !hoyCerrada ? <button onClick={() => setForm({ tipo: 'egreso', fecha: hoyCl(), medio: 'Efectivo' })} className="noma-btn-primary flex items-center gap-2 text-sm"><Plus size={16} /> Movimiento</button> : null}
          {puedeEditar && !hoyCerrada ? <button onClick={() => setArqueo({})} className="flex items-center gap-2 text-sm text-white bg-[#1b2a4a] rounded-lg px-3 py-2"><Lock size={15} /> Cerrar caja</button> : null}
          {hoyCerrada && REABRIR.includes(role) ? <button onClick={() => reabrir(hoyCl())} className="flex items-center gap-2 text-sm text-amber-700 border border-amber-200 rounded-lg px-3 py-2"><Lock size={15} /> Reabrir hoy</button> : null}
        </div>
      </div>
      {error ? <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700">{error}</div> : null}
      {msg ? <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-sm text-blue-800">{msg}</div> : null}
      {hoyCerrada ? <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 flex items-center gap-2"><Lock size={14} /> La caja de hoy está cerrada. Los movimientos del día no se pueden editar.</div> : null}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Kpi label="Ingresos" value={clp(kpi.ing)} color="#27500A" />
        <Kpi label="Egresos" value={clp(kpi.egr)} color="#A32D2D" />
        <Kpi label="Saldo" value={clp(kpi.saldo)} color="#1b2a4a" />
        <Kpi label="Por conciliar" value={String(kpi.pend)} color="#854F0B" />
      </div>

      <div className="noma-card !p-3 flex flex-wrap gap-2 items-end">
        <Campo label="Desde"><input type="date" className="noma-input" value={S(fil.desde)} onChange={e => setFil({ ...fil, desde: e.target.value })} /></Campo>
        <Campo label="Hasta"><input type="date" className="noma-input" value={S(fil.hasta)} onChange={e => setFil({ ...fil, hasta: e.target.value })} /></Campo>
        <Campo label="Tipo"><select className="noma-input" value={S(fil.tipo)} onChange={e => setFil({ ...fil, tipo: e.target.value })}><option value="">Todos</option><option value="ingreso">Ingreso</option><option value="egreso">Egreso</option></select></Campo>
        <Campo label="Origen"><select className="noma-input" value={S(fil.origen)} onChange={e => setFil({ ...fil, origen: e.target.value })}><option value="">Todos</option><option value="mercado_pago">Mercado Pago</option><option value="compra">Compra</option><option value="manual">Manual</option><option value="banco">Banco</option></select></Campo>
        <Campo label="Estado"><select className="noma-input" value={S(fil.estado)} onChange={e => setFil({ ...fil, estado: e.target.value })}><option value="">Todos</option><option value="pendiente">Pendiente</option><option value="conciliado">Conciliado</option><option value="anulado">Anulado</option></select></Campo>
      </div>

      <div className="noma-card !p-0 overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-sm">
        <thead className="bg-gray-50/50 text-gray-400 text-xs text-left"><tr>
          <th className="py-2.5 px-3 font-medium">Fecha</th><th className="py-2.5 px-3 font-medium">Detalle</th><th className="py-2.5 px-3 font-medium">Origen</th><th className="py-2.5 px-3 font-medium">Estado</th><th className="py-2.5 px-3 font-medium text-right">Monto</th><th className="py-2.5 px-3"></th>
        </tr></thead>
        <tbody className="divide-y divide-gray-50">
          {vis.length === 0 ? <tr><td colSpan={6} className="py-10 text-center text-gray-400 text-sm">Sin movimientos en el filtro.</td></tr>
          : vis.map(m => {
            const o = ORIGEN[S(m.origen)] || ORIGEN.manual; const e = ESTADO[S(m.estado)] || ESTADO.pendiente
            const dayLock = cerradas.has(S(m.fecha)); const anul = Boolean(m.anulado)
            return (
              <tr key={S(m.id)} className={anul ? 'opacity-50' : ''}>
                <td className="py-2.5 px-3 text-gray-500 whitespace-nowrap">{fmt(m.fecha)}</td>
                <td className="py-2.5 px-3">
                  <div className={`font-medium ${anul ? 'line-through text-gray-400' : 'text-[#1a1a1a]'}`}>{S(m.descripcion) || '—'}</div>
                  <div className="text-[11px] text-gray-400 flex items-center gap-1.5">{S(m.categoria)}{m.comprobante_url ? <a href={S(m.comprobante_url)} target="_blank" rel="noreferrer" className="text-green-600 inline-flex items-center gap-0.5"><FileCheck size={11} /> comprobante</a> : S(m.origen) === 'manual' && S(m.tipo) === 'egreso' ? <span className="text-gray-300 inline-flex items-center gap-0.5"><Paperclip size={11} /> sin comprobante</span> : null}</div>
                </td>
                <td className="py-2.5 px-3"><span className={`text-[10px] px-2 py-0.5 rounded-full ${o.c}`}>{o.l}</span></td>
                <td className="py-2.5 px-3"><span className={`text-[10px] px-2 py-0.5 rounded-full ${e.c}`}>{e.l}</span></td>
                <td className={`py-2.5 px-3 text-right font-medium whitespace-nowrap ${S(m.tipo) === 'ingreso' ? 'text-green-700' : 'text-red-700'}`}>{S(m.tipo) === 'ingreso' ? '+' : '−'}{clp(N(m.monto))}</td>
                <td className="py-2.5 px-3 text-right whitespace-nowrap">
                  {puedeEditar && !anul && !dayLock ? <>
                    {S(m.origen) === 'manual' ? <button onClick={() => setForm({ ...m, file: null })} className="text-gray-300 hover:text-[#1b2a4a] mr-2" title="Editar"><Pencil size={14} /></button> : null}
                    <button onClick={() => anular(m)} className="text-gray-300 hover:text-red-500" title="Anular"><Ban size={14} /></button>
                  </> : dayLock && !anul ? <Lock size={13} className="text-gray-300 inline" /> : null}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table></div></div>

      {form ? (
        <Modal title={form.id ? 'Editar movimiento' : 'Nuevo movimiento'} onClose={() => setForm(null)}>
          {!form.id ? <div className="flex gap-2 mb-3">
            {['ingreso', 'egreso'].map(t => <button key={t} onClick={() => setForm({ ...form, tipo: t, categoria: '' })} className={`flex-1 text-sm py-2 rounded-lg ${S(form.tipo) === t ? 'bg-[#1b2a4a] text-white' : 'bg-gray-100 text-gray-600'}`}>{t === 'ingreso' ? 'Ingreso' : 'Egreso'}</button>)}
          </div> : null}
          <div className="grid grid-cols-2 gap-3">
            <Campo label="Fecha"><input type="date" className="noma-input" value={S(form.fecha)} disabled={Boolean(form.id)} onChange={e => setForm({ ...form, fecha: e.target.value })} /></Campo>
            <Campo label="Monto"><input type="number" className="noma-input" value={S(form.monto)} onChange={e => setForm({ ...form, monto: e.target.value })} /></Campo>
            <Campo label="Categoría"><select className="noma-input" value={S(form.categoria)} onChange={e => setForm({ ...form, categoria: e.target.value })}><option value="">—</option>{cats.map(c => <option key={c} value={c}>{c}</option>)}</select></Campo>
            <Campo label="Medio"><select className="noma-input" value={S(form.medio)} onChange={e => setForm({ ...form, medio: e.target.value })}>{MEDIOS.map(c => <option key={c} value={c}>{c}</option>)}</select></Campo>
            <div className="col-span-2"><Campo label="Descripción"><input className="noma-input" value={S(form.descripcion)} onChange={e => setForm({ ...form, descripcion: e.target.value })} /></Campo></div>
            {!form.id && S(form.tipo) === 'egreso' ? <div className="col-span-2"><Campo label="Comprobante (PDF/imagen)"><input type="file" accept="image/*,application/pdf" className="noma-input" onChange={e => setForm({ ...form, file: e.target.files?.[0] || null })} /></Campo></div> : null}
            {form.id ? <div className="col-span-2"><Campo label="Motivo del cambio *"><input className="noma-input" value={S(form.motivo)} onChange={e => setForm({ ...form, motivo: e.target.value })} /></Campo></div> : null}
          </div>
          <button onClick={guardarMov} disabled={busy} className="noma-btn-primary text-sm mt-4 w-full flex items-center justify-center gap-2">{busy ? <Loader2 size={15} className="animate-spin" /> : null} Guardar</button>
        </Modal>
      ) : null}

      {arqueo ? (
        <Modal title="Cerrar caja del día · arqueo" onClose={() => setArqueo(null)}>
          <p className="text-xs text-gray-500 mb-3">Ingresa lo contado físicamente. El sistema calcula la diferencia con lo registrado.</p>
          <div className="grid grid-cols-2 gap-3">
            <Campo label="Efectivo real"><input type="number" className="noma-input" value={S(arqueo.arqueo_efectivo)} onChange={e => setArqueo({ ...arqueo, arqueo_efectivo: e.target.value })} /></Campo>
            <Campo label="Transferencias"><input type="number" className="noma-input" value={S(arqueo.arqueo_transferencias)} onChange={e => setArqueo({ ...arqueo, arqueo_transferencias: e.target.value })} /></Campo>
            <Campo label="Mercado Pago"><input type="number" className="noma-input" value={S(arqueo.arqueo_mp)} onChange={e => setArqueo({ ...arqueo, arqueo_mp: e.target.value })} /></Campo>
            <Campo label="Egresos"><input type="number" className="noma-input" value={S(arqueo.arqueo_egresos)} onChange={e => setArqueo({ ...arqueo, arqueo_egresos: e.target.value })} /></Campo>
            <div className="col-span-2"><Campo label="Observaciones"><textarea className="noma-input" rows={2} value={S(arqueo.observaciones)} onChange={e => setArqueo({ ...arqueo, observaciones: e.target.value })} /></Campo></div>
          </div>
          <button onClick={cerrarCaja} disabled={busy} className="text-sm mt-4 w-full flex items-center justify-center gap-2 bg-[#1b2a4a] text-white rounded-lg py-2.5">{busy ? <Loader2 size={15} className="animate-spin" /> : <Lock size={15} />} Cerrar caja del día</button>
        </Modal>
      ) : null}
    </div>
  )
}

function Kpi({ label, value, color }: { label: string; value: string; color: string }) {
  return <div className="bg-gray-50 rounded-xl p-3"><div className="text-[11px] text-gray-500">{label}</div><div className="text-lg font-semibold" style={{ color }}>{value}</div></div>
}
function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><div className="text-[11px] text-gray-500 mb-1">{label}</div>{children}</div>
}
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-white rounded-2xl p-5 w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3"><h3 className="font-bold text-[#1b2a4a]">{title}</h3><button onClick={onClose} className="text-gray-400"><X size={18} /></button></div>
        {children}
      </div>
    </div>
  )
}
