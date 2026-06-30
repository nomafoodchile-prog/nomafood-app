'use client'

import { useState } from 'react'
import { Plus, TrendingUp, TrendingDown, DollarSign, X } from 'lucide-react'
import { initialCashEntries, cashCategories, paymentMethods } from '@/lib/finance'
import type { CashEntry, CashEntryType } from '@/lib/finance'

function currency(n: number) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n)
}

export default function CajaPage() {
  const [entries, setEntries] = useState<CashEntry[]>(initialCashEntries)
  const [showForm, setShowForm] = useState(false)
  const [typeFilter, setTypeFilter] = useState<'Todos' | 'Ingreso' | 'Egreso'>('Todos')
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    type: 'Ingreso' as CashEntryType,
    category: '',
    description: '',
    amount: '',
    paymentMethod: 'Transferencia',
    responsible: '',
    notes: '',
  })

  const totalIncome = entries.filter(e => e.type === 'Ingreso').reduce((s, e) => s + e.amount, 0)
  const totalExpenses = entries.filter(e => e.type === 'Egreso').reduce((s, e) => s + e.amount, 0)
  const balance = totalIncome - totalExpenses

  const filtered = entries.filter(
    e => typeFilter === 'Todos' || e.type === typeFilter
  )

  const handleSubmit = (ev: React.FormEvent) => {
    ev.preventDefault()
    const newEntry: CashEntry = {
      id: `cash-${Date.now()}`,
      ...form,
      amount: Number(form.amount),
    }
    setEntries(prev => [newEntry, ...prev])
    setShowForm(false)
    setForm({
      date: new Date().toISOString().split('T')[0],
      type: 'Ingreso',
      category: '',
      description: '',
      amount: '',
      paymentMethod: 'Transferencia',
      responsible: '',
      notes: '',
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1a1a1a]">Caja</h1>
          <p className="text-sm text-gray-500 mt-0.5">Movimientos de caja — Junio 2026</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="noma-btn-primary text-sm flex items-center gap-2"
        >
          <Plus size={16} />
          Nuevo movimiento
        </button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="noma-card bg-gradient-to-br from-[#0f0f0f] to-gray-800 text-white">
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 bg-[#c9a84c]/20 rounded-xl flex items-center justify-center">
              <DollarSign size={18} className="text-[#c9a84c]" />
            </div>
            <span className="text-xs text-gray-400">Balance</span>
          </div>
          <p className="text-xs text-gray-400">Saldo actual</p>
          <p className="text-2xl font-bold text-[#c9a84c] mt-1">{currency(balance)}</p>
        </div>

        <div className="noma-card border-l-4 border-green-400">
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
              <TrendingUp size={18} className="text-green-600" />
            </div>
            <span className="noma-badge-green">Ingresos</span>
          </div>
          <p className="text-xs text-gray-500">Total ingresos</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{currency(totalIncome)}</p>
        </div>

        <div className="noma-card border-l-4 border-red-400">
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center">
              <TrendingDown size={18} className="text-red-500" />
            </div>
            <span className="noma-badge-red">Egresos</span>
          </div>
          <p className="text-xs text-gray-500">Total egresos</p>
          <p className="text-2xl font-bold text-red-600 mt-1">{currency(totalExpenses)}</p>
        </div>
      </div>

      {/* Simple CSS bar chart */}
      <div className="noma-card">
        <h2 className="font-bold text-[#1a1a1a] mb-4">Resumen visual</h2>
        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-gray-600 font-medium">Ingresos</span>
              <span className="text-green-600 font-bold">{currency(totalIncome)}</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-3">
              <div
                className="h-3 rounded-full bg-green-400"
                style={{ width: '100%' }}
              />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-gray-600 font-medium">Egresos</span>
              <span className="text-red-600 font-bold">{currency(totalExpenses)}</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-3">
              <div
                className="h-3 rounded-full bg-red-400"
                style={{ width: `${totalIncome > 0 ? (totalExpenses / totalIncome) * 100 : 0}%` }}
              />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-gray-600 font-medium">Margen neto</span>
              <span className="text-[#c9a84c] font-bold">
                {totalIncome > 0 ? Math.round(((totalIncome - totalExpenses) / totalIncome) * 100) : 0}%
              </span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-3">
              <div
                className="h-3 rounded-full bg-[#c9a84c]"
                style={{ width: `${totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Transactions table */}
      <div className="noma-card !p-0 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-bold text-[#1a1a1a]">Movimientos</h2>
          <div className="flex items-center gap-1 bg-gray-50 rounded-lg p-1">
            {(['Todos', 'Ingreso', 'Egreso'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                  typeFilter === t
                    ? 'bg-[#c9a84c] text-[#0f0f0f]'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50/50 border-b border-gray-100">
              <tr>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wide">Fecha</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wide">Descripción</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wide hidden sm:table-cell">Categoría</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wide hidden md:table-cell">Método</th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wide">Monto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(entry => (
                <tr key={entry.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="py-3 px-4 text-xs text-gray-500 whitespace-nowrap">
                    {new Date(entry.date).toLocaleDateString('es-CL')}
                  </td>
                  <td className="py-3 px-4">
                    <p className="font-medium text-[#1a1a1a] text-sm">{entry.description}</p>
                    <p className="text-xs text-gray-400">{entry.responsible}</p>
                  </td>
                  <td className="py-3 px-4 hidden sm:table-cell">
                    <span className="noma-badge-gray">{entry.category}</span>
                  </td>
                  <td className="py-3 px-4 text-xs text-gray-500 hidden md:table-cell">
                    {entry.paymentMethod}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className={`font-bold ${entry.type === 'Ingreso' ? 'text-green-600' : 'text-red-600'}`}>
                      {entry.type === 'Ingreso' ? '+' : '-'}{currency(entry.amount)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add transaction modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowForm(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-[#1a1a1a]">Nuevo movimiento</h3>
              <button
                onClick={() => setShowForm(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex gap-2">
                {(['Ingreso', 'Egreso'] as CashEntryType[]).map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, type: t }))}
                    className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition-all ${
                      form.type === t
                        ? t === 'Ingreso'
                          ? 'bg-green-50 border-green-400 text-green-700'
                          : 'bg-red-50 border-red-400 text-red-700'
                        : 'border-gray-200 text-gray-500'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Fecha</label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                    className="noma-input"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Monto ($)</label>
                  <input
                    type="number"
                    value={form.amount}
                    onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                    className="noma-input"
                    placeholder="0"
                    min="1"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Categoría</label>
                <select
                  value={form.category}
                  onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  className="noma-input"
                  required
                >
                  <option value="">Seleccionar...</option>
                  {cashCategories.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Descripción</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  className="noma-input"
                  placeholder="Descripción del movimiento"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Método de pago</label>
                  <select
                    value={form.paymentMethod}
                    onChange={e => setForm(f => ({ ...f, paymentMethod: e.target.value }))}
                    className="noma-input"
                  >
                    {paymentMethods.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Responsable</label>
                  <input
                    type="text"
                    value={form.responsible}
                    onChange={e => setForm(f => ({ ...f, responsible: e.target.value }))}
                    className="noma-input"
                    placeholder="Nombre"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 noma-btn-secondary"
                >
                  Cancelar
                </button>
                <button type="submit" className="flex-1 noma-btn-primary">
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
