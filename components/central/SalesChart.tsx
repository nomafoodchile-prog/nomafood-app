'use client'

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

export interface SalesPoint { mes: string; ventas: number; gastos: number }

function clpCompact(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(0)}M`
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`
  return `$${n}`
}
function clp(n: number) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n)
}

export function SalesChart({ data }: { data: SalesPoint[] }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: 4, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#eef0f2" vertical={false} />
          <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#9aa1ac' }} axisLine={false} tickLine={false} />
          <YAxis tickFormatter={clpCompact} tick={{ fontSize: 11, fill: '#9aa1ac' }} axisLine={false} tickLine={false} width={44} />
          <Tooltip
            formatter={(v: number, name: string) => [clp(v), name === 'ventas' ? 'Ventas' : 'Gastos']}
            contentStyle={{ borderRadius: 12, border: '1px solid #eef0f2', fontSize: 12 }}
          />
          <Line type="monotone" dataKey="ventas" stroke="#c9a24e" strokeWidth={2.5} dot={{ r: 3, fill: '#c9a24e' }} activeDot={{ r: 5 }} />
          <Line type="monotone" dataKey="gastos" stroke="#1b2a4a" strokeWidth={2.5} dot={{ r: 3, fill: '#1b2a4a' }} activeDot={{ r: 5 }} />
        </LineChart>
      </ResponsiveContainer>
      <div className="flex items-center justify-center gap-5 mt-2 text-xs text-gray-500">
        <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 rounded bg-[#c9a24e]" /> Ventas</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 rounded bg-[#1b2a4a]" /> Gastos</span>
      </div>
    </div>
  )
}
