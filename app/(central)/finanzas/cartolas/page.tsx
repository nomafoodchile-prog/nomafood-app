'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Loader2, Upload, Check, Link2, ShieldAlert, FileText } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'

type Row = Record<string, unknown>
const S = (v: unknown) => v === null || v === undefined ? '' : String(v)
const N = (v: unknown) => { const n = Number(v); return Number.isNaN(n) ? 0 : n }
const clp = (n: number) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n)
const fmt = (v: unknown) => v ? new Date(String(v) + 'T00:00:00').toLocaleDateString('es-CL', { day: '2-digit', month: 'short' }) : '—'
const VER = ['SuperAdmin', 'Administracion', 'Gerencia', 'Contador']
const EDITAR = ['SuperAdmin', 'Administracion', 'Gerencia']

interface Linea { fecha: string; descripcion: string; monto: number; tipo: string }

function parseFecha(s: string): string {
  const t = s.trim()
  if (/^\d{4}-\d{2}-\d{2}/.test(t)) return t.slice(0, 10)
  const m = t.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/)
  if (m) { const y = m[3].length === 2 ? '20' + m[3] : m[3]; return `${y}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` }
  return ''
}
function parseMonto(s: string): number {
  const neg = /-/.test(s) || /\(/.test(s)
  const clean = s.replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.')
  const n = Math.abs(parseFloat(clean) || 0)
  return neg ? -n : n
}
function parseCSV(text: string): Linea[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim())
  if (!lines.length) return []
  const delim = (lines[0].match(/;/g) || []).length >= (lines[0].match(/,/g) || []).length ? ';' : ','
  const cells = (l: string) => l.split(delim).map(c => c.replace(/^"|"$/g, '').trim())
  const head = cells(lines[0]).map(h => h.toLowerCase())
  const idx = (keys: string[]) => head.findIndex(h => keys.some(k => h.includes(k)))
  const iF = idx(['fecha', 'date']); const iD = idx(['glosa', 'descrip', 'detalle', 'movimiento', 'concepto'])
  const iCargo = idx(['cargo', 'debito', 'débito']); const iAbono = idx(['abono', 'credito', 'crédito', 'deposito', 'depósito'])
  const iMonto = idx(['monto', 'importe', 'valor'])
  const hasHead = iF >= 0 || iMonto >= 0 || iCargo >= 0
  const out: Linea[] = []
  for (let r = hasHead ? 1 : 0; r < lines.length; r++) {
    const c = cells(lines[r]); if (!c.length) continue
    const fecha = parseFecha(c[iF >= 0 ? iF : 0] || '')
    const desc = c[iD >= 0 ? iD : 1] || 'Movimiento'
    let monto = 0, tipo = 'cargo'
    if (iCargo >= 0 || iAbono >= 0) {
      const cargo = parseMonto(c[iCargo] || '0'); const abono = parseMonto(c[iAbono] || '0')
      if (Math.abs(abono) > 0) { monto = Math.abs(abono); tipo = 'abono' } else { monto = Math.abs(cargo); tipo = 'cargo' }
    } else {
      const raw = parseMonto(c[iMonto >= 0 ? iMonto : 2] || '0')
      monto = Math.abs(raw); tipo = raw < 0 ? 'cargo' : 'abono'
    }
    if (fecha && monto > 0) out.push({ fecha, descripcion: desc, monto, tipo })
  }
  return out
}

export default function CartolasPage() {
  const [loading, setLoading] = useState(true)
  const [role, setRole] = useState('')
  const [cartolas, setCartolas] = useState<Row[]>([])
  const [sel, setSel] = useState<string | null>(null)
  const [lineas, setLineas] = useState<Row[]>([])
  const [cajaMovs, setCajaMovs] = useState<Row[]>([])
  const [parsed, setParsed] = useState<Linea[] | null>(null)
  const [banco, setBanco] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [conc, setConc] = useState<Row | null>(null)

  const puedeEditar = EDITAR.includes(role)

  const cargar = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }
    const { data: p } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
    const r = S((p as Row)?.role); setRole(r)
    if (!VER.includes(r)) { setLoading(false); return }
    const [{ data: c }, { data: cm }] = await Promise.all([
      supabase.from('fin_cartolas').select('*').order('created_at', { ascending: false }),
      supabase.from('fin_movimientos').select('id, fecha, descripcion, monto, tipo').eq('anulado', false).order('fecha', { ascending: false }).limit(500),
    ])
    setCartolas((c as Row[]) || [])
    setCajaMovs((cm as Row[]) || [])
    setLoading(false)
  }, [])

  useEffect(() => { cargar() }, [cargar])

  const cargarLineas = useCallback(async (id: string) => {
    const { data } = await supabase.from('fin_cartola_movimientos').select('*').eq('cartola_id', id).order('fecha')
    setLineas((data as Row[]) || [])
  }, [])
  useEffect(() => { if (sel) cargarLineas(sel) }, [sel, cargarLineas])

  async function api(payload: Row): Promise<Row | null> {
    setError(null)
    const r = await fetch('/api/central/finanzas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    const d = await r.json() as Row
    if (!r.ok) { setError(S(d.error) || 'Error'); return null }
    return d
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return
    setFile(f); setError(null)
    if (!f.name.toLowerCase().endsWith('.csv')) { setError('Por ahora solo CSV. El PDF llega en la próxima iteración.'); setParsed(null); return }
    const text = await f.text()
    const rows = parseCSV(text)
    if (!rows.length) { setError('No pude leer movimientos del CSV. Revisa que tenga columnas de fecha, glosa y monto (o cargo/abono).'); setParsed(null); return }
    setParsed(rows)
  }

  async function cargarCartola() {
    if (!parsed || !parsed.length) return
    setBusy(true)
    let archivo_url: string | null = null
    if (file) {
      const path = `cartolas/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
      const { error: eUp } = await supabase.storage.from('comprobantes').upload(path, file, { upsert: true })
      if (!eUp) archivo_url = supabase.storage.from('comprobantes').getPublicUrl(path).data.publicUrl
    }
    const d = await api({ action: 'cartola_crear', banco, archivo_url, movimientos: parsed })
    setBusy(false)
    if (d) {
      setMsg(`Cartola cargada: ${N(d.total)} líneas · ${N(d.conciliados)} conciliadas automáticamente.`)
      setParsed(null); setFile(null); setBanco('')
      await cargar(); setSel(S(d.cartola_id))
    }
  }

  async function conciliarManual() {
    if (!conc?.id || !conc.movimiento_id) { setError('Elige el movimiento de la Caja'); return }
    if (!conc.motivo) { setError('Indica el motivo'); return }
    setBusy(true)
    const ok = await api({ action: 'cartola_conciliar', id: conc.id, movimiento_id: conc.movimiento_id, motivo: conc.motivo })
    setBusy(false)
    if (ok && sel) { setConc(null); cargarLineas(sel); cargar() }
  }

  const resumen = useMemo(() => {
    const con = lineas.filter(l => l.conciliado).length
    const pend = lineas.length - con
    const montoPend = lineas.filter(l => !l.conciliado).reduce((a, l) => a + N(l.monto), 0)
    return { con, pend, montoPend, total: lineas.length }
  }, [lineas])

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
      <div><h1 className="text-2xl font-bold text-[#1a1a1a]">Cartolas del banco</h1><p className="text-sm text-gray-500 mt-0.5">Sube la cartola y crúzala con la Caja</p></div>
      {error ? <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700">{error}</div> : null}
      {msg ? <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-sm text-blue-800">{msg}</div> : null}

      {puedeEditar ? (
        <div className="noma-card !p-4 space-y-3">
          <div className="text-sm font-semibold text-[#1b2a4a]">Subir cartola (CSV)</div>
          <div className="flex flex-col sm:flex-row gap-2">
            <input className="noma-input sm:w-48" placeholder="Banco (ej: BancoEstado)" value={banco} onChange={e => setBanco(e.target.value)} />
            <input type="file" accept=".csv,application/pdf" className="noma-input flex-1" onChange={onFile} />
          </div>
          {parsed ? (
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-xs text-gray-600 mb-2">{parsed.length} movimientos leídos. Ejemplo:</div>
              <div className="text-xs text-gray-500 space-y-0.5">
                {parsed.slice(0, 3).map((l, i) => <div key={i}>{fmt(l.fecha)} · {l.descripcion.slice(0, 40)} · {l.tipo === 'abono' ? '+' : '−'}{clp(l.monto)}</div>)}
              </div>
              <button onClick={cargarCartola} disabled={busy} className="noma-btn-primary text-sm mt-3 flex items-center gap-2">{busy ? <Loader2 size={14} className="animate-spin" /> : <Upload size={15} />} Cargar y conciliar</button>
            </div>
          ) : null}
          <p className="text-[11px] text-gray-400">CSV con columnas de fecha, glosa/descripción y monto (o cargo/abono). El PDF llega después.</p>
        </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-1">
          <div className="text-sm font-semibold text-[#1b2a4a] mb-2">Cartolas</div>
          {cartolas.length === 0 ? <p className="text-sm text-gray-400">Aún no hay cartolas.</p> : (
            <div className="space-y-2">
              {cartolas.map(c => (
                <button key={S(c.id)} onClick={() => setSel(S(c.id))} className={`w-full text-left noma-card !p-3 ${sel === S(c.id) ? 'border-[#c9a24e]' : ''}`}>
                  <div className="flex items-center gap-2"><FileText size={15} className="text-gray-400" /><span className="font-medium text-sm text-[#1a1a1a]">{S(c.banco) || 'Cartola'}</span></div>
                  <div className="text-[11px] text-gray-500 mt-0.5">{fmt(S(c.created_at).slice(0, 10))} · {N(c.total_lineas)} líneas</div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-2">
          {!sel ? <div className="noma-card text-center py-12 text-gray-400 text-sm">Selecciona una cartola para ver la conciliación.</div> : (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-green-50 rounded-xl p-3 text-center"><div className="text-lg font-bold text-green-700">{resumen.con}</div><div className="text-[11px] text-gray-500">Conciliados</div></div>
                <div className="bg-amber-50 rounded-xl p-3 text-center"><div className="text-lg font-bold text-amber-700">{resumen.pend}</div><div className="text-[11px] text-gray-500">Pendientes</div></div>
                <div className="bg-gray-50 rounded-xl p-3 text-center"><div className="text-lg font-bold text-[#1b2a4a]">{clp(resumen.montoPend)}</div><div className="text-[11px] text-gray-500">Monto pendiente</div></div>
              </div>
              <div className="noma-card !p-0 overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-sm">
                <thead className="bg-gray-50/50 text-gray-400 text-xs text-left"><tr><th className="py-2 px-3 font-medium">Fecha</th><th className="py-2 px-3 font-medium">Glosa</th><th className="py-2 px-3 font-medium text-right">Monto</th><th className="py-2 px-3 font-medium">Estado</th><th className="py-2 px-3"></th></tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {lineas.map(l => (
                    <tr key={S(l.id)}>
                      <td className="py-2 px-3 text-gray-500 whitespace-nowrap">{fmt(l.fecha)}</td>
                      <td className="py-2 px-3 text-[#1a1a1a]">{S(l.descripcion)}</td>
                      <td className={`py-2 px-3 text-right whitespace-nowrap ${S(l.tipo) === 'abono' ? 'text-green-700' : 'text-red-700'}`}>{S(l.tipo) === 'abono' ? '+' : '−'}{clp(N(l.monto))}</td>
                      <td className="py-2 px-3">{l.conciliado ? <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-100 text-green-700 inline-flex items-center gap-1"><Check size={10} /> Conciliado</span> : <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Pendiente</span>}</td>
                      <td className="py-2 px-3 text-right">{!l.conciliado && puedeEditar ? <button onClick={() => setConc({ id: l.id, monto: l.monto, tipo: l.tipo })} className="text-gray-400 hover:text-[#1b2a4a]" title="Conciliar manual"><Link2 size={14} /></button> : null}</td>
                    </tr>
                  ))}
                  {lineas.length === 0 ? <tr><td colSpan={5} className="py-8 text-center text-gray-400 text-sm">Cartola sin líneas.</td></tr> : null}
                </tbody>
              </table></div></div>
            </div>
          )}
        </div>
      </div>

      {conc ? (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50" onClick={() => setConc(null)}>
          <div className="bg-white rounded-2xl p-5 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-[#1b2a4a] mb-3">Conciliar manualmente</h3>
            <div className="text-xs text-gray-500 mb-1">Movimiento de la Caja</div>
            <select className="noma-input" value={S(conc.movimiento_id)} onChange={e => setConc({ ...conc, movimiento_id: e.target.value })}>
              <option value="">Selecciona…</option>
              {cajaMovs.filter(m => S(m.tipo) === (S(conc.tipo) === 'abono' ? 'ingreso' : 'egreso')).map(m => (
                <option key={S(m.id)} value={S(m.id)}>{fmt(m.fecha)} · {S(m.descripcion).slice(0, 30)} · {clp(N(m.monto))}</option>
              ))}
            </select>
            <div className="text-xs text-gray-500 mt-3 mb-1">Motivo</div>
            <input className="noma-input" value={S(conc.motivo)} onChange={e => setConc({ ...conc, motivo: e.target.value })} placeholder="Ej: coincide con transferencia" />
            <button onClick={conciliarManual} disabled={busy} className="noma-btn-primary text-sm mt-4 w-full flex items-center justify-center gap-2">{busy ? <Loader2 size={14} className="animate-spin" /> : <Link2 size={15} />} Conciliar</button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
