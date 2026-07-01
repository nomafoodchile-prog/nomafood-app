'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Package, CheckCircle2, AlertCircle, RefreshCw, Wifi, WifiOff,
  MapPin, Barcode, Camera, ChevronDown, ChevronUp, ClipboardList,
  User, Star, Send, Search
} from 'lucide-react'

/* ─────────────────────────────────────────────
   TIPOS
───────────────────────────────────────────── */
type PickStatus = 'pendiente' | 'en_proceso' | 'completado' | 'faltante'

interface Picker {
  id: string
  nombre: string
  apellido: string
  token: string
}

interface PickItem {
  id: string
  producto_nombre: string
  producto_sku?: string
  cantidad_pedida: number
  cantidad_pickeada: number
  unidad: string
  ubicacion_bodega: string  // Ej: "A-3-2" (pasillo-estante-nivel)
  pedido_numero: string
  status: PickStatus
  notas?: string
}

interface PickSession {
  id: string
  fecha: string
  status: 'activa' | 'completada'
  items: PickItem[]
}

/* ─────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────── */
const STATUS_COLORS: Record<PickStatus, string> = {
  pendiente: 'bg-gray-100 text-gray-600',
  en_proceso: 'bg-blue-100 text-blue-700',
  completado: 'bg-green-100 text-green-700',
  faltante: 'bg-amber-100 text-amber-700',
}

const STATUS_LABELS: Record<PickStatus, string> = {
  pendiente: 'Pendiente',
  en_proceso: 'En proceso',
  completado: 'Completado',
  faltante: 'Faltante',
}

/* ─────────────────────────────────────────────
   COMPONENTE PRINCIPAL
───────────────────────────────────────────── */
export default function PortalPicker({ params }: { params: { token: string } }) {
  const { token } = params

  const [picker, setPicker] = useState<Picker | null>(null)
  const [session, setSession] = useState<PickSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [online, setOnline] = useState(true)

  const [expandedItem, setExpandedItem] = useState<string | null>(null)
  const [saving, setSaving] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  // Cantidades ingresadas por el picker
  const [quantities, setQuantities] = useState<Record<string, number>>({})
  const [itemNotas, setItemNotas] = useState<Record<string, string>>({})

  /* ── Carga ── */
  const loadData = useCallback(async () => {
    try {
      setOnline(navigator.onLine)
      const res = await fetch(`/api/portal/picker/${token}`)
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        setError(err.error || 'Token inválido')
        setLoading(false)
        return
      }
      const data = await res.json()
      setPicker(data.picker)
      setSession(data.session)
      // Inicializar cantidades con las ya pickeadas
      if (data.session?.items) {
        const initQty: Record<string, number> = {}
        data.session.items.forEach((item: PickItem) => {
          initQty[item.id] = item.cantidad_pickeada || 0
        })
        setQuantities(initQty)
      }
      setError(null)
    } catch {
      setOnline(false)
      setError('Sin conexión')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => { loadData() }, [loadData])

  useEffect(() => {
    const onOnline = () => { setOnline(true); loadData() }
    const onOffline = () => setOnline(false)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => { window.removeEventListener('online', onOnline); window.removeEventListener('offline', onOffline) }
  }, [loadData])

  function showSuccess(msg: string) {
    setSuccessMsg(msg)
    setTimeout(() => setSuccessMsg(null), 3000)
  }

  /* ── Acciones ── */
  async function confirmPick(itemId: string, qty: number, isFaltante: boolean) {
    setSaving(itemId)
    try {
      const item = session?.items.find(i => i.id === itemId)
      if (!item) return

      await fetch(`/api/portal/picker/${token}/item/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cantidad_pickeada: qty,
          status: isFaltante ? 'faltante' : 'completado',
          notas: itemNotas[itemId] || '',
          picked_at: new Date().toISOString(),
        })
      })

      setSession(s => {
        if (!s) return null
        return {
          ...s,
          items: s.items.map(i => i.id === itemId
            ? { ...i, cantidad_pickeada: qty, status: isFaltante ? 'faltante' : 'completado' }
            : i)
        }
      })
      setExpandedItem(null)
      showSuccess(isFaltante ? 'Faltante registrado' : '¡Pick confirmado!')
    } finally { setSaving(null) }
  }

  /* ── Stats ── */
  const items = session?.items || []
  const completados = items.filter(i => i.status === 'completado').length
  const faltantes = items.filter(i => i.status === 'faltante').length
  const pendientes = items.filter(i => i.status === 'pendiente' || i.status === 'en_proceso').length
  const pct = items.length > 0 ? Math.round(((completados + faltantes) / items.length) * 100) : 0

  const filteredItems = searchQuery
    ? items.filter(i =>
        i.producto_nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
        i.ubicacion_bodega.toLowerCase().includes(searchQuery.toLowerCase()) ||
        i.pedido_numero.includes(searchQuery)
      )
    : items

  // Agrupar por pasillo
  const grouped = filteredItems.reduce((acc, item) => {
    const pasillo = item.ubicacion_bodega.split('-')[0] || 'Sin ubicación'
    if (!acc[pasillo]) acc[pasillo] = []
    acc[pasillo].push(item)
    return acc
  }, {} as Record<string, PickItem[]>)

  /* ── LOADING ── */
  if (loading) {
    return (
      <div className="min-h-screen bg-[#f5f0e8] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#c9a84c] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 text-sm">Cargando portal...</p>
        </div>
      </div>
    )
  }

  if (error && !picker) {
    return (
      <div className="min-h-screen bg-[#f5f0e8] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center shadow-sm border border-gray-100">
          <AlertCircle className="text-red-500 w-12 h-12 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-gray-800 mb-2">Acceso no autorizado</h2>
          <p className="text-sm text-gray-500">{error}</p>
        </div>
      </div>
    )
  }

  /* ── PORTAL ── */
  return (
    <div className="min-h-screen bg-[#f5f0e8]">
      {/* Toast */}
      {successMsg && (
        <div className="fixed top-4 right-4 z-50 bg-green-500 text-white px-4 py-2 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2">
          <CheckCircle2 size={16} /> {successMsg}
        </div>
      )}

      {/* Header */}
      <div className="bg-[#0f0f0f] text-white px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#c9a84c] flex items-center justify-center">
            <Package size={16} className="text-[#0f0f0f]" />
          </div>
          <div>
            <p className="text-xs text-gray-400">Portal Picker</p>
            <p className="text-sm font-semibold">{picker?.nombre} {picker?.apellido}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {online ? <Wifi size={14} className="text-green-400" /> : <WifiOff size={14} className="text-red-400" />}
          <button onClick={loadData} className="p-1.5 rounded-lg hover:bg-white/10">
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {!online && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-xs text-amber-700 flex items-center gap-2">
          <WifiOff size={12} /> Sin conexión — los picks se sincronizarán al reconectar
        </div>
      )}

      <div className="max-w-md mx-auto px-4 py-5 space-y-4">

        {/* Sin sesión */}
        {!session && (
          <div className="bg-white rounded-xl p-8 text-center border border-gray-100 shadow-sm">
            <Package className="mx-auto text-gray-300 mb-3" size={40} />
            <p className="text-sm font-semibold text-gray-600">Sin picking asignado hoy</p>
            <p className="text-xs text-gray-400 mt-1">Contacta al administrador</p>
          </div>
        )}

        {session && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: 'Total', value: items.length, color: 'text-gray-800' },
                { label: 'OK', value: completados, color: 'text-green-600' },
                { label: 'Pend.', value: pendientes, color: 'text-blue-600' },
                { label: 'Falt.', value: faltantes, color: 'text-amber-500' },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-white rounded-xl p-2.5 text-center border border-gray-100 shadow-sm">
                  <p className={`text-xl font-bold ${color}`}>{value}</p>
                  <p className="text-xs text-gray-400">{label}</p>
                </div>
              ))}
            </div>

            {/* Progress */}
            <div className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm">
              <div className="flex justify-between mb-1.5">
                <span className="text-xs font-medium text-gray-600">Avance del picking</span>
                <span className="text-xs text-gray-400">{pct}%</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-[#c9a84c] transition-all" style={{ width: `${pct}%` }} />
              </div>
            </div>

            {/* Buscador */}
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Buscar producto, ubicación, pedido..."
                className="w-full bg-white border border-gray-200 rounded-xl pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#c9a84c]"
              />
            </div>

            {/* Items agrupados por pasillo */}
            {Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([pasillo, pasilloItems]) => (
              <div key={pasillo}>
                <div className="flex items-center gap-2 mb-2 px-1">
                  <MapPin size={13} className="text-[#c9a84c]" />
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Pasillo {pasillo}
                  </h3>
                  <div className="flex-1 h-px bg-gray-200" />
                  <span className="text-xs text-gray-400">
                    {pasilloItems.filter(i => i.status === 'completado').length}/{pasilloItems.length}
                  </span>
                </div>

                <div className="space-y-2">
                  {pasilloItems.map(item => {
                    const isExpanded = expandedItem === item.id
                    const isDone = item.status === 'completado' || item.status === 'faltante'
                    const currentQty = quantities[item.id] ?? item.cantidad_pickeada ?? 0

                    return (
                      <div
                        key={item.id}
                        className={`bg-white rounded-xl border shadow-sm overflow-hidden ${
                          item.status === 'completado' ? 'border-green-200 opacity-70' :
                          item.status === 'faltante' ? 'border-amber-200 opacity-70' :
                          'border-gray-100'
                        }`}
                      >
                        {/* Cabecera item */}
                        <button
                          onClick={() => setExpandedItem(isExpanded ? null : item.id)}
                          className="w-full flex items-center gap-3 p-3 text-left"
                        >
                          {/* Ubicación */}
                          <div className={`shrink-0 text-center rounded-lg p-1.5 min-w-[44px] ${
                            isDone ? 'bg-gray-100' : 'bg-[#c9a84c]/15'
                          }`}>
                            <p className={`text-xs font-bold ${isDone ? 'text-gray-400' : 'text-[#c9a84c]'}`}>
                              {item.ubicacion_bodega}
                            </p>
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium truncate ${isDone ? 'text-gray-400' : 'text-gray-800'}`}>
                              {item.producto_nombre}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              <span className="text-xs text-gray-400">
                                {item.cantidad_pickeada > 0 ? item.cantidad_pickeada : '0'}/{item.cantidad_pedida} {item.unidad}
                              </span>
                              <span className="text-xs text-gray-300">·</span>
                              <span className="text-xs text-gray-400">Ped. #{item.pedido_numero}</span>
                              <span className={`text-xs px-1.5 py-0.5 rounded-full ${STATUS_COLORS[item.status]}`}>
                                {STATUS_LABELS[item.status]}
                              </span>
                            </div>
                          </div>

                          {item.status === 'completado'
                            ? <CheckCircle2 size={18} className="text-green-500 shrink-0" />
                            : isExpanded
                              ? <ChevronUp size={16} className="text-gray-400 shrink-0" />
                              : <ChevronDown size={16} className="text-gray-400 shrink-0" />}
                        </button>

                        {/* Detalle */}
                        {isExpanded && !isDone && (
                          <div className="px-3 pb-3 border-t border-gray-100 pt-3 space-y-3">
                            {item.producto_sku && (
                              <p className="text-xs text-gray-400 flex items-center gap-1">
                                <Barcode size={12} /> SKU: {item.producto_sku}
                              </p>
                            )}

                            {/* Cantidad a pickear */}
                            <div>
                              <label className="text-xs text-gray-500 mb-1 block">
                                Cantidad pickeada (de {item.cantidad_pedida} {item.unidad})
                              </label>
                              <div className="flex items-center gap-3">
                                <button
                                  onClick={() => setQuantities(q => ({ ...q, [item.id]: Math.max(0, (q[item.id] ?? 0) - 1) }))}
                                  className="w-9 h-9 rounded-lg bg-gray-100 text-gray-600 font-bold flex items-center justify-center"
                                >−</button>
                                <input
                                  type="number"
                                  min={0}
                                  max={item.cantidad_pedida * 2}
                                  value={currentQty}
                                  onChange={e => setQuantities(q => ({ ...q, [item.id]: Number(e.target.value) }))}
                                  className="flex-1 border border-gray-200 rounded-lg text-center py-2 text-base font-bold focus:outline-none focus:ring-1 focus:ring-[#c9a84c]"
                                />
                                <button
                                  onClick={() => setQuantities(q => ({ ...q, [item.id]: (q[item.id] ?? 0) + 1 }))}
                                  className="w-9 h-9 rounded-lg bg-gray-100 text-gray-600 font-bold flex items-center justify-center"
                                >+</button>
                                <button
                                  onClick={() => setQuantities(q => ({ ...q, [item.id]: item.cantidad_pedida }))}
                                  className="text-xs text-[#c9a84c] underline whitespace-nowrap"
                                >
                                  Completo
                                </button>
                              </div>
                            </div>

                            {/* Nota */}
                            <input
                              type="text"
                              value={itemNotas[item.id] || ''}
                              onChange={e => setItemNotas(n => ({ ...n, [item.id]: e.target.value }))}
                              placeholder="Nota (opcional)..."
                              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#c9a84c]"
                            />

                            {/* Acciones */}
                            <div className="flex gap-2">
                              <button
                                onClick={() => confirmPich(item.id, currentQty, true)}
                                disabled={saving === item.id}
                                className="flex-1 bg-amber-50 border border-amber-200 text-amber-700 rounded-xl py-2 text-xs font-medium"
                              >
                                Producto faltante
                              </button>
                              <button
                                onClick={() => confirmPich(item.id, currentQty, false)}
                                disabled={saving === item.id || currentQty === 0}
                                className="flex-1 bg-green-500 text-white rounded-xl py-2 text-xs font-semibold flex items-center justify-center gap-1.5 disabled:opacity-50"
                              >
                                {saving === item.id ? <RefreshCw size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                                Confirmar pick
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Estado final */}
                        {isExpanded && isDone && (
                          <div className="px-3 pb-3 border-t border-gray-100 pt-2">
                            <p className="text-xs text-gray-400">
                              {item.status === 'completado'
                                ? `✓ Pickeado: ${item.cantidad_pickeada}/${item.cantidad_pedida} ${item.unidad}`
                                : `⚠ Faltante — ${item.cantidad_pickeada}/${item.cantidad_pedida} ${item.unidad}`}
                              {item.notas && ` · "${item.notas}"`}
                            </p>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}

            {filteredItems.length === 0 && searchQuery && (
              <div className="bg-white rounded-xl p-6 text-center border border-gray-100">
                <Search className="mx-auto text-gray-300 mb-2" size={24} />
                <p className="text-sm text-gray-400">Sin resultados para "{searchQuery}"</p>
              </div>
            )}
          </>
        )}

        {/* Footer */}
        <div className="text-center text-xs text-gray-400 pb-4">
          <p>Noma Food · Portal Picker</p>
        </div>
      </div>
    </div>
  )
}
