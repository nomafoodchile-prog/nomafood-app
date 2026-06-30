import { TrendingUp, TrendingDown, DollarSign, BarChart3 } from 'lucide-react'
import { initialFinancialSnapshots } from '@/lib/finance'

function currency(n: number) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n)
}

// Top products by margin (mock)
const topProducts = [
  { name: 'Lasagna vegana individual', revenue: 2180000, cost: 840000, margin: 61 },
  { name: 'Bowl thai tofu', revenue: 1640000, cost: 680000, margin: 59 },
  { name: 'Focaccia integral', revenue: 980000, cost: 420000, margin: 57 },
  { name: 'Empanadas veganas', revenue: 1280000, cost: 620000, margin: 52 },
  { name: 'Ciabatta seitan', revenue: 860000, cost: 440000, margin: 49 },
]

export default function BalancePage() {
  const snapshots = initialFinancialSnapshots ?? []
  const latest = snapshots[snapshots.length - 1]
  const prev = snapshots[snapshots.length - 2]

  const totalRevenue = snapshots.reduce((s, m) => s + m.income, 0)
  const totalExpenses = snapshots.reduce((s, m) => s + m.expenses, 0)
  const netMargin = totalRevenue > 0 ? Math.round(((totalRevenue - totalExpenses) / totalRevenue) * 100) : 0

  const maxIncome = Math.max(...snapshots.map(s => s.income), 1)

  const revenueGrowth = prev && prev.income > 0
    ? Math.round(((latest.income - prev.income) / prev.income) * 100)
    : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1a1a1a]">Balance</h1>
          <p className="text-sm text-gray-500 mt-0.5">Resultado económico — Enero a Junio 2026</p>
        </div>
        <button className="noma-btn-secondary text-sm flex items-center gap-2">
          <BarChart3 size={14} />
          Exportar informe
        </button>
      </div>

      {/* KPI Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="noma-card bg-gradient-to-br from-[#0f0f0f] to-gray-800 text-white">
          <div className="w-9 h-9 bg-[#c9a84c]/20 rounded-xl flex items-center justify-center mb-3">
            <DollarSign size={16} className="text-[#c9a84c]" />
          </div>
          <p className="text-xs text-gray-400">Ingresos totales</p>
          <p className="text-xl font-bold text-[#c9a84c] mt-1">{currency(totalRevenue)}</p>
        </div>

        <div className="noma-card">
          <div className="w-9 h-9 bg-red-50 rounded-xl flex items-center justify-center mb-3">
            <TrendingDown size={16} className="text-red-500" />
          </div>
          <p className="text-xs text-gray-500">Costos totales</p>
          <p className="text-xl font-bold text-red-600 mt-1">{currency(totalExpenses)}</p>
        </div>

        <div className="noma-card">
          <div className="w-9 h-9 bg-green-50 rounded-xl flex items-center justify-center mb-3">
            <TrendingUp size={16} className="text-green-600" />
          </div>
          <p className="text-xs text-gray-500">Resultado neto</p>
          <p className={`text-xl font-bold mt-1 ${totalRevenue - totalExpenses >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {currency(totalRevenue - totalExpenses)}
          </p>
        </div>

        <div className="noma-card">
          <div className="w-9 h-9 bg-[#c9a84c]/10 rounded-xl flex items-center justify-center mb-3">
            <BarChart3 size={16} className="text-[#c9a84c]" />
          </div>
          <p className="text-xs text-gray-500">Margen neto</p>
          <p className={`text-xl font-bold mt-1 ${netMargin >= 20 ? 'text-green-600' : 'text-yellow-600'}`}>
            {netMargin}%
          </p>
        </div>
      </div>

      {/* Monthly bar chart */}
      <div className="noma-card">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-bold text-[#1a1a1a]">Evolución mensual</h2>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-[#c9a84c]" />
              <span className="text-gray-500">Ingresos</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-red-400" />
              <span className="text-gray-500">Egresos</span>
            </div>
          </div>
        </div>

        <div className="flex items-end gap-3 h-40">
          {snapshots.map((s, i) => {
            const incomePct = (s.income / maxIncome) * 100
            const expPct = (s.expenses / maxIncome) * 100
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex items-end gap-0.5 h-32">
                  <div
                    className="flex-1 bg-[#c9a84c] rounded-t-md transition-all hover:bg-[#b8962e]"
                    style={{ height: `${incomePct}%` }}
                    title={`Ingresos: ${currency(s.income)}`}
                  />
                  <div
                    className="flex-1 bg-red-400 rounded-t-md transition-all hover:bg-red-500"
                    style={{ height: `${expPct}%` }}
                    title={`Egresos: ${currency(s.expenses)}`}
                  />
                </div>
                <span className="text-[10px] text-gray-400 font-medium">{s.month}</span>
              </div>
            )
          })}
        </div>

        {/* Table below chart */}
        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-2 text-gray-400 font-semibold">Mes</th>
                <th className="text-right py-2 text-gray-400 font-semibold">Ingresos</th>
                <th className="text-right py-2 text-gray-400 font-semibold">Egresos</th>
                <th className="text-right py-2 text-gray-400 font-semibold">Resultado</th>
                <th className="text-right py-2 text-gray-400 font-semibold">Margen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {snapshots.map((s, i) => {
                const result = s.income - s.expenses
                const margin = s.income > 0 ? Math.round((result / s.income) * 100) : 0
                return (
                  <tr key={i} className="hover:bg-gray-50/50">
                    <td className="py-2 font-semibold text-[#1a1a1a]">{s.month} 2026</td>
                    <td className="py-2 text-right text-green-600 font-medium">{currency(s.income)}</td>
                    <td className="py-2 text-right text-red-600 font-medium">{currency(s.expenses)}</td>
                    <td className={`py-2 text-right font-bold ${result >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {currency(result)}
                    </td>
                    <td className={`py-2 text-right font-semibold ${margin >= 20 ? 'text-green-600' : 'text-yellow-600'}`}>
                      {margin}%
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Top products by margin */}
      <div className="noma-card">
        <h2 className="font-bold text-[#1a1a1a] mb-4">Top productos por margen</h2>
        <div className="space-y-3">
          {topProducts.map((p, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="w-6 h-6 rounded-full bg-gray-100 text-gray-500 text-xs flex items-center justify-center font-bold flex-shrink-0">
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-[#1a1a1a] truncate">{p.name}</span>
                  <span className="text-sm font-bold text-[#c9a84c] flex-shrink-0 ml-2">{p.margin}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-1.5">
                  <div
                    className="h-1.5 rounded-full bg-[#c9a84c]"
                    style={{ width: `${p.margin}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
                  <span>Ventas: {currency(p.revenue)}</span>
                  <span>Costo: {currency(p.cost)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
