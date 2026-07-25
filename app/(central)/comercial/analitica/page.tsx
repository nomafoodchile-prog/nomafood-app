'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { BarChart3, Users, Globe, Megaphone, RefreshCw, ExternalLink } from 'lucide-react'

type Item = { nombre: string; total: number }
type Data = {
  ok: boolean
  rango_dias: number
  total_visitas: number
  visitantes_unicos: number
  fuentes: Item[]
  paths: Item[]
  campanas: Item[]
  serie: { dia: string; total: number }[]
}

const nf = (n: number) => new Intl.NumberFormat('es-CL').format(n)

export default function AnaliticaPage() {
  const [d, setD] = useState<Data | null>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)

  const load = () => {
    setLoading(true)
    fetch('/api/central/analitica')
      .then(r => r.json())
      .then((j: Data & { error?: string }) => { if (j.ok) { setD(j); setErr(null) } else setErr(j.error || 'Error') })
      .catch(() => setErr('Error de conexión'))
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  const maxSerie = Math.max(1, ...(d?.serie.map(s => s.total) || [1]))
  const maxFuente = Math.max(1, ...(d?.fuentes.map(f => f.total) || [1]))

  return (
    <div className="p-5 lg:p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-bold text-[#16233f] flex items-center gap-2">
          <BarChart3 className="text-[#c9a24e]" size={24} /> Analítica web
        </h1>
        <button onClick={load} className="p-2 rounded-lg text-gray-500 hover:bg-gray-100" title="Actualizar">
          <RefreshCw size={16} />
        </button>
      </div>
      <p className="text-sm text-gray-500 mb-6">Cómo llegan los clientes a la web · últimos {d?.rango_dias || 30} días</p>

      {loading ? (
        <p className="text-gray-400 text-sm">Cargando…</p>
      ) : err ? (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm">{err}</div>
      ) : !d || d.total_visitas === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center">
          <Globe className="mx-auto text-gray-300 mb-3" size={40} />
          <p className="font-semibold text-[#16233f]">Aún no hay visitas registradas</p>
          <p className="text-sm text-gray-500 mt-1">Los datos empiezan a acumularse desde que se publique la web. Vuelve aquí luego de recibir tráfico o lanzar una campaña.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Métricas */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Metric icon={<Globe size={18} />} label="Visitas" value={nf(d.total_visitas)} />
            <Metric icon={<Users size={18} />} label="Visitantes únicos" value={nf(d.visitantes_unicos)} />
            <Metric icon={<Megaphone size={18} />} label="Fuente principal" value={d.fuentes[0]?.nombre || '—'} />
          </div>

          {/* Serie por día */}
          <Card title="Visitas por día (últimos 14)">
            <div className="flex items-end gap-1.5 h-32 mt-2">
              {d.serie.map(s => (
                <div key={s.dia} className="flex-1 flex flex-col items-center justify-end group">
                  <div className="w-full rounded-t bg-[#c9a24e]" style={{ height: `${(s.total / maxSerie) * 100}%`, minHeight: s.total > 0 ? 4 : 0 }} title={`${s.dia}: ${s.total}`} />
                  <span className="text-[9px] text-gray-400 mt-1">{s.dia.slice(8, 10)}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Fuentes */}
          <Card title="De dónde llegan (fuentes)">
            <div className="space-y-2 mt-2">
              {d.fuentes.map(f => (
                <div key={f.nombre} className="flex items-center gap-3">
                  <span className="text-sm text-[#16233f] w-28 truncate">{f.nombre}</span>
                  <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-[#16233f] rounded-full" style={{ width: `${(f.total / maxFuente) * 100}%` }} />
                  </div>
                  <span className="text-sm font-semibold text-gray-600 w-12 text-right">{nf(f.total)}</span>
                </div>
              ))}
            </div>
          </Card>

          <div className="grid md:grid-cols-2 gap-6">
            <Card title="Páginas más vistas">
              <ul className="mt-2 space-y-1.5">
                {d.paths.map(p => (
                  <li key={p.nombre} className="flex justify-between text-sm">
                    <span className="text-gray-600 truncate mr-2">{p.nombre}</span>
                    <span className="font-semibold text-[#16233f]">{nf(p.total)}</span>
                  </li>
                ))}
              </ul>
            </Card>
            <Card title="Campañas (UTM)">
              {d.campanas.length === 0 ? (
                <p className="text-sm text-gray-400 mt-2">Sin campañas con UTM todavía. Usa enlaces con <code>?utm_campaign=</code> en tus campañas para medirlas aquí.</p>
              ) : (
                <ul className="mt-2 space-y-1.5">
                  {d.campanas.map(c => (
                    <li key={c.nombre} className="flex justify-between text-sm">
                      <span className="text-gray-600 truncate mr-2">{c.nombre}</span>
                      <span className="font-semibold text-[#16233f]">{nf(c.total)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </div>
      )}

      {/* Nota GA4 */}
      <div className="mt-8 bg-[#16233f]/5 border border-[#16233f]/10 rounded-xl p-4 text-sm text-gray-600">
        <p className="font-semibold text-[#16233f] mb-1">¿Quieres análisis más profundo?</p>
        Este panel es un resumen propio. Para reportes detallados (embudos, geografía, tiempo en página), usa <b>Google Analytics 4</b>.{' '}
        <a href="https://analytics.google.com" target="_blank" rel="noopener noreferrer" className="text-[#c9a24e] font-semibold inline-flex items-center gap-1">Abrir Google Analytics <ExternalLink size={12} /></a>
      </div>
    </div>
  )
}

function Metric({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-4">
      <div className="flex items-center gap-2 text-gray-400 text-xs font-medium mb-1">{icon}{label}</div>
      <div className="text-2xl font-bold text-[#16233f] truncate">{value}</div>
    </div>
  )
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-4">
      <p className="text-sm font-semibold text-[#16233f]">{title}</p>
      {children}
    </div>
  )
}
