import Link from 'next/link'
import { ChevronRight, TrendingUp, TrendingDown } from 'lucide-react'

type Tone = 'gold' | 'navy' | 'green' | 'red'

const TONE: Record<Tone, { bg: string; fg: string }> = {
  gold: { bg: 'bg-[#c9a24e]/12', fg: 'text-[#c9a24e]' },
  navy: { bg: 'bg-[#1b2a4a]/10', fg: 'text-[#1b2a4a]' },
  green: { bg: 'bg-green-100', fg: 'text-green-600' },
  red: { bg: 'bg-red-100', fg: 'text-[#c0392b]' },
}

// Tendencia opcional bajo el valor: 'pos' (verde ▲), 'neg' (rojo ▼) o 'muted' (gris, sin flecha).
type Trend = { text: string; tone?: 'pos' | 'neg' | 'muted' }

/**
 * Tarjeta KPI estilo mockup: ícono en cuadro redondeado, etiqueta, valor
 * grande, una tendencia opcional y un enlace "Ver detalle →" opcional al pie.
 */
export function KpiCard({
  icon: Icon,
  label,
  value,
  tone = 'gold',
  detailHref,
  trend,
}: {
  icon: React.ElementType
  label: string
  value: string | number
  tone?: Tone
  detailHref?: string
  trend?: Trend
}) {
  const t = TONE[tone]
  return (
    <div className="bg-white rounded-2xl shadow-card p-5 flex flex-col transition-shadow hover:shadow-lg">
      <div className="flex items-center gap-3">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${t.bg}`}>
          <Icon size={20} className={t.fg} />
        </div>
        <p className="text-sm text-gray-500 font-medium">{label}</p>
      </div>
      <div className="flex items-end gap-2 mt-3 flex-wrap">
        <p className="text-2xl font-bold text-[#1b2a4a] leading-none">{value}</p>
        {trend && (
          <span
            className={`inline-flex items-center gap-1 text-xs font-semibold leading-none pb-0.5 ${
              trend.tone === 'neg' ? 'text-[#c0392b]' : trend.tone === 'muted' ? 'text-gray-400' : 'text-green-600'
            }`}
          >
            {trend.tone === 'neg' ? <TrendingDown size={13} /> : trend.tone === 'muted' ? null : <TrendingUp size={13} />}
            {trend.text}
          </span>
        )}
      </div>
      {detailHref && (
        <Link href={detailHref} className="mt-2 text-xs font-medium text-[#c9a24e] hover:underline flex items-center gap-1">
          Ver detalle <ChevronRight size={13} />
        </Link>
      )}
    </div>
  )
}
