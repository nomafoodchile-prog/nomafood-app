'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  ShoppingCart, Package, ChevronDown, ChevronUp, Trash2, Plus, Minus,
  CheckCircle2, AlertCircle, Clock, User, LogOut, RefreshCw,
  CreditCard, ClipboardList, Search, Filter, Wifi, WifiOff, Sprout, MapPin
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
  puntos_disponibles?: number
  puntos_pendientes?: number
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
  const [showNomma, setShowNomma]   = useState(false)
  const [showDir, setShowDir]       = useState(false)
  const [direcciones, setDirecciones] = useState<any[]>([])
  const [pedidosHabilitados, setPedidosHabilitados] = useState(false)

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
  const [dirForm, setDirForm]         = useState({ alias: '', direccion: '', comuna: '', contacto: '', telefono: '' })
  const [dirSaving, setDirSaving]     = useState(false)
  const [dirShowForm, setDirShowForm] = useState(false)

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
      setDirecciones(data.direcciones || [])
      setPedidosHabilitados(data.pedidos_habilitados === true)
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

  async function agregarDireccion() {
    if (!dirForm.direccion.trim()) { setSuccessMsg('Escribe la dirección.'); return }
    setDirSaving(true)
    try {
      const res = await fetch(`/api/portal/mayoristas/${token}/direccion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dirForm),
      })
      const d = await res.json()
      if (!res.ok || !d.ok) throw new Error(d.error || 'No se pudo guardar')
      setDirForm({ alias: '', direccion: '', comuna: '', contacto: '', telefono: '' })
      setDirShowForm(false)
      setSuccessMsg('Dirección guardada. Ya puedes elegirla al hacer tu pedido.')
      loadData()
    } catch (e: any) {
      setSuccessMsg(e?.message || 'Error al guardar la dirección')
    } finally {
      setDirSaving(false)
    }
  }

  const cartTotal    = cart.reduce((s, i) => s + i.precio_mayorista * i.cantidad, 0)  // neto productos
  const cartSubtotal = cart.reduce((s, i) => s + i.precio_lista     * i.cantidad, 0)
  const cartAhorro   = cartSubtotal - cartTotal
  const cartCount    = cart.reduce((s, i) => s + i.cantidad, 0)
  const IVA_PCT      = 19
  const MINIMO_NETO  = 80000
  const DESPACHO     = 3500
  const bajoMinimo   = cartCount > 0 && cartTotal < MINIMO_NETO
  const faltanteMin  = Math.max(0, MINIMO_NETO - cartTotal)
  const cartDespacho = cartCount > 0 ? DESPACHO : 0
  const cartIva      = Math.round(cartTotal * IVA_PCT / 100)  // IVA solo sobre productos
  const cartTotalIva = cartTotal + cartIva + cartDespacho     // + despacho ($3.500 IVA incl.)

  // NOMMA CARD (fidelización)
  const META_CANJE = 10000
  const ptsDisp    = mayorista?.puntos_disponibles || 0
  const ptsPend    = mayorista?.puntos_pendientes || 0
  const ptsFaltan  = Math.max(0, META_CANJE - ptsDisp)
  const ptsPct     = Math.min(100, Math.round((ptsDisp / META_CANJE) * 100))
  const nfmt       = (n: number) => new Intl.NumberFormat('es-CL').format(Math.round(n))

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
      <div className="min-h-screen bg-[#f6f3ec] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#c9a24e] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 text-sm">Cargando portal mayorista...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#f6f3ec] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 text-center shadow-lg max-w-sm w-full">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-[#16233f] mb-2">Acceso denegado</h2>
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
      <div className="min-h-screen bg-[#f6f3ec] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 text-center shadow-lg max-w-sm w-full">
          <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-[#16233f] mb-1">¡Pedido confirmado!</h2>
          <p className="text-gray-500 text-sm mb-1">Pedido {orderSuccess.numero}</p>
          <p className="text-2xl font-bold text-[#c9a24e] mb-6">{fmt(orderSuccess.total)}</p>

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
    <div className="min-h-screen bg-[#f6f3ec]">

      {/* ── Header ── */}
      <header className="bg-[#16233f] text-white sticky top-0 z-50 shadow-lg">
        <div className="max-w-lg lg:max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#c9a24e] flex items-center justify-center flex-shrink-0">
              <Sprout className="w-5 h-5 text-[#16233f]" />
            </div>
            <div>
              <h1 className="font-bold text-[#c9a24e] text-base leading-tight tracking-wide">NOMMA FOOD</h1>
              <p className="text-xs text-gray-400">Portal Mayoristas</p>
            </div>
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
              onClick={() => { setShowCart(true); setShowPedidos(false); setShowNomma(false); setShowDir(false) }}
              className="relative flex items-center gap-1.5 px-3 py-2 bg-[#c9a24e] hover:bg-[#b8923f] rounded-xl transition-colors"
            >
              <ShoppingCart className="w-5 h-5 text-white" />
              {cartCount > 0 && (
                <span className="text-white text-sm font-bold whitespace-nowrap">{fmt(cartTotal)}</span>
              )}
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold min-w-[20px] h-5 px-1 rounded-full flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Bienvenida */}
        <div className="max-w-lg lg:max-w-4xl mx-auto px-4 pb-3">
          <div className="flex items-center justify-between text-xs text-gray-400 gap-2">
            <span className="truncate">
              <User className="w-3 h-3 inline mr-1" />
              {mayorista?.nombre} · {mayorista?.empresa || 'Mayorista'}
            </span>
            <div className="flex items-center gap-2 flex-shrink-0">
              {(mayorista?.descuento_pct || 0) > 0 && (
                <span className="bg-[#c9a24e]/20 text-[#c9a24e] px-2 py-0.5 rounded-full font-medium">
                  {mayorista?.descuento_pct}% desc.
                </span>
              )}
              <button
                onClick={() => { setShowNomma(true); setShowCart(false); setShowPedidos(false); setShowDir(false) }}
                className="flex items-center gap-1 bg-[#c9a24e] text-[#16233f] px-2.5 py-0.5 rounded-full font-bold hover:opacity-90 transition-opacity"
              >
                <CreditCard className="w-3 h-3" /> {nfmt(ptsDisp)} pts
              </button>
            </div>
          </div>
        </div>

        {/* Aviso de mínimo mientras el cliente compra */}
        {cartCount > 0 && bajoMinimo && (
          <div className="max-w-lg lg:max-w-4xl mx-auto px-4 pb-2">
            <div className="text-xs text-center bg-amber-400 text-[#5a3e00] font-semibold rounded-lg px-3 py-1.5">
              Llevas {fmt(cartTotal)} · te faltan {fmt(faltanteMin)} para el pedido mínimo de {fmt(MINIMO_NETO)}
            </div>
          </div>
        )}
      </header>

      {/* ── Toast ── */}
      {successMsg && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-[#16233f] text-white text-sm font-medium px-4 py-2 rounded-xl shadow-xl">
          {successMsg}
        </div>
      )}

      <div className="max-w-lg lg:max-w-4xl mx-auto px-4 pb-24">

        {/* ── Tabs ── */}
        <div className="flex gap-2 mt-4 mb-4">
          <button
            onClick={() => { setShowCart(false); setShowPedidos(false); setShowNomma(false); setShowDir(false) }}
            className={`flex-1 py-2 px-2 rounded-xl text-sm font-medium transition-colors ${
              !showCart && !showPedidos && !showNomma && !showDir
                ? 'bg-[#16233f] text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Package className="w-4 h-4 inline mr-1" />
            Catálogo
          </button>
          <button
            onClick={() => { setShowPedidos(true); setShowCart(false); setShowNomma(false); setShowDir(false) }}
            className={`flex-1 py-2 px-2 rounded-xl text-sm font-medium transition-colors ${
              showPedidos
                ? 'bg-[#16233f] text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            <ClipboardList className="w-4 h-4 inline mr-1" />
            Pedidos
            {pedidos.length > 0 && (
              <span className="ml-1 bg-[#c9a24e] text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
                {pedidos.length}
              </span>
            )}
          </button>
          <button
            onClick={() => { setShowNomma(true); setShowCart(false); setShowPedidos(false); setShowDir(false) }}
            className={`flex-1 py-2 px-2 rounded-xl text-sm font-medium transition-colors ${
              showNomma
                ? 'bg-[#16233f] text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            <CreditCard className="w-4 h-4 inline mr-1" />
            NOMMA CARD
          </button>
          <button
            onClick={() => { setShowDir(true); setShowCart(false); setShowPedidos(false); setShowNomma(false) }}
            className={`flex-1 py-2 px-2 rounded-xl text-sm font-medium transition-colors ${
              showDir
                ? 'bg-[#16233f] text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            <MapPin className="w-4 h-4 inline mr-1" />
            Direcciones
          </button>
        </div>

        {/* Aviso marcha blanca (pedidos aún no habilitados) */}
        {!pedidosHabilitados && (
          <div className="mb-4 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 flex items-start gap-3">
            <Clock className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800">
              <b>Portal en marcha blanca.</b> Puedes revisar el catálogo y armar tu carrito, pero los <b>pedidos se habilitan muy pronto</b>. Te avisaremos apenas puedas comprar. 🌱
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════
             VISTA: CATÁLOGO
        ════════════════════════════════════════════════════════ */}
        {!showCart && !showPedidos && !showNomma && !showDir && (
          <div>
            {/* Búsqueda */}
            <div className="relative mb-3">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                placeholder="Buscar producto o SKU..."
                className="w-full pl-9 pr-4 py-2.5 bg-white rounded-xl border-0 shadow-sm text-sm focus:ring-2 focus:ring-[#c9a24e] outline-none"
              />
            </div>

            {/* Filtro categorías */}
            {categorias.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">
                <button
                  onClick={() => setCatFilter('todas')}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    catFilter === 'todas'
                      ? 'bg-[#c9a24e] text-white'
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
                        ? 'bg-[#c9a24e] text-white'
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-start">
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
                            <h3 className="font-semibold text-[#16233f] text-sm leading-tight">{prod.nombre}</h3>
                            {prod.sku && <p className="text-xs text-gray-400 mt-0.5">SKU: {prod.sku}</p>}
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="font-bold text-[#16233f] text-base">{fmt(prod.precio_mayorista)}</p>
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
                                  className="w-8 h-8 rounded-lg bg-[#c9a24e] hover:bg-[#b8923f] text-white flex items-center justify-center transition-colors"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => addToCart(prod, 1)}
                                className="flex-1 bg-[#16233f] hover:bg-gray-800 text-white text-sm font-medium py-2 px-4 rounded-xl transition-colors flex items-center justify-center gap-2"
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
          <div className="lg:max-w-xl lg:mx-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-[#16233f]">Tu pedido</h2>
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
                  className="mt-4 text-sm text-[#c9a24e] font-medium hover:underline"
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
                          <p className="font-medium text-sm text-[#16233f] leading-tight">{item.producto_nombre}</p>
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
                            className="w-7 h-7 rounded-lg bg-[#c9a24e] hover:bg-[#b8923f] text-white flex items-center justify-center"
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
                  <div className="flex justify-between text-sm text-gray-600 mb-1">
                    <span>Neto productos</span>
                    <span>{fmt(cartTotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-600 mb-1">
                    <span>Despacho (RM · IVA incl.)</span>
                    <span>{fmt(cartDespacho)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-600 mb-2">
                    <span>IVA ({IVA_PCT}%)</span>
                    <span>{fmt(cartIva)}</span>
                  </div>
                  <div className="border-t border-gray-100 pt-2 flex justify-between font-bold text-[#16233f]">
                    <span>Total a pagar</span>
                    <span className="text-[#c9a24e] text-lg">{fmt(cartTotalIva)}</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1.5">Precios netos; el IVA (19%) se suma al total.</p>
                </div>

                {!pedidosHabilitados && (
                  <div className="mb-3 text-sm bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-4 py-3">
                    Los pedidos aún no están habilitados (marcha blanca). Muy pronto podrás comprar. 🌱
                  </div>
                )}
                {bajoMinimo && pedidosHabilitados && (
                  <div className="mb-3 text-sm bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-4 py-3">
                    El pedido mínimo es de <b>{fmt(MINIMO_NETO)}</b> neto. Te faltan <b>{fmt(faltanteMin)}</b> para poder finalizar tu pedido.
                  </div>
                )}
                <button
                  onClick={() => setShowCheckout(true)}
                  disabled={bajoMinimo || !pedidosHabilitados}
                  className={`w-full font-semibold py-3 px-6 rounded-xl transition-colors ${(bajoMinimo || !pedidosHabilitados) ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-[#c9a24e] hover:bg-[#b8923f] text-white'}`}
                >
                  {pedidosHabilitados ? 'Confirmar pedido →' : 'Pedidos muy pronto'}
                </button>
              </>
            )}
          </div>
        )}

        {/* ════════════════════════════════════════════════════════
             VISTA: CHECKOUT
        ════════════════════════════════════════════════════════ */}
        {showCart && showCheckout && (
          <div className="lg:max-w-xl lg:mx-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-[#16233f]">Detalles del pedido</h2>
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
                  className="w-full p-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#c9a24e]"
                />
              </div>

              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Dirección de entrega (opcional)
                </label>
                {direcciones.filter((d: any) => d.estado === 'aprobada').length > 0 && (
                  <select
                    onChange={e => setCheckoutDir(e.target.value)}
                    className="w-full p-3 mb-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#c9a24e] bg-white"
                    defaultValue=""
                  >
                    <option value="">Elige una de tus direcciones guardadas…</option>
                    {direcciones.filter((d: any) => d.estado === 'aprobada').map((d: any) => (
                      <option key={d.id} value={`${d.direccion}${d.comuna ? ', ' + d.comuna : ''}`}>
                        {d.alias ? `${d.alias} — ` : ''}{d.direccion}{d.comuna ? `, ${d.comuna}` : ''}
                      </option>
                    ))}
                  </select>
                )}
                <input
                  type="text"
                  value={checkoutDir}
                  onChange={e => setCheckoutDir(e.target.value)}
                  placeholder="…o escribe la dirección de entrega"
                  className="w-full p-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#c9a24e]"
                />
                <p className="text-[11px] text-gray-400 mt-1">Puedes guardar tus direcciones fijas en la pestaña “Direcciones”.</p>
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
                  className="w-full p-3 border border-gray-200 rounded-xl text-sm resize-none outline-none focus:border-[#c9a24e]"
                />
              </div>

              {/* Resumen */}
              <div className="bg-[#16233f] rounded-2xl p-4 text-white">
                <p className="text-xs text-gray-400 mb-3">
                  {cart.length} producto{cart.length !== 1 ? 's' : ''} · {cartCount} unidades
                </p>
                {(mayorista?.descuento_pct || 0) > 0 && (
                  <div className="flex justify-between text-sm text-gray-300 mb-1">
                    <span>Ahorro ({mayorista?.descuento_pct}%)</span>
                    <span className="text-green-400">-{fmt(cartAhorro)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm text-gray-300 mb-1">
                  <span>Neto</span>
                  <span>{fmt(cartTotal)}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-300 mb-2">
                  <span>IVA ({IVA_PCT}%)</span>
                  <span>{fmt(cartIva)}</span>
                </div>
                <div className="border-t border-white/10 pt-2 flex justify-between font-bold text-lg">
                  <span>Total a pagar</span>
                  <span className="text-[#c9a24e]">{fmt(cartTotalIva)}</span>
                </div>
              </div>
            </div>

            <button
              onClick={submitOrder}
              disabled={placing}
              className="w-full bg-[#c9a24e] hover:bg-[#b8923f] disabled:opacity-60 text-white font-semibold py-3.5 px-6 rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {placing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Procesando...
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4" />
                  Confirmar y pagar {fmt(cartTotalIva)}
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
            <h2 className="text-lg font-bold text-[#16233f] mb-4">Mis pedidos</h2>

            {pedidos.length === 0 ? (
              <div className="text-center py-16 text-gray-500">
                <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p className="text-sm">No tienes pedidos aún</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-start">
                {pedidos.map(pedido => (
                  <div key={pedido.id} className="bg-white rounded-2xl overflow-hidden shadow-sm">
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <p className="font-semibold text-sm text-[#16233f]">{pedido.numero_pedido}</p>
                          <p className="text-xs text-gray-400">
                            {new Date(pedido.created_at).toLocaleDateString('es-CL', {
                              day: '2-digit', month: 'short', year: 'numeric'
                            })}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-[#c9a24e]">{fmt(pedido.total)}</p>
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

        {/* ════════════════════════════════════════════════════════
             VISTA: NOMMA CARD (fidelización)
        ════════════════════════════════════════════════════════ */}
        {showNomma && (
          <div className="lg:max-w-2xl lg:mx-auto">
            <h2 className="text-lg font-bold text-[#16233f] mb-4">NOMMA CARD</h2>

            {/* Tarjeta de membresía */}
            <div className="relative overflow-hidden rounded-3xl p-6 text-white shadow-lg" style={{ background: 'linear-gradient(135deg,#1f3355 0%,#16233f 55%,#101a31 100%)' }}>
              <div className="absolute -top-16 -right-10 w-56 h-56 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(201,162,78,.28), transparent 70%)' }} />
              <div className="relative">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[11px] tracking-widest text-gray-400">NOMMA FOOD</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <h3 className="text-xl font-extrabold tracking-wide">NOMMA CARD</h3>
                      <CreditCard className="w-5 h-5 text-[#c9a24e]" />
                    </div>
                  </div>
                  <span className="text-[10px] font-semibold bg-[#c9a24e]/20 text-[#c9a24e] px-2.5 py-1 rounded-full whitespace-nowrap">MEMBRESÍA MAYORISTA</span>
                </div>

                <div className="mt-5">
                  <p className="text-[11px] tracking-widest text-gray-400">NEGOCIO</p>
                  <p className="text-lg font-semibold">{mayorista?.empresa || mayorista?.nombre}</p>
                </div>

                <div className="flex gap-10 mt-5">
                  <div>
                    <p className="text-[11px] tracking-widest text-gray-400">DISPONIBLES</p>
                    <p className="text-3xl font-extrabold text-[#c9a24e]">{nfmt(ptsDisp)}</p>
                  </div>
                  <div>
                    <p className="text-[11px] tracking-widest text-gray-400">PENDIENTES</p>
                    <p className="text-3xl font-extrabold text-white/90">{nfmt(ptsPend)}</p>
                  </div>
                </div>

                {/* Progreso hacia el canje */}
                <div className="mt-6">
                  <div className="flex justify-between text-xs text-gray-300 mb-1.5">
                    <span>Hacia el canje mínimo</span>
                    <span className="font-semibold">{nfmt(ptsDisp)} / {nfmt(META_CANJE)}</span>
                  </div>
                  <div className="h-2.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,.12)' }}>
                    <div className="h-full rounded-full" style={{ width: `${ptsPct}%`, background: 'linear-gradient(90deg,#e2ca8f,#c9a24e)' }} />
                  </div>
                  <p className="text-[11px] text-gray-400 mt-2">
                    {ptsFaltan > 0
                      ? <>Canje disponible desde {nfmt(META_CANJE)} puntos · faltan <b className="text-white">{nfmt(ptsFaltan)}</b></>
                      : <>¡Ya puedes canjear tus puntos! 🎉</>}
                  </p>
                </div>
              </div>
            </div>

            {/* Cómo funciona */}
            <div className="bg-white rounded-2xl p-4 shadow-sm mt-4">
              <p className="text-sm font-semibold text-[#16233f] mb-2">¿Cómo funciona tu NOMMA CARD?</p>
              <ul className="space-y-2 text-xs text-gray-600">
                <li className="flex gap-2"><span className="text-[#c9a24e] font-bold">•</span> Acumulas <b>1,5% del monto neto</b> de cada compra.</li>
                <li className="flex gap-2"><span className="text-[#c9a24e] font-bold">•</span> Los puntos pasan a <b>disponibles</b> cuando tu pedido se entrega con éxito.</li>
                <li className="flex gap-2"><span className="text-[#c9a24e] font-bold">•</span> Mientras el pedido está en curso, quedan <b>pendientes</b>.</li>
                <li className="flex gap-2"><span className="text-[#c9a24e] font-bold">•</span> Canjeas desde <b>{nfmt(META_CANJE)} puntos</b> por productos o descuentos.</li>
              </ul>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════
             VISTA: DIRECCIONES DE DESPACHO
        ════════════════════════════════════════════════════════ */}
        {showDir && (
          <div className="lg:max-w-2xl lg:mx-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-[#16233f]">Mis direcciones de despacho</h2>
              <button
                onClick={() => setDirShowForm(v => !v)}
                className="text-sm font-semibold text-[#c9a24e] flex items-center gap-1"
              >
                <Plus className="w-4 h-4" /> Agregar
              </button>
            </div>

            {dirShowForm && (
              <div className="bg-white rounded-2xl p-4 shadow-sm mb-4 space-y-3">
                <p className="text-xs text-gray-500">Queda guardada al instante y podrás <b>elegirla al hacer tu pedido</b>.</p>
                <input className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm" placeholder="Alias (ej: Sucursal Providencia)" value={dirForm.alias} onChange={e => setDirForm({ ...dirForm, alias: e.target.value })} />
                <input className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm" placeholder="Dirección *" value={dirForm.direccion} onChange={e => setDirForm({ ...dirForm, direccion: e.target.value })} />
                <input className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm" placeholder="Comuna" value={dirForm.comuna} onChange={e => setDirForm({ ...dirForm, comuna: e.target.value })} />
                <input className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm" placeholder="Contacto en el local" value={dirForm.contacto} onChange={e => setDirForm({ ...dirForm, contacto: e.target.value })} />
                <input className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm" placeholder="Teléfono" value={dirForm.telefono} onChange={e => setDirForm({ ...dirForm, telefono: e.target.value })} />
                <button onClick={agregarDireccion} disabled={dirSaving} className="w-full bg-[#c9a24e] hover:bg-[#b8923f] text-white font-semibold py-2.5 rounded-xl disabled:opacity-60">
                  {dirSaving ? 'Guardando…' : 'Guardar dirección'}
                </button>
              </div>
            )}

            {direcciones.length === 0 ? (
              <div className="bg-white rounded-2xl p-6 shadow-sm text-center text-sm text-gray-500">
                <MapPin className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                Aún no tienes direcciones guardadas. Agrega la de cada sucursal para despachar a distintos locales.
              </div>
            ) : (
              <div className="space-y-3">
                {direcciones.map((d: any) => (
                  <div key={d.id} className="bg-white rounded-2xl p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-[#16233f] text-sm">{d.alias || 'Dirección'}</p>
                        <p className="text-sm text-gray-600">{d.direccion}{d.comuna ? `, ${d.comuna}` : ''}</p>
                        {d.contacto && <p className="text-xs text-gray-400">{d.contacto}{d.telefono ? ` · ${d.telefono}` : ''}</p>}
                      </div>
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full flex-shrink-0 ${
                        d.estado === 'aprobada' ? 'bg-green-100 text-green-700'
                        : d.estado === 'rechazada' ? 'bg-red-100 text-red-700'
                        : 'bg-amber-100 text-amber-700'
                      }`}>
                        {d.estado === 'aprobada' ? 'Aprobada' : d.estado === 'rechazada' ? 'Rechazada' : 'En revisión'}
                      </span>
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
          <div className="max-w-lg lg:max-w-4xl mx-auto">
            <button
              onClick={() => { setShowCart(true); setShowPedidos(false); setShowNomma(false); setShowDir(false) }}
              className="w-full bg-[#c9a24e] hover:bg-[#b8923f] text-white font-semibold py-3 px-6 rounded-xl transition-colors flex items-center justify-between"
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
