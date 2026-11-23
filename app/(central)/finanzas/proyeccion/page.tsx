'use client'

import { useEffect, useMemo, useState } from 'react'
import { Loader2, Check, TrendingUp, Target, Calculator, Info, Plus, Trash2, ClipboardPaste, Receipt } from 'lucide-react'

const clp = (n: number) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(Math.round(isFinite(n) ? n : 0))
const num = (s: unknown) => Number(String(s ?? '').replace(/[^0-9]/g, '')) || 0
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7)

type Datos = { gastosFijos: string; deudaTotal: string; mesesDeuda: string; margen: string; ventasActuales: string; ticket: string }
const VACIO: Datos = { gastosFijos: '', deudaTotal: '', mesesDeuda: '12', margen: '50', ventasActuales: '', ticket: '' }

type Deuda = { id: string; acreedor: string; tipo: string; monto: number; cuota: number; notas: string }

const TIPOS: { v: string; label: string }[] = [
  { v: 'proveedor', label: 'Proveedor' },
  { v: 'prestamo', label: 'Préstamo / Prestamista' },
  { v: 'banco', label: 'Banco / Crédito' },
  { v: 'tarjeta', label: 'Tarjeta' },
  { v: 'otro', label: 'Otro' },
]
const tipoLabel = (v: string) => TIPOS.find(t => t.v === v)?.label || 'Otro'

export default function ProyeccionPage() {
  const [d, setD] = useState<Datos>(VACIO)
  const [deudas, setDeudas] = useState<Deuda[]>([])
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [guardado, setGuardado] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      fetch('/api/central/proyeccion').then(r => r.json()).catch(() => ({})),
      fetch('/api/central/deudas').then(r => r.json()).catch(() => ({})),
    ]).then(([p, de]) => {
      if (p?.datos && typeof p.datos === 'object') setD({ ...VACIO, ...p.datos })
      if (Array.isArray(de?.deudas)) setDeudas(de.deudas)
    }).finally(() => setCargando(false))
  }, [])

  const set = (k: keyof Datos, v: string) => { setD(prev => ({ ...prev, [k]: v.replace(/[^0-9]/g, '') })); setGuardado(false) }
  const tocar = () => setGuardado(false)

  const totalDeudas = useMemo(() => deudas.reduce((s, x) => s + (x.monto || 0), 0), [deudas])
  const totalCuotas = useMemo(() => deudas.reduce((s, x) => s + (x.cuota || 0), 0), [deudas])
  const hayDetalle = deudas.length > 0

  const c = useMemo(() => {
    const gastos = num(d.gastosFijos)
    const deuda = hayDetalle ? totalDeudas : num(d.deudaTotal)
    const meses = Math.max(1, num(d.mesesDeuda))
    const m = num(d.margen) / 100
    const ventas = num(d.ventasActuales)
    const ticket = num(d.ticket)
    // Si hay cuotas mensuales reales cargadas, ese es el abono real; si no, repartimos la deuda en los meses.
    const abono = totalCuotas > 0 ? totalCuotas : (deuda > 0 ? deuda / meses : 0)
    const usaCuotas = totalCuotas > 0
    const mesesImplicados = usaCuotas && abono > 0 ? Math.ceil(deuda / abono) : meses
    const equilibrioMes = m > 0 ? gastos / m : 0
    const metaMes = m > 0 ? (gastos + abono) / m : 0
    const brecha = metaMes - ventas
    const estado = m <= 0 || metaMes <= 0 ? 'sin' : ventas >= metaMes ? 'verde' : ventas >= equilibrioMes && equilibrioMes > 0 ? 'amarillo' : 'rojo'
    const pedidosDia = ticket > 0 ? Math.ceil((metaMes / 30) / ticket) : 0
    return { gastos, deuda, abono, ticket, usaCuotas, mesesImplicados, equilibrioMes, metaMes, brecha, estado, pedidosDia }
  }, [d, hayDetalle, totalDeudas, totalCuotas])

  async function guardar() {
    setGuardando(true); setError(null)
    try {
      const [r1, r2] = await Promise.all([
        fetch('/api/central/proyeccion', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ datos: d }) }),
        fetch('/api/central/deudas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ deudas }) }),
      ])
      if (!r1.ok || !r2.ok) {
        const j = await (r1.ok ? r2 : r1).json().catch(() => ({}))
        setError(j.error || 'No se pudo guardar.'); return
      }
      setGuardado(true); setTimeout(() => setGuardado(false), 3000)
    } catch { setError('Revisa tu internet e intenta de nuevo.') }
    finally { setGuardando(false) }
  }

  // ---- edición de deudas ----
  const addDeuda = () => { setDeudas(prev => [...prev, { id: uid(), acreedor: '', tipo: 'proveedor', monto: 0, cuota: 0, notas: '' }]); tocar() }
  const updDeuda = (id: string, patch: Partial<Deuda>) => { setDeudas(prev => prev.map(x => x.id === id ? { ...x, ...patch } : x)); tocar() }
  const delDeuda = (id: string) => { setDeudas(prev => prev.filter(x => x.id !== id)); tocar() }
  const addMuchas = (filas: Deuda[]) => { if (filas.length) { setDeudas(prev => [...prev, ...filas]); tocar() } }

  if (cargando) return <div className="min-h-[50vh] flex items-center justify-center"><Loader2 className="w-6 h-6 text-[#1F4D27] animate-spin" /></div>

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
          <h2 className="font-semibold text-[#1F4D27] flex items-center gap-2"><Calculator size={16} /> Tus números</h2>
          <Campo label="Gastos fijos al mes" prefijo="$" hint="Arriendo, sueldos, servicios, etc." value={d.gastosFijos} onChange={v => set('gastosFijos', v)} />
          <div className="grid grid-cols-2 gap-3">
            {hayDetalle ? (
              <div>
                <label className="text-xs font-medium text-gray-600">Deuda total</label>
                <div className="mt-1 flex items-center rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5">
                  <span className="text-sm font-semibold text-[#1F4D27]">{clp(totalDeudas)}</span>
                </div>
                <p className="text-[11px] text-[#307139] mt-1">Suma automática del detalle de abajo ({deudas.length})</p>
              </div>
            ) : (
              <Campo label="Deuda total" prefijo="$" value={d.deudaTotal} onChange={v => set('deudaTotal', v)} />
            )}
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
            <div className="flex items-center gap-2 font-semibold text-[#1F4D27]"><Target size={16} /> Cuánto vender</div>
            <div className="mt-3 space-y-4">
              <Meta titulo="Para cubrir los gastos" sub="Punto de equilibrio" mes={c.equilibrioMes} color="#1F4D27" />
              <div className="border-t border-gray-100" />
              <Meta titulo="Para cubrir gastos + salir de deudas" sub={c.abono > 0 ? (c.usaCuotas ? `Incluye tus cuotas reales ${clp(c.abono)}/mes (≈ ${c.mesesImplicados} meses)` : `Incluye abono de ${clp(c.abono)}/mes a la deuda`) : 'Sin deuda cargada'} mes={c.metaMes} color="#307139" destacado />
            </div>
            {c.pedidosDia > 0 && c.metaMes > 0 && (
              <p className="text-xs text-gray-500 mt-4 flex items-start gap-1.5"><Info size={13} className="mt-0.5 shrink-0" /> Con un ticket de {clp(c.ticket)}, son unos <strong>{c.pedidosDia} pedidos al día</strong> para llegar a la meta.</p>
            )}
          </div>
        </div>
      </div>

      {/* Detalle de deudas */}
      <DeudasCard
        deudas={deudas}
        totalDeudas={totalDeudas}
        totalCuotas={totalCuotas}
        onAdd={addDeuda}
        onUpd={updDeuda}
        onDel={delDeuda}
        onAddMuchas={addMuchas}
      />
    </div>
  )
}

function Campo({ label, value, onChange, hint, prefijo, sufijo }: { label: string; value: string; onChange: (v: string) => void; hint?: string; prefijo?: string; sufijo?: string }) {
  return (
    <div>
      <label className="text-xs font-medium text-gray-600">{label}</label>
      <div className="mt-1 flex items-center rounded-xl border border-gray-200 focus-within:border-[#307139] overflow-hidden bg-white">
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
            <div className={`font-bold ${destacado ? 'text-[#1F4D27] text-base' : 'text-[#1a1a1a] text-sm'}`}>{clp(v)}</div>
            <div className="text-[10px] text-gray-400 mt-0.5">{l}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

const num2 = (s: unknown) => Number(String(s ?? '').replace(/[^0-9]/g, '')) || 0

// Convierte texto pegado (Excel/Sheets o CSV) en filas de deuda.
// Columnas esperadas: Acreedor | Monto | Tipo (opcional) | Cuota mensual (opcional) | Notas (opcional)
function parsearPegado(texto: string): Deuda[] {
  const out: Deuda[] = []
  const lineas = texto.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
  for (const linea of lineas) {
    const cols = linea.split(/\t|;|,(?=\s*[^0-9])|,/).map(x => x.trim())
    // Heurística: el primer texto no-numérico es el acreedor; el primer número grande es el monto.
    const acreedor = (cols[0] || '').slice(0, 120)
    if (!acreedor) continue
    // saltar fila de encabezado
    if (/^(acreedor|proveedor|nombre|deuda|a qui)/i.test(acreedor) && cols.slice(1).every(x => !/\d/.test(x))) continue
    const monto = num2(cols[1])
    const tipoRaw = (cols[2] || '').toLowerCase()
    const tipo = tipoRaw.includes('prest') ? 'prestamo' : tipoRaw.includes('banc') || tipoRaw.includes('cred') ? 'banco' : tipoRaw.includes('tarj') ? 'tarjeta' : tipoRaw.includes('otro') ? 'otro' : 'proveedor'
    const cuota = num2(cols[3])
    const notas = (cols[4] || '').slice(0, 200)
    if (!monto && !cuota) continue
    out.push({ id: uid(), acreedor, tipo, monto, cuota, notas })
  }
  return out
}

function DeudasCard({ deudas, totalDeudas, totalCuotas, onAdd, onUpd, onDel, onAddMuchas }: {
  deudas: Deuda[]
  totalDeudas: number
  totalCuotas: number
  onAdd: () => void
  onUpd: (id: string, patch: Partial<Deuda>) => void
  onDel: (id: string) => void
  onAddMuchas: (filas: Deuda[]) => void
}) {
  const [modo, setModo] = useState<'' | 'pegar'>('')
  const [texto, setTexto] = useState('')
  const [aviso, setAviso] = useState<string | null>(null)

  const procesarTexto = () => {
    const filas = parsearPegado(texto)
    if (!filas.length) { setAviso('No encontré filas válidas. Revisa que tengas al menos Acreedor y Monto.'); return }
    onAddMuchas(filas)
    setTexto(''); setModo(''); setAviso(`Se agregaron ${filas.length} deuda(s).`)
    setTimeout(() => setAviso(null), 3500)
  }

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const t = await file.text()
    const filas = parsearPegado(t)
    if (!filas.length) { setAviso('No encontré filas válidas en el archivo. Debe tener Acreedor y Monto.'); }
    else { onAddMuchas(filas); setAviso(`Se agregaron ${filas.length} deuda(s) desde el archivo.`); setTimeout(() => setAviso(null), 3500) }
    e.target.value = ''
  }

  return (
    <div className="noma-card !p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold text-[#1F4D27] flex items-center gap-2"><Receipt size={16} /> Detalle de deudas</h2>
          <p className="text-[11px] text-gray-400 mt-0.5">Carga a quién le debes y cuánto. El total alimenta la proyección de arriba.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onAdd} className="text-xs font-medium px-3 py-2 rounded-lg bg-[#1F4D27] text-white flex items-center gap-1.5"><Plus size={14} /> Agregar deuda</button>
          <button onClick={() => { setModo(modo === 'pegar' ? '' : 'pegar'); setAviso(null) }} className="text-xs font-medium px-3 py-2 rounded-lg border border-gray-200 text-gray-600 flex items-center gap-1.5"><ClipboardPaste size={14} /> Pegar desde Excel</button>
        </div>
      </div>

      {modo === 'pegar' && (
        <div className="mt-4 rounded-xl border border-dashed border-[#307139] bg-[#faf7ef] p-4 space-y-2">
          <p className="text-xs text-gray-600">Copia las celdas en tu Excel/Google Sheets y pégalas aquí. Una deuda por fila, en este orden:</p>
          <p className="text-[11px] text-gray-500 font-mono bg-white rounded px-2 py-1 border border-gray-100">Acreedor &nbsp;|&nbsp; Monto &nbsp;|&nbsp; Tipo (opc.) &nbsp;|&nbsp; Cuota mensual (opc.) &nbsp;|&nbsp; Notas (opc.)</p>
          <textarea value={texto} onChange={e => setTexto(e.target.value)} rows={5} placeholder={'Distribuidora Sur\t850000\tproveedor\t85000\nPréstamo Tía Ana\t2000000\tprestamo\t100000\nBanco Estado\t1500000\tbanco'} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs font-mono outline-none focus:border-[#307139]" />
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={procesarTexto} className="text-xs font-medium px-3 py-2 rounded-lg bg-[#307139] text-white">Agregar las filas</button>
            <label className="text-xs font-medium px-3 py-2 rounded-lg border border-gray-200 text-gray-600 cursor-pointer">
              …o subir un CSV
              <input type="file" accept=".csv,text/csv,text/plain" onChange={onFile} className="hidden" />
            </label>
            <span className="text-[11px] text-gray-400">Tip: en Excel usa &quot;Guardar como → CSV&quot;.</span>
          </div>
        </div>
      )}

      {aviso && <p className="mt-3 text-xs text-[#1F4D27] bg-[#f5efdf] rounded-lg px-3 py-2">{aviso}</p>}

      {/* Lista */}
      <div className="mt-4 space-y-2">
        {deudas.length === 0 && (
          <div className="text-center py-8 text-sm text-gray-400">
            Aún no cargas deudas. Usa <strong>Agregar deuda</strong> o <strong>Pegar desde Excel</strong>.
          </div>
        )}
        {deudas.map(x => (
          <DeudaRow key={x.id} d={x} onUpd={onUpd} onDel={onDel} />
        ))}
      </div>

      {/* Totales */}
      {deudas.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-gray-500">{deudas.length} deuda(s)</div>
          <div className="flex items-center gap-6">
            {totalCuotas > 0 && (
              <div className="text-right">
                <div className="text-[11px] text-gray-400">Cuotas al mes</div>
                <div className="font-bold text-[#1F4D27]">{clp(totalCuotas)}</div>
              </div>
            )}
            <div className="text-right">
              <div className="text-[11px] text-gray-400">Deuda total</div>
              <div className="font-bold text-lg text-[#307139]">{clp(totalDeudas)}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function DeudaRow({ d, onUpd, onDel }: { d: Deuda; onUpd: (id: string, patch: Partial<Deuda>) => void; onDel: (id: string) => void }) {
  return (
    <div className="rounded-xl border border-gray-200 p-3 grid grid-cols-1 sm:grid-cols-12 gap-2 items-start">
      <div className="sm:col-span-4">
        <label className="text-[10px] text-gray-400 sm:hidden">A quién le debes</label>
        <input value={d.acreedor} onChange={e => onUpd(d.id, { acreedor: e.target.value })} placeholder="Nombre del proveedor o prestamista" className="w-full rounded-lg border border-gray-200 px-2.5 py-2 text-sm outline-none focus:border-[#307139]" />
      </div>
      <div className="sm:col-span-2">
        <label className="text-[10px] text-gray-400 sm:hidden">Tipo</label>
        <select value={d.tipo} onChange={e => onUpd(d.id, { tipo: e.target.value })} className="w-full rounded-lg border border-gray-200 px-2 py-2 text-sm outline-none focus:border-[#307139] bg-white">
          {TIPOS.map(t => <option key={t.v} value={t.v}>{t.label}</option>)}
        </select>
      </div>
      <div className="sm:col-span-2">
        <label className="text-[10px] text-gray-400 sm:hidden">Monto (saldo)</label>
        <div className="flex items-center rounded-lg border border-gray-200 focus-within:border-[#307139] overflow-hidden">
          <span className="pl-2 text-gray-400 text-xs">$</span>
          <input value={d.monto ? d.monto.toLocaleString('es-CL') : ''} onChange={e => onUpd(d.id, { monto: num2(e.target.value) })} inputMode="numeric" placeholder="0" className="w-full px-1.5 py-2 text-sm outline-none" />
        </div>
      </div>
      <div className="sm:col-span-2">
        <label className="text-[10px] text-gray-400 sm:hidden">Cuota mensual</label>
        <div className="flex items-center rounded-lg border border-gray-200 focus-within:border-[#307139] overflow-hidden">
          <span className="pl-2 text-gray-400 text-xs">$</span>
          <input value={d.cuota ? d.cuota.toLocaleString('es-CL') : ''} onChange={e => onUpd(d.id, { cuota: num2(e.target.value) })} inputMode="numeric" placeholder="0" className="w-full px-1.5 py-2 text-sm outline-none" />
        </div>
      </div>
      <div className="sm:col-span-2 flex items-center gap-1">
        <input value={d.notas} onChange={e => onUpd(d.id, { notas: e.target.value })} placeholder="Nota" className="w-full rounded-lg border border-gray-200 px-2.5 py-2 text-sm outline-none focus:border-[#307139]" />
        <button onClick={() => onDel(d.id)} className="shrink-0 p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50" title="Borrar"><Trash2 size={15} /></button>
      </div>
    </div>
  )
}
