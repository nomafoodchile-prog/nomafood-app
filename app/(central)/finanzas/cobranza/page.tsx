'use client'

import { useState } from 'react'
import { Plus, CreditCard, AlertCircle, CheckCircle, Clock, X } from 'lucide-react'

function currency(n: number) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n)
}

function diasMora(vencimiento: string): number {
  const hoy = new Date('2026-06-30')
  const venc = new Date(vencimiento)
  const diff = Math.floor((hoy.getTime() - venc.getTime()) / (1000 * 60 * 60 * 24))
  return diff > 0 ? diff : 0
}

type EstadoCobranza = 'Al día' | 'Vencida' | 'En gestión' | 'Pagada'

interface Cobranza {
  id: string
  cliente: string
  nFactura: string
  monto: number
  fechaEmision: string
  fechaVencimiento: string
  estado: EstadoCobranza
  responsable: string
}

const initialData: Cobranza[] = [
  { id: 'C001', cliente: 'Restaurant Quinoa Verde', nFactura: 'F-2026-0441', monto: 890000, fechaEmision: '2026-06-01', fechaVencimiento: '2026-07-01', estado: 'Al día', responsable: 'Andrea M.' },
  { id: 'C002', cliente: 'Tienda Mundo Natural', nFactura: 'F-2026-0428', monto: 345000, fechaEmision: '2026-05-15', fechaVencimiento: '2026-06-14', estado: 'Vencida', responsable: 'Andrea M.' },
  { id: 'C003', cliente: 'Hotel W Santiago', nFactura: 'F-2026-0415', monto: 1250000, fechaEmision: '2026-05-10', fechaVencimiento: '2026-06-09', estado: 'En gestión', responsable: 'Camila R.' },
  { id: 'C004', cliente: 'Supermercado El Árbol', nFactura: 'F-2026-0401', monto: 2180000, fechaEmision: '2026-05-01', fechaVencimiento: '2026-05-31', estado: 'Pagada', responsable: 'Andrea M.' },
  { id: 'C005', cliente: 'Restaurant Pura Vida', nFactura: 'F-2026-0388', monto: 560000, fechaEmision: '2026-04-20', fechaVencimiento: '2026-05-20', estado: 'Vencida', responsable: 'Camila R.' },
  { id: 'C006', cliente: 'Café Consciente Providencia', nFactura: 'F-2026-0445', monto: 175000, fechaEmision: '2026-06-10', fechaVencimiento: '2026-07-10', estado: 'Al día', responsable: 'Andrea M.' },
  { id: 'C007', cliente: 'Almacén Orgánico Las Condes', nFactura: 'F-2026-0399', monto: 690000, fechaEmision: '2026-04-28', fechaVencimiento: '2026-05-28', estado: 'En gestión', responsable: 'Camila R.' },
  { id: 'C008', cliente: 'Colegio Bicentenario', nFactura: 'F-2026-0412', monto: 430000, fechaEmision: '2026-05-08', fechaVencimiento: '2026-06-07', estado: 'Pagada', responsable: 'Andrea M.' },
  { id: 'C009', cliente: 'Catering Verde Ltda.', nFactura: 'F-2026-0433', monto: 780000, fechaEmision: '2026-05-25', fechaVencimiento: '2026-06-24', estado: 'Vencida', responsable: 'Camila R.' },
  { id: 'C010', cliente: 'Tienda Semillas Vitales', nFactura: 'F-2026-0449', monto: 215000, fechaEmision: '2026-06-15', fechaVencimiento: '2026-07-15', estado: 'Al día', responsable: 'Andrea M.' },
  { id: 'C011', cliente: 'Restaurant Flor de Loto', nFactura: 'F-2026-0377', monto: 940000, fechaEmision: '2026-04-10', fechaVencimiento: '2026-05-10', estado: 'Pagada', responsable: 'Camila R.' },
  { id: 'C012', cliente: 'Clínica Integra', nFactura: 'F-2026-0422', monto: 380000, fechaEmision: '2026-05-12', fechaVencimiento: '2026-06-11', estado: 'En gestión', responsable: 'Andrea M.' },
]

const estadoBadge: Record<EstadoCobranza, string> = {
  'Al día': 'noma-badge-green',
  'Vencida': 'noma-badge-red',
  'En gestión': 'noma-badge-gold',
  'Pagada': 'noma-badge-blue',
}

export default function CobranzaPage() {
  const [cobranzas, setCobranzas] = useState<Cobranza[]>(initialData)
  const [filtroEstado, setFiltroEstado] = useState<'Todos' | EstadoCobranza>('Todos')
  const [showPago, setShowPago] = useState(false)
  const [showNueva, setShowNueva] = useState(false)
  const [pagoForm, setPagoForm] = useState({ id: '', monto: '', fecha: new Date().toISOString().split('T')[0], nota: '' })
  const [nuevaForm, setNuevaForm] = useState({
    cliente: '', nFactura: '', monto: '', fechaEmision: new Date().toISOString().split('T')[0],
    fechaVencimiento: '', responsable: ''
  })

  const porCobrar = cobranzas.filter(c => c.estado !== 'Pagada').reduce((s, c) => s + c.monto, 0)
  const vencido = cobranzas.filter(c => c.estado === 'Vencida').reduce((s, c) => s + c.monto, 0)
  const enGestion = cobranzas.filter(c => c.estado === 'En gestión').reduce((s, c) => s + c.monto, 0)
  const cobradoMes = cobranzas.filter(c => c.estado === 'Pagada').reduce((s, c) => s + c.monto, 0)

  const filtered = cobranzas.filter(c => filtroEstado === 'Todos' || c.estado === filtroEstado)

  const handleRegistrarPago = (e: React.FormEvent) => {
    e.preventDefault()
    setCobranzas(prev => prev.map(c =>
      c.id === pagoForm.id ? { ...c, estado: 'Pagada' as EstadoCobranza } : c
    ))
    setShowPago(false)
    setPagoForm({ id: '', monto: '', fecha: new Date().toISOString().split('T')[0], nota: '' })
  }

  const handleNuevaCobranza = (e: React.FormEvent) => {
    e.preventDefault()
    const nueva: Cobranza = {
      id: `C${String(cobranzas.length + 1).padStart(3, '0')}`,
      cliente: nuevaForm.cliente,
      nFactura: nuevaForm.nFactura,
      monto: Number(nuevaForm.monto),
      fechaEmision: nuevaForm.fechaEmision,
      fechaVencimiento: nuevaForm.fechaVencimiento,
      estado: 'Al día',
      responsable: nuevaForm.responsable,
    }
    setCobranzas(prev => [nueva, ...prev])
    setShowNueva(false)
    setNuevaForm({ cliente: '', nFactura: '', monto: '', fechaEmision: new Date().toISOString().split('T')[0], fechaVencimiento: '', responsable: '' })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1a1a1a]">Cobranza</h1>
          <p className="text-sm text-gray-500 mt-0.5">Cuentas por cobrar — Junio 2026</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowPago(true)} className="noma-btn-primary text-sm flex items-center gap-2">
            <CheckCircle size={16} />
            Registrar pago
          </button>
          <button onClick={() => setShowNueva(true)} className="noma-btn-primary text-sm flex items-center gap-2">
            <Plus size={16} />
            Nueva cobranza
          </button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="noma-card border-l-4 border-[#c9a84c]">
          <div className="flex items-center gap-2 mb-2">
            <CreditCard size={16} className="text-[#c9a84c]" />
            <span className="text-xs text-gray-500">Total por cobrar</span>
          </div>
          <p className="text-xl font-bold text-[#1a1a1a]">{currency(porCobrar)}</p>
        </div>
        <div className="noma-card border-l-4 border-red-400">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle size={16} className="text-red-500" />
            <span className="text-xs text-gray-500">Vencido</span>
          </div>
          <p className="text-xl font-bold text-red-600">{currency(vencido)}</p>
        </div>
        <div className="noma-card border-l-4 border-yellow-400">
          <div className="flex items-center gap-2 mb-2">
            <Clock size={16} className="text-yellow-600" />
            <span className="text-xs text-gray-500">En gestión</span>
          </div>
          <p className="text-xl font-bold text-yellow-700">{currency(enGestion)}</p>
        </div>
        <div className="noma-card border-l-4 border-green-400">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle size={16} className="text-green-600" />
            <span className="text-xs text-gray-500">Cobrado este mes</span>
          </div>
          <p className="text-xl font-bold text-green-600">{currency(cobradoMes)}</p>
        </div>
      </div>

      {/* Table */}
      <div className="noma-card !p-0 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between flex-wrap gap-2">
          <h2 className="font-bold text-[#1a1a1a]">Facturas</h2>
          <div className="flex items-center gap-1 bg-gray-50 rounded-lg p-1">
            {(['Todos', 'Al día', 'Vencida', 'En gestión', 'Pagada'] as const).map(e => (
              <button
                key={e}
                onClick={() => setFiltroEstado(e)}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                  filtroEstado === e ? 'bg-[#c9a84c] text-[#0f0f0f]' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {e}
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50/50 border-b border-gray-100">
              <tr>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wide">Cliente</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wide hidden sm:table-cell">N° Factura</th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wide">Monto</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wide hidden md:table-cell">Emisión</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wide hidden md:table-cell">Vencimiento</th>
                <th className="text-center py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wide">Días mora</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wide">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(c => {
                const mora = c.estado === 'Pagada' ? 0 : diasMora(c.fechaVencimiento)
                return (
                  <tr key={c.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-3 px-4">
                      <p className="font-medium text-[#1a1a1a]">{c.cliente}</p>
                      <p className="text-xs text-gray-400">{c.responsable}</p>
                    </td>
                    <td className="py-3 px-4 text-xs text-gray-500 font-mono hidden sm:table-cell">{c.nFactura}</td>
                    <td className="py-3 px-4 text-right font-bold text-[#1a1a1a]">{currency(c.monto)}</td>
                    <td className="py-3 px-4 text-xs text-gray-500 hidden md:table-cell">
                      {new Date(c.fechaEmision).toLocaleDateString('es-CL')}
                    </td>
                    <td className="py-3 px-4 text-xs text-gray-500 hidden md:table-cell">
                      {new Date(c.fechaVencimiento).toLocaleDateString('es-CL')}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {mora > 0 ? (
                        <span className="text-xs font-bold text-red-600">{mora}d</span>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className={estadoBadge[c.estado]}>{c.estado}</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Registrar pago */}
      {showPago && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowPago(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-[#1a1a1a]">Registrar pago</h3>
              <button onClick={() => setShowPago(false)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleRegistrarPago} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Factura</label>
                <select
                  value={pagoForm.id}
                  onChange={e => setPagoForm(f => ({ ...f, id: e.target.value }))}
                  className="noma-input"
                  required
                >
                  <option value="">Seleccionar factura...</option>
                  {cobranzas.filter(c => c.estado !== 'Pagada').map(c => (
                    <option key={c.id} value={c.id}>{c.nFactura} — {c.cliente}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Fecha de pago</label>
                  <input
                    type="date"
                    value={pagoForm.fecha}
                    onChange={e => setPagoForm(f => ({ ...f, fecha: e.target.value }))}
                    className="noma-input"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Monto recibido (CLP)</label>
                  <input
                    type="number"
                    value={pagoForm.monto}
                    onChange={e => setPagoForm(f => ({ ...f, monto: e.target.value }))}
                    className="noma-input"
                    placeholder="0"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Nota</label>
                <input
                  type="text"
                  value={pagoForm.nota}
                  onChange={e => setPagoForm(f => ({ ...f, nota: e.target.value }))}
                  className="noma-input"
                  placeholder="Referencia de pago, banco, etc."
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowPago(false)} className="flex-1 px-4 py-2 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">Cancelar</button>
                <button type="submit" className="flex-1 noma-btn-primary">Confirmar pago</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Nueva cobranza */}
      {showNueva && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowNueva(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-[#1a1a1a]">Nueva cobranza</h3>
              <button onClick={() => setShowNueva(false)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleNuevaCobranza} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Cliente</label>
                <input type="text" value={nuevaForm.cliente} onChange={e => setNuevaForm(f => ({ ...f, cliente: e.target.value }))} className="noma-input" placeholder="Nombre del cliente" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">N° Factura</label>
                  <input type="text" value={nuevaForm.nFactura} onChange={e => setNuevaForm(f => ({ ...f, nFactura: e.target.value }))} className="noma-input" placeholder="F-2026-XXXX" required />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Monto (CLP)</label>
                  <input type="number" value={nuevaForm.monto} onChange={e => setNuevaForm(f => ({ ...f, monto: e.target.value }))} className="noma-input" placeholder="0" required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Fecha emisión</label>
                  <input type="date" value={nuevaForm.fechaEmision} onChange={e => setNuevaForm(f => ({ ...f, fechaEmision: e.target.value }))} className="noma-input" required />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Fecha vencimiento</label>
                  <input type="date" value={nuevaForm.fechaVencimiento} onChange={e => setNuevaForm(f => ({ ...f, fechaVencimiento: e.target.value }))} className="noma-input" required />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Responsable</label>
                <input type="text" value={nuevaForm.responsable} onChange={e => setNuevaForm(f => ({ ...f, responsable: e.target.value }))} className="noma-input" placeholder="Nombre responsable" required />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowNueva(false)} className="flex-1 px-4 py-2 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">Cancelar</button>
                <button type="submit" className="flex-1 noma-btn-primary">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
