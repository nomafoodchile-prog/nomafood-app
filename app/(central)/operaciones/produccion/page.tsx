import { ChefHat, Snowflake, Croissant, Package2, Clock, CheckCircle2, Circle } from 'lucide-react'
import { operationsDemo } from '@/lib/operations'
import type { OperativeArea } from '@/lib/operations'

const areaConfig: Record<OperativeArea, { icon: React.ElementType; color: string; bg: string }> = {
  'Cocina caliente': { icon: ChefHat, color: 'text-orange-600', bg: 'bg-orange-50' },
  Frio: { icon: Snowflake, color: 'text-blue-600', bg: 'bg-blue-50' },
  Panaderia: { icon: Croissant, color: 'text-yellow-700', bg: 'bg-yellow-50' },
  Armado: { icon: Package2, color: 'text-purple-600', bg: 'bg-purple-50' },
  Despacho: { icon: Package2, color: 'text-green-600', bg: 'bg-green-50' },
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="w-full bg-gray-100 rounded-full h-1.5">
      <div
        className="h-1.5 rounded-full bg-[#c9a84c] transition-all"
        style={{ width: `${Math.min(100, value)}%` }}
      />
    </div>
  )
}

export default function ProduccionPage() {
  const { productionOrders, dailyTasks } = operationsDemo

  const areas: OperativeArea[] = ['Cocina caliente', 'Frio', 'Panaderia', 'Armado']

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#1a1a1a]">Producción</h1>
        <p className="text-sm text-gray-500 mt-0.5">Asignación diaria de tareas — 30 jun 2026</p>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Órdenes totales', value: productionOrders.length, color: 'text-[#1a1a1a]' },
          { label: 'En proceso', value: productionOrders.filter(o => o.status === 'En proceso').length, color: 'text-blue-600' },
          { label: 'Pendientes', value: productionOrders.filter(o => o.status === 'Pendiente').length, color: 'text-yellow-600' },
          { label: 'Completadas', value: productionOrders.filter(o => o.status === 'Completada').length, color: 'text-green-600' },
        ].map(s => (
          <div key={s.label} className="noma-card !py-4">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Area cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {areas.map(area => {
          const config = areaConfig[area]
          const areaTasks = dailyTasks.filter(t => t.area === area)
          const completed = areaTasks.filter(t => t.status === 'Lista').length
          const progress = areaTasks.length > 0 ? Math.round((completed / areaTasks.length) * 100) : 0
          const totalMinutes = areaTasks.reduce((s, t) => s + t.estimatedMinutes, 0)
          const completedMinutes = areaTasks
            .filter(t => t.status === 'Lista')
            .reduce((s, t) => s + t.estimatedMinutes, 0)
          const remainingMin = totalMinutes - completedMinutes

          return (
            <div key={area} className="noma-card">
              {/* Area header */}
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 ${config.bg} rounded-xl flex items-center justify-center`}>
                  <config.icon size={18} className={config.color} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-[#1a1a1a]">{area}</h3>
                  <p className="text-xs text-gray-500">{areaTasks.length} tareas · {remainingMin} min restantes</p>
                </div>
                <span
                  className={`text-sm font-bold ${
                    progress === 100 ? 'text-green-600' : 'text-[#c9a84c]'
                  }`}
                >
                  {progress}%
                </span>
              </div>

              <ProgressBar value={progress} />

              {/* Task list */}
              <div className="mt-4 space-y-2">
                {areaTasks.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-4">Sin tareas asignadas</p>
                ) : (
                  areaTasks.map(task => (
                    <div
                      key={task.id}
                      className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      {task.status === 'Lista' ? (
                        <CheckCircle2 size={16} className="text-green-500 flex-shrink-0 mt-0.5" />
                      ) : task.status === 'En proceso' ? (
                        <Circle size={16} className="text-[#c9a84c] flex-shrink-0 mt-0.5 animate-pulse" />
                      ) : (
                        <Circle size={16} className="text-gray-300 flex-shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-sm font-medium leading-tight ${
                            task.status === 'Lista' ? 'line-through text-gray-400' : 'text-[#1a1a1a]'
                          }`}
                        >
                          {task.task}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5 truncate">{task.operatorName}</p>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Clock size={11} className="text-gray-300" />
                        <span className="text-xs text-gray-400">{task.estimatedMinutes}m</span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Production orders for this area */}
              {productionOrders.filter(o => o.area === area).length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                    Órdenes de producción
                  </p>
                  {productionOrders
                    .filter(o => o.area === area)
                    .map(po => (
                      <div key={po.id} className="flex items-center justify-between py-1.5">
                        <div>
                          <p className="text-xs font-medium text-[#1a1a1a]">
                            {po.quantity} {po.unit} — {po.productName}
                          </p>
                          <p className="text-[10px] text-gray-400">{po.code}</p>
                        </div>
                        <span
                          className={
                            po.status === 'Completada'
                              ? 'noma-badge-green'
                              : po.status === 'En proceso'
                              ? 'noma-badge-blue'
                              : 'noma-badge-gray'
                          }
                        >
                          {po.status}
                        </span>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
