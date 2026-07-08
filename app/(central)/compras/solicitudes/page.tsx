'use client'

import { useCallback, useEffect, useState } from 'react'
import { Loader2, ArrowLeft, RefreshCw, Sparkles, FileSpreadsheet, Copy, Check, Ban, ShoppingCart, ClipboardCheck } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'

type Row = Record<string, unknown>
const S = (v: unknown) => v === null || v === undefined ? '' : String(v)
const N = (v: unknown) => { const n = Number(v); return Number.isNaN(n) ? 0 : n }
const fecha = (v: unknown) => v ? new Date(String(v)).toLocaleDateString('es-CL', { day: '2-digit', month: 'short' }) : '—'

const ESTADO_CLR: Record<string, string> = {
  sugerida: 'bg-blue-100 text-blue-700', en_revision: 'bg-amber-100 text-amber-700',
  aprobada: 'bg-green-100 text-green-700', comprada: 'bg-violet-100 text-violet-700',
  recibida: 'bg-emerald-100 text-emerald-700', cancelada: 'bg-gray-100 text-gray-500',
}
const ESTADO_LBL: Record<string, string> = {
  sugerida: 'Sugerida', en_revision: 'En revisión', aprobada: 'Aprobada',
  comprada: 'Comprada', recibida: 'Recibida', cancelada: 'Cancelada',
}
const PRIOR_CLR: Record<string, string> = { alta: 'text-red-600', media: 'text-amber-600', baja: 'text-gray-500' }

export default function SolicitudesPage() {
  const [sols, setSols] = useState<Row[]>([])
  const [items, setItems] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [sel, setSel] = useState<Row | null>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copiado, setCopiado] = useState(false)

  const cargar = useCallback(async () => {
    const { data: s } = await supabase.from('solicitudes_compra')
      .select('*, proveedor:proveedores(id, nombre, whatsapp, telefono)')
      .order('created_at', { ascending: false })
    setSols((s as Row[]) || [])
    const { data: it } = await supabase.from('solicitud_compra_items')
      .select('*, producto:products(nombre, unidad_inventario)')
    setItems((it as Row[]) || [])
    setLoading(false)
  }, [])

  useEffect(() => { cargar() }, [cargar])

  async function api(payload: Row): Promise<Row | null> {
    setError(null)
    const r = await fetch('/api/central/solicitudes-compra', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    const d = await r.json() as Row
    if (!r.ok) { setError(S(d.error) || 'Error'); return null }
    return d
  }

  async function generar() {
    setBusy(true); setMsg(null)
    const d = await api({ action: 'generar' })
    setBusy(false)
    if (d) {
      const partes: string[] = []
      partes.push(`${N(d.creadas)} solicitud(es) creada(s)`)
      if (N(d.omitidas)) partes.push(`${N(d.omitidas)} omitida(s) (ya tenían una abierta)`)
      const sinProv = (d.sin_proveedor as string[] | undefined) || []
      if (sinProv.length) partes.push(`${sinProv.length} producto(s) sin proveedor principal: ${sinProv.slice(0, 5).join(', ')}${sinProv.length > 5 ? '…' : ''}`)
      setMsg(partes.join(' · '))
      cargar()
    }
  }

  async function cambiarEstado(id: unknown, estado: string) {
    setBusy(true)
    const ok = await api({ action: 'estado', id, estado })
    setBusy(false)
    if (ok) { setSel(s => s ? { ...s, estado } : s); cargar() }
  }

  const itemsDe = (solId: unknown) => items.filter(i => S(i.solicitud_id) === S(solId))
  const nombreItem = (i: Row) => S((i.producto as Row)?.nombre)

  // ── Exportar / copiar / WhatsApp ──
  function lineasTexto(sol: Row): string[] {
    return itemsDe(sol.id).map(i => `- ${N(i.cantidad_sugerida)} ${S(i.unidad_compra) || S((i.producto as Row)?.unidad_inventario) || 'un'} ${nombreItem(i)}`)
  }
  function exportarExcel(sol: Row) {
    const its = itemsDe(sol.id)
    const head = ['Producto', 'Stock actual', 'Stock mínimo', 'Punto reposición', 'Cantidad sugerida', 'Unidad compra']
    const rows = its.map(i => [nombreItem(i), N(i.stock_actual), N(i.stock_min), N(i.punto_reposicion), N(i.cantidad_sugerida), S(i.unidad_compra)])
    const csv = [head, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\r\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `${S(sol.numero) || 'solicitud'}.csv`; a.click()
    URL.revokeObjectURL(url)
  }
  async function copiar(sol: Row) {
    const prov = (sol.proveedor as Row) || {}
    const texto = `Solicitud de compra ${S(sol.numero)} · ${S(prov.nombre)}\n\nHola hola, queremos dejar un nuevo pedido:\n${lineasTexto(sol).join('\n')}`
    try { await navigator.clipboard.writeText(texto); setCopiado(true); setTimeout(() => setCopiado(false), 1800) } catch { setError('No se pudo copiar') }
  }
  function whatsapp(sol: Row) {
    const prov = (sol.proveedor as Row) || {}
    let num = (S(prov.whatsapp) || S(prov.telefono)).replace(/\D/g, '')
    if (!num) { setError('Este proveedor no tiene WhatsApp/teléfono cargado en su ficha'); return }
    if (!num.startsWith('56') && num.length <= 9) num = '56' + num // Chile por defecto
    const texto = `Hola hola, queremos dejar un nuevo pedido:\n${lineasTexto(sol).join('\n')}`
    window.open(`https://wa.me/${num}?text=${encodeURIComponent(texto)}`, '_blank')
  }

  // ── Detalle ──
  if (sel) {
    const its = itemsDe(sel.id)
    const prov = (sel.proveedor as Row) || {}
    const est = S(sel.estado)
    return (
      <div className="space-y-4">
        <button onClick={() => { setSel(null); cargar() }} className="flex items-center gap-1 text-sm text-gray-500 hover:text-[#1b2a4a]"><ArrowLeft size={15} /> Volver a solicitudes</button>
        {error && <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700">{error}</div>}

        <div className="noma-card !p-0 overflow-hidden">
          <div className="flex items-center justify-between gap-3 p-4 border-b border-gray-100 flex-wrap">
            <div>
              <div className="flex items-center gap-2 flex-wrap"><span className="font-bold text-[#1b2a4a] font-mono">{S(sel.numero)}</span><span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${ESTADO_CLR[est]}`}>{ESTADO_LBL[est] || est}</span><span className={`text-[11px] font-semibold ${PRIOR_CLR[S(sel.prioridad)] || ''}`}>● {S(sel.prioridad)}</span></div>
              <div className="text-sm text-gray-600 mt-1">{S(prov.nombre)} · {fecha(sel.created_at)}</div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button onClick={() => exportarExcel(sel)} className="flex items-center gap-1.5 text-sm text-gray-600 border border-gray-200 rounded-lg px-3 py-2 hover:border-[#c9a24e]"><FileSpreadsheet size={15} /> Excel</button>
              <button onClick={() => copiar(sel)} className="flex items-center gap-1.5 text-sm text-gray-600 border border-gray-200 rounded-lg px-3 py-2 hover:border-[#c9a24e]">{copiado ? <Check size={15} className="text-green-600" /> : <Copy size={15} />} {copiado ? 'Copiado' : 'Copiar'}</button>
              <button onClick={() => whatsapp(sel)} className="flex items-center gap-1.5 text-sm text-white rounded-lg px-3 py-2" style={{ backgroundColor: '#25D366' }}><svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M17.5 14.4c-.3-.1-1.7-.8-1.9-.9-.3-.1-.5-.1-.7.1-.2.3-.7.9-.9 1.1-.2.2-.3.2-.6.1-1.6-.8-2.6-1.4-3.7-3.2-.3-.5.3-.5.8-1.5.1-.2 0-.4 0-.5 0-.1-.7-1.6-.9-2.2-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.1.2 2.1 3.3 5.2 4.6 2 .8 2.7.9 3.7.8.6-.1 1.7-.7 1.9-1.4.2-.7.2-1.2.2-1.4-.1-.1-.3-.2-.6-.3M12 2a10 10 0 0 0-8.6 15l-1.3 4.7 4.8-1.3A10 10 0 1 0 12 2"/></svg> WhatsApp</button>
            </div>
          </div>

          <div className="p-4">
            <div className="overflow-x-auto"><table className="w-full text-sm">
              <thead className="bg-gray-50/50 text-gray-400 text-xs text-left"><tr><th className="py-2 px-3 font-medium">Producto</th><th className="py-2 px-3 font-medium text-right">Actual</th><th className="py-2 px-3 font-medium text-right">Mínimo</th><th className="py-2 px-3 font-medium text-right">P. reposición</th><th className="py-2 px-3 font-medium text-right">Sugerido</th><th className="py-2 px-3 font-medium">U. compra</th></tr></thead>
              <tbody className="divide-y divide-gray-50">
                {its.map(i => (
                  <tr key={S(i.id)}>
                    <td className="py-2 px-3 font-medium text-[#1a1a1a]">{nombreItem(i)}</td>
                    <td className={`py-2 px-3 text-right ${N(i.stock_actual) <= 0 ? 'text-red-600 font-semibold' : N(i.stock_actual) < N(i.stock_min) ? 'text-amber-600' : ''}`}>{N(i.stock_actual)}</td>
                    <td className="py-2 px-3 text-right text-gray-500">{N(i.stock_min)}</td>
                    <td className="py-2 px-3 text-right text-gray-500">{N(i.punto_reposicion)}</td>
                    <td className="py-2 px-3 text-right font-semibold text-[#1b2a4a]">{N(i.cantidad_sugerida)}</td>
                    <td className="py-2 px-3 text-gray-500">{S(i.unidad_compra) || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table></div>

            <div className="mt-4 p-3 bg-gray-50/60 rounded-lg text-xs text-gray-500"><span className="font-medium">Motivo:</span> {S(sel.motivo) || '—'}</div>

            {/* Acciones de estado (la Central aprueba; nada automático) */}
            <div className="flex gap-2 mt-4 flex-wrap">
              {['sugerida', 'en_revision'].includes(est) && <button onClick={() => cambiarEstado(sel.id, 'aprobada')} disabled={busy} className="noma-btn-primary text-sm flex items-center gap-1.5"><Check size={15} /> Aprobar</button>}
              {est === 'sugerida' && <button onClick={() => cambiarEstado(sel.id, 'en_revision')} disabled={busy} className="text-sm border border-gray-200 rounded-lg px-3 py-2 flex items-center gap-1.5"><ClipboardCheck size={15} /> Marcar en revisión</button>}
              {est === 'aprobada' && <button onClick={() => cambiarEstado(sel.id, 'comprada')} disabled={busy} className="text-sm border border-gray-200 rounded-lg px-3 py-2 flex items-center gap-1.5"><ShoppingCart size={15} /> Marcar comprada</button>}
              {!['cancelada', 'recibida'].includes(est) && <button onClick={() => cambiarEstado(sel.id, 'cancelada')} disabled={busy} className="text-sm border border-gray-200 text-red-600 rounded-lg px-3 py-2 flex items-center gap-1.5"><Ban size={15} /> Cancelar</button>}
            </div>
            <p className="text-xs text-gray-400 mt-3">La recepción de mercadería (P-C) tomará esta solicitud y creará la entrada de inventario.</p>
          </div>
        </div>
      </div>
    )
  }

  // ── Lista ──
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-2xl font-bold text-[#1a1a1a]">Solicitudes de compra</h1><p className="text-sm text-gray-500 mt-0.5">Sugeridas por stock bajo el punto de reposición · la Central aprueba</p></div>
        <div className="flex gap-2">
          <button onClick={() => { setLoading(true); cargar() }} className="flex items-center gap-2 text-sm text-gray-600 border border-gray-200 rounded-lg px-3 py-2 hover:border-[#c9a24e]"><RefreshCw size={15} /> Actualizar</button>
          <button onClick={generar} disabled={busy} className="noma-btn-primary flex items-center gap-2 text-sm">{busy ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />} Generar sugeridas</button>
        </div>
      </div>
      {error && <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700">{error}</div>}
      {msg && <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-sm text-blue-800">{msg}</div>}

      <div className="noma-card !p-0 overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-sm">
        <thead className="border-b border-gray-100 bg-gray-50/50"><tr>
          <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase">Solicitud</th>
          <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase">Proveedor</th>
          <th className="text-right py-3 px-4 text-xs font-semibold text-gray-400 uppercase">Ítems</th>
          <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase hidden md:table-cell">Fecha</th>
          <th className="text-center py-3 px-4 text-xs font-semibold text-gray-400 uppercase">Estado</th>
        </tr></thead>
        <tbody className="divide-y divide-gray-50">
          {loading ? <tr><td colSpan={5} className="py-12 text-center"><Loader2 className="w-5 h-5 text-[#1b2a4a] animate-spin mx-auto" /></td></tr>
          : sols.length === 0 ? <tr><td colSpan={5} className="py-12 text-center text-gray-400 text-sm">Sin solicitudes. Usa <strong>Generar sugeridas</strong> para crearlas desde el stock bajo mínimo.</td></tr>
          : sols.map(s => { const est = S(s.estado); const prov = (s.proveedor as Row) || {}; return (
            <tr key={S(s.id)} onClick={() => setSel(s)} className="hover:bg-gray-50 cursor-pointer">
              <td className="py-3 px-4 font-mono font-medium text-[#1b2a4a]">{S(s.numero)}<span className={`ml-2 text-[10px] ${PRIOR_CLR[S(s.prioridad)] || ''}`}>●</span></td>
              <td className="py-3 px-4 text-[#1a1a1a]">{S(prov.nombre)}</td>
              <td className="py-3 px-4 text-right text-gray-600">{itemsDe(s.id).length}</td>
              <td className="py-3 px-4 text-gray-500 text-xs hidden md:table-cell">{fecha(s.created_at)}</td>
              <td className="py-3 px-4 text-center"><span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${ESTADO_CLR[est]}`}>{ESTADO_LBL[est] || est}</span></td>
            </tr>
          )})}
        </tbody>
      </table></div></div>
    </div>
  )
}
