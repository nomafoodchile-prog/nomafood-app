'use client'

import { useState, useEffect } from 'react'
import { CheckCircle2, Circle, Clock, Play, AlertCircle, User, RefreshCw } from 'lucide-react'
import { operationsDemo } from '@/lib/operations'
import type { DailyTask } from '@/lib/operations'

type TaskStatus = DailyTask['status']

const STATUS_COLORS: Record<TaskStatus, string> = {
  Pendiente: 'noma-badge-gray',
  'En proceso': 'noma-badge-blue',
  Lista: 'noma-badge-green',
}

const STATUS_ICONS: Record<TaskStatus, React.ElementType> = {
  Pendiente: Circle,
  'En proceso': Play,
  Lista: CheckCircle2,
}

export default function TareasPage() {
  const [tasks, setTasks] = useState<DailyTask[]>(operationsDemo.dailyTasks)
  const [workerFilter, setWorkerFilter] = useState('Todos')
  const [tick, setTick] = useState(0)

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setTick(t => t + 1)
    }, 30000) // refresh simulation every 30s
    return () => clearInterval(interval)
  }, [])

  const workers = ['Todos', ...Array.from(new Set(tasks.map(t => t.operatorName)))]

  const filtered = tasks.filter(
    t => workerFilter === 'Todos' || t.operatorName === workerFilter
  )

  const updateStatus = (id: string, status: TaskStatus) => {
    setTasks(prev =>
      prev.map(t => (t.id === id ? { ...t, status } : t))
    )
  }

  const completed = filtered.filter(t => t.status === 'Lista').length
  const total = filtered.length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1a1a1a]">Tareas del día</h1>
          <p className="text-sm text-gray-500 mt-0.5">ADT — Asignación Diaria de Tareas</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <RefreshCw size={12} className="animate-spin opacity-50" />
            <span>En tiempo real</span>
          </div>
        </div>
      </div>

      {/* Progress summary */}
      <div className="noma-card !p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-[#1a1a1a]">
            Progreso global — {completed}/{total} tareas completadas
          </p>
          <span className="text-sm font-bold text-[#c9a84c]">
            {total > 0 ? Math.round((completed / total) * 100) : 0}%
          </span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2">
          <div
            className="h-2 rounded-full bg-[#c9a84c] transition-all duration-500"
            style={{ width: `${total > 0 ? (completed / total) * 100 : 0}%` }}
          />
        </div>
      </div>

      {/* Worker filter */}
      <div className="flex items-center gap-1 bg-white rounded-xl p-1 shadow-card overflow-x-auto">
        <User size={13} className="text-gray-400 flex-shrink-0 ml-2" />
        {workers.map(w => (
          <button
            key={w}
            onClick={() => setWorkerFilter(w)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              workerFilter === w
                ? 'bg-[#c9a84c] text-[#0f0f0f]'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            {w}
          </button>
        ))}
      </div>

      {/* Task cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map(task => {
          const Icon = STATUS_ICONS[task.status]
          return (
            <div
              key={task.id}
              className={`bg-white rounded-2xl shadow-card p-4 border-l-4 transition-all ${
                task.status === 'Lista'
                  ? 'border-green-400 opacity-80'
                  : task.status === 'En proceso'
                  ? 'border-[#c9a84c]'
                  : 'border-gray-200'
              }`}
            >
              {/* Card header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Icon
                    size={16}
                    className={
                      task.status === 'Lista'
                        ? 'text-green-500'
                        : task.status === 'En proceso'
                        ? 'text-[#c9a84c]'
                        : 'text-gray-300'
                    }
                  />
                  <span className={STATUS_COLORS[task.status]}>{task.status}</span>
                </div>
                <div className="flex items-center gap-1 text-gray-400">
                  <Clock size={11} />
                  <span className="text-xs">{task.estimatedMinutes} min</span>
                </div>
              </div>

              {/* Task info */}
              <h3 className={`font-semibold text-sm mb-1 ${task.status === 'Lista' ? 'line-through text-gray-400' : 'text-[#1a1a1a]'}`}>
                {task.task}
              </h3>
              <p className="text-xs text-gray-500 mb-3 line-clamp-2">{task.detail}</p>

              {/* Operator + area */}
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 rounded-full bg-[#c9a84c]/20 flex items-center justify-center text-[9px] font-bold text-[#c9a84c]">
                  {task.operatorName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-700">{task.operatorName}</p>
                  <p className="text-[10px] text-gray-400">{task.area}</p>
                </div>
              </div>

              {/* Action buttons */}
              {task.status !== 'Lista' && (
                <div className="flex gap-2">
                  {task.status === 'Pendiente' && (
                    <button
                      onClick={() => updateStatus(task.id, 'En proceso')}
                      className="flex-1 text-xs font-semibold py-1.5 rounded-lg bg-[#c9a84c]/10 text-[#c9a84c] hover:bg-[#c9a84c] hover:text-[#0f0f0f] transition-colors"
                    >
                      Iniciar
                    </button>
                  )}
                  {task.status === 'En proceso' && (
                    <>
                      <button
                        onClick={() => updateStatus(task.id, 'Lista')}
                        className="flex-1 text-xs font-semibold py-1.5 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 transition-colors"
                      >
                        Completar
                      </button>
                      <button className="px-3 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors">
                        <AlertCircle size={13} />
                      </button>
                    </>
                  )}
                </div>
              )}
              {task.status === 'Lista' && (
                <div className="flex items-center gap-1.5 text-green-600">
                  <CheckCircle2 size={14} />
                  <span className="text-xs font-semibold">Completada</span>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {filtered.length === 0 && (
        <div className="noma-card text-center py-12">
          <CheckCircle2 size={32} className="text-green-400 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No hay tareas para mostrar</p>
        </div>
      )}
    </div>
  )
}
