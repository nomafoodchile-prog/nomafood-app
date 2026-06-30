'use client'

import { useState } from 'react'
import { Plus, Search, Filter, Eye, Pencil } from 'lucide-react'
import { operationsDemo } from '@/lib/operations'
import type { Order } from '@/lib/operations'

type StatusFilter = 'Todos' | 'Confirmado' | 'Reservado' | 'En produccion' | 'Armado' | 'Despachado'

const STATUS_OPTIONS: StatusFilter[] = [
  'Todos', 'Confirmado', 'Reservado', 'En produccion', 'Armado', 'Despachado'
]

function StatusBadge({ status }: { status: Order['status'] }) {
  const map: Record<string, string> = {
    Confirmado: 'noma-badge-blue',
    Reservado: 'noma-badge-gray',
    'En produccion': 'noma-badge-gold',
    Armado: 'noma-badge-gold',
    Despachado: 'noma-badge-green',
  }
  return <span className={map[status] || 'noma-badge-gray'}>{status}</span>
}

function currency(n: number) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n)
}

function orderTotal(order: Order): number {
  // Demo: random total based on lines quantity
  return order.lines.reduce((s, l) => s + l.quantity * 3500, 0)
}

export default function PedidosPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('Todos')
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 8

  const { orders } = operationsDemo

  const filtered = orders.filter(o => {
    const matchSearch =
      !search ||
      o.code.toLowerCase().includes(search.toLowerCase()) ||
      o.customerName.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'Todos' || o.status === statusFilter
    return matchSearch && matchStatus
  })

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1a1a1a]">Pedidos</h1>
          <p className="text-sm text-gray-500 mt-0.5">{filtered.length} pedidos encontrados</p>
        </div>
        <button className="noma-btn-primary flex items-center gap-2 text-sm">
          <Plus size={16} />
          Nuevo pedido
        </button>
      </div>

      {/* Filters */}
      <div className="noma-card !p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por código o cliente..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              className="noma-input pl-9"
            />
          </div>

          {/* Status filter */}
          <div className="flex items-center gap-1 bg-gray-50 rounded-lg p-1 overflow-x-auto">
            <Filter size={13} className="text-gray-400 flex-shrink-0 ml-1" />
            {STATUS_OPTIONS.map(s => (
              <button
                key={s}
                onClick={() => { setStatusFilter(s); setPage(1) }}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap transition-all ${
                  statusFilter === s
                    ? 'bg-[#c9a84c] text-[#0f0f0f]'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="noma-card !p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100 bg-gray-50/50">
              <tr>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wide">Código</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wide">Cliente</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wide hidden md:table-cell">Entrega</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wide">Estado</th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wide hidden sm:table-cell">Total</th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wide">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paged.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-400 text-sm">
                    No se encontraron pedidos con ese filtro
                  </td>
                </tr>
              ) : (
                paged.map(order => (
                  <tr key={order.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-3 px-4">
                      <span className="font-mono text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                        {order.code}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-medium text-[#1a1a1a]">{order.customerName}</td>
                    <td className="py-3 px-4 text-gray-500 text-xs hidden md:table-cell">
                      {new Date(order.deliveryDate).toLocaleDateString('es-CL')}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={order.status} />
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-[#1a1a1a] hidden sm:table-cell">
                      {currency(orderTotal(order))}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end gap-1">
                        <button className="p-1.5 rounded-lg text-gray-400 hover:text-[#c9a84c] hover:bg-[#c9a84c]/10 transition-colors">
                          <Eye size={14} />
                        </button>
                        <button className="p-1.5 rounded-lg text-gray-400 hover:text-[#c9a84c] hover:bg-[#c9a84c]/10 transition-colors">
                          <Pencil size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-xs text-gray-500">
              Mostrando {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} de {filtered.length}
            </p>
            <div className="flex gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 text-gray-600 hover:border-[#c9a84c] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Anterior
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-8 h-8 text-xs rounded-lg border transition-colors ${
                    p === page
                      ? 'bg-[#c9a84c] border-[#c9a84c] text-[#0f0f0f] font-bold'
                      : 'border-gray-200 text-gray-600 hover:border-[#c9a84c]'
                  }`}
                >
                  {p}
                </button>
              ))}
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 text-gray-600 hover:border-[#c9a84c] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
