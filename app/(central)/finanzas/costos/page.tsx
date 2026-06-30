'use client'

import { TrendingUp, TrendingDown, Package, Users, Box, Truck, Settings } from 'lucide-react'

function currency(n: number) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n)
}

function pct(n: number) {
  return `${n > 0 ? '+' : ''}${n.toFixed(1)}%`
}

interface CategoriaCosto {
  nombre: string
  icon: React.ReactNode
  mesActual: number
  mesAnterior: number
}

const categorias: CategoriaCosto[] = [
  { nombre: 'Materias Primas', icon: <Package size={16} />, mesActual: 8_450_000, mesAnterior: 7_920_000 },
  { nombre: 'Mano de Obra', icon: <Users size={16} />, mesActual: 5_200_000, mesAnterior: 5_200_000 },
  { nombre: 'Envases y Packaging', icon: <Box size={16} />, mesActual: 1_340_000, mesAnterior: 1_280_000 },
  { nombre: 'Transporte y Despacho', icon: <Truck size={16} />, mesActual: 980_000, mesAnterior: 1_050_000 },
  { nombre: 'Gastos Generales', icon: <Settings size={16} />, mesActual: 620_000, mesAnterior: 590_000 },
]

const meses = [
  { mes: 'Ene', costo: 14_200_000 },
  { mes: 'Feb', costo: 13_800_000 },
  { mes: 'Mar', costo: 15_600_000 },
  { mes: 'Abr', costo: 15_100_000 },
  { mes: 'May', costo: 16_040_000 },
  { mes: 'Jun', costo: 16_590_000 },
]

const totalActual = categorias.reduce((s, c) => s + c.mesActual, 0)
const totalAnterior = categorias.reduce((s, c) => s + c.mesAnterior, 0)
const variacionTotal = ((totalActual - totalAnterior) / totalAnterior) * 100

// Ventas estimadas junio para calcular margen
const ventasJunio = 24_800_000
const margenBruto = ((ventasJunio - totalActual) / ventasJunio) * 100
const kgProducidos = 3_840
const costoPorKg = totalActual / kgProducidos

const maxMes = Math.max(...meses.map(m => m.costo))

export default function CostosPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#1a1a1a]">Análisis de Costos</h1>
        <p className="text-sm text-gray-500 mt-0.5">Estructura de costos — Junio 2026</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="noma-card bg-gradient-to-br from-[#0f0f0f] to-gray-800 text-white">
          <p className="text-xs text-gray-400 mb-1">Costo total junio</p>
          <p className="text-2xl font-bold text-[#c9a84c]">{currency(totalActual)}</p>
          <div className={`flex items-center gap-1 mt-2 text-xs ${variacionTotal > 0 ? 'text-red-400' : 'text-green-400'}`}>
            {variacionTotal > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            <span>{pct(variacionTotal)} vs mayo</span>
          </div>
        </div>

        <div className="noma-card border-l-4 border-green-400">
          <p className="text-xs text-gray-500 mb-1">Margen bruto estimado</p>
          <p className="text-2xl font-bold text-green-600">{margenBruto.toFixed(1)}%</p>
          <p className="text-xs text-gray-400 mt-1">Sobre ventas de {currency(ventasJunio)}</p>
        </div>

        <div className="noma-card border-l-4 border-[#c9a84c]">
          <p className="text-xs text-gray-500 mb-1">Costo por kg producido</p>
          <p className="text-2xl font-bold text-[#1a1a1a]">{currency(costoPorKg)}</p>
          <p className="text-xs text-gray-400 mt-1">{kgProducidos.toLocaleString('es-CL')} kg producidos</p>
        </div>
      </div>

      {/* Table */}
      <div className="noma-card !p-0 overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h2 className="font-bold text-[#1a1a1a]">Desglose por categoría</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50/50 border-b border-gray-100">
              <tr>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wide">Categoría</th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wide">Mes actual</th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wide hidden sm:table-cell">Mes anterior</th>
                <th className="text-center py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wide">Variación</th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wide hidden md:table-cell">% del total</th>
                <th className="py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wide hidden lg:table-cell">Participación</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {categorias.map(cat => {
                const variacion = ((cat.mesActual - cat.mesAnterior) / cat.mesAnterior) * 100
                const porcentaje = (cat.mesActual / totalActual) * 100
                return (
                  <tr key={cat.nombre} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-[#c9a84c]/10 rounded-lg flex items-center justify-center text-[#c9a84c]">
                          {cat.icon}
                        </div>
                        <span className="font-medium text-[#1a1a1a]">{cat.nombre}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-[#1a1a1a]">{currency(cat.mesActual)}</td>
                    <td className="py-3 px-4 text-right text-gray-500 hidden sm:table-cell">{currency(cat.mesAnterior)}</td>
                    <td className="py-3 px-4 text-center">
                      <div className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
                        variacion > 0 ? 'bg-red-50 text-red-600' : variacion < 0 ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {variacion > 0 ? <TrendingUp size={10} /> : variacion < 0 ? <TrendingDown size={10} /> : null}
                        {pct(variacion)}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right text-gray-500 text-xs hidden md:table-cell">{porcentaje.toFixed(1)}%</td>
                    <td className="py-3 px-4 hidden lg:table-cell">
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div
                          className="h-2 rounded-full bg-[#c9a84c]"
                          style={{ width: `${porcentaje}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot className="border-t-2 border-gray-200 bg-gray-50/50">
              <tr>
                <td className="py-3 px-4 font-bold text-[#1a1a1a]">Total</td>
                <td className="py-3 px-4 text-right font-bold text-[#1a1a1a]">{currency(totalActual)}</td>
                <td className="py-3 px-4 text-right font-bold text-gray-500 hidden sm:table-cell">{currency(totalAnterior)}</td>
                <td className="py-3 px-4 text-center">
                  <div className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
                    variacionTotal > 0 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'
                  }`}>
                    {variacionTotal > 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                    {pct(variacionTotal)}
                  </div>
                </td>
                <td className="py-3 px-4 text-right font-bold text-gray-500 hidden md:table-cell">100%</td>
                <td className="hidden lg:table-cell" />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Bar chart */}
      <div className="noma-card">
        <h2 className="font-bold text-[#1a1a1a] mb-6">Evolución de costos — Enero a Junio 2026</h2>
        <div className="flex items-end gap-3 h-40">
          {meses.map(m => {
            const altura = (m.costo / maxMes) * 100
            const esMesActual = m.mes === 'Jun'
            return (
              <div key={m.mes} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[10px] text-gray-500 font-bold hidden sm:block">
                  {(m.costo / 1_000_000).toFixed(1)}M
                </span>
                <div className="w-full flex items-end" style={{ height: '120px' }}>
                  <div
                    className={`w-full rounded-t-md transition-all ${esMesActual ? 'bg-[#c9a84c]' : 'bg-gray-200'}`}
                    style={{ height: `${altura}%` }}
                  />
                </div>
                <span className={`text-xs font-semibold ${esMesActual ? 'text-[#c9a84c]' : 'text-gray-500'}`}>
                  {m.mes}
                </span>
              </div>
            )
          })}
        </div>
        <div className="flex items-center gap-4 mt-4 pt-4 border-t border-gray-100">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-[#c9a84c]" />
            <span className="text-xs text-gray-500">Mes actual</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-gray-200" />
            <span className="text-xs text-gray-500">Meses anteriores</span>
          </div>
        </div>
      </div>

      {/* Composition breakdown */}
      <div className="noma-card">
        <h2 className="font-bold text-[#1a1a1a] mb-4">Composición del costo — Junio 2026</h2>
        <div className="space-y-3">
          {categorias.map(cat => {
            const porcentaje = (cat.mesActual / totalActual) * 100
            return (
              <div key={cat.nombre}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-600 font-medium">{cat.nombre}</span>
                  <span className="text-gray-500">{porcentaje.toFixed(1)}% · {currency(cat.mesActual)}</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2.5">
                  <div
                    className="h-2.5 rounded-full bg-[#c9a84c]"
                    style={{ width: `${porcentaje}%`, opacity: 0.4 + (porcentaje / 60) }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
