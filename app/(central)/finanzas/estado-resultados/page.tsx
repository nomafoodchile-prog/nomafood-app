'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Loader2, FileSpreadsheet, Printer, ShieldAlert } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'

type Row = Record<string, unknown>
const S = (v: unknown) => v === null || v === undefined ? '' : String(v)
const N = (v: unknown) => { const n = Number(v); return Number.isNaN(n) ? 0 : n }
const clp = (n: number) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n)
const mesActual = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' }).format(new Date()).slice(0, 7)

const VER = ['SuperAdmin', 'Administracion', 'Gerencia', 'Contador']
const COSTO_PROD = ['Materia prima', 'Envases']
const MES_LBL = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

export default function EstadoResultadosPage() {
  const [loading, setLoading] = useState(true)
  const [role, setRole] = useState('')
  const [mes, setMes] = useState(mesActual())
  const [movs, setMovs] = useState<Row[]>([])

  const cargar = useCallback(async (m: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }
    const { data: p } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
    const r = S((p as Row)?.role); setRole(r)
    if (!VER.includes(r)) { setLoading(false); return }
    const desde = m + '-01'
    const [y, mm] = m.split('-').map(Number)
    const hasta = new Date(y, mm, 0).toLocaleDateString('en-CA')
    const { data } = await supabase.from('fin_movimientos').select('tipo, categoria, monto, anulado')
      .gte('fecha', desde).lte('fecha', hasta).eq('anulado', false)
    setMovs((data as Row[]) || [])
    setLoading(false)
  }, [])

  useEffect(() => { cargar(mes) }, [cargar, mes])

  const pl = useMemo(() => {
    const ing = movs.filter(m => S(m.tipo) === 'ingreso')
    const egr = movs.filter(m => S(m.tipo) === 'egreso')
    const ventas = ing.reduce((a, m) => a + N(m.monto), 0)
    const costoProd = egr.filter(m => COSTO_PROD.includes(S(m.categoria))).reduce((a, m) => a + N(m.monto), 0)
    const gastosArr = egr.filter(m => !COSTO_PROD.includes(S(m.categoria)))
    const gastosOp = gastosArr.reduce((a, m) => a + N(m.monto), 0)
    const porCat = new Map<string, number>()
    for (const m of gastosArr) { const k = S(m.categoria) || 'Otros'; porCat.set(k, (porCat.get(k) ?? 0) + N(m.monto)) }
    return { ventas, costoProd, margen: ventas - costoProd, gastosOp, resultado: ventas - costoProd - gastosOp, porCat: [...porCat.entries()].sort((a, b) => b[1] - a[1]) }
  }, [movs])

  const titulo = () => { const [y, m] = mes.split('-'); return `${MES_LBL[Number(m) - 1]} ${y}` }

  function exportarCSV() {
    const filas = [
      ['Estado de resultados', titulo()],
      [],
      ['Ventas netas', pl.ventas],
      ['(-) Costo de producción', pl.costoProd],
      ['Margen bruto', pl.margen],
      ['(-) Gastos operacionales', pl.gastosOp],
      ...pl.porCat.map(([k, v]) => [`   · ${k}`, v]),
      ['Resultado', pl.resultado],
    ]
    const csv = filas.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\r\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `estado-resultados-${mes}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) return <div className="min-h-[60vh] flex items-center justify-center"><Loader2 className="w-6 h-6 text-[#1b2a4a] animate-spin" /></div>
  if (!VER.includes(role)) return (
    <div className="p-6"><div className="noma-card text-center py-12 max-w-md mx-auto">
      <ShieldAlert className="w-9 h-9 mx-auto text-gray-300 mb-3" />
      <p className="font-semibold text-[#1b2a4a]">Acceso restringido</p>
      <p className="text-sm text-gray-500 mt-1">Solo Administración, Gerencia y Contador pueden ver Finanzas.</p>
    </div></div>
  )

  const pos = pl.resultado >= 0
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3 no-print">
        <div><h1 className="text-2xl font-bold text-[#1a1a1a]">Estado de resultados</h1><p className="text-sm text-gray-500 mt-0.5">Resultado del período, calculado desde la Caja</p></div>
        <div className="flex gap-2 items-center flex-wrap">
          <input type="month" className="noma-input" value={mes} onChange={e => setMes(e.target.value)} />
          <button onClick={exportarCSV} className="flex items-center gap-2 text-sm text-gray-600 border border-gray-200 rounded-lg px-3 py-2 hover:border-[#c9a24e]"><FileSpreadsheet size={15} /> Excel</button>
          <button onClick={() => window.print()} className="flex items-center gap-2 text-sm text-gray-600 border border-gray-200 rounded-lg px-3 py-2 hover:border-[#c9a24e]"><Printer size={15} /> PDF</button>
        </div>
      </div>

      <div className="noma-card max-w-2xl">
        <div className="text-lg font-bold text-[#1b2a4a] mb-4">Resultado · {titulo()}</div>
        <Linea k="Ventas netas" v={pl.ventas} bold />
        <Linea k="(−) Costo de producción" v={-pl.costoProd} muted />
        <div className="border-t border-gray-200 my-1" />
        <Linea k="Margen bruto" v={pl.margen} bold />
        <Linea k="(−) Gastos operacionales" v={-pl.gastosOp} muted />
        {pl.porCat.map(([k, v]) => <Linea key={k} k={`     · ${k}`} v={-v} small />)}
        <div className="border-t-2 border-gray-300 my-2" />
        <div className="flex justify-between items-center py-1">
          <span className="text-base font-bold text-[#1b2a4a]">Resultado del mes</span>
          <span className={`text-xl font-bold ${pos ? 'text-green-700' : 'text-red-700'}`}>{clp(pl.resultado)}</span>
        </div>
        <p className="text-xs text-gray-400 mt-3">Ventas = ingresos · Costo de producción = egresos de Materia prima y Envases · Gastos operacionales = el resto. Todo del período seleccionado.</p>
      </div>

      <style dangerouslySetInnerHTML={{ __html: '@media print { .no-print { display:none } aside, nav, header { display:none !important } }' }} />
    </div>
  )
}

function Linea({ k, v, bold, muted, small }: { k: string; v: number; bold?: boolean; muted?: boolean; small?: boolean }) {
  return (
    <div className={`flex justify-between py-1 ${small ? 'text-xs' : 'text-sm'}`}>
      <span className={`${bold ? 'font-semibold text-[#1b2a4a]' : muted ? 'text-gray-500' : 'text-gray-600'} ${small ? 'text-gray-400' : ''}`}>{k}</span>
      <span className={`${bold ? 'font-semibold' : ''} ${muted || small ? 'text-gray-500' : 'text-[#1a1a1a]'}`}>{clp(v)}</span>
    </div>
  )
}
