'use client'

import { useState } from 'react'
import { Search, AlertTriangle, Package, TrendingDown, ArrowUpDown } from 'lucide-react'
import { operationsDemo } from '@/lib/operations'
import { currency } from '@/lib/inventory'

type ProductionItemType = 'Todos' | 'Materia prima' | 'Envase' | 'Preelaboracion' | 'Producto terminado'

const TYPE_FILTER: ProductionItemType[] = [
  'Todos', 'Materia prima', 'Envase', 'Preelaboracion', 'Producto terminado'
]

export default function InventarioPage() {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<ProductionItemType>('Todos')

  const { catalogItems } = operationsDemo

  const filtered = catalogItems.filter(item => {
    const matchSearch = !search || item.name.toLowerCase().includes(search.toLowerCase())
    const matchType = typeFilter === 'Todos' || item.type === typeFilter
    return matchSearch && matchType
  })

  const lowStock = catalogItems.filter(i => i.stock <= i.minimumStock)
  const totalValue = catalogItems.reduce((s, i) => s + i.stock * 1800, 0) // demo cost

  const stockPct = (item: typeof catalogItems[0]) =>
    item.minimumStock > 0 ? Math.min(100, (item.stock / (item.minimumStock * 2)) * 100) : 100

  // Mock movements
  const movements = [
    { id: 'm1', date: '2026-06-30', type: 'Entrada', product: 'Harina integral', qty: 25, unit: 'kg', responsible: 'Javier Rojas' },
    { id: 'm2', date: '2026-06-30', type: 'Salida', product: 'Tofu firme', qty: 4, unit: 'kg', responsible: 'Marisol Fuentes' },
    { id: 'm3', date: '2026-06-29', type: 'Merma', product: 'Salsa de tomate base', qty: 2, unit: 'lt', responsible: 'Nicolas Araya' },
    { id: 'm4', date: '2026-06-29', type: 'Entrada', product: 'Bowl compostable 750 ml', qty: 200, unit: 'unidad', responsible: 'Camila Soto' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1a1a1a]">Inventario</h1>
          <p className="text-sm text-gray-500 mt-0.5">{catalogItems.length} productos registrados</p>
        </div>
        <button className="noma-btn-primary text-sm">
          + Registrar movimiento
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="noma-card !py-4">
          <div className="w-9 h-9 bg-[#c9a84c]/10 rounded-xl flex items-center justify-center mb-2">
            <Package size={16} className="text-[#c9a84c]" />
          </div>
          <p className="text-xs text-gray-500">Total productos</p>
          <p className="text-xl font-bold text-[#1a1a1a]">{catalogItems.length}</p>
        </div>
        <div className="noma-card !py-4">
          <div className="w-9 h-9 bg-red-50 rounded-xl flex items-center justify-center mb-2">
            <AlertTriangle size={16} className="text-red-500" />
          </div>
          <p className="text-xs text-gray-500">Stock bajo</p>
          <p className="text-xl font-bold text-red-600">{lowStock.length}</p>
        </div>
        <div className="noma-card !py-4">
          <div className="w-9 h-9 bg-green-50 rounded-xl flex items-center justify-center mb-2">
            <TrendingDown size={16} className="text-green-600" />
          </div>
          <p className="text-xs text-gray-500">Valor inventario</p>
          <p className="text-xl font-bold text-[#1a1a1a]">{currency(totalValue)}</p>
        </div>
        <div className="noma-card !py-4">
          <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center mb-2">
            <ArrowUpDown size={16} className="text-blue-600" />
          </div>
          <p className="text-xs text-gray-500">Movimientos hoy</p>
          <p className="text-xl font-bold text-[#1a1a1a]">{movements.filter(m => m.date === '2026-06-30').length}</p>
        </div>
      </div>

      {/* Low stock alerts */}
      {lowStock.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={16} className="text-red-500" />
            <h2 className="font-semibold text-red-700 text-sm">Alertas de stock bajo</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {lowStock.map(item => (
              <div key={item.id} className="bg-white rounded-xl p-3 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-[#1a1a1a]">{item.name}</p>
                  <p className="text-[10px] text-gray-500">{item.type}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-red-600">{item.stock} {item.unit}</p>
                  <p className="text-[10px] text-gray-400">mín {item.minimumStock}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters + table */}
      <div className="noma-card !p-0 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar producto..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="noma-input pl-9"
            />
          </div>
          <div className="flex items-center gap-1 bg-gray-50 rounded-lg p-1 overflow-x-auto">
            {TYPE_FILTER.map(t => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap transition-all ${
                  typeFilter === t
                    ? 'bg-[#c9a84c] text-[#0f0f0f]'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50/50 border-b border-gray-100">
              <tr>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wide">Producto</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wide hidden sm:table-cell">Tipo</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wide">Stock</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wide hidden md:table-cell">Nivel</th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wide">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(item => {
                const pct = stockPct(item)
                const isCritical = item.stock <= item.minimumStock
                return (
                  <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-3 px-4 font-medium text-[#1a1a1a]">
                      {item.name}
                      <p className="text-[10px] text-gray-400 font-mono">{item.id}</p>
                    </td>
                    <td className="py-3 px-4 hidden sm:table-cell">
                      <span className="noma-badge-gray">{item.type}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`font-bold text-sm ${isCritical ? 'text-red-600' : 'text-[#1a1a1a]'}`}>
                        {item.stock}
                      </span>
                      <span className="text-xs text-gray-400 ml-1">{item.unit}</span>
                      <p className="text-[10px] text-gray-400">mín {item.minimumStock}</p>
                    </td>
                    <td className="py-3 px-4 hidden md:table-cell">
                      <div className="w-24">
                        <div className="w-full bg-gray-100 rounded-full h-1.5">
                          <div
                            className={`h-1.5 rounded-full transition-all ${
                              pct < 50 ? 'bg-red-400' : pct < 75 ? 'bg-yellow-400' : 'bg-green-400'
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <p className="text-[10px] text-gray-400 mt-0.5">{Math.round(pct)}%</p>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {isCritical ? (
                        <span className="noma-badge-red">Bajo mínimo</span>
                      ) : (
                        <span className="noma-badge-green">OK</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent movements */}
      <div className="noma-card">
        <h2 className="font-bold text-[#1a1a1a] mb-4">Movimientos recientes</h2>
        <div className="space-y-2">
          {movements.map(m => (
            <div key={m.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  m.type === 'Entrada' ? 'bg-green-500' : m.type === 'Salida' ? 'bg-blue-500' : 'bg-red-500'
                }`} />
                <div>
                  <p className="text-sm font-medium text-[#1a1a1a]">{m.product}</p>
                  <p className="text-xs text-gray-400">{m.responsible} · {m.date}</p>
                </div>
              </div>
              <div className="text-right">
                <p className={`text-sm font-bold ${
                  m.type === 'Entrada' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {m.type === 'Entrada' ? '+' : '-'}{m.qty} {m.unit}
                </p>
                <p className="text-[10px] text-gray-400">{m.type}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
