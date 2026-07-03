'use client'

import { useState, useEffect, useCallback, Fragment } from 'react'
import { RefreshCw, ChevronDown, ChevronUp, Search, Package, AlertCircle } from 'lucide-react'

interface PedidoItem {
  producto_nombre: string
  producto_sku: string | null
  cantidad: number
  precio_final: number
  unidad: string | null
}

interface Mayorista {
  nombre: string
  empresa: string | null
  email: string | null
  telefono: string | null
}

interface Pedido {
  id: string
  numero_pedido: string
  estado: string
  total: number
  subtotal: number
  descuento_monto: number
  direccion_entrega: string | null
  fecha_entrega_req: string | null
  notas: string | null
  created_at: string
  mp_status: string | null
  mayorista: Mayorista | null
  items: PedidoItem[]
}

// Estados en el orden del flujo. El equipo puede avanzar el pedido con el selector.
const ESTADOS = ['confirmado', 'pagado', 'en_preparacion', 'despachado', 'entregado', 'cancelado'] as const

const ESTADO_LABELS: Record<string, string> = {
  borrador: 'Borrador',
  confirmado: 'Confirmado',
  pagado: 'Pagado',
  en_preparacion: 'En preparación',
  despachado: 'Despachado',
  entregado: 'Entregado',
  cancelado: 'Cancelado',
}

const ESTADO_COLORS: Record<string, string> = {
  borrador: 'bg-gray-100 text-gray-600',
  confirmado: 'bg-blue-100 text-blue-700',
  pagado: 'bg-emerald-100 text-emerald-700',
  en_preparacion: 'bg-amber-100 text-amber-700',
  despachado: 'bg-purple-100 text-purple-700',
  entregado: 'bg-green-100 text-green-700',
  cancelado: 'bg-red-100 text-red-700',
}

function currency(n: number) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n)
}

export default function PedidosMayoristasPage() {
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [savingId, setSavingId] = useState<string | null>(null)

  const cargar = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/central/pedidos-mayoristas')
      if (res.status === 401) {
        setError('Tu sesión expiró. Vuelve a iniciar sesión para ver los pedidos.')
        setPedidos([])
        return
      }
      if (!res.ok) throw new Error('Error al cargar')
      const data = await res.json()
      setPedidos(data.pedidos ?? [])
    } catch {
      setError('No se pudieron cargar los pedidos. Intenta actualizar.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    cargar()
  }, [cargar])

  async function cambiarEstado(id: string, estado: string) {
    setSavingId(id)
    // Optimista: refleja el cambio de inmediato
    setPedidos(prev => prev.map(p => (p.id === id ? { ...p, estado } : p)))
    try {
      const res = await fetch('/api/central/pedidos-mayoristas', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, estado }),
      })
      if (!res.ok) {
        // Revierte recargando desde el servidor si falló
        await cargar()
      }
    } catch {
      await cargar()
    } finally {
      setSavingId(null)
    }
  }

  const filtered = pedidos.filter(p => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      p.numero_pedido?.toLowerCase().includes(q) ||
      p.mayorista?.nombre?.toLowerCase().includes(q) ||
      p.mayorista?.empresa?.toLowerCase().includes(q)
    )
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1a1a1a]">Pedidos Mayoristas</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {loading ? 'Cargando…' : `${filtered.length} pedido${filtered.length === 1 ? '' : 's'} del portal`}
          </p>
        </div>
        <button
          onClick={cargar}
          disabled={loading}
          className="noma-btn-primary flex items-center gap-2 text-sm disabled:opacity-50"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Actualizar
        </button>
      </div>

      {/* Search */}
      <div className="noma-card !p-4">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por número, cliente o empresa…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="noma-input pl-9"
          />
        </div>
      </div>

      {error && (
        <div className="noma-card !p-4 flex items-center gap-2 text-sm text-red-600 bg-red-50">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {/* Table */}
      <div className="noma-card !p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100 bg-gray-50/50">
              <tr>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wide">Pedido</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wide">Cliente</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wide hidden md:table-cell">Fecha</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wide">Estado</th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wide hidden sm:table-cell">Total</th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wide">Detalle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {!loading && filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-400 text-sm">
                    {pedidos.length === 0 ? 'Aún no hay pedidos mayoristas.' : 'Ningún pedido coincide con la búsqueda.'}
                  </td>
                </tr>
              ) : (
                filtered.map(pedido => (
                  <Fragment key={pedido.id}>
                    <tr className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-3 px-4">
                        <span className="font-mono text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                          {pedido.numero_pedido}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-medium text-[#1a1a1a]">{pedido.mayorista?.empresa || pedido.mayorista?.nombre || '—'}</p>
                        {pedido.mayorista?.empresa && (
                          <p className="text-xs text-gray-400">{pedido.mayorista?.nombre}</p>
                        )}
                      </td>
                      <td className="py-3 px-4 text-gray-500 text-xs hidden md:table-cell">
                        {new Date(pedido.created_at).toLocaleDateString('es-CL')}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-semibold px-2 py-1 rounded-full ${ESTADO_COLORS[pedido.estado] || 'bg-gray-100 text-gray-600'}`}>
                            {ESTADO_LABELS[pedido.estado] || pedido.estado}
                          </span>
                          <select
                            value={ESTADOS.includes(pedido.estado as (typeof ESTADOS)[number]) ? pedido.estado : ''}
                            onChange={e => cambiarEstado(pedido.id, e.target.value)}
                            disabled={savingId === pedido.id}
                            className="text-xs border border-gray-200 rounded-lg px-1.5 py-1 text-gray-600 bg-white hover:border-[#c9a84c] focus:outline-none focus:border-[#c9a84c] disabled:opacity-50"
                            title="Cambiar estado"
                          >
                            {!ESTADOS.includes(pedido.estado as (typeof ESTADOS)[number]) && (
                              <option value="" disabled>{ESTADO_LABELS[pedido.estado] || pedido.estado}</option>
                            )}
                            {ESTADOS.map(e => (
                              <option key={e} value={e}>{ESTADO_LABELS[e]}</option>
                            ))}
                          </select>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-[#1a1a1a] hidden sm:table-cell">
                        {currency(pedido.total)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end">
                          <button
                            onClick={() => setExpanded(expanded === pedido.id ? null : pedido.id)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-[#c9a84c] hover:bg-[#c9a84c]/10 transition-colors"
                            title="Ver productos"
                          >
                            {expanded === pedido.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </button>
                        </div>
                      </td>
                    </tr>
                    {expanded === pedido.id && (
                      <tr className="bg-gray-50/50">
                        <td colSpan={6} className="px-4 py-3">
                          <div className="text-xs text-gray-600 space-y-2">
                            <div className="flex items-center gap-2 font-semibold text-gray-500">
                              <Package size={13} /> Productos del pedido
                            </div>
                          <div className="divide-y divide-gray-100">
                            {pedido.items?.length ? pedido.items.map((it, i) => (
                              <div key={i} className="flex justify-between py-1.5">
                                <span>
                                  {it.cantidad} {it.unidad || 'un'} · {it.producto_nombre}
                                  {it.producto_sku && <span className="text-gray-400"> ({it.producto_sku})</span>}
                                </span>
                                <span className="font-medium">{currency(it.precio_final * it.cantidad)}</span>
                              </div>
                            )) : <p className="py-1.5 text-gray-400">Sin líneas registradas.</p>}
                          </div>
                          <div className="flex flex-wrap gap-x-6 gap-y-1 pt-2 text-gray-500">
                            <span>Subtotal: <b className="text-gray-700">{currency(pedido.subtotal)}</b></span>
                            <span>Descuento: <b className="text-emerald-600">−{currency(pedido.descuento_monto)}</b></span>
                            <span>Total: <b className="text-gray-900">{currency(pedido.total)}</b></span>
                            {pedido.direccion_entrega && <span>Entrega: <b className="text-gray-700">{pedido.direccion_entrega}</b></span>}
                            {pedido.fecha_entrega_req && <span>Fecha solicitada: <b className="text-gray-700">{new Date(pedido.fecha_entrega_req).toLocaleDateString('es-CL')}</b></span>}
                            {pedido.mp_status && <span>Pago MP: <b className="text-gray-700">{pedido.mp_status}</b></span>}
                          </div>
                          {pedido.notas && <p className="pt-1 italic text-gray-400">Nota: {pedido.notas}</p>}
                        </div>
                      </td>
                    </tr>
                  )}
                  </Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

