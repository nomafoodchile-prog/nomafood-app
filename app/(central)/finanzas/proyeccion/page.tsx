'use client'

import { useEffect, useMemo, useState } from 'react'
import { Loader2, Check, TrendingUp, Target, Calculator, Info } from 'lucide-react'

const clp = (n: number) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(Math.round(isFinite(n) ? n : 0))
const num = (s: unknown) => Number(String(s ?? '').replace(/[^0-9]/g, '')) || 0

type Datos = { gastosFijos: string; deudaTotal: string; mesesDeuda: string; margen: string; ventasActuales: string; ticket: string }
const VACIO: Datos = { gastosFijos: '', deudaTotal: '', mesesDeuda: '12', margen: '50', ventasActuales: '', ticket: '' }

export default function ProyeccionPage() {
  const [d, setD] = useState<Datos>(VACIO)
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [guardado, setGuardado] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/central/proyeccion').then(r => r.json()).then(j => {
      if (j?.datos && typeof j.datos === 'object') setD({ ...VACIO, ...j.datos })
    }).catch(() => {}).finally(() => setCargando(false))
  }, [])

  const set = (k: keyof Datos, v: string) => { setD(prev => ({ ...prev, [k]: v.replace(/[^0-9]/g, '') })); setGuardado(false) }

  const c = useMemo(() => {
    const gastos = num(d.gastosFijos)
    const deuda = num(d.deudaTotal)
    const meses = Math.max(1, num(d.mesesDeuda))
    const m = num(d.margen) / 100
    const ventas = num(d.ventasActuales)
    const ticket = num(d.ticket)
    const abono = deuda > 0 ? deuda / meses : 0
    const equilibrioMes = m > 0 ? gastos / m : 0
    const metaMes = m > 0 ? (gastos + abono) / m : 0
    const brecha = metaMes - ventas
    const estado = m <= 0 || metaMes <= 0 ? 'sin' : ventas >= metaMes ? 'verde' : ventas >= equilibrioMes && equilibrioMes > 0 ? 'amarillo' : 'rojo'
    const pedidosDia = ticket > 0 ? Math.ceil((metaMes / 30) / ticket) : 0
    return { gastos, abono, ticket, equilibrioMes, metaMes, brecha, estado, pedidosDia }
  }, [d])

  async function guardar() {
    setGuardando(true); setError(null)
    try {
      const r = await fetch('/api/central/proyeccion', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ datos: d }) })
      const j = await r.json()
      if (!r.ok) { setError(j.error || 'No se pudo guardar.'); return }
      setGuardado(true); setTimeout(() => setGuardado(false), 3000)
    } catch { setError('Revisa tu internet e intenta de nuevo.') }
    finally { setGuardando(false) }
  }

  if (cargando) return <div className="min-h-[50vh] flex items-center justify-center"><Loader2 className="w-6 h-6 text-[#1b2a4a] animate-spin" /></div>

  const semColor = c.estado === 'verde' ? 'bg-green-50 border-green-200 text-green-800' : c.estado === 'amarillo' ? 'bg-amber-50 border-amber-200 text-amber-800' : c.estado === 'rojo' ? 'bg-red-50 border-red-200 text-red-800' : 'bg-gray-50 border-gray-200 text-gray-500'
  const semDot = c.estado === 'verde' ? 'bg-green-500' : c.estado === 'amarillo' ? 'bg-amber-500' : c.estado === 'rojo' ? 'bg-red-500' : 'bg-gray-300'
  const semMsg = c.estado === 'verde' ? '¡Vas saliendo de deudas! Cubres los gastos y el abono mensual.'
    : c.estado === 'amarillo' ? 'Cubres los gastos fijos, pero aún te falta para el abono de la deuda.'
    : c.estado === 'rojo' ? 'Todavía no cubres los gastos fijos. Aquí partimos.'
    : 'Pon un margen y gastos mayores a 0 para calcular.'

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-[#1a1a1a] flex items-center gap-2"><TrendingUp size={22} /> Proyección de ventas</h1>
        <p className="text-sm text-gray-500 mt-1">Cuánto necesitas vender para cubrir tus gastos y salir de deudas. Cambia los números y mira al instante.</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Tus números */}
        <div className="noma-card !p-5 space-y-4">
          <h2 className="font-semibold text-[#1b2a4a] flex items-center gap-2"><Calculator size={16} /> Tus números</h2>
          <Campo label="Gastos fijos al mes" prefijo="$" hint="Arriendo, sueldos, servicios, etc." value={d.gastosFijos} onChange={v => set('gastosFijos', v)} />
          <div className="grid grid-cols-2 gap-3">
            <Campo label="Deuda total" prefijo="$" value={d.deudaTotal} onChange={v => set('deudaTotal', v)} />
            <Campo label="Salir en… (meses)" sufijo="meses" value={d.mesesDeuda} onChange={v => set('mesesDeuda', v)} />
          </div>
          <Campo label="Margen" sufijo="%" hint="De cada $100 que vendes, ¿cuánto te queda tras pagar ingredientes/materia prima? (ej: 50)" value={d.margen} onChange={v => set('margen', v)} />
          <Campo label="Ventas actuales al mes" prefijo="$" hint="Lo que vendes hoy, para comparar." value={d.ventasActuales} onChange={v => set('ventasActuales', v)} />
          <Campo label="Ticket promedio (opcional)" prefijo="$" hint="Cuánto gasta un cliente en promedio. Para estimar pedidos por día." value={d.ticket} onChange={v => set('ticket', v)} />
          <button onClick={guardar} disabled={guardando} className="w-full noma-btn-primary text-sm flex items-center justify-center gap-2 disabled:opacity-60">
            {guardando ? <Loader2 size={15} className="animate-spin" /> : guardado ? <Check size={15} /> : null} {guardado ? 'Guardado' : 'Guardar mis números'}
          </button>
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>

        {/* Resultados */}
        <div className="space-y-4">
          <div className={`rounded-2xl border p-5 ${semColor}`}>
            <div className="flex items-center gap-2 font-semibold"><span className={`w-3 h-3 rounded-full ${semDot}`} /> ¿Cómo vas?</div>
            <p className="text-sm mt-2">{semMsg}</p>
            {c.estado !== 'sin' && c.brecha > 0 && (
              <p className="text-sm mt-2 font-medium">Te faltan <strong>{clp(c.brecha)}</strong> al mes (≈ {clp(c.brecha / 30)} al día) para llegar a la meta.</p>
            )}
            {c.estado === 'verde' && c.brecha < 0 && (
              <p className="text-sm mt-2 font-medium">Te sobran <strong>{clp(-c.brecha)}</strong> al mes para acelerar el pago de la deuda. 🎉</p>
            )}
          </div>

          <div className="noma-card !p-5">
            <div className="flex items-center gap-2 font-semibold text-[#1b2a4a]"><Target size={16} /> Cuánto vender</div>
            <div className="mt-3 space-y-4">
              <Meta titulo="Para cubrir los gastos" sub="Punto de equilibrio" mes={c.equilibrioMes} color="#1b2a4a" />
              <div className="border-t border-gray-100" />
              <Meta titulo="Para cubrir gastos + salir de deudas" sub={c.abono > 0 ? `Incluye abono de ${clp(c.abono)}/mes a la deuda` : 'Sin deuda cargada'} mes={c.metaMes} color="#c9a24e" destacado />
            </div>
            {c.pedidosDia > 0 && c.metaMes > 0 && (
              <p className="text-xs text-gray-500 mt-4 flex items-start gap-1.5"><Info size={13} className="mt-0.5 shrink-0" /> Con un ticket de {clp(c.ticket)}, son unos <strong>{c.pedidosDia} pedidos al día</strong> para llegar a la meta.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function Campo({ label, value, onChange, hint, prefijo, sufijo }: { label: string; value: string; onChange: (v: string) => void; hint?: string; prefijo?: string; sufijo?: string }) {
  return (
    <div>
      <label className="text-xs font-medium text-gray-600">{label}</label>
      <div className="mt-1 flex items-center rounded-xl border border-gray-200 focus-within:border-[#c9a24e] overflow-hidden bg-white">
        {prefijo && <span className="pl-3 text-gray-400 text-sm">{prefijo}</span>}
        <input value={value} onChange={e => onChange(e.target.value)} inputMode="numeric" className="w-full px-3 py-2.5 text-sm outline-none" placeholder="0" />
        {sufijo && <span className="pr-3 text-gray-400 text-sm">{sufijo}</span>}
      </div>
      {hint && <p className="text-[11px] text-gray-400 mt-1">{hint}</p>}
    </div>
  )
}

function Meta({ titulo, sub, mes, color, destacado }: { titulo: string; sub: string; mes: number; color: string; destacado?: boolean }) {
  const semana = mes / 4.33
  const dia = mes / 30
  return (
    <div>
      <p className="text-sm font-semibold" style={{ color }}>{titulo}</p>
      <p className="text-[11px] text-gray-400">{sub}</p>
      <div className="grid grid-cols-3 gap-2 mt-2">
        {([['al mes', mes], ['a la semana', semana], ['al día', dia]] as const).map(([l, v]) => (
          <div key={l} className={`rounded-xl px-2 py-2.5 text-center ${destacado ? 'bg-[#f5efdf]' : 'bg-gray-50'}`}>
            <div className={`font-bold ${destacado ? 'text-[#1b2a4a] text-base' : 'text-[#1a1a1a] text-sm'}`}>{clp(v)}</div>
            <div className="text-[10px] text-gray-400 mt-0.5">{l}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
