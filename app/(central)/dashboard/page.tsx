import {
  TrendingUp,
  ClipboardList,
  AlertTriangle,
  DollarSign,
  Plus,
  ChevronRight,
  Package,
  Truck,
} from 'lucide-react'
import Link from 'next/link'
import { operationsDemo } from '@/lib/operations'
import { initialCashEntries, initialFinancialSnapshots } from '@/lib/finance'

function currency(n: number) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n)
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    Confirmado: 'noma-badge-blue',
    Reservado: 'noma-badge-gray',
    'En produccion': 'noma-badge-gold',
    Armado: 'noma-badge-gold',
    Despachado: 'noma-badge-green',
  }
  return <span className={map[status] || 'noma-badge-gray'}>{status}</span>
}

export default function DashboardPage() {
  const { orders, catalogItems } = operationsDemo

  // KPI computations
  const todayIncome = initialCashEntries
    .filter(e => e.date === '2026-06-20' && e.type === 'Ingreso')
    .reduce((s, e) => s + e.amount, 0)

  const pendingOrders = orders.filter(o =>
    ['Confirmado', 'Reservado', 'En produccion'].includes(o.status)
  ).length

  const criticalStock = catalogItems.filter(i => i.stock < i.minimumStock).length

  const lastSnapshot = initialFinancialSnapshots?.[initialFinancialSnapshots.length - 1]
  const currentCash = lastSnapshot?.cash ?? 1842000

  const recentOrders = orders.slice(0, 5)
  const lowStockItems = catalogItems.filter(i => i.stock <= i.minimumStock)

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1a1a1a]">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">Lunes 30 de junio, 2026</p>
        </div>
        <Link href="/operaciones/pedidos" className="noma-btn-primary flex items-center gap-2 text-sm">
          <Plus size={16} />
          Nuevo pedido
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="noma-card">
          <div className="flex items-start justify-between mb-3">
            <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
              <TrendingUp size={18} className="text-green-600" />
            </div>
            <span className="text-xs text-green-600 font-semibold bg-green-50 px-2 py-0.5 rounded-full">+12%</span>
          </div>
          <p className="text-xs text-gray-500 font-medium">Ventas del día</p>
          <p className="text-xl font-bold text-[#1a1a1a] mt-1">{currency(todayIncome)}</p>
        </div>

        <div className="noma-card">
          <div className="flex items-start justify-between mb-3">
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
              <ClipboardList size={18} className="text-blue-600" />
            </div>
            <span className="text-xs text-blue-600 font-semibold bg-blue-50 px-2 py-0.5 rounded-full">Activos</span>
          </div>
          <p className="text-xs text-gray-500 font-medium">Pedidos pendientes</p>
          <p className="text-xl font-bold text-[#1a1a1a] mt-1">{pendingOrders}</p>
        </div>

        <div className="noma-card">
          <div className="flex items-start justify-between mb-3">
            <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center">
              <AlertTriangle size={18} className="text-red-500" />
            </div>
            <span className="text-xs text-red-600 font-semibold bg-red-50 px-2 py-0.5 rounded-full">Crítico</span>
          </div>
          <p className="text-xs text-gray-500 font-medium">Stock crítico</p>
          <p className="text-xl font-bold text-[#1a1a1a] mt-1">{criticalStock} productos</p>
        </div>

        <div className="noma-card">
          <div className="flex items-start justify-between mb-3">
            <div className="w-10 h-10 bg-[#c9a84c]/10 rounded-xl flex items-center justify-center">
              <DollarSign size={18} className="text-[#c9a84c]" />
            </div>
            <span className="text-xs text-[#c9a84c] font-semibold bg-[#c9a84c]/10 px-2 py-0.5 rounded-full">Hoy</span>
          </div>
          <p className="text-xs text-gray-500 font-medium">Caja actual</p>
          <p className="text-xl font-bold text-[#1a1a1a] mt-1">{currency(currentCash)}</p>
        </div>
      </div>

      {/* Recent orders + Stock alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent orders */}
        <div className="lg:col-span-2 noma-card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-[#1a1a1a]">Pedidos recientes</h2>
            <Link
              href="/operaciones/pedidos"
              className="text-xs text-[#c9a84c] hover:underline flex items-center gap-1"
            >
              Ver todos <ChevronRight size={12} />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 px-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">Código</th>
                  <th className="text-left py-2 px-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">Cliente</th>
                  <th className="text-left py-2 px-2 text-xs font-semibold text-gray-400 uppercase tracking-wide hidden sm:table-cell">Entrega</th>
                  <th className="text-left py-2 px-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {recentOrders.map(order => (
                  <tr key={order.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-3 px-2 font-mono text-xs text-gray-600">{order.code}</td>
                    <td className="py-3 px-2 font-medium text-[#1a1a1a]">{order.customerName}</td>
                    <td className="py-3 px-2 text-gray-500 hidden sm:table-cell text-xs">
                      {new Date(order.deliveryDate).toLocaleDateString('es-CL')}
                    </td>
                    <td className="py-3 px-2">
                      <StatusBadge status={order.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Stock alerts + Quick actions */}
        <div className="space-y-4">
          {/* Stock alerts */}
          <div className="noma-card">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle size={16} className="text-red-500" />
              <h2 className="font-bold text-[#1a1a1a]">Alertas de stock</h2>
            </div>
            <div className="space-y-2.5">
              {lowStockItems.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-4">Sin alertas activas</p>
              ) : (
                lowStockItems.map(item => (
                  <div key={item.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
                      <span className="text-xs text-gray-700 truncate">{item.name}</span>
                    </div>
                    <span className="text-xs font-bold text-red-600 flex-shrink-0 ml-2">
                      {item.stock}/{item.minimumStock} {item.unit}
                    </span>
                  </div>
                ))
              )}
            </div>
            <Link
              href="/operaciones/inventario"
              className="mt-4 flex items-center gap-1 text-xs text-[#c9a84c] hover:underline"
            >
              <Package size={12} />
              Ir al inventario
            </Link>
          </div>

          {/* Quick actions */}
          <div className="noma-card">
            <h2 className="font-bold text-[#1a1a1a] mb-3">Acciones rápidas</h2>
            <div className="space-y-2">
              <Link href="/operaciones/produccion" className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-[#f5f0e8] transition-colors group">
                <div className="w-8 h-8 bg-[#c9a84c]/10 rounded-lg flex items-center justify-center">
                  <ClipboardList size={14} className="text-[#c9a84c]" />
                </div>
                <span className="text-sm text-gray-700 group-hover:text-[#1a1a1a]">Ver producción</span>
                <ChevronRight size={14} className="ml-auto text-gray-300" />
              </Link>
              <Link href="/operaciones/despachos" className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-[#f5f0e8] transition-colors group">
                <div className="w-8 h-8 bg-[#c9a84c]/10 rounded-lg flex items-center justify-center">
                  <Truck size={14} className="text-[#c9a84c]" />
                </div>
                <span className="text-sm text-gray-700 group-hover:text-[#1a1a1a]">Despachos activos</span>
                <ChevronRight size={14} className="ml-auto text-gray-300" />
              </Link>
              <Link href="/finanzas/caja" className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-[#f5f0e8] transition-colors group">
                <div className="w-8 h-8 bg-[#c9a84c]/10 rounded-lg flex items-center justify-center">
                  <DollarSign size={14} className="text-[#c9a84c]" />
                </div>
                <span className="text-sm text-gray-700 group-hover:text-[#1a1a1a]">Registrar movimiento</span>
                <ChevronRight size={14} className="ml-auto text-gray-300" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
