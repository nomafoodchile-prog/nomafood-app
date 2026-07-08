import {
  Sun, Moon, Calendar, ShoppingCart, Factory, DollarSign, FileWarning,
  ClipboardList, ChefHat, PackageCheck, Truck, CheckCircle2, AlertTriangle,
  ChevronRight, Circle, Users,
} from 'lucide-react'
import Link from 'next/link'
import { operationsDemo } from '@/lib/operations'
import { initialFinancialSnapshots, initialReceivables, receivableComputedStatus } from '@/lib/finance'
import { Panel } from '@/components/central/Panel'
import { AlertasDashboard } from '@/components/central/AlertasDashboard'
import { KpiCard } from '@/components/central/KpiCard'
import { SalesChart, type SalesPoint } from '@/components/central/SalesChart'

function currency(n: number) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n || 0)
}

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

const ESTADO_PEDIDO: Record<string, string> = {
  Confirmado: 'noma-badge-blue', Reservado: 'noma-badge-gray',
  'En produccion': 'noma-badge-gold', Armado: 'noma-badge-gold', Despachado: 'noma-badge-green',
}

export default function DashboardPage() {
  const { orders, productionOrders, pickingTasks, dispatches, catalogItems, operators } = operationsDemo

  // KPIs
  const lastSnapshot = initialFinancialSnapshots[initialFinancialSnapshots.length - 1]
  const prodDone = productionOrders.filter(p => p.status === 'Completada').length
  const prodPct = productionOrders.length ? Math.round((prodDone / productionOrders.length) * 100) : 0
  const vencidas = initialReceivables.filter(r => receivableComputedStatus(r) === 'Vencida')
  const criticos = catalogItems.filter(i => i.stock < i.minimumStock)

  // Flujo operativo
  const flujo = [
    { icon: ClipboardList, label: 'Pedidos', value: orders.length, done: false },
    { icon: ChefHat, label: 'Producción', value: productionOrders.length, done: false },
    { icon: PackageCheck, label: 'Picking', value: pickingTasks.length, done: false },
    { icon: Truck, label: 'Despacho', value: dispatches.filter(d => d.status !== 'Entregado').length, done: false },
    { icon: CheckCircle2, label: 'Entregados', value: dispatches.filter(d => d.status === 'Entregado').length, done: true },
  ]

  // Alertas y pendientes
  const alertas = [
    criticos.length && { icon: AlertTriangle, text: `${criticos.length} productos con stock crítico`, tone: 'red' as const, href: '/operaciones/inventario' },
    vencidas.length && { icon: FileWarning, text: `${vencidas.length} facturas vencidas`, tone: 'red' as const, href: '/finanzas/cobranza' },
    productionOrders.filter(p => p.status !== 'Completada').length && { icon: ClipboardList, text: `${productionOrders.filter(p => p.status !== 'Completada').length} órdenes de producción en curso`, tone: 'gold' as const, href: '/operaciones/produccion' },
    dispatches.filter(d => d.status === 'En ruta').length && { icon: Truck, text: `${dispatches.filter(d => d.status === 'En ruta').length} despachos en ruta`, tone: 'navy' as const, href: '/operaciones/despachos' },
  ].filter(Boolean) as { icon: React.ElementType; text: string; tone: 'red' | 'gold' | 'navy'; href: string }[]

  // Serie Ventas y gastos (últimos 6 meses)
  const salesData: SalesPoint[] = initialFinancialSnapshots.slice(-6).map(s => ({
    mes: MESES[Number(s.month.split('-')[1]) - 1] ?? s.month,
    ventas: s.income,
    gastos: s.expenses,
  }))

  const recentOrders = orders.slice(0, 5)

  // Equipo conectado (operadores por área)
  const equipo = Object.entries(
    operators.reduce<Record<string, number>>((acc, o) => { acc[o.area] = (acc[o.area] || 0) + 1; return acc }, {})
  )

  const now = new Date()
  const saludo = now.getHours() < 12 ? 'Buenos días' : now.getHours() < 20 ? 'Buenas tardes' : 'Buenas noches'
  const fecha = now.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-[#1b2a4a]">Dashboard Central</h1>

      {/* Saludo */}
      <div className="bg-white rounded-2xl shadow-card p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-[#c9a24e]/12 flex items-center justify-center">
            {now.getHours() < 20 ? <Sun size={22} className="text-[#c9a24e]" /> : <Moon size={22} className="text-[#c9a24e]" />}
          </div>
          <div>
            <p className="text-lg font-bold text-[#1b2a4a]">{saludo}</p>
            <p className="text-sm text-gray-500">Resumen general de Noma Food</p>
          </div>
        </div>
        <span className="flex items-center gap-2 text-sm font-medium text-[#1b2a4a] bg-[#f5f0e8] rounded-full px-4 py-2 capitalize">
          <Calendar size={15} className="text-[#c9a24e]" /> {fecha}
        </span>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={ShoppingCart} label="Pedidos de hoy" value={orders.length} tone="gold" detailHref="/operaciones/pedidos" />
        <KpiCard icon={Factory} label="Producción" value={`${prodPct}%`} tone="navy" detailHref="/operaciones/produccion" />
        <KpiCard icon={DollarSign} label="Ventas del mes" value={currency(lastSnapshot?.income ?? 0)} tone="green" detailHref="/finanzas/balance" />
        <KpiCard icon={FileWarning} label="Facturas vencidas" value={vencidas.length} tone="red" detailHref="/finanzas/cobranza" />
      </div>

      {/* Flujo operativo + Alertas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Panel title="Flujo operativo de hoy" className="lg:col-span-2">
          <div className="flex items-center justify-between gap-1 overflow-x-auto pb-1">
            {flujo.map((f, i) => (
              <div key={f.label} className="flex items-center gap-1 flex-shrink-0">
                <div className="flex flex-col items-center gap-1.5 w-[74px]">
                  <div className={`w-14 h-14 rounded-full flex items-center justify-center ${f.done ? 'bg-green-100' : 'bg-[#c9a24e]/12'}`}>
                    <f.icon size={22} className={f.done ? 'text-green-600' : 'text-[#c9a24e]'} />
                  </div>
                  <p className="text-xs text-gray-500">{f.label}</p>
                  <p className={`text-lg font-bold leading-none ${f.done ? 'text-green-600' : 'text-[#1b2a4a]'}`}>{f.value}</p>
                </div>
                {i < flujo.length - 1 && <ChevronRight size={18} className="text-gray-300 flex-shrink-0" />}
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Alertas y pendientes" icon={AlertTriangle}>
          <AlertasDashboard />
          <Link href="/operaciones/inventario" className="mt-4 block text-center bg-[#c9a24e] hover:bg-[#b8923f] text-[#1b2a4a] text-sm font-semibold py-2.5 rounded-xl transition-colors">
            Ver inventario
          </Link>
        </Panel>
      </div>

      {/* Ventas/gastos + Pedidos recientes + Equipo */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Panel title="Ventas y gastos" action={<span className="text-xs text-gray-400">Últimos 6 meses</span>}>
          <SalesChart data={salesData} />
        </Panel>

        <Panel title="Pedidos recientes" actionHref="/operaciones/pedidos" actionLabel="Ver todos">
          <div className="space-y-3">
            {recentOrders.map(o => (
              <div key={o.id} className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-[#f5f0e8] flex items-center justify-center flex-shrink-0">
                  <ShoppingCart size={15} className="text-[#c9a24e]" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-[#1b2a4a] truncate">{o.customerName}</p>
                  <p className="text-xs text-gray-400">{o.code} · {new Date(o.deliveryDate).toLocaleDateString('es-CL', { day: '2-digit', month: 'short' })}</p>
                </div>
                <span className={ESTADO_PEDIDO[o.status] || 'noma-badge-gray'}>{o.status}</span>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Equipo conectado" icon={Users} actionHref="/personas/usuarios" actionLabel="Ver equipo">
          <div className="space-y-3">
            {equipo.map(([area, n]) => (
              <div key={area} className="flex items-center justify-between">
                <span className="text-sm text-gray-700">{area}</span>
                <span className="flex items-center gap-2">
                  <span className="text-sm font-bold text-[#1b2a4a]">{n}</span>
                  <Circle size={8} className="fill-green-500 text-green-500" />
                </span>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  )
}
