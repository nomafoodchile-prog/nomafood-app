'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Sprout, LogOut, Loader2, ChevronDown, ArrowLeft, Package, PlusCircle, Truck, Receipt, AlertTriangle, MessageCircle, Search, Clock, Minus, Plus, Check } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'

interface Sesion {
  organizacion: { id: string; nombre: string } | null
  rol: 'admin_general' | 'encargado_local'; rol_label: string
  usuario: { nombre: string; email: string }
  sucursales: { id: string; nombre: string }[]
}
interface StockItem { product_id: string; nombre: string; sku: string; unidad: string; imagen_url: string | null; stock_actual: number; stock_min: number; stock_ideal: number; por_recibir: number; estado: string }
interface Pedido { id: string; folio: string; estado: string; prioridad: string; fecha_requerida: string | null; observaciones: string | null; created_at: string; items: any[]; n_items: number; con_diferencia: boolean }

const MODULOS = [
  { k: 'stock', label: 'Mi Stock', icon: Package, desc: 'Inventario del local', on: true },
  { k: 'pedir', label: 'Nueva solicitud', icon: PlusCircle, desc: 'Pedir reposición', on: true },
  { k: 'pedidos', label: 'Pedidos', icon: Truck, desc: 'Seguimiento y trazabilidad', on: true },
  { k: 'facturas', label: 'Facturación', icon: Receipt, desc: 'Facturas por pagar', on: false },
  { k: 'incidencias', label: 'Incidencias', icon: AlertTriangle, desc: 'Reportes y consultas', on: false },
  { k: 'consultas', label: 'Consultas', icon: MessageCircle, desc: 'Preguntas a NOMMA', on: false },
]
const EST_STOCK: Record<string, { l: string; c: string }> = {
  ok: { l: 'Stock OK', c: 'bg-green-100 text-green-700' }, bajo: { l: 'Bajo', c: 'bg-amber-100 text-amber-700' },
  critico: { l: 'Crítico', c: 'bg-red-100 text-red-700' }, sin_stock: { l: 'Sin stock', c: 'bg-gray-200 text-gray-600' },
  reposicion: { l: 'En reposición', c: 'bg-blue-100 text-blue-700' },
}
const EST_PED: Record<string, { l: string; c: string }> = {
  solicitud_enviada: { l: 'Enviada', c: 'bg-blue-100 text-blue-700' }, en_revision: { l: 'En revisión', c: 'bg-amber-100 text-amber-700' },
  aprobada: { l: 'Aprobada', c: 'bg-teal-100 text-teal-700' }, en_preparacion: { l: 'En preparación', c: 'bg-amber-100 text-amber-700' },
  en_picking: { l: 'En picking', c: 'bg-amber-100 text-amber-700' }, listo_despacho: { l: 'Listo', c: 'bg-amber-100 text-amber-700' },
  en_ruta: { l: 'En ruta', c: 'bg-blue-100 text-blue-700' }, entregada: { l: 'Entregada', c: 'bg-green-100 text-green-700' },
  entregada_diferencias: { l: 'Con diferencias', c: 'bg-red-100 text-red-700' }, cancelada: { l: 'Cancelada', c: 'bg-gray-200 text-gray-600' },
}
const FILTROS = [['todos', 'Todos'], ['bajo', 'Bajo'], ['critico', 'Crítico'], ['sin_stock', 'Sin stock'], ['reposicion', 'Reposición']] as const
const fFecha = (s: string | null) => s ? new Date(s + (s.length <= 10 ? 'T00:00:00' : '')).toLocaleDateString('es-CL') : '—'
const nn = (v: any) => v == null ? '—' : String(v)

export default function AldeaDashboard() {
  const router = useRouter()
  const [ses, setSes] = useState<Sesion | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [sucursal, setSucursal] = useState('')
  const [vista, setVista] = useState<'inicio' | 'stock' | 'pedir' | 'pedidos'>('inicio')

  const [stock, setStock] = useState<StockItem[]>([])
  const [stockLoading, setStockLoading] = useState(false)
  const [q, setQ] = useState(''); const [filtro, setFiltro] = useState<string>('todos')

  const [cart, setCart] = useState<Record<string, number>>({})
  const [fechaReq, setFechaReq] = useState(''); const [prioridad, setPrioridad] = useState('normal'); const [obs, setObs] = useState('')
  const [enviando, setEnviando] = useState(false); const [okMsg, setOkMsg] = useState<string | null>(null)

  const [pedidos, setPedidos] = useState<Pedido[]>([]); const [pedLoading, setPedLoading] = useState(false); const [abierto, setAbierto] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/portal/aldea/session').then(async r => {
      const d = await r.json()
      if (!r.ok) { setError(d.error || 'No autorizado'); return }
      setSes(d); if (d.sucursales?.length) setSucursal(d.sucursales[0].id)
    }).catch(() => setError('Error de conexión')).finally(() => setLoading(false))
  }, [])

  const cargarStock = useCallback(async (suc: string) => {
    if (!suc) return; setStockLoading(true)
    try { const r = await fetch(`/api/portal/aldea/stock?sucursal=${suc}`); const d = await r.json(); setStock(r.ok ? (d.items || []) : []) } catch { setStock([]) }
    setStockLoading(false)
  }, [])
  const cargarPedidos = useCallback(async (suc: string) => {
    if (!suc) return; setPedLoading(true)
    try { const r = await fetch(`/api/portal/aldea/pedidos?sucursal=${suc}`); const d = await r.json(); setPedidos(r.ok ? (d.pedidos || []) : []) } catch { setPedidos([]) }
    setPedLoading(false)
  }, [])

  useEffect(() => { if ((vista === 'stock' || vista === 'pedir') && sucursal) cargarStock(sucursal) }, [vista, sucursal, cargarStock])
  useEffect(() => { if (vista === 'pedidos' && sucursal) cargarPedidos(sucursal) }, [vista, sucursal, cargarPedidos])
  useEffect(() => { setCart({}); setOkMsg(null) }, [sucursal])

  function setQty(pid: string, delta: number, nombre?: string) {
    setCart(c => { const n = Math.max(0, (c[pid] || 0) + delta); const nc = { ...c }; if (n === 0) delete nc[pid]; else nc[pid] = n; return nc })
  }
  async function enviarSolicitud() {
    const items = stock.filter(s => (cart[s.product_id] || 0) > 0).map(s => ({ product_id: s.product_id, cantidad: cart[s.product_id], producto_nombre: s.nombre, unidad: s.unidad }))
    if (items.length === 0) { setOkMsg('Agrega al menos un producto.'); return }
    setEnviando(true)
    try {
      const r = await fetch('/api/portal/aldea/solicitud', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sucursal, items, fecha_requerida: fechaReq || null, prioridad, observaciones: obs }),
      })
      const d = await r.json()
      if (!r.ok) { setOkMsg(d.error || 'No se pudo enviar.'); setEnviando(false); return }
      setCart({}); setObs(''); setFechaReq(''); setPrioridad('normal')
      setVista('pedidos'); cargarPedidos(sucursal)
    } catch { setOkMsg('Sin conexión.') }
    setEnviando(false)
  }

  async function salir() { await supabase.auth.signOut(); router.replace('/portal/aldea/login') }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-6 h-6 text-[#1b2a4a] animate-spin" /></div>
  if (error) return (
    <div className="min-h-screen flex items-center justify-center p-5">
      <div className="bg-white rounded-2xl shadow p-7 text-center max-w-sm">
        <Sprout className="w-8 h-8 text-[#c9a24e] mx-auto mb-3" />
        <p className="font-semibold text-[#16233f] mb-1">Acceso no disponible</p>
        <p className="text-sm text-gray-500 mb-4">{error}</p>
        <button onClick={salir} className="text-sm font-semibold text-[#c9a24e]">Cambiar de cuenta</button>
      </div>
    </div>
  )

  const esAdmin = ses?.rol === 'admin_general'
  const sucNombre = ses?.sucursales.find(s => s.id === sucursal)?.nombre || '—'
  const visibles = stock.filter(i => (filtro === 'todos' || i.estado === filtro) && (!q || i.nombre.toLowerCase().includes(q.toLowerCase()) || i.sku.toLowerCase().includes(q.toLowerCase())))
  const cartCount = Object.values(cart).reduce((a, b) => a + b, 0)
  const TITULO: Record<string, string> = { stock: 'Mi Stock', pedir: 'Nueva solicitud', pedidos: 'Pedidos' }

  return (
    <div className="max-w-md mx-auto pb-24">
      <header className="bg-[#16233f] text-white px-5 pt-6 pb-5 rounded-b-3xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {vista !== 'inicio'
              ? <button onClick={() => setVista('inicio')} className="w-9 h-9 rounded-lg bg-white/10 grid place-items-center"><ArrowLeft size={17} /></button>
              : <div className="w-9 h-9 rounded-lg bg-[#c9a24e] text-[#16233f] grid place-items-center font-bold" style={{ fontFamily: 'Georgia, serif' }}>A</div>}
            <div>
              <p className="font-bold text-sm leading-tight">{vista === 'inicio' ? (ses?.organizacion?.nombre || 'Aldea Vegetal') : TITULO[vista]}</p>
              <p className="text-[11px] text-white/60">{vista === 'inicio' ? 'Portal de abastecimiento' : sucNombre}</p>
            </div>
          </div>
          <button onClick={salir} className="w-9 h-9 rounded-lg bg-white/10 grid place-items-center" title="Salir"><LogOut size={16} /></button>
        </div>
        <div className="mt-4 flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-[#c9a24e]/20 text-[#c9a24e]">{ses?.rol_label}</span>
          {ses && ses.sucursales.length > 0 && (esAdmin ? (
            <div className="inline-flex items-center gap-1.5 bg-white/10 border border-white/15 rounded-full pl-3 pr-2 py-1">
              <span className="text-xs">📍</span>
              <select value={sucursal} onChange={e => setSucursal(e.target.value)} className="bg-transparent text-white text-xs font-semibold outline-none">
                {ses.sucursales.map(s => <option key={s.id} value={s.id} className="text-black">{s.nombre}</option>)}
              </select>
              <ChevronDown size={13} className="text-white/60" />
            </div>
          ) : <span className="inline-flex items-center gap-1.5 bg-white/10 border border-white/15 rounded-full px-3 py-1 text-xs font-semibold">📍 {sucNombre}</span>)}
        </div>
        {vista === 'inicio' && <p className="text-xs text-white/70 mt-3">Hola, {ses?.usuario.nombre.split(' ')[0]} 👋</p>}
      </header>

      {/* INICIO */}
      {vista === 'inicio' && (
        <div className="px-5 pt-4">
          <div className="bg-[#faf7ef] border border-[#e7d4a6] rounded-xl p-3.5 text-sm text-[#5a4a24] mb-4">
            <b>Portal en construcción.</b> Ya puedes ver tu stock, <b>pedir reposición</b> y seguir tus pedidos. El resto se irá activando.
          </div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400 mb-2">Módulos</p>
          <div className="grid grid-cols-2 gap-3">
            {MODULOS.map(m => (
              <button key={m.k} onClick={() => m.on && setVista(m.k as any)}
                className={`text-left bg-white rounded-2xl border border-gray-100 p-4 shadow-sm ${m.on ? 'hover:border-[#c9a24e] cursor-pointer' : 'opacity-70 cursor-default'}`}>
                <div className={`w-9 h-9 rounded-xl grid place-items-center mb-2 ${m.on ? 'bg-[#c9a24e] text-white' : 'bg-[#f5f0e8] text-[#c9a24e]'}`}><m.icon size={18} /></div>
                <p className="font-semibold text-sm text-[#1a1a1a]">{m.label}</p>
                <p className="text-[11px] text-gray-400">{m.desc}</p>
                <span className={`inline-block mt-2 text-[10px] font-bold px-2 py-0.5 rounded-full ${m.on ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>{m.on ? 'Activo' : 'Próximamente'}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* MI STOCK */}
      {vista === 'stock' && (
        <div className="px-5 pt-4">
          <div className="relative mb-2">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar producto o SKU…" className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#c9a24e]" />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {FILTROS.map(([k, l]) => <button key={k} onClick={() => setFiltro(k)} className={`text-xs font-semibold whitespace-nowrap px-3 py-1.5 rounded-full border ${filtro === k ? 'bg-[#16233f] text-white border-[#16233f]' : 'bg-white text-gray-500 border-gray-200'}`}>{l}</button>)}
          </div>
          {stockLoading ? <div className="py-12 text-center"><Loader2 className="w-5 h-5 text-[#1b2a4a] animate-spin mx-auto" /></div>
            : visibles.length === 0 ? <div className="bg-white rounded-2xl border border-gray-100 py-12 text-center text-gray-400 text-sm"><Package className="w-8 h-8 text-gray-200 mx-auto mb-2" />{stock.length === 0 ? 'Aún no hay stock cargado.' : 'Sin productos con ese filtro.'}</div>
            : <div className="bg-white rounded-2xl border border-gray-100 px-4 shadow-sm">
              {visibles.map(i => { const e = EST_STOCK[i.estado] || EST_STOCK.ok; return (
                <div key={i.product_id} className="flex items-center gap-3 py-3 border-t border-gray-50 first:border-0">
                  <div className="w-11 h-11 rounded-xl bg-[#f5f0e8] grid place-items-center overflow-hidden flex-none">{i.imagen_url ? <img src={i.imagen_url} alt="" className="w-full h-full object-cover" /> : <Package size={18} className="text-[#c9a24e]" />}</div>
                  <div className="flex-1 min-w-0"><p className="font-semibold text-sm text-[#1a1a1a] truncate">{i.nombre}</p><p className="text-[11px] text-gray-400">{i.sku ? i.sku + ' · ' : ''}{i.unidad} · actual {i.stock_actual} / mín {i.stock_min} / ideal {i.stock_ideal}{i.por_recibir > 0 && <span className="text-blue-600"> · llegan {i.por_recibir}</span>}</p></div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-none ${e.c}`}>{e.l}</span>
                </div>)})}
            </div>}
          <p className="text-[11px] text-gray-400 mt-3 flex items-center gap-1.5"><Clock size={12} /> Cuando se conecte Bsale, el stock se actualizará solo con cada venta.</p>
        </div>
      )}

      {/* NUEVA SOLICITUD */}
      {vista === 'pedir' && (
        <div className="px-5 pt-4">
          <p className="text-sm text-gray-500 mb-3">Elige los productos y cantidades que necesitas reponer.</p>
          {stockLoading ? <div className="py-12 text-center"><Loader2 className="w-5 h-5 text-[#1b2a4a] animate-spin mx-auto" /></div>
            : stock.length === 0 ? <div className="bg-white rounded-2xl border border-gray-100 py-12 text-center text-gray-400 text-sm">Sin catálogo autorizado para esta sucursal.</div>
            : <div className="bg-white rounded-2xl border border-gray-100 px-4 shadow-sm mb-4">
              {stock.map(i => (
                <div key={i.product_id} className="flex items-center gap-3 py-3 border-t border-gray-50 first:border-0">
                  <div className="w-11 h-11 rounded-xl bg-[#f5f0e8] grid place-items-center overflow-hidden flex-none">{i.imagen_url ? <img src={i.imagen_url} alt="" className="w-full h-full object-cover" /> : <Package size={18} className="text-[#c9a24e]" />}</div>
                  <div className="flex-1 min-w-0"><p className="font-semibold text-sm text-[#1a1a1a] truncate">{i.nombre}</p><p className="text-[11px] text-gray-400">{i.unidad} · tienes {i.stock_actual} / ideal {i.stock_ideal}</p></div>
                  <div className="inline-flex items-center gap-2.5 border border-gray-200 rounded-lg px-1.5 py-1 flex-none">
                    <button onClick={() => setQty(i.product_id, -1)} className="w-7 h-7 rounded-md bg-gray-50 text-[#16233f] grid place-items-center"><Minus size={14} /></button>
                    <b className="min-w-[18px] text-center text-sm tabular-nums">{cart[i.product_id] || 0}</b>
                    <button onClick={() => setQty(i.product_id, 1)} className="w-7 h-7 rounded-md bg-[#c9a24e] text-white grid place-items-center"><Plus size={14} /></button>
                  </div>
                </div>
              ))}
            </div>}
          <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm space-y-3 mb-4">
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-xs font-semibold text-gray-600 mb-1">Fecha requerida</label><input type="date" value={fechaReq} onChange={e => setFechaReq(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm" /></div>
              <div><label className="block text-xs font-semibold text-gray-600 mb-1">Prioridad</label>
                <select value={prioridad} onChange={e => setPrioridad(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white"><option value="baja">Baja</option><option value="normal">Normal</option><option value="alta">Alta</option></select></div>
            </div>
            <div><label className="block text-xs font-semibold text-gray-600 mb-1">Observaciones</label><textarea value={obs} onChange={e => setObs(e.target.value)} rows={2} placeholder="Ej: entregar antes de las 11:00" className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm" /></div>
          </div>
          {okMsg && <p className="text-sm text-red-600 mb-2">{okMsg}</p>}
          <button onClick={enviarSolicitud} disabled={enviando || cartCount === 0} className="w-full bg-[#c9a24e] hover:bg-[#b8923f] text-[#16233f] font-bold py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50">
            {enviando ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />} Enviar solicitud{cartCount > 0 ? ` · ${cartCount} un.` : ''}
          </button>
        </div>
      )}

      {/* PEDIDOS + TRAZABILIDAD */}
      {vista === 'pedidos' && (
        <div className="px-5 pt-4">
          {pedLoading ? <div className="py-12 text-center"><Loader2 className="w-5 h-5 text-[#1b2a4a] animate-spin mx-auto" /></div>
            : pedidos.length === 0 ? <div className="bg-white rounded-2xl border border-gray-100 py-12 text-center text-gray-400 text-sm"><Truck className="w-8 h-8 text-gray-200 mx-auto mb-2" />Aún no hay solicitudes. Crea una en “Nueva solicitud”.</div>
            : <div className="space-y-3">
              {pedidos.map(p => { const e = EST_PED[p.estado] || { l: p.estado, c: 'bg-gray-100 text-gray-600' }; const open = abierto === p.id; return (
                <div key={p.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <button onClick={() => setAbierto(open ? null : p.id)} className="w-full p-4 text-left">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-sm text-[#16233f]">{p.folio}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${e.c}`}>{e.l}</span>
                    </div>
                    <p className="text-[11px] text-gray-400 mt-1">{fFecha(p.created_at)} · {p.n_items} producto{p.n_items !== 1 ? 's' : ''}{p.fecha_requerida ? ` · entrega: ${fFecha(p.fecha_requerida)}` : ''}{p.prioridad === 'alta' ? ' · ⚡ alta' : ''}</p>
                  </button>
                  {open && (
                    <div className="px-4 pb-4">
                      <div className="overflow-x-auto rounded-xl border border-gray-100">
                        <table className="w-full text-xs" style={{ minWidth: 420 }}>
                          <thead className="bg-gray-50/60"><tr>
                            <th className="text-left py-2 px-2.5 font-bold text-gray-400 uppercase text-[10px]">Producto</th>
                            <th className="py-2 px-1.5 font-bold text-gray-400 uppercase text-[10px]">Solic.</th>
                            <th className="py-2 px-1.5 font-bold text-gray-400 uppercase text-[10px]">Aprob.</th>
                            <th className="py-2 px-1.5 font-bold text-gray-400 uppercase text-[10px]">Prep.</th>
                            <th className="py-2 px-1.5 font-bold text-gray-400 uppercase text-[10px]">Desp.</th>
                            <th className="py-2 px-1.5 font-bold text-gray-400 uppercase text-[10px]">Recib.</th>
                          </tr></thead>
                          <tbody>
                            {p.items.map((it: any, idx: number) => (
                              <tr key={idx} className="border-t border-gray-50">
                                <td className="py-2 px-2.5 font-medium text-[#1a1a1a]">{it.producto_nombre || 'Producto'}</td>
                                <td className="py-2 px-1.5 text-center tabular-nums">{nn(it.cantidad_solicitada)}</td>
                                <td className="py-2 px-1.5 text-center tabular-nums text-gray-500">{nn(it.cantidad_aprobada)}</td>
                                <td className="py-2 px-1.5 text-center tabular-nums text-gray-500">{nn(it.cantidad_preparada)}</td>
                                <td className="py-2 px-1.5 text-center tabular-nums text-gray-500">{nn(it.cantidad_despachada)}</td>
                                <td className="py-2 px-1.5 text-center tabular-nums text-gray-500">{nn(it.cantidad_recibida)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {p.observaciones && <p className="text-[11px] text-gray-500 mt-2">📝 {p.observaciones}</p>}
                      <p className="text-[11px] text-gray-400 mt-2">La Central irá completando aprobado, preparado y despachado. Al recibir, tú confirmas lo recibido.</p>
                    </div>
                  )}
                </div>)})}
            </div>}
        </div>
      )}
    </div>
  )
}
