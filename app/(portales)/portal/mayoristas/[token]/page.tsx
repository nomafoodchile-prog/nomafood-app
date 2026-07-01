'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  ShoppingCart, Package, ChevronDown, ChevronUp, Trash2, Plus, Minus,
  CheckCircle2, AlertCircle, Clock, User, LogOut, RefreshCw,
  CreditCard, ClipboardList, Search, Filter, Wifi, WifiOff
} from 'lucide-react'

/* ════════════════════════════════════════════════════════════
   TIPOS
════════════════════════════════════════════════════════════ */
interface Mayorista {
  id: string
  nombre: string
  empresa: string
  email: string
  descuento_pct: number
  limite_credito: number
}

interface Producto {
  id: string
  nombre: string
  sku: string
  precio_lista: number
  precio_mayorista: number
  unidad: string
  categoria: string
  stock_actual: number
  imagen_url?: string
  descripcion?: string
}

interface CartItem {
  producto_id: string
  producto_nombre: string
  producto_sku: string
  precio_lista: number
  precio_mayorista: number
  unidad: string
  cantidad: number
}

interface Pedido {
  id: string
  numero_pedido: string
  estado: string
  total: number
  created_at: string
  mp_status?: string
  items: { producto_nombre: string; cantidad: number; unidad: string; precio_final: number }[]
}

/* ════════════════════════════════════════════════════════════
   HELPERS
════════════════════════════════════════════════════════════ */
const ESTADO_COLORS: Record<string, string> = {
  borrador:       'bg-gray-100 text-gray-600',
  confirmado:     'bg-blue-100 text-blue-700',
  pagado:         'bg-emerald-100 text-emerald-700',
  en_preparacion: 'bg-amber-100 text-amber-700',
  despachado:     'bg-purple-100 text-purple-700',
  entregado:      'bg-green-100 text-green-700',
  cancelado:      'bg-red-100 text-red-700',
}
const ESTADO_LABELS: Record<string, string> = {
  borrador:       'Borrador',
  confirmado:     'Confirmado',
  pagado:         'Pagado',
  en_preparacion: 'En preparación',
  despachado:     'Despachado',
  entregado:      'Entregado',
  cancelado:      'Cancelado',
}

function fmt(n: number) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n)
}

/* ════════════════════════════════════════════════════════════
   COMPONENTE PRINCIPAL
════════════════════════════════════════════════════════════ */
export default function PortalMayoristas({ params }: { params: { token: string } }) {
  const { token } = params

  const [mayorista, setMayorista]   = useState<Mayorista | null>(null)
  const [catalogo, setCatalogo]     = useState<Producto[]>([])
  const [pedidos, setPedidos]       = useState<Pedido[]>([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState<string | null>(null)
  const [online, setOnline]         = useState(true)

  // Cart
  const [cart, setCart]             = useState<CartItem[]>([])
  const [showCart, setShowCart]     = useState(false)
  const [showPedidos, setShowPedidos] = useState(false)

  // Catalog filters
  const [busqueda, setBusqueda]     = useState('')
  const [catFilter, setCatFilter]   = useState('todas')
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null)

  // Checkout
  const [showCheckout, setShowCheckout] = useState(false)
  const [checkoutNotas, setCheckoutNotas] = useState('')
  const [checkoutFecha, setCheckoutFecha] = useState('')
  const [checkoutDir, setCheckoutDir]    = useState('')
  const [placing, setPlacing]         = useState(false)
  const [orderSuccess, setOrderSuccess] = useState<{ numero: string; total: number; init_point: string | null } | null>(null)
  const [successMsg, setSuccessMsg]   = useState<string | null>(null)

  /* ── Carga de datos ── */
  const loadData = useCallback(async () => {
    try {
      setOnline(navigator.onLine)
      const res = await fetch(`/api/portal/mayoristas/${token}`)
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setError(d.error || 'Token inválido o expirado')
        setLoading(false)
        return
      }
      const data = await res.json()
      setMayorista(data.mayorista)
      setCatalogo(data.catalogo || [])
      setPedidos(data.pedidos || [])
      setError(null)
    } catch {
      setOnline(false)
      setError('Sin conexión. Por favor revisa tu internet.')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => { loadData() }, [loadData])

  useEffect(() => {
    const onOnline  = () => { setOnline(true); loadData() }
    const onOffline = () => setOnline(false)
    window.addEventListener('online',  onOnline)
    window.addEventListener('offline', onOffline)
    return () => { window.removeEventListener('online', onOnline); window.removeEventListener('offline', onOffline) }
  }, [loadData])

  /* ── Cart helpers ── */
  const addToCart = (prod: Producto, qty: number) => {
    setCart(prev => {
      const existing = prev.find(i => i.producto_id === prod.id)
      if (existing) {
        return prev.map(i => i.producto_id === prod.id
          ? { ...i, cantidad: i.cantidad + qty }
          : i)
      }
      return [...prev, {
        producto_id:      prod.id,
        producto_nombre:  prod.nombre,
        producto_sku:     prod.sku,
        precio_lista:     prod.precio_lista,
        precio_mayorista: prod.precio_mayorista,
        unidad:           prod.unidad,
        cantidad:         qty,
      }]
    })
    showFeedback(`✓ ${prod.nombre} agregado`)
  }

  const updateCartQty = (prodId: string, qty: number) => {
    if (qty <= 0) {
      setCart(prev => prev.filter(i => i.producto_id !== prodId))
    } else {
      setCart(prev => prev.map(i => i.producto_id === prodId ? { ...i, cantidad: qty } : i))
    }
  }

  const cartTotal    = cart.reduce((s, i) => s + i.precio_mayorista * i.cantidad, 0)
  const cartSubtotal = cart.reduce((s, i) => s + i.precio_lista     * i.cantidad, 0)
  const cartAhorro   = cartSubtotal - cartTotal
  const cartCount    = cart.reduce((s, i) => s + i.cantidad, 0)

  /* ── Checkout ── */
  const submitOrder = async () => {
    if (cart.length === 0) return
    setPlacing(true)
    try {
      const res = await fetch(`/api/portal/mayoristas/${token}/pedido`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          items: cart.map(i => ({
            producto_id:     i.producto_id,
            producto_nombre: i.producto_nombre,
            producto_sku:    i.producto_sku,
            cantidad:        i.cantidad,
            precio_lista:    i.precio_lista,
            unidad:          i.unidad,
          })),
          notas:             checkoutNotas || null,
          fecha_entrega_req: checkoutFecha || null,
          direccion_entrega: checkoutDir   || null,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) throw new Error(data.error || 'Error al crear pedido')

      setCart([])
      setShowCart(false)
      setShowCheckout(false)
      setOrderSuccess({ numero: data.numero, total: data.total, init_point: data.init_point })
      loadData() // refrescar pedidos
    } catch (e: any) {
      showFeedback('Error: ' + (e.message || 'intente nuevamente'))
    } finally {
      setPlacing(false)
    }
  }

  function showFeedback(msg: string) {
    setSuccessMsg(msg)
    setTimeout(() => setSuccessMsg(null), 3000)
  }

  /* ── Filtrado de catálogo ── */
  const categorias = useMemo(() => {
    const cats = Array.from(new Set(catalogo.map(p => p.categoria).filter(Boolean)))
    return cats.sort()
  }, [catalogo])

  const catalogoFiltrado = useMemo(() => {
    return catalogo.filter(p => {
      const matchCat = catFilter === 'todas' || p.categoria === catFilter
      const q = busqueda.toLowerCase()
      const matchBus = !q || p.nombre.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q)
      return matchCat && matchBus
    })
  }, [catalogo, catFilter, busqueda])

  /* ════════════════════════════════════════════════════════════
     RENDER: LOADING / ERROR
  ════════════════════════════════════════════════════════════ */
  if (loading) {
    return (
      <div className="min-h-screen bg-[#f5f0e8] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#c9a84c] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 text-sm">Cargando portal mayorista...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#f5f0e8] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 text-center shadow-lg max-w-sm w-full">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-[#0f0f0f] mb-2">Acceso denegado</h2>
          <p className="text-gray-600 text-sm">{error}</p>
        </div>
      </div>
    )
  }

  /* ════════════════════════════════════════════════════════════
     RENDER: ORDER SUCCESS
  ════════════════════════════════════════════════════════════ */
  if (orderSuccess) {
    return (
      <div className="min-h-screen bg-[#f5f0e8] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 text-center shadow-lg max-w-sm w-full">
          <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-[#0f0f0f] mb-1">¡Pedido confirmado!</h2>
          <p className="text-gray-500 text-sm mb-1">Pedido {orderSuccess.numero}</p>
          <p className="text-2xl font-bold text-[#c9a84c] mb-6">{fmt(orderSuccess.total)}</p>

          {orderSuccess.init_point ? (
            <>
              <p className="text-sm text-gray-600 mb-4">
                Haz clic en el botón para completar el pago con Mercado Pago.
              </p>
              <a
                href={orderSuccess.init_point}
                className="block w-full bg-[#009ee3] hover:bg-[#007ec0] text-white font-semibold py-3 px-6 rounded-xl transition-colors mb-3"
              >
                <CreditCard className="w-4 h-4 inline mr-2" />
                Pagar con Mercado Pago
              </a>
            </>
          ) : (
            <p className="text-sm text-gray-500 mb-4">
              Tu pedido fue registrado. Te contactaremos para coordinar el pago.
            </p>
          )}

          <button
            onClick={() => setOrderSuccess(null)}
            className="w-full border border-gray-200 text-gray-600 font-medium py-2.5 px-4 rounded-xl hover:bg-gray-50 transition-colors"
          >
            Seguir comprando
          </button>
        </div>
      </div>
    )
  }

  /* ══════════════════════════════════════════════════
     RENDER PRINCIPAL
  ════════════════════════════════════════════════════════════ */
  return (
    <div className="min-h-screen bg-[#f5f0e8]">

      {/* ── Header ── */}
      <header className="bg-[#0f0f0f] text-white sticky top-0 z-50 shadow-lg">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="font-bold text-[#c9a84c] text-base leading-tight">Noma Food</h1>
            <p className="text-xs text-gray-400">Portal Mayoristas</p>
          </div>
          <div className="flex items-center gap-3">
            {!online && <WifiOff className="w-4 h-4 text-red-400" />}
            <button
              onClick={loadData}
              className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
              title="Actualizar"
            >
              <RefreshCw className="w-4 h-4 text-gray-300" />
            </button>
            {/* Cart button */}
            <button
              onClick={() => { setShowCart(true); setShowPedidos(false) }}
              className="relative p-2 bg-[#c9a84c] hover:bg-[#b8943e] rounded-xl transition-colors"
            >
              <ShoppingCart className="w-5 h-5 text-white" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                  {cartCount > 9 ? '9+' : cartCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Bienvenida */}
        <div className="max-w-lg mx-auto px-4 pb-3">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>
              <User className="w-3 h-3 inline mr-1" />
              {mayorista?.nombre} · {mayorista?.empresa || 'Mayorista'}
            </span>
            {(mayorista?.descuento_pct || 0) > 0 && (
              <span className="bg-[#c9a84c]/20 text-[#c9a84c] px-2 py-0.5 rounded-full font-medium">
                {mayorista?.descuento_pct}% descuento
              </span>
            )}
          </div>
        </div>
      </header>

      {/* ── Toast ── */}
      {successMsg && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-[#0f0f0f] text-white text-sm font-medium px-4 py-2 rounded-xl shadow-xl">
          {successMsg}
        </div>
      )}

      <div className="max-w-lg mx-auto px-4 pb-24">

        {/* ── Tabs ── */}
        <div className="flex gap-2 mt-4 mb-4">
          <button
            onClick={() => { setShowCart(false); setShowPedidos(false) }}
            className={`flex-1 py-2 px-3 rounded-xl text-sm font-medium transition-colors ${
              !showCart && !showPedidos
                ? 'bg-[#0f0f0f] text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Package className="w-4 h-4 inline mr-1.5" />
            Catálogo
          </button>
          <button
            onClick={() => { setShowPedidos(true); setShowCart(false) }}
            className={`flex-1 py-2 px-3 rounded-xl text-sm font-medium transition-colors ${
              showPedidos
                ? 'bg-[#0f0f0f] text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            <ClipboardList className="w-4 h-4 inline mr-1.5" />
            Mis pedidos
            {pedidos.length > 0 && (
              <span className="ml-1.5 bg-[#c9a84c] text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
                {pedidos.length}
              </span>
            )}
          </button>
        </div>

        {/* ════════════════════════════════════════════════════════
             VISTA: CATÁLOGO
        ════════════════════════════════════════════════════════ */}
        {!showCart && !showPedidos && (
          <div>
            {/* Búsqueda */}
            <div className="relative mb-3">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                placeholder="Buscar producto o SKU..."
                className="w-full pl-9 pr-4 py-2.5 bg-white rounded-xl border-0 shadow-sm text-sm focus:ring-2 focus:ring-[#c9a84c] outline-none"
              />
            </div>

            {/* Filtro categorías */}
            {categorias.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">
                <button
                  onClick={() => setCatFilter('todas')}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    catFilter === 'todas'
                      ? 'bg-[#c9a84c] text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  Todas
                </button>
                {categorias.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setCatFilter(cat)}
                    className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                      catFilter === cat
                        ? 'bg-[#c9a84c] text-white'
                        : 'bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}

            {/* Lista de productos */}
            {catalogoFiltrado.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Package className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No hay productos{busqueda ? ` para "${busqueda}"` : ''}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {catalogoFiltrado.map(prod => {
                  const inCart = cart.find(i => i.producto_id === prod.id)
                  const isExpanded = expandedProduct === prod.id
                  const sinStock = prod.stock_actual <= 0

                  return (
                    <div
                      key={prod.id}
                      className={`bg-white rounded-2xl overflow-hidden shadow-sm border ${
                        sinStock ? 'opacity-60 border-gray-100' : 'border-transparent'
                      }`}
                    >
                      <div className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              {prod.categoria && (
                                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                                  {prod.categoria}
                                </span>
                              )}
                              {sinStock && (
                                <span className="text-xs text-red-500 bg-red-50 px-2 py-0.5 rounded-full">
                                  Sin stock
                                </span>
                              )}
                            </div>
                            <h3 className="font-semibold text-[#0f0f0f] text-sm leading-tight">{prod.nombre}</h3>
                            {prod.sku && <p className="text-xs text-gray-400 mt-0.5">SKU: {prod.sku}</p>}
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="font-bold text-[#0f0f0f] text-base">{fmt(prod.precio_mayorista)}</p>
                            <p className="text-xs text-gray-400">/{prod.unidad}</p>
                            {(mayorista?.descuento_pct || 0) > 0 && (
                              <p className="text-xs text-gray-400 line-through">{fmt(prod.precio_lista)}</p>
                            )}
                          </div>
                        </div>

                        {/* Descripción */}
                        {prod.descripcion && (
                          <button
                            onClick={() => setExpandedProduct(isExpanded ? null : prod.id)}
                            className="text-xs text-gray-500 mt-1 flex items-center gap-1 hover:text-gray-700"
                          >
                            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            {isExpanded ? 'Ocultar' : 'Ver descripción'}
                          </button>
                        )}
                        {isExpanded && prod.descripcion && (
                          <p className="text-xs text-gray-600 mt-2 leading-relaxed">{prod.descripcion}</p>
                        )}

                        {/* Add to cart */}
                        {!sinStock && (
                          <div className="mt-3 flex items-center gap-2">
                            {inCart ? (
                              <div className="flex items-center gap-2 flex-1">
                                <button
                                  onClick={() => updateCartQty(prod.id, inCart.cantidad - 1)}
                                  className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
                                >
                                  <Minus className="w-3.5 h-3.5" />
                                </button>
                                <span className="flex-1 text-center font-semibold text-sm">
                                  {inCart.cantidad} {prod.unidad}
                                </span>
                                <button
                                  onClick={() => updateCartQty(prod.id, inCart.cantidad + 1)}
                                  className="w-8 h-8 rounded-lg bg-[#c9a84c] hover:bg-[#b8943e] text-white flex items-center justify-center transition-colors"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => addToCart(prod, 1)}
                                className="flex-1 bg-[#0f0f0f] hover:bg-gray-800 text-white text-sm font-medium py-2 px-4 rounded-xl transition-colors flex items-center justify-center gap-2"
                              >
                                <Plus className="w-4 h-4" />
                                Agregar
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ════════════════════════════════════════════════════════
             VISTA: CARRITO
        ═══════════════════════════════════════════════════════ */}
        {showCart && !showCheckout && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-[#0f0f0f]">Tu pedido</h2>
              <button
                onClick={() => setShowCart(false)}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                ← Catálogo
              </button>
            </div>

            {cart.length === 0 ? (
              <div className="text-center py-16 text-gray-500">
                <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p className="text-sm">Tu carrito está vacío</p>
                <button
                  onClick={() => setShowCart(false)}
                  className="mt-4 text-sm text-[#c9a84c] font-medium hover:underline"
                >
                  Ir al catálogo
                </button>
              </div>
            ) : (
              <>
                <div className="space-y-3 mb-4">
                  {cart.map(item => (
                    <div key={item.producto_id} className="bg-white rounded-2xl p-4 shadow-sm">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-[#0f0f0f] leading-tight">{item.producto_nombre}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{item.producto_sku}</p>
                        </div>
                        <button
                          onClick={() => updateCartQty(item.producto_id, 0)}
                          className="p-1 text-red-400 hover:text-red-600 flex-shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex items-center justify-between mt-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateCartQty(item.producto_id, item.cantidad - 1)}
                            className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="text-sm font-semibold min-w-[2.5rem] text-center">
                            {item.cantidad} {item.unidad}
                          </span>
                          <button
                            onClick={() => updateCartQty(item.producto_id, item.cantidad + 1)}
                            className="w-7 h-7 rounded-lg bg-[#c9a84c] hover:bg-[#b8943e] text-white flex items-center justify-center"
                             >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-sm">{fmt(item.precio_mayorista * item.cantidad)}</p>
                          {(mayorista?.descuento_pct || 0) > 0 && (
                            <p className="text-xs text-gray-400 line-through">
                              {fmt(item.precio_lista * item.cantidad)}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Resumen */}
                <div className="bg-white rounded-2xl p-4 shadow-sm mb-4">
                  {(mayorista?.descuento_pct || 0) > 0 && (
                    <>
                      <div className="flex justify-between text-sm text-gray-500 mb-1">
                        <span>Subtotal (precio lista)</span>
                        <span>{fmt(cartSubtotal)}</span>
                      </div>
                      <div className="flex justify-between text-sm text-green-600 mb-2">
                        <span>Descuento {mayorista?.descuento_pct}%</span>
                        <span>-{fmt(cartAhorro)}</span>
                      </div>
                      <div className="border-t border-gray-100 pt-2" />
                    </>
                  )}
                  <div className="flex justify-between font-bold text-[#0f0f0f]">
                    <span>Total pedido</span>
                    <span className="text-[#c9a84c] text-lg">{fmt(cartTotal)}</span>
                  </div>
                </div>

                <button
                  onClick={() => setShowCheckout(true)}
                  className="w-full bg-[#c9a84c] hover:bg-[#b8943e] text-white font-semibold py-3 px-6 rounded-xl transition-colors"
                >
                  Confirmar pedido →
                </button>
              </>
            )}
          </div>
        )}

        {/* ════════════════════════════════════════════════════════
             VISTA: CHECKOUT
        ════════════════════════════════════════════════════════ */}
        {showCart && showCheckout && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-[#0f0f0f]">Detalles del pedido</h2>
              <button
                onClick={() => setShowCheckout(false)}
                className="text-sm text-gray-500"
              >
                ← Volver
              </button>
            </div>

            <div className="space-y-4 mb-6">
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Fecha de entrega solicitada (opcional)
                </label>
                <input
                  type="date"
                  value={checkoutFecha}
                  onChange={e => setCheckoutFecha(e.target.value)}
                  className="w-full p-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#c9a84c]"
                />
              </div>

              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Dirección de entrega (opcional)
                </label>
                <input
                  type="text"
                  value={checkoutDir}
                  onChange={e => setCheckoutDir(e.target.value)}
                  placeholder="Ej: Av. Providencia 1234, Santiago"
                  className="w-full p-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#c9a84c]"
                />
              </div>

              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Notas adicionales (opcional)
                </label>
                <textarea
                  value={checkoutNotas}
                  onChange={e => setCheckoutNotas(e.target.value)}
                  rows={3}
                  placeholder="Instrucciones especiales, horario de recepción..."
                  className="w-full p-3 border border-gray-200 rounded-xl text-sm resize-none outline-none focus:border-[#c9a84c]"
                />
              </div>

              {/* Resumen */}
              <div className="bg-[#0f0f0f] rounded-2xl p-4 text-white">
                <p className="text-xs text-gray-400 mb-3">
                  {cart.length} producto{cart.length !== 1 ? 's' : ''} · {cartCount} unidades
                </p>
                {(mayorista?.descuento_pct || 0) > 0 && (
                  <div className="flex justify-between text-sm text-gray-300 mb-1">
                    <span>Ahorro ({mayorista?.descuento_pct}%)</span>
                    <span className="text-green-400">-{fmt(cartAhorro)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span className="text-[#c9a84c]">{fmt(cartTotal)}</span>
                </div>
              </div>
            </div>

            <button
              onClick={submitOrder}
              disabled={placing}
              className="w-full bg-[#c9a84c] hover:bg-[#b8943e] disabled:opacity-60 text-white font-semibold py-3.5 px-6 rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {placing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Procesando...
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4" />
                  Confirmar y pagar {fmt(cartTotal)}
                </>
              )}
            </button>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════
             VISTA: MIS PEDIDOS
        ════════════════════════════════════════════════════════ */}
        {showPedidos && (
          <div>
            <h2 className="text-lg font-bold text-[#0f0f0f] mb-4">Mis pedidos</h2>

            {pedidos.length === 0 ? (
              <div className="text-center py-16 text-gray-500">
                <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p className="text-sm">No tienes pedidos aún</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pedidos.map(pedido => (
                  <div key={pedido.id} className="bg-white rounded-2xl overflow-hidden shadow-sm">
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <p className="font-semibold text-sm text-[#0f0f0f]">{pedido.numero_pedido}</p>
                          <p className="text-xs text-gray-400">
                            {new Date(pedido.created_at).toLocaleDateString('es-CL', {
                              day: '2-digit', month: 'short', year: 'numeric'
                            })}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-[#c9a84c]">{fmt(pedido.total)}</p>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${ESTADO_COLORS[pedido.estado] || 'bg-gray-100 text-gray-600'}`}>
                            {ESTADO_LABELS[pedido.estado] || pedido.estado}
                          </span>
                        </div>
                      </div>
                      {pedido.items && pedido.items.length > 0 && (
                        <div className="space-y-1 mt-2 pt-2 border-t border-gray-50">
                          {pedido.items.slice(0, 3).map((item, i) => (
                            <p key={i} className="text-xs text-gray-500">
                              {item.cantidad} {item.unidad} {item.producto_nombre} · {fmt(item.precio_final * item.cantidad)}
                            </p>
                          ))}
                          {pedido.items.length > 3 && (
                            <p className="text-xs text-gray-400">+{pedido.items.length - 3} más...</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Bottom bar cuando hay items en carrito ── */}
      {cart.length > 0 && !showCart && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-40">
          <div className="max-w-lg mx-auto">
            <button
              onClick={() => { setShowCart(true); setShowPedidos(false) }}
              className="w-full bg-[#c9a84c] hover:bg-[#b8943e] text-white font-semibold py-3 px-6 rounded-xl transition-colors flex items-center justify-between"
            >
              <span className="bg-white/20 text-white text-sm font-bold px-2 py-0.5 rounded-lg">
                {cartCount}
              </span>
              <span>Ver pedido</span>
              <span className="font-bold">{fmt(cartTotal)}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
