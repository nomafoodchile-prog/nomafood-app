'use client'

import { useEffect, useState } from 'react'
import { Sun, Moon, Calendar, ShoppingCart, DollarSign, TrendingDown, HandCoins, Loader2, Store, ShoppingBag } from 'lucide-react'
import Link from 'next/link'
import { Panel } from '@/components/central/Panel'
import { KpiCard } from '@/components/central/KpiCard'
import { SalesChart, type SalesPoint } from '@/components/central/SalesChart'

function currency(n: number) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n || 0)
}
const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

type Reciente = { id: string; tipo: 'may' | 'min'; numero: string; cliente: string; total: number; estado: string; fecha: string }
type Data = {
  kpis: { pedidosHoy: number; ventasMes: number; porCobrar: number; porCobrarN: number; porPagar: number; saldoMes: number }
  serie: { key: string; ingresos: number; egresos: number }[]
  recientes: Reciente[]
}

const BADGE: Record<string, { t: string; c: string }> = {
  pendiente_pago: { t: 'Pend. pago', c: 'bg-orange-100 text-orange-700' },
  pagado: { t: 'Pagado', c: 'bg-green-100 text-green-700' },
  en_preparacion: { t: 'En preparación', c: 'bg-[#f5f0e8] text-[#c9a24e]' },
  listo_para_despacho: { t: 'Listo', c: 'bg-blue-50 text-blue-700' },
  asignado: { t: 'En despacho', c: 'bg-blue-50 text-blue-700' },
  entregado: { t: 'Entregado', c: 'bg-green-100 text-green-700' },
  cancelado: { t: 'Cancelado', c: 'bg-gray-100 text-gray-500' },
  processing: { t: 'Pagado', c: 'bg-green-100 text-green-700' },
  completed: { t: 'Completado', c: 'bg-green-100 text-green-700' },
  pending: { t: 'Pend. pago', c: 'bg-orange-100 text-orange-700' },
  'on-hold': { t: 'En espera', c: 'bg-amber-50 text-amber-700' },
  nuevo: { t: 'Nuevo', c: 'bg-gray-100 text-gray-600' },
}
function badge(estado: string) { return BADGE[estado] || { t: estado, c: 'bg-gray-100 text-gray-600' } }
function fechaCorta(iso: string) { return iso ? new Date(iso).toLocaleDateString('es-CL', { day: '2-digit', month: 'short' }) : '—' }

export default function DashboardPage() {
  const [data, setData] = useState<Data | null>(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    fetch('/api/central/dashboard').then(r => r.json()).then(j => { if (j?.kpis) setData(j) }).catch(() => {}).finally(() => setCargando(false))
  }, [])

  const now = new Date()
  const saludo = now.getHours() < 12 ? 'Buenos días' : now.getHours() < 20 ? 'Buenas tardes' : 'Buenas noches'
  const fecha = now.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  const salesData: SalesPoint[] = (data?.serie || []).map(s => ({
    mes: MESES[Number(s.key.split('-')[1]) - 1] ?? s.key,
    ventas: s.ingresos,
    gastos: s.egresos,
  }))

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

      {cargando ? (
        <div className="min-h-[40vh] flex items-center justify-center"><Loader2 className="w-6 h-6 text-[#1b2a4a] animate-spin" /></div>
      ) : !data ? (
        <div className="bg-white rounded-2xl shadow-card p-8 text-center text-gray-400 text-sm">No se pudieron cargar los datos. Recarga la página.</div>
      ) : (
        <>
          {/* KPIs reales */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard icon={ShoppingCart} label="Pedidos de hoy" value={data.kpis.pedidosHoy} tone="gold" detailHref="/operaciones/pedidos" trend={{ text: 'mayoristas + minoristas', tone: 'muted' }} />
            <KpiCard icon={DollarSign} label="Ventas del mes" value={currency(data.kpis.ventasMes)} tone="green" detailHref="/finanzas/caja" trend={{ text: `Saldo ${currency(data.kpis.saldoMes)}`, tone: data.kpis.saldoMes >= 0 ? 'pos' : 'neg' }} />
            <KpiCard icon={HandCoins} label="Por cobrar" value={currency(data.kpis.porCobrar)} tone="navy" detailHref="/operaciones/pedidos" trend={{ text: `${data.kpis.porCobrarN} pedido(s) pend. pago`, tone: 'muted' }} />
            <KpiCard icon={TrendingDown} label="Por pagar" value={currency(data.kpis.porPagar)} tone="red" detailHref="/finanzas/caja" trend={{ text: 'egresos pendientes', tone: 'muted' }} />
          </div>

          {/* Ventas/gastos + Pedidos recientes */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Panel title="Ventas y gastos" className="lg:col-span-2" action={<span className="text-xs text-gray-400">Últimos 6 meses</span>}>
              {salesData.some(s => s.ventas || s.gastos) ? <SalesChart data={salesData} /> : <p className="text-sm text-gray-400 py-10 text-center">Aún no hay movimientos de caja para graficar.</p>}
            </Panel>

            <Panel title="Pedidos recientes" actionHref="/operaciones/pedidos" actionLabel="Ver todos">
              <div className="space-y-3">
                {data.recientes.length === 0 && <p className="text-sm text-gray-400 py-6 text-center">Sin pedidos recientes.</p>}
                {data.recientes.map(o => {
                  const e = badge(o.estado)
                  return (
                    <div key={`${o.tipo}-${o.id}`} className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-[#f5f0e8] flex items-center justify-center flex-shrink-0" title={o.tipo === 'may' ? 'Mayorista' : 'Minorista'}>
                        {o.tipo === 'may' ? <Store size={15} className="text-[#c9a24e]" /> : <ShoppingBag size={15} className="text-[#c9a24e]" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-[#1b2a4a] truncate">{o.cliente}</p>
                        <p className="text-xs text-gray-400">{o.numero} · {fechaCorta(o.fecha)} · {currency(o.total)}</p>
                      </div>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${e.c}`}>{e.t}</span>
                    </div>
                  )
                })}
              </div>
            </Panel>
          </div>

          {/* Resumen de caja del mes */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Panel title="Caja de este mes" actionHref="/finanzas/caja" actionLabel="Ver caja">
              <div className="grid grid-cols-3 gap-3">
                {[
                  { l: 'Ingresos', v: data.kpis.ventasMes, c: 'text-green-600' },
                  { l: 'Egresos', v: data.kpis.ventasMes - data.kpis.saldoMes, c: 'text-red-600' },
                  { l: 'Saldo', v: data.kpis.saldoMes, c: data.kpis.saldoMes >= 0 ? 'text-[#1b2a4a]' : 'text-red-600' },
                ].map(x => (
                  <div key={x.l} className="rounded-xl bg-gray-50 px-3 py-3 text-center">
                    <div className={`font-bold text-sm ${x.c}`}>{currency(x.v)}</div>
                    <div className="text-[11px] text-gray-400 mt-0.5">{x.l}</div>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel title="Atajos" className="lg:col-span-2">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { l: 'Pedidos', href: '/operaciones/pedidos' },
                  { l: 'Caja', href: '/finanzas/caja' },
                  { l: 'Proyección', href: '/finanzas/proyeccion' },
                  { l: 'Compras', href: '/compras/recepcion' },
                ].map(a => (
                  <Link key={a.href} href={a.href} className="rounded-xl border border-gray-100 hover:border-[#c9a24e] px-3 py-4 text-center text-sm font-medium text-[#1b2a4a] transition-colors">{a.l}</Link>
                ))}
              </div>
            </Panel>
          </div>
        </>
      )}
    </div>
  )
}
