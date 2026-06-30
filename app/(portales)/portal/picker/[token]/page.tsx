'use client'

import { useState, useEffect } from 'react'
import { CheckCircle2, Circle, Timer, Play, Package, AlertCircle } from 'lucide-react'
import { operationsDemo } from '@/lib/operations'

export default function PickerPortalPage({ params }: { params: { token: string } }) {
  // Pick first picking task for demo
  const task = operationsDemo.pickingTasks[0] ?? {
    id: 'pick-demo',
    orderId: 'ORD-001',
    customerName: 'Cliente Demo',
    basketCode: 'CAN-001',
    checklist: [
      { label: 'Ciabatta seitan x12', done: false },
      { label: 'Bowl thai tofu x8', done: false },
      { label: 'Empanadas x20', done: false },
    ],
    status: 'Pendiente' as const,
  }

  const [items, setItems] = useState(task.checklist.map((i, idx) => ({ ...i, id: idx })))
  const [started, setStarted] = useState(false)
  const [completed, setCompleted] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!started || completed) return
    const interval = setInterval(() => {
      setElapsed(s => s + 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [started, completed])

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  const toggleItem = (id: number) => {
    if (!started || completed) return
    setItems(prev =>
      prev.map(i => (i.id === id ? { ...i, done: !i.done } : i))
    )
  }

  const handleComplete = async () => {
    setLoading(true)
    await new Promise(r => setTimeout(r, 800))
    setCompleted(true)
    setLoading(false)
  }

  const completedCount = items.filter(i => i.done).length
  const allDone = completedCount === items.length

  if (completed) {
    return (
      <div className="min-h-screen bg-[#f5f0e8] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-card p-8 max-w-sm w-full text-center">
          <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={32} className="text-green-500" />
          </div>
          <h2 className="text-xl font-bold text-[#1a1a1a] mb-2">¡Armado completado!</h2>
          <p className="text-gray-500 text-sm mb-2">
            Pedido <strong>{task.orderId}</strong> — {task.customerName}
          </p>
          <div className="bg-[#c9a84c]/10 rounded-xl p-3 mt-4">
            <p className="text-[#c9a84c] font-bold text-xl">{formatTime(elapsed)}</p>
            <p className="text-xs text-gray-500">Tiempo total de armado</p>
          </div>
          <div className="mt-4 text-xs text-gray-400">
            <p>Canasta: <strong>{task.basketCode}</strong></p>
            <p>{items.length} productos armados</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f5f0e8]">
      {/* Header */}
      <header className="bg-[#0f0f0f] text-white px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[#c9a84c] rounded-lg flex items-center justify-center font-black text-[#0f0f0f] text-sm">
            NF
          </div>
          <div>
            <p className="font-bold text-sm">Portal Picker</p>
            <p className="text-[10px] text-gray-400">{task.orderId} · {task.customerName}</p>
          </div>
          {started && (
            <div className="ml-auto flex items-center gap-1.5">
              <Timer size={14} className="text-[#c9a84c]" />
              <span className="text-[#c9a84c] font-mono font-bold text-sm">{formatTime(elapsed)}</span>
            </div>
          )}
        </div>
      </header>

      <div className="max-w-lg mx-auto p-4 space-y-4">
        {/* Order info */}
        <div className="bg-white rounded-2xl shadow-card p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Package size={16} className="text-[#c9a84c]" />
              <h2 className="font-bold text-[#1a1a1a]">Lista de armado</h2>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-xs text-gray-400">Canasta</span>
              <span className="font-mono font-bold text-[#c9a84c]">{task.basketCode}</span>
            </div>
          </div>

          {/* Progress */}
          <div className="mb-4">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-gray-500">{completedCount}/{items.length} ítems</span>
              <span className="font-bold text-[#c9a84c]">
                {Math.round((completedCount / items.length) * 100)}%
              </span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div
                className="h-2 rounded-full bg-[#c9a84c] transition-all duration-300"
                style={{ width: `${(completedCount / items.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Checklist */}
          <div className="space-y-2">
            {items.map(item => (
              <button
                key={item.id}
                onClick={() => toggleItem(item.id)}
                disabled={!started}
                className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all ${
                  item.done
                    ? 'bg-green-50 border border-green-200'
                    : started
                    ? 'bg-gray-50 border border-gray-200 hover:border-[#c9a84c] active:scale-[0.98]'
                    : 'bg-gray-50 border border-gray-100 opacity-60'
                }`}
              >
                {item.done ? (
                  <CheckCircle2 size={20} className="text-green-500 flex-shrink-0" />
                ) : (
                  <Circle size={20} className="text-gray-300 flex-shrink-0" />
                )}
                <span className={`text-sm font-medium ${item.done ? 'line-through text-gray-400' : 'text-[#1a1a1a]'}`}>
                  {item.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        {!started ? (
          <button
            onClick={() => setStarted(true)}
            className="w-full bg-[#c9a84c] text-[#0f0f0f] py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2 hover:bg-[#b8962e] transition-colors"
          >
            <Play size={20} />
            Iniciar armado
          </button>
        ) : (
          <div className="space-y-3">
            <button
              onClick={handleComplete}
              disabled={!allDone || loading}
              className={`w-full py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2 transition-all ${
                allDone
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              <CheckCircle2 size={20} />
              {loading ? 'Completando...' : allDone ? 'Completar armado' : `Faltan ${items.length - completedCount} ítems`}
            </button>

            <button className="w-full py-3 rounded-2xl border border-red-200 text-red-600 font-semibold text-sm flex items-center justify-center gap-2 hover:bg-red-50 transition-colors">
              <AlertCircle size={16} />
              Reportar problema
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
