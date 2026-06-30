'use client'

import { useState, useEffect } from 'react'
import {
  CheckCircle2,
  Circle,
  Play,
  AlertCircle,
  Clock,
  User,
  ChefHat,
  Timer,
} from 'lucide-react'
import { operationsDemo } from '@/lib/operations'
import type { DailyTask } from '@/lib/operations'

type TaskStatus = DailyTask['status']

export default function OperarioPortalPage({ params }: { params: { token: string } }) {
  // Demo: show first operator's tasks
  const operator = operationsDemo.operators[0]
  const allTasks = operationsDemo.dailyTasks
  const operatorTasks = allTasks.filter(t => t.operatorId === operator?.id) || allTasks.slice(0, 3)

  const [tasks, setTasks] = useState<DailyTask[]>(operatorTasks.length > 0 ? operatorTasks : allTasks.slice(0, 3))
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 60000)
    return () => clearInterval(interval)
  }, [])

  const updateStatus = (id: string, status: TaskStatus) => {
    setTasks(prev => prev.map(t => (t.id === id ? { ...t, status } : t)))
  }

  const completed = tasks.filter(t => t.status === 'Lista').length
  const inProgress = tasks.filter(t => t.status === 'En proceso').length

  // Attendance mock
  const attendance = {
    entryTime: '07:05',
    status: 'Presente',
    shift: operator?.shift || '07:00-15:00',
  }

  return (
    <div className="min-h-screen bg-[#f5f0e8]">
      {/* Header */}
      <header className="bg-[#0f0f0f] text-white px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[#c9a84c] rounded-lg flex items-center justify-center font-black text-[#0f0f0f] text-sm">
            NF
          </div>
          <div className="flex-1">
            <p className="font-bold text-sm">{operator?.name || 'Operario'}</p>
            <p className="text-[10px] text-gray-400">{operator?.area || 'Producción'}</p>
          </div>
          <div className="text-right">
            <p className="text-[#c9a84c] font-mono font-bold text-sm">
              {currentTime.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
            </p>
            <p className="text-[10px] text-gray-400">
              {currentTime.toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short' })}
            </p>
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto p-4 space-y-4">
        {/* Attendance card */}
        <div className="bg-white rounded-2xl shadow-card p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
                <User size={18} className="text-green-600" />
              </div>
              <div>
                <p className="font-semibold text-[#1a1a1a] text-sm">Asistencia</p>
                <p className="text-xs text-gray-500">Turno: {attendance.shift}</p>
              </div>
            </div>
            <div className="text-right">
              <span className="noma-badge-green">{attendance.status}</span>
              <p className="text-xs text-gray-400 mt-1">Entrada: {attendance.entryTime}</p>
            </div>
          </div>
          <div className="mt-3 text-xs text-gray-400 bg-gray-50 rounded-lg px-3 py-2">
            Control de asistencia GeoVictoria — pendiente integración
          </div>
        </div>

        {/* Progress summary */}
        <div className="bg-white rounded-2xl shadow-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <ChefHat size={16} className="text-[#c9a84c]" />
            <h2 className="font-bold text-[#1a1a1a]">Mis tareas de hoy</h2>
          </div>
          <div className="flex gap-3 mb-3">
            <div className="flex-1 text-center">
              <p className="text-xl font-bold text-green-600">{completed}</p>
              <p className="text-[10px] text-gray-400">Completadas</p>
            </div>
            <div className="flex-1 text-center">
              <p className="text-xl font-bold text-[#c9a84c]">{inProgress}</p>
              <p className="text-[10px] text-gray-400">En proceso</p>
            </div>
            <div className="flex-1 text-center">
              <p className="text-xl font-bold text-gray-400">{tasks.length - completed - inProgress}</p>
              <p className="text-[10px] text-gray-400">Pendientes</p>
            </div>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2">
            <div
              className="h-2 rounded-full bg-[#c9a84c] transition-all duration-300"
              style={{ width: `${tasks.length > 0 ? (completed / tasks.length) * 100 : 0}%` }}
            />
          </div>
        </div>

        {/* Task cards */}
        <div className="space-y-3">
          {tasks.map(task => (
            <div
              key={task.id}
              className={`bg-white rounded-2xl shadow-card overflow-hidden border-l-4 ${
                task.status === 'Lista'
                  ? 'border-green-400'
                  : task.status === 'En proceso'
                  ? 'border-[#c9a84c]'
                  : 'border-gray-200'
              }`}
            >
              <div className="p-4">
                {/* Task header */}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {task.status === 'Lista' ? (
                      <CheckCircle2 size={16} className="text-green-500 flex-shrink-0 mt-0.5" />
                    ) : task.status === 'En proceso' ? (
                      <Play size={16} className="text-[#c9a84c] flex-shrink-0 mt-0.5" />
                    ) : (
                      <Circle size={16} className="text-gray-300 flex-shrink-0 mt-0.5" />
                    )}
                    <h3 className={`font-bold text-sm ${task.status === 'Lista' ? 'line-through text-gray-400' : 'text-[#1a1a1a]'}`}>
                      {task.task}
                    </h3>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                    <Clock size={11} className="text-gray-400" />
                    <span className="text-xs text-gray-400">{task.estimatedMinutes} min</span>
                  </div>
                </div>

                <p className="text-xs text-gray-500 mb-3 leading-relaxed">{task.detail}</p>

                <div className="flex items-center gap-2 mb-3">
                  <span className="noma-badge-gray text-[10px]">{task.area}</span>
                </div>

                {/* Action buttons */}
                {task.status === 'Pendiente' && (
                  <button
                    onClick={() => updateStatus(task.id, 'En proceso')}
                    className="w-full py-2.5 rounded-xl bg-[#c9a84c] text-[#0f0f0f] font-bold text-sm flex items-center justify-center gap-2 hover:bg-[#b8962e] transition-colors active:scale-[0.98]"
                  >
                    <Play size={14} />
                    Iniciar tarea
                  </button>
                )}
                {task.status === 'En proceso' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => updateStatus(task.id, 'Lista')}
                      className="flex-1 py-2.5 rounded-xl bg-green-600 text-white font-bold text-sm flex items-center justify-center gap-1.5 hover:bg-green-700 transition-colors"
                    >
                      <CheckCircle2 size={14} />
                      Completar
                    </button>
                    <button
                      className="px-4 py-2.5 rounded-xl border border-red-200 text-red-600 font-semibold text-sm flex items-center gap-1.5 hover:bg-red-50 transition-colors"
                    >
                      <AlertCircle size={14} />
                      Problema
                    </button>
                  </div>
                )}
                {task.status === 'Lista' && (
                  <div className="flex items-center gap-1.5 text-green-600">
                    <CheckCircle2 size={14} />
                    <span className="text-xs font-semibold">Completada</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {tasks.length === 0 && (
          <div className="bg-white rounded-2xl shadow-card p-8 text-center">
            <CheckCircle2 size={32} className="text-green-400 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">Sin tareas asignadas</p>
            <p className="text-xs text-gray-400 mt-1">Consulta con tu supervisor</p>
          </div>
        )}
      </div>
    </div>
  )
}
