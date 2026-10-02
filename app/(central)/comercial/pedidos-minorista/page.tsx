'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { ShoppingCart, Loader2, RefreshCw, X, MapPin, Phone, Mail, Package, Printer, CheckCircle2, Truck, Route } from 'lucide-react'
import RoutePlanner from './RoutePlanner'
import RouteDetail from './RouteDetail'

// Estados que representan un pedido PAGADO / activo (se puede imprimir su OC para armar).
const PAGADO = ['processing', 'procesando', 'on-hold', 'completado', 'completed', 'pagado']
const esPagado = (estado: string) => PAGADO.includes(String(estado || '').toLowerCase())

interface Item { id: string; producto_nombre: string; producto_sku: string | null; cantidad: number; precio: number }
interface Pedido {
  id: string; wc_order_id: number | null; numero: string; marca: string
  cliente_nombre: string | null; cliente_email: string | null; cliente_telefono: string | null
  despacho_direccion: string | null; despacho_comuna: string | null; despacho_region: string | null
  subtotal: number; envio: number; iva: number; total: number; estado: string
  metodo_pago: string | null; notas: string | null; created_at: string
  // Campos de despacho (aparecen tras correr la migración logistica-minorista-fase1.sql)
  lat?: number | null; lng?: number | null; geo_status?: string | null
  route_id?: string | null; estado_entrega?: string | null; chofer_id?: string | null
  items?: Item[]
}
interface RutaInfo { codigo: string; estado: string }

const fmt = (n: number) => '$' + Math.round(n || 0).toLocaleString('es-CL')
const cuando = (iso: string) => new Date(iso).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' })
const EST: Record<string, string> = {
  nuevo: 'noma-badge-blue', procesando: 'noma-badge-gold', processing: 'noma-badge-gold', 'on-hold': 'noma-badge-gold',
  pending: 'noma-badge-gold', pendiente_pago: 'noma-badge-gold', completado: 'noma-badge-green', completed: 'noma-badge-green',
  cancelado: 'noma-badge-red', cancelled: 'noma-badge-red', failed: 'noma-badge-red',
}

export default function PedidosMinorista() {
  const [rows, setRows] = useState<Pedido[]>([])
  const [loading, setLoading] = useState(true)
  const [marca, setMarca] = useState('todas')
  const [q, setQ] = useState('')
  const [sel, setSel] = useState<Pedido | null>(null)
  const [marcando, setMarcando] = useState(false)
  // Despacho / rutas
  const [despFiltro, setDespFiltro] = useState<'todos' | 'sin' | 'con'>('todos')
  const [seleccion, setSeleccion] = useState<Set<string>>(new Set())
  const [rutasMap, setRutasMap] = useState<Record<string, RutaInfo>>({})
  const [planner, setPlanner] = useState<string[] | null>(null)
  const [verRuta, setVerRuta] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const cargarRutas = useCallback(async () => {
    try {
      const res = await fetch('/api/central/rutas')
      const d = await res.json().catch(() => ({}))
      const map: Record<string, RutaInfo> = {}
      for (const r of (d.rutas || [])) map[r.id] = { codigo: r.codigo, estado: r.estado }
      setRutasMap(map)
    } catch { /* la migración puede no estar aún; se ignora */ }
  }, [])

  const cargar = useCallback(async () => {
    setLoading(true)
    // Leemos por la API del servidor (service-role + rol admin): la tabla tiene RLS
    // y no debe exponerse a todo usuario autenticado (datos de clientes retail).
    try {
      const res = await fetch('/api/central/pedidos-minorista')
      const d = await res.json().catch(() => ({}))
      setRows(res.ok ? ((d.pedidos as Pedido[]) || []) : [])
    } catch {
      setRows([])
    }
    setLoading(false)
  }, [])
  useEffect(() => { cargar(); cargarRutas() }, [cargar, cargarRutas])

  const despachoBadge = (p: Pedido) => {
    const ee = String(p.estado_entrega || '')
    if (p.route_id) {
      const cod = rutasMap[p.route_id]?.codigo || 'Ruta'
      if (ee === 'entregado') return { cls: 'bg-green-100 text-green-700', txt: '🟢 Entregado' }
      if (ee === 'incidencia' || ee === 'no_entregado') return { cls: 'bg-red-100 text-red-700', txt: '🔴 Incidencia' }
      if (ee === 'en_ruta' || ee === 'llego_cliente') return { cls: 'bg-amber-100 text-amber-700', txt: '🚚 En ruta' }
      return { cls: 'bg-blue-100 text-blue-700', txt: '🔵 ' + cod }
    }
    return { cls: 'bg-gray-100 text-gray-500', txt: '— Sin ruta' }
  }

  const toggleSel = (id: string) => setSeleccion(prev => {
    const n = new Set(prev)
    if (n.has(id)) n.delete(id); else n.add(id)
    return n
  })
  const generarRuta = () => { if (seleccion.size > 0) setPlanner([...seleccion]) }
  const onConfirmado = (codigo: string) => {
    setPlanner(null); setSeleccion(new Set())
    setToast(`✓ Ruta ${codigo} creada`)
    setTimeout(() => setToast(null), 4000)
    cargar(); cargarRutas()
  }

  // Marcar un pedido como pagado (processing). Resuelve el desfase cuando el pago
  // se confirmó en la web pero la Central quedó en "pending" porque no llegó el
  // aviso de cambio de estado. Deja el pedido listo para imprimir su OC.
  const marcarPagado = useCallback(async (pedido: Pedido) => {
    setMarcando(true)
    try {
      const res = await fetch('/api/central/pedidos-minorista', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: pedido.id, estado: 'processing' }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) { alert(d.error || 'No se pudo marcar como pagada.'); return }
      // Actualiza en memoria para reflejar el cambio al instante.
      setRows(prev => prev.map(r => r.id === pedido.id ? { ...r, estado: 'processing' } : r))
      setSel(prev => prev && prev.id === pedido.id ? { ...prev, estado: 'processing' } : prev)
    } catch {
      alert('No se pudo marcar como pagada. Revisa tu conexión e intenta de nuevo.')
    } finally {
      setMarcando(false)
    }
  }, [])

  const filtered = useMemo(() => rows.filter(p => {
    const mM = marca === 'todas' || p.marca === marca
    const s = (q || '').toLowerCase()
    const mQ = !s || [p.numero, p.cliente_nombre, p.cliente_email, p.despacho_comuna].some(v => (v || '').toLowerCase().includes(s))
    const mD = despFiltro === 'todos' || (despFiltro === 'sin' ? !p.route_id : !!p.route_id)
    return mM && mQ && mD
  }), [rows, marca, q, despFiltro])

  // Solo se pueden despachar pedidos aún sin ruta.
  const seleccionables = useMemo(() => filtered.filter(p => !p.route_id), [filtered])
  const todosSel = seleccionables.length > 0 && seleccionables.every(p => seleccion.has(p.id))
  const toggleTodos = () => setSeleccion(prev => {
    const n = new Set(prev)
    if (todosSel) seleccionables.forEach(p => n.delete(p.id))
    else seleccionables.forEach(p => n.add(p.id))
    return n
  })
  const selList = useMemo(() => rows.filter(p => seleccion.has(p.id)), [rows, seleccion])
  const selTotal = selList.reduce((s, p) => s + (p.total || 0), 0)

  return (
    <div className="p-4 lg:p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-[#16233f] flex items-center gap-2"><ShoppingCart className="w-6 h-6" /> Pedidos minorista</h1>
          <p className="text-sm text-gray-500">Pedidos de la web (retail) que llegan a la Central.</p>
        </div>
        <button onClick={cargar} className="flex items-center gap-1.5 text-sm bg-white border px-3 py-2 rounded-xl hover:bg-gray-50"><RefreshCw className="w-4 h-4" /> Actualizar</button>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {['todas', 'Brotes Asiáticos', 'NOMMA FOOD'].map(m => (
          <button key={m} onClick={() => setMarca(m)} className={`px-3 py-1.5 rounded-full text-sm font-medium ${marca === m ? 'bg-[#16233f] text-white' : 'bg-white border text-gray-600'}`}>{m === 'todas' ? 'Todas' : m}</button>
        ))}
        <span className="w-px bg-gray-200 self-stretch mx-1" />
        {([['todos', 'Despacho: Todos'], ['sin', 'Sin ruta'], ['con', 'Con ruta']] as const).map(([k, lbl]) => (
          <button key={k} onClick={() => setDespFiltro(k)} className={`px-3 py-1.5 rounded-full text-sm font-medium ${despFiltro === k ? 'bg-[#c9a24e] text-[#16233f]' : 'bg-white border text-gray-600'}`}>{lbl}</button>
        ))}
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar pedido, cliente, comuna..." className="flex-1 min-w-[200px] px-3 py-2 rounded-xl border text-sm" />
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400"><Package className="w-10 h-10 mx-auto mb-2 opacity-30" /><p className="text-sm">Aún no hay pedidos minorista.</p></div>
      ) : (
        <div className="bg-white rounded-2xl border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase"><tr>
              <th className="px-3 py-2 w-9">
                <input type="checkbox" checked={todosSel} onChange={toggleTodos} title="Seleccionar todos"
                  className="w-4 h-4 accent-[#16233f] cursor-pointer align-middle" />
              </th>
              <th className="text-left px-4 py-2">Pedido</th><th className="text-left px-4 py-2">Cliente</th>
              <th className="text-left px-4 py-2">Comuna</th><th className="text-right px-4 py-2">Total</th>
              <th className="text-left px-4 py-2">Estado</th><th className="text-left px-4 py-2">Fecha</th>
              <th className="text-left px-4 py-2">Despacho</th><th className="text-right px-4 py-2">OC</th>
            </tr></thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id} onClick={() => setSel(p)} className={`border-t hover:bg-gray-50 cursor-pointer ${seleccion.has(p.id) ? 'bg-amber-50/60' : ''}`}>
                  <td className="px-3 py-2.5" onClick={e => e.stopPropagation()}>
                    <input type="checkbox" checked={seleccion.has(p.id)} disabled={!!p.route_id}
                      onChange={() => toggleSel(p.id)} title={p.route_id ? 'Ya está en una ruta' : 'Seleccionar para despacho'}
                      className="w-4 h-4 accent-[#16233f] cursor-pointer align-middle disabled:opacity-30" />
                  </td>
                  <td className="px-4 py-2.5 font-semibold text-[#16233f]">#{p.numero}<div className="text-[11px] text-gray-400">{p.marca}</div></td>
                  <td className="px-4 py-2.5">{p.cliente_nombre || '—'}<div className="text-[11px] text-gray-400">{p.cliente_email}</div></td>
                  <td className="px-4 py-2.5">{p.despacho_comuna || '—'}</td>
                  <td className="px-4 py-2.5 text-right font-semibold">{fmt(p.total)}</td>
                  <td className="px-4 py-2.5"><span className={`text-xs px-2 py-0.5 rounded-full ${EST[p.estado] || 'noma-badge-gold'}`}>{p.estado}</span></td>
                  <td className="px-4 py-2.5 text-gray-500">{cuando(p.created_at)}</td>
                  <td className="px-4 py-2.5" onClick={e => { if (p.route_id) e.stopPropagation() }}>{(() => {
                    const b = despachoBadge(p)
                    if (p.route_id) return <button onClick={() => setVerRuta(p.route_id!)} className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap hover:ring-2 hover:ring-[#c9a24e]/40 ${b.cls}`} title="Ver ruta y mapa">{b.txt}</button>
                    return <span className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${b.cls}`}>{b.txt}</span>
                  })()}</td>
                  <td className="px-4 py-2.5 text-right" onClick={e => e.stopPropagation()}>
                    {esPagado(p.estado) && (
                      <a href={`/orden-compra-minorista/${p.id}`} target="_blank" rel="noopener noreferrer" title="Imprimir orden de compra"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-[#c9a24e] hover:underline whitespace-nowrap">
                        <Printer className="w-3.5 h-3.5" /> OC
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {sel && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setSel(null)}>
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[85vh] overflow-auto" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b flex items-center justify-between">
              <div><h2 className="font-bold text-[#16233f]">Pedido #{sel.numero}</h2><p className="text-xs text-gray-400">{sel.marca} · {cuando(sel.created_at)}</p></div>
              <button onClick={() => setSel(null)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="p-5 space-y-3 text-sm">
              <div className="flex flex-col gap-1 text-gray-600">
                {sel.cliente_nombre && <span className="font-semibold text-[#16233f] text-base">{sel.cliente_nombre}</span>}
                {sel.cliente_email && <span className="flex items-center gap-2"><Mail className="w-4 h-4 text-gray-400" />{sel.cliente_email}</span>}
                {sel.cliente_telefono && <span className="flex items-center gap-2"><Phone className="w-4 h-4 text-gray-400" />{sel.cliente_telefono}</span>}
                {(sel.despacho_direccion || sel.despacho_comuna) && <span className="flex items-center gap-2"><MapPin className="w-4 h-4 text-gray-400" />{[sel.despacho_direccion, sel.despacho_comuna, sel.despacho_region].filter(Boolean).join(', ')}</span>}
              </div>
              {sel.notas && <div className="bg-amber-50 text-amber-800 text-xs p-2 rounded-lg">Nota: {sel.notas}</div>}
              <div className="border rounded-xl overflow-hidden">
                {(sel.items || []).map(it => (
                  <div key={it.id} className="flex justify-between px-3 py-2 border-b last:border-0">
                    <span>{it.cantidad}× {it.producto_nombre}</span><span className="font-medium">{fmt(it.precio * it.cantidad)}</span>
                  </div>
                ))}
              </div>
              <div className="space-y-1 pt-1">
                <div className="flex justify-between text-gray-500"><span>Subtotal</span><span>{fmt(sel.subtotal)}</span></div>
                <div className="flex justify-between text-gray-500"><span>Envío</span><span>{fmt(sel.envio)}</span></div>
                <div className="flex justify-between font-bold text-[#16233f] text-base pt-1 border-t"><span>Total</span><span>{fmt(sel.total)}</span></div>
                {sel.metodo_pago && <div className="text-xs text-gray-400 text-right">Pago: {sel.metodo_pago}</div>}
              </div>
            </div>
            <div className="p-5 border-t space-y-2">
              {esPagado(sel.estado) ? (
                <a
                  href={`/orden-compra-minorista/${sel.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 bg-[#c9a24e] hover:bg-[#b8923f] text-[#16233f] font-semibold py-2.5 rounded-xl transition-colors"
                >
                  <Printer className="w-4 h-4" /> Imprimir orden de compra
                </a>
              ) : (
                <>
                  <button
                    onClick={() => marcarPagado(sel)}
                    disabled={marcando}
                    className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white font-semibold py-2.5 rounded-xl transition-colors"
                  >
                    {marcando ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    Marcar como pagada
                  </button>
                  <p className="text-[11px] text-gray-400 text-center">
                    Úsalo si ya recibiste el pago en la web pero aquí sigue pendiente. Quedará listo para imprimir su orden de compra.
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Barra de selección para crear ruta de despacho */}
      {seleccion.size > 0 && (
        <div className="sticky bottom-3 mt-4 z-40 bg-[#16233f] text-white rounded-2xl shadow-2xl px-4 py-3 flex items-center gap-4 flex-wrap">
          <div>
            <div className="font-bold text-sm">{seleccion.size} pedido{seleccion.size > 1 ? 's' : ''} seleccionado{seleccion.size > 1 ? 's' : ''}</div>
            <div className="text-[12px] text-white/70">{fmt(selTotal)} en productos · {seleccion.size} entregas</div>
          </div>
          <div className="flex-1" />
          <button onClick={() => setSeleccion(new Set())} className="text-sm text-white/80 hover:text-white px-3 py-2">Limpiar</button>
          <button onClick={generarRuta} className="flex items-center gap-2 bg-[#c9a24e] hover:bg-[#b8923f] text-[#16233f] font-bold text-sm px-4 py-2.5 rounded-xl">
            <Truck className="w-4 h-4" /> Generar ruta de despacho
          </button>
        </div>
      )}

      {planner && <RoutePlanner ids={planner} onClose={() => setPlanner(null)} onConfirmed={onConfirmado} />}

      {verRuta && <RouteDetail routeId={verRuta} onClose={() => setVerRuta(null)} />}

      {toast && (
        <div className="fixed left-1/2 -translate-x-1/2 bottom-6 z-[60] bg-[#16233f] text-white px-5 py-3 rounded-xl shadow-2xl font-semibold text-sm flex items-center gap-2">
          <Route className="w-4 h-4 text-[#c9a24e]" /> {toast}
        </div>
      )}
    </div>
  )
}
