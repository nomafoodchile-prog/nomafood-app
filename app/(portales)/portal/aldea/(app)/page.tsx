'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Sprout, LogOut, Loader2, ChevronDown, ArrowLeft, Package, PlusCircle, Truck, Receipt, AlertTriangle, MessageCircle, Search, Clock, Minus, Plus, Check, PackageCheck } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'

interface Sesion {
  organizacion: { id: string; nombre: string } | null
  rol: 'admin_general' | 'encargado_local'; rol_label: string
  usuario: { nombre: string; email: string }
  sucursales: { id: string; nombre: string }[]
}
interface StockItem { product_id: string; nombre: string; sku: string; unidad: string; unidad_venta: string; unidades_por_caja: number; categoria: string; imagen_url: string | null; precio_caja: number | null; precio_unitario: number | null; disponible: boolean; stock_actual: number; stock_min: number; stock_ideal: number; por_recibir: number; estado: string }
interface Pedido { id: string; folio: string; estado: string; prioridad: string; fecha_requerida: string | null; observaciones: string | null; chofer_nombre: string | null; chofer_telefono: string | null; hora_estimada: string | null; neto: number | null; total: number | null; created_at: string; items: any[]; n_items: number; con_diferencia: boolean }

const MODULOS = [
  { k: 'stock', label: 'Mi Stock', icon: Package, desc: 'Inventario del local', on: true },
  { k: 'pedir', label: 'Nueva solicitud', icon: PlusCircle, desc: 'Pedir reposición', on: true },
  { k: 'pedidos', label: 'Pedidos', icon: Truck, desc: 'Seguimiento y trazabilidad', on: true },
  { k: 'incidencias', label: 'Incidencias', icon: AlertTriangle, desc: 'Reportes y consultas', on: true },
  { k: 'facturas', label: 'Facturación', icon: Receipt, desc: 'Facturas por pagar', on: true },
  { k: 'consultas', label: 'Consultas', icon: MessageCircle, desc: 'Preguntas a NOMMA', on: true },
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
// Seguimiento del pedido: 4 etapas visibles para el local. Mapea los estados internos.
const STAGE_OF: Record<string, number> = { solicitud_enviada: 0, en_revision: 0, aprobada: 0, en_preparacion: 1, en_picking: 1, listo_despacho: 2, en_ruta: 2, entregada: 3, entregada_diferencias: 3 }
const STAGES = [{ k: 'Confirmado', icon: Check }, { k: 'Preparación', icon: Package }, { k: 'Despacho', icon: Truck }, { k: 'Entregado', icon: PackageCheck }]
const FILTROS = [['todos', 'Todos'], ['bajo', 'Bajo'], ['critico', 'Crítico'], ['sin_stock', 'Sin stock'], ['reposicion', 'Reposición']] as const
const TIPO_INC: Record<string, string> = { pedido_incompleto: 'Pedido incompleto', producto_danado: 'Producto dañado', producto_incorrecto: 'Producto incorrecto', cantidad: 'Cantidad incorrecta', calidad: 'Calidad', temperatura: 'Temperatura', atraso: 'Atraso de despacho', chofer: 'Chofer', falta_stock: 'Falta de stock', diferencia_recepcion: 'Diferencia de recepción', consulta: 'Consulta', otro: 'Otro' }
const EST_INC: Record<string, { l: string; c: string }> = { nueva: { l: 'Nueva', c: 'bg-blue-100 text-blue-700' }, en_revision: { l: 'En revisión', c: 'bg-amber-100 text-amber-700' }, en_solucion: { l: 'En solución', c: 'bg-amber-100 text-amber-700' }, resuelta: { l: 'Resuelta', c: 'bg-green-100 text-green-700' }, cerrada: { l: 'Cerrada', c: 'bg-gray-100 text-gray-500' } }
const TIPO_OPCIONES = ['consulta', 'pedido_incompleto', 'producto_danado', 'producto_incorrecto', 'cantidad', 'calidad', 'temperatura', 'atraso', 'chofer', 'falta_stock', 'otro']
const fFecha = (s: string | null) => s ? new Date(s + (s.length <= 10 ? 'T00:00:00' : '')).toLocaleDateString('es-CL') : '—'
const nn = (v: any) => v == null ? '—' : String(v)
const clp = (n: number) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n || 0)
const EST_FACT: Record<string, { l: string; c: string }> = { por_pagar: { l: 'Por pagar', c: 'bg-amber-100 text-amber-700' }, vencida: { l: 'Vencida', c: 'bg-red-100 text-red-700' }, pagada: { l: 'Pagada', c: 'bg-green-100 text-green-700' } }

export default function AldeaDashboard() {
  const router = useRouter()
  const [ses, setSes] = useState<Sesion | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [sucursal, setSucursal] = useState('')
  const [vista, setVista] = useState<'inicio' | 'stock' | 'pedir' | 'pedidos' | 'recepcion' | 'incidencias' | 'facturas'>('inicio')

  const [stock, setStock] = useState<StockItem[]>([])
  const [stockLoading, setStockLoading] = useState(false)
  const [q, setQ] = useState(''); const [filtro, setFiltro] = useState<string>('todos')

  const [cart, setCart] = useState<Record<string, number>>({})
  const [fechaReq, setFechaReq] = useState(''); const [prioridad, setPrioridad] = useState('normal'); const [obs, setObs] = useState('')
  const [enviando, setEnviando] = useState(false); const [okMsg, setOkMsg] = useState<string | null>(null)

  const [pedidos, setPedidos] = useState<Pedido[]>([]); const [pedLoading, setPedLoading] = useState(false); const [abierto, setAbierto] = useState<string | null>(null)
  const [recSol, setRecSol] = useState<Pedido | null>(null); const [recib, setRecib] = useState<Record<string, string>>({}); const [notasRec, setNotasRec] = useState(''); const [confirmando, setConfirmando] = useState(false)
  const [incs, setIncs] = useState<any[]>([]); const [incLoading, setIncLoading] = useState(false); const [repOpen, setRepOpen] = useState(false); const [repTipo, setRepTipo] = useState('consulta'); const [repDesc, setRepDesc] = useState(''); const [reportando, setReportando] = useState(false); const [incFiltro, setIncFiltro] = useState<'todas' | 'incidencia' | 'consulta'>('todas')

  function abrirModulo(k: string) {
    if (k === 'consultas') { setIncFiltro('consulta'); setRepTipo('consulta'); setVista('incidencias'); return }
    if (k === 'incidencias') { setIncFiltro('todas'); setRepTipo('consulta') }
    setVista(k as any)
  }
  const [facts, setFacts] = useState<any[]>([]); const [factLoad, setFactLoad] = useState(false); const [factRes, setFactRes] = useState<any>({}); const [factFiltro, setFactFiltro] = useState('todas')

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

  const cargarIncs = useCallback(async (suc: string) => {
    if (!suc) return; setIncLoading(true)
    try { const r = await fetch(`/api/portal/aldea/incidencias?sucursal=${suc}`); const d = await r.json(); setIncs(r.ok ? (d.incidencias || []) : []) } catch { setIncs([]) }
    setIncLoading(false)
  }, [])
  async function enviarIncidencia() {
    if (!repDesc.trim()) return
    setReportando(true)
    try {
      const r = await fetch('/api/portal/aldea/incidencias', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sucursal, tipo: repTipo, descripcion: repDesc }) })
      if (!r.ok) { const e = await r.json(); alert(e.error || 'No se pudo enviar.'); setReportando(false); return }
      setRepDesc(''); setRepOpen(false); cargarIncs(sucursal)
    } catch { alert('Sin conexión.') }
    setReportando(false)
  }

  useEffect(() => { if ((vista === 'stock' || vista === 'pedir') && sucursal) cargarStock(sucursal) }, [vista, sucursal, cargarStock])
  useEffect(() => { if (vista === 'pedidos' && sucursal) cargarPedidos(sucursal) }, [vista, sucursal, cargarPedidos])
  useEffect(() => { if (vista === 'incidencias' && sucursal) cargarIncs(sucursal) }, [vista, sucursal, cargarIncs])
  const cargarFacts = useCallback(async (suc: string) => {
    if (!suc) return; setFactLoad(true)
    try { const r = await fetch(`/api/portal/aldea/facturas?sucursal=${suc}`); const d = await r.json(); setFacts(r.ok ? (d.facturas || []) : []); setFactRes(r.ok ? (d.resumen || {}) : {}) } catch { setFacts([]) }
    setFactLoad(false)
  }, [])
  useEffect(() => { if (vista === 'facturas' && sucursal) cargarFacts(sucursal) }, [vista, sucursal, cargarFacts])
  // Inicio: precarga pedidos + incidencias + facturas para el seguimiento y los contadores.
  useEffect(() => { if (vista === 'inicio' && sucursal) { cargarPedidos(sucursal); cargarIncs(sucursal); cargarFacts(sucursal) } }, [vista, sucursal, cargarPedidos, cargarIncs, cargarFacts])
  useEffect(() => { setCart({}); setOkMsg(null) }, [sucursal])

  function setQty(pid: string, delta: number) {
    setCart(c => { const n = Math.max(0, (c[pid] || 0) + delta); const nc = { ...c }; if (n === 0) delete nc[pid]; else nc[pid] = n; return nc })
  }
  function setQtyDirect(pid: string, raw: string) {
    const n = Math.max(0, Math.floor(Number(raw.replace(/[^0-9]/g, '')) || 0))
    setCart(c => { const nc = { ...c }; if (!n) delete nc[pid]; else nc[pid] = n; return nc })
  }
  async function enviarSolicitud() {
    const items = stock.filter(s => (cart[s.product_id] || 0) > 0).map(s => ({ product_id: s.product_id, cantidad: cart[s.product_id], producto_nombre: s.nombre, unidad: s.unidad, unidad_venta: s.unidad_venta, unidades_por_caja: s.unidades_por_caja, precio_caja: s.precio_caja }))
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

  const RECIBIBLE = ['aprobada', 'en_preparacion', 'en_picking', 'listo_despacho', 'en_ruta']
  function abrirRecepcion(p: Pedido) {
    const r: Record<string, string> = {}
    for (const it of p.items) r[it.id] = String(it.cantidad_despachada ?? it.cantidad_solicitada ?? 0)
    setRecSol(p); setRecib(r); setNotasRec(''); setVista('recepcion')
  }
  async function confirmarRecepcion() {
    if (!recSol) return
    setConfirmando(true)
    try {
      const items = recSol.items.map((it: any) => ({ id: it.id, cantidad_recibida: Number(recib[it.id] || 0) }))
      const r = await fetch('/api/portal/aldea/recepcion', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ solicitud_id: recSol.id, items, notas: notasRec }) })
      const d = await r.json()
      if (!r.ok) { alert(d.error || 'No se pudo confirmar.'); setConfirmando(false); return }
      setRecSol(null); setVista('pedidos'); cargarPedidos(sucursal)
      if (sucursal) cargarStock(sucursal)
    } catch { alert('Sin conexión.') }
    setConfirmando(false)
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
  const cartUnid = stock.reduce((s, i) => s + (cart[i.product_id] || 0) * (i.unidades_por_caja || 1), 0)
  const cartNeto = stock.reduce((s, i) => s + (Number(i.precio_caja) || 0) * (cart[i.product_id] || 0), 0)
  const cartIva = Math.round(cartNeto * 0.19)
  const cartTotal = cartNeto > 0 ? cartNeto + cartIva + 3500 : 0
  // Pedible = disponible en el catálogo Y con precio configurado (el local pide para reponer, sin depender del stock local).
  // "Próximamente" (disponible=false) o "Precio pendiente" (sin precio) → visible pero NO pedible.
  const pedible = (i: StockItem) => i.disponible && i.precio_caja != null
  const TITULO: Record<string, string> = { stock: 'Mi Stock', pedir: 'Nueva solicitud', pedidos: 'Pedidos', recepcion: 'Confirmar recepción', incidencias: 'Incidencias y consultas', facturas: 'Facturación' }
  const factVis = facts.filter((f: any) => factFiltro === 'todas' || (factFiltro === 'pagada' ? f.estado_real === 'pagada' : factFiltro === 'vencida' ? f.estado_real === 'vencida' : f.estado_real === 'por_pagar'))
  // Inicio: derivados para el seguimiento y los contadores
  const ACTIVO_PED = (e: string) => !['entregada', 'entregada_diferencias', 'cancelada'].includes(e)
  const pedidosActivos = pedidos.filter(p => ACTIVO_PED(p.estado)).length
  const proximoPedido = pedidos.find(p => ACTIVO_PED(p.estado)) || pedidos[0] || null
  const incAbiertas = incs.filter((i: any) => !['resuelta', 'cerrada'].includes(i.estado)).length
  const factPend = facts.filter((f: any) => f.estado_real !== 'pagada').length

  return (
    <div className="max-w-md mx-auto pb-24">
      <header className="bg-[#16233f] text-white px-5 pt-6 pb-5 rounded-b-3xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {vista !== 'inicio'
              ? <button onClick={() => setVista(vista === 'recepcion' ? 'pedidos' : 'inicio')} className="w-9 h-9 rounded-lg bg-white/10 grid place-items-center"><ArrowLeft size={17} /></button>
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
        <div className="px-5 pt-4 space-y-4">
          {/* Pedido en curso + seguimiento */}
          {proximoPedido && ACTIVO_PED(proximoPedido.estado) ? (() => {
            const stage = STAGE_OF[proximoPedido.estado] ?? 0
            const est = EST_PED[proximoPedido.estado] || { l: proximoPedido.estado, c: 'bg-gray-100 text-gray-600' }
            return (
              <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-[11px] uppercase font-bold tracking-wide text-gray-400">Pedido en curso</p>
                    <p className="font-bold text-[#16233f]">{proximoPedido.folio}</p>
                  </div>
                  <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${est.c}`}>{est.l}</span>
                </div>
                <div className="flex">
                  {STAGES.map((st, idx) => (
                    <div key={st.k} className="flex-1 flex flex-col items-center">
                      <div className="flex items-center w-full">
                        <div className={`h-0.5 flex-1 ${idx === 0 ? 'bg-transparent' : idx <= stage ? 'bg-[#c9a24e]' : 'bg-gray-200'}`} />
                        <div className={`w-7 h-7 rounded-full grid place-items-center shrink-0 ${idx <= stage ? 'bg-[#c9a24e] text-white' : 'bg-gray-100 text-gray-300'}`}><st.icon size={14} /></div>
                        <div className={`h-0.5 flex-1 ${idx === STAGES.length - 1 ? 'bg-transparent' : idx < stage ? 'bg-[#c9a24e]' : 'bg-gray-200'}`} />
                      </div>
                      <span className={`mt-1.5 text-[10px] font-semibold text-center ${idx <= stage ? 'text-[#16233f]' : 'text-gray-400'}`}>{st.k}</span>
                    </div>
                  ))}
                </div>
                {proximoPedido.estado === 'en_ruta' && proximoPedido.chofer_nombre && (
                  <p className="mt-3 text-xs text-gray-500 flex items-center gap-1.5"><Truck size={13} className="text-[#c9a24e]" /> En ruta con {proximoPedido.chofer_nombre}{proximoPedido.hora_estimada ? ` · llega ~${proximoPedido.hora_estimada}` : ''}</p>
                )}
                <button onClick={() => { setAbierto(proximoPedido.id); setVista('pedidos') }} className="mt-3 w-full text-center text-xs font-bold text-[#c9a24e] py-2">Ver detalle del pedido →</button>
              </div>
            )
          })() : (
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm text-center">
              <Truck className="w-8 h-8 text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No tienes pedidos en curso.</p>
              <button onClick={() => setVista('pedir')} className="mt-3 inline-flex items-center gap-1.5 bg-[#c9a24e] hover:bg-[#b8923f] text-[#16233f] font-bold text-xs px-4 py-2 rounded-xl"><PlusCircle size={14} /> Nueva solicitud</button>
            </div>
          )}

          {/* Contadores */}
          <div className="grid grid-cols-3 gap-3">
            <button onClick={() => setVista('pedidos')} className="bg-white rounded-2xl border border-gray-100 p-3.5 shadow-sm text-left hover:border-[#c9a24e]">
              <Truck size={16} className="text-[#c9a24e] mb-1.5" />
              <p className="text-2xl font-bold text-[#16233f] leading-none" style={{ fontFamily: 'Georgia, serif' }}>{pedidosActivos}</p>
              <p className="text-[11px] text-gray-400 mt-1 leading-tight">Pedidos activos</p>
            </button>
            <button onClick={() => setVista('facturas')} className="bg-white rounded-2xl border border-gray-100 p-3.5 shadow-sm text-left hover:border-[#c9a24e]">
              <Receipt size={16} className="text-[#c9a24e] mb-1.5" />
              <p className="text-2xl font-bold text-[#16233f] leading-none" style={{ fontFamily: 'Georgia, serif' }}>{factPend}</p>
              <p className="text-[11px] text-gray-400 mt-1 leading-tight">Facturas pend.</p>
            </button>
            <button onClick={() => { setIncFiltro('todas'); setVista('incidencias') }} className="bg-white rounded-2xl border border-gray-100 p-3.5 shadow-sm text-left hover:border-[#c9a24e]">
              <AlertTriangle size={16} className="text-[#c9a24e] mb-1.5" />
              <p className="text-2xl font-bold text-[#16233f] leading-none" style={{ fontFamily: 'Georgia, serif' }}>{incAbiertas}</p>
              <p className="text-[11px] text-gray-400 mt-1 leading-tight">Incidencias</p>
            </button>
          </div>

          {/* Accesos */}
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400 mb-2">Accesos</p>
            <div className="grid grid-cols-2 gap-3">
              {MODULOS.map(m => (
                <button key={m.k} onClick={() => m.on && abrirModulo(m.k)}
                  className={`text-left bg-white rounded-2xl border border-gray-100 p-4 shadow-sm ${m.on ? 'hover:border-[#c9a24e] cursor-pointer' : 'opacity-70 cursor-default'}`}>
                  <div className={`w-9 h-9 rounded-xl grid place-items-center mb-2 ${m.on ? 'bg-[#c9a24e] text-white' : 'bg-[#f5f0e8] text-[#c9a24e]'}`}><m.icon size={18} /></div>
                  <p className="font-semibold text-sm text-[#1a1a1a]">{m.label}</p>
                  <p className="text-[11px] text-gray-400">{m.desc}</p>
                </button>
              ))}
            </div>
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

      {/* PRODUCTOS / NUEVA SOLICITUD */}
      {vista === 'pedir' && (
        <div className="px-5 pt-4">
          <p className="text-sm text-gray-500 mb-3">Catálogo autorizado para Aldea. Elige cuántas cajas necesitas.</p>
          {stockLoading ? <div className="py-12 text-center"><Loader2 className="w-5 h-5 text-[#1b2a4a] animate-spin mx-auto" /></div>
            : stock.length === 0 ? <div className="bg-white rounded-2xl border border-gray-100 py-12 text-center text-gray-400 text-sm">Sin catálogo autorizado para esta sucursal.</div>
            : [...new Set(stock.map(i => i.categoria || 'Otros'))].map(categoria => (
              <div key={categoria} className="mb-4">
                <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400 mb-2 px-1">{categoria}</p>
                <div className="bg-white rounded-2xl border border-gray-100 px-4 shadow-sm">
                  {stock.filter(i => (i.categoria || 'Otros') === categoria).map(i => {
                    const puede = pedible(i)
                    const cajas = cart[i.product_id] || 0
                    const porcaja = i.unidades_por_caja || 1
                    return (
                    <div key={i.product_id} className={`py-3 border-t border-gray-50 first:border-0 ${puede ? '' : 'opacity-70'}`}>
                      <div className="flex items-center gap-3">
                        <div className="w-14 h-14 rounded-xl bg-[#f5f0e8] grid place-items-center overflow-hidden flex-none">{i.imagen_url ? <img src={i.imagen_url} alt="" className="w-full h-full object-cover" /> : <Package size={18} className="text-[#c9a24e]" />}</div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-[#1a1a1a] leading-tight">{i.nombre}</p>
                          <p className="text-[11px] text-gray-400 mt-0.5">{i.unidad_venta === 'caja' ? `Caja × ${porcaja}` : i.unidad_venta}</p>
                          {i.precio_caja != null
                            ? <p className="text-[13px] font-bold text-[#16233f] mt-0.5">{clp(i.precio_caja)} <span className="font-medium text-gray-400 text-[10px]">/ {i.unidad_venta}{i.precio_unitario != null && porcaja > 1 ? ` · ${clp(i.precio_unitario)} un.` : ''}</span></p>
                            : <p className="text-[11px] text-amber-600 mt-0.5">Precio pendiente</p>}
                        </div>
                      </div>
                      <div className="flex items-center justify-end mt-2.5">
                        {puede ? (
                          <div className="inline-flex items-center gap-1.5 border border-gray-200 rounded-lg px-1.5 py-1 flex-none">
                            <button onClick={() => setQty(i.product_id, -1)} className="w-7 h-7 rounded-md bg-gray-50 text-[#16233f] grid place-items-center"><Minus size={14} /></button>
                            <div className="text-center min-w-[54px] leading-none">
                              <input type="number" inputMode="numeric" min={0} value={cart[i.product_id] ?? ''} placeholder="0" onChange={ev => setQtyDirect(i.product_id, ev.target.value)}
                                className="w-full text-center text-sm font-bold tabular-nums border-0 outline-none bg-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                              <small className="block text-[9px] text-gray-400 font-semibold">{cajas > 0 ? `${cajas} caja${cajas !== 1 ? 's' : ''} · ${cajas * porcaja} un.` : 'cajas'}</small>
                            </div>
                            <button onClick={() => setQty(i.product_id, 1)} className="w-7 h-7 rounded-md bg-[#c9a24e] text-white grid place-items-center"><Plus size={14} /></button>
                          </div>
                        ) : i.disponible
                          ? <span className="text-[11px] font-bold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">Precio pendiente</span>
                          : <span className="text-[11px] font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full">Próximamente</span>}
                      </div>
                    </div>
                  )})}
                </div>
              </div>
            ))}
          {cartCount > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm mb-4">
              <p className="text-[11px] font-bold uppercase text-gray-400 mb-2">Total estimado</p>
              <div className="flex justify-between text-sm py-0.5"><span className="text-gray-500">Neto ({cartCount} caja{cartCount !== 1 ? 's' : ''} · {cartUnid} un.)</span><span>{clp(cartNeto)}</span></div>
              <div className="flex justify-between text-sm py-0.5"><span className="text-gray-500">IVA 19%</span><span>{clp(cartIva)}</span></div>
              <div className="flex justify-between text-sm py-0.5"><span className="text-gray-500">Despacho (RM)</span><span>{clp(3500)}</span></div>
              <div className="flex justify-between text-base font-bold text-[#16233f] border-t border-gray-100 mt-1.5 pt-2"><span>Total estimado</span><span>{clp(cartTotal)}</span></div>
            </div>
          )}
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
            {enviando ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />} Enviar pedido{cartTotal > 0 ? ` · ${clp(cartTotal)}` : ''}
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
                    {p.total != null && <p className="text-sm font-bold text-[#16233f] mt-1">{clp(p.total)} <span className="text-[10px] font-medium text-gray-400">estimado</span></p>}
                  </button>
                  {open && (
                    <div className="px-4 pb-4">
                      {['listo_despacho', 'en_ruta'].includes(p.estado) && (
                        <div className="mb-3 rounded-2xl border border-gray-100 overflow-hidden">
                          <div className="p-3 bg-[#f7f4ec]">
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <span className="text-xs font-bold text-[#16233f]">🚚 Seguimiento del despacho</span>
                              {p.hora_estimada && <span className="text-[11px] font-semibold text-[#c9a24e]">Llega ~{p.hora_estimada}</span>}
                            </div>
                            <div className="flex items-center gap-1 mb-1">
                              {['Preparando', 'En ruta', 'Próximo', 'Entregado'].map((st, i) => {
                                const idx = p.estado === 'en_ruta' ? 1 : 0
                                const done = i <= idx
                                return <div key={st} className="flex-1 flex flex-col items-center gap-1">
                                  <div className={`h-1.5 w-full rounded-full ${done ? 'bg-[#c9a24e]' : 'bg-gray-200'}`} />
                                  <span className={`text-[9px] ${done ? 'text-[#16233f] font-semibold' : 'text-gray-400'}`}>{st}</span>
                                </div>
                              })}
                            </div>
                            {(p.chofer_nombre || p.chofer_telefono) && (
                              <div className="flex items-center justify-between mt-2 text-xs">
                                <span className="text-gray-600">Chofer: <b className="text-[#16233f]">{p.chofer_nombre || '—'}</b></span>
                                {p.chofer_telefono && <a href={`tel:${p.chofer_telefono}`} className="font-semibold text-[#c9a24e]">📞 {p.chofer_telefono}</a>}
                              </div>
                            )}
                          </div>
                          {p.estado === 'en_ruta' && (
                            <div className="relative h-40 bg-[#dfe6ec]">
                              <svg viewBox="0 0 390 160" preserveAspectRatio="none" className="absolute inset-0 w-full h-full"><g stroke="rgba(255,255,255,.7)" strokeWidth="6" fill="none"><path d="M-10 45 H400" /><path d="M-10 110 H400" /><path d="M120 -10 V170" /><path d="M270 -10 V170" /></g><path d="M120 110 L120 45 L270 45" stroke="#c9a24e" strokeWidth="3.5" strokeDasharray="6 5" fill="none" /></svg>
                              <div className="absolute" style={{ left: '30%', top: '62%', fontSize: 20 }}>🚚</div>
                              <div className="absolute" style={{ right: '28%', top: '22%', fontSize: 22 }}>📍</div>
                              <div className="absolute left-2 bottom-2 bg-white/90 rounded-lg px-2.5 py-1 text-[10px] text-gray-600">Tu local</div>
                            </div>
                          )}
                          <p className="text-[10px] text-gray-400 px-3 py-2 flex items-center gap-1.5"><Clock size={11} /> La ubicación en vivo del chofer se activa durante la ruta (se conecta con el chofer real).</p>
                        </div>
                      )}
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
                      {RECIBIBLE.includes(p.estado)
                        ? <button onClick={() => abrirRecepcion(p)} className="mt-3 w-full bg-[#16233f] hover:bg-[#1b2a4a] text-white font-semibold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2"><PackageCheck size={16} /> Confirmar recepción</button>
                        : <p className="text-[11px] text-gray-400 mt-2">La Central irá completando aprobado, preparado y despachado. Al recibir, tú confirmas lo recibido.</p>}
                    </div>
                  )}
                </div>)})}
            </div>}
        </div>
      )}

      {/* CONFIRMAR RECEPCIÓN */}
      {vista === 'recepcion' && recSol && (
        <div className="px-5 pt-4">
          <div className="bg-[#faf7ef] border border-[#e7d4a6] rounded-xl p-3 text-sm text-[#5a4a24] mb-3">
            Pedido <b>{recSol.folio}</b>. Ingresa lo que <b>realmente recibiste</b> por producto. El stock del local sube por lo recibido.
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 px-4 shadow-sm mb-3">
            {recSol.items.map((it: any) => {
              const desp = it.cantidad_despachada ?? it.cantidad_solicitada ?? 0
              const val = Number(recib[it.id] || 0)
              const dif = it.cantidad_despachada != null && val !== Number(it.cantidad_despachada)
              return (
                <div key={it.id} className="py-3 border-t border-gray-50 first:border-0">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0"><p className="font-semibold text-sm text-[#1a1a1a] truncate">{it.producto_nombre || 'Producto'}</p><p className="text-[11px] text-gray-400">Despachado: {desp} {it.unidad}</p></div>
                    <input type="number" inputMode="numeric" min={0} value={recib[it.id] ?? ''} onChange={e => setRecib(r => ({ ...r, [it.id]: e.target.value.replace(/[^0-9]/g, '') }))}
                      className="w-16 text-center font-bold border border-gray-200 rounded-lg py-2 tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none" />
                  </div>
                  {dif && <p className="text-[11px] text-red-600 font-semibold mt-1">Diferencia {val - Number(it.cantidad_despachada) > 0 ? '+' : ''}{val - Number(it.cantidad_despachada)} → generará incidencia</p>}
                </div>
              )
            })}
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm mb-3">
            <label className="block text-xs font-semibold text-gray-600 mb-1">Comentario / problema (opcional)</label>
            <textarea value={notasRec} onChange={e => setNotasRec(e.target.value)} rows={2} placeholder="Ej: llegó 1 caja con envase roto" className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm" />
          </div>
          <button onClick={confirmarRecepcion} disabled={confirmando} className="w-full bg-[#16233f] hover:bg-[#1b2a4a] text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-60">
            {confirmando ? <Loader2 size={18} className="animate-spin" /> : <PackageCheck size={18} />} Confirmar recepción · sube al stock
          </button>
        </div>
      )}

      {/* INCIDENCIAS Y CONSULTAS */}
      {vista === 'incidencias' && (
        <div className="px-5 pt-4">
          {!repOpen
            ? <button onClick={() => setRepOpen(true)} className="w-full mb-4 bg-[#c9a24e] hover:bg-[#b8923f] text-[#16233f] font-bold py-2.5 rounded-xl flex items-center justify-center gap-2"><Plus size={17} /> Reportar / consultar</button>
            : <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm mb-4 space-y-3">
                <div className="flex items-center justify-between"><h3 className="font-bold text-sm text-[#16233f]">Nuevo reporte</h3><button onClick={() => setRepOpen(false)} className="text-gray-400 text-xl leading-none">×</button></div>
                <div><label className="block text-xs font-semibold text-gray-600 mb-1">Tipo</label>
                  <select value={repTipo} onChange={e => setRepTipo(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white">
                    {TIPO_OPCIONES.map(t => <option key={t} value={t}>{TIPO_INC[t] || t}</option>)}
                  </select></div>
                <div><label className="block text-xs font-semibold text-gray-600 mb-1">Descripción</label>
                  <textarea value={repDesc} onChange={e => setRepDesc(e.target.value)} rows={3} placeholder="Cuéntanos qué pasó o qué necesitas consultar…" className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm" /></div>
                <button onClick={enviarIncidencia} disabled={reportando || !repDesc.trim()} className="w-full bg-[#16233f] text-white font-semibold py-2.5 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50">{reportando ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Enviar</button>
              </div>}

          <div className="flex gap-2 overflow-x-auto pb-2">
            {([['todas', 'Todas'], ['incidencia', 'Incidencias'], ['consulta', 'Consultas']] as const).map(([k, l]) => (
              <button key={k} onClick={() => setIncFiltro(k)} className={`text-xs font-semibold whitespace-nowrap px-3 py-1.5 rounded-full border ${incFiltro === k ? 'bg-[#16233f] text-white border-[#16233f]' : 'bg-white text-gray-500 border-gray-200'}`}>{l}</button>
            ))}
          </div>
          {(() => { const incVis = incs.filter(i => incFiltro === 'todas' ? true : incFiltro === 'consulta' ? i.tipo === 'consulta' : i.tipo !== 'consulta'); return (
          incLoading ? <div className="py-12 text-center"><Loader2 className="w-5 h-5 text-[#1b2a4a] animate-spin mx-auto" /></div>
            : incVis.length === 0 ? <div className="bg-white rounded-2xl border border-gray-100 py-12 text-center text-gray-400 text-sm"><MessageCircle className="w-8 h-8 text-gray-200 mx-auto mb-2" />{incFiltro === 'consulta' ? 'Sin consultas.' : incFiltro === 'incidencia' ? 'Sin incidencias.' : 'Sin incidencias ni consultas.'}</div>
            : <div className="space-y-3">
              {incVis.map(i => { const e = EST_INC[i.estado] || { l: i.estado, c: 'bg-gray-100 text-gray-600' }; return (
                <div key={i.id} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-semibold text-sm text-[#16233f]">{TIPO_INC[i.tipo] || i.tipo}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${e.c}`}>{e.l}</span>
                  </div>
                  <p className="text-xs text-gray-600">{i.descripcion}</p>
                  <p className="text-[10px] text-gray-400 mt-1">{fFecha(i.created_at)}</p>
                  {i.respuesta_central && <div className="mt-2 bg-[#faf7ef] border border-[#e7d4a6] rounded-lg p-2.5 text-xs text-[#5a4a24]"><b>NOMMA respondió:</b> {i.respuesta_central}</div>}
                </div>)})}
            </div>) })()}
        </div>
      )}

      {/* FACTURACIÓN */}
      {vista === 'facturas' && (
        <div className="px-5 pt-4">
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="bg-white rounded-2xl border border-gray-100 p-3.5 shadow-sm"><p className="text-[11px] uppercase font-bold text-gray-400">Por pagar</p><p className="font-bold text-xl text-[#16233f]" style={{ fontFamily: 'Georgia, serif' }}>{clp(factRes.por_pagar || 0)}</p></div>
            <div className="bg-white rounded-2xl border border-gray-100 p-3.5 shadow-sm"><p className="text-[11px] uppercase font-bold text-gray-400">Vencidas</p><p className="font-bold text-xl text-red-600" style={{ fontFamily: 'Georgia, serif' }}>{clp(factRes.vencidas || 0)}</p><p className="text-[11px] text-gray-400">{factRes.n_vencidas || 0} factura{(factRes.n_vencidas || 0) !== 1 ? 's' : ''}</p></div>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {[['todas', 'Todas'], ['por_pagar', 'Por pagar'], ['vencida', 'Vencidas'], ['pagada', 'Pagadas']].map(([k, l]) => (
              <button key={k} onClick={() => setFactFiltro(k)} className={`text-xs font-semibold whitespace-nowrap px-3 py-1.5 rounded-full border ${factFiltro === k ? 'bg-[#16233f] text-white border-[#16233f]' : 'bg-white text-gray-500 border-gray-200'}`}>{l}</button>
            ))}
          </div>
          {factLoad ? <div className="py-12 text-center"><Loader2 className="w-5 h-5 text-[#1b2a4a] animate-spin mx-auto" /></div>
            : factVis.length === 0 ? <div className="bg-white rounded-2xl border border-gray-100 py-12 text-center text-gray-400 text-sm"><Receipt className="w-8 h-8 text-gray-200 mx-auto mb-2" />Sin facturas.</div>
            : <div className="bg-white rounded-2xl border border-gray-100 px-4 shadow-sm">
              {factVis.map((f: any) => { const e = EST_FACT[f.estado_real] || EST_FACT.por_pagar; return (
                <div key={f.id} className="flex items-center gap-3 py-3 border-t border-gray-50 first:border-0">
                  <div className="w-10 h-10 rounded-xl bg-[#f5f0e8] grid place-items-center flex-none"><Receipt size={17} className="text-[#c9a24e]" /></div>
                  <div className="flex-1 min-w-0"><p className="font-semibold text-sm text-[#1a1a1a]">Factura {f.numero || 's/n'}</p><p className="text-[11px] text-gray-400">{f.fecha_vencimiento ? `Vence ${fFecha(f.fecha_vencimiento)}` : 'Sin vencimiento'}</p></div>
                  <div className="text-right flex-none"><p className="font-bold text-sm text-[#1a1a1a]">{clp(f.monto)}</p><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${e.c}`}>{e.l}</span></div>
                </div>)})}
            </div>}
          <p className="text-[11px] text-gray-400 mt-3">Facturas emitidas por NOMMA FOOD. El pago se coordina con la Central.</p>
        </div>
      )}
    </div>
  )
}
