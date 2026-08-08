'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Sprout, LogOut, Loader2, ChevronDown, ArrowLeft, Package, PlusCircle, Truck, Receipt, AlertTriangle, MessageCircle, Search, Clock } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'

interface Sesion {
  organizacion: { id: string; nombre: string } | null
  rol: 'admin_general' | 'encargado_local'
  rol_label: string
  usuario: { nombre: string; email: string }
  sucursales: { id: string; nombre: string }[]
}
interface StockItem {
  product_id: string; nombre: string; sku: string; unidad: string; categoria: string; imagen_url: string | null
  stock_actual: number; stock_min: number; stock_ideal: number; por_recibir: number; estado: string
}

const MODULOS = [
  { k: 'stock', label: 'Mi Stock', icon: Package, desc: 'Inventario del local', on: true },
  { k: 'pedir', label: 'Nueva solicitud', icon: PlusCircle, desc: 'Pedir reposición', on: false },
  { k: 'pedidos', label: 'Pedidos', icon: Truck, desc: 'Seguimiento y mapa', on: false },
  { k: 'facturas', label: 'Facturación', icon: Receipt, desc: 'Facturas por pagar', on: false },
  { k: 'incidencias', label: 'Incidencias', icon: AlertTriangle, desc: 'Reportes y consultas', on: false },
  { k: 'consultas', label: 'Consultas', icon: MessageCircle, desc: 'Preguntas a NOMMA', on: false },
]

const EST: Record<string, { l: string; c: string }> = {
  ok:         { l: 'Stock OK',      c: 'bg-green-100 text-green-700' },
  bajo:       { l: 'Bajo',          c: 'bg-amber-100 text-amber-700' },
  critico:    { l: 'Crítico',       c: 'bg-red-100 text-red-700' },
  sin_stock:  { l: 'Sin stock',     c: 'bg-gray-200 text-gray-600' },
  reposicion: { l: 'En reposición', c: 'bg-blue-100 text-blue-700' },
}
const FILTROS = [['todos', 'Todos'], ['bajo', 'Bajo'], ['critico', 'Crítico'], ['sin_stock', 'Sin stock'], ['reposicion', 'Reposición']] as const

export default function AldeaDashboard() {
  const router = useRouter()
  const [ses, setSes] = useState<Sesion | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [sucursal, setSucursal] = useState<string>('')
  const [vista, setVista] = useState<'inicio' | 'stock'>('inicio')

  const [stock, setStock] = useState<StockItem[]>([])
  const [stockLoading, setStockLoading] = useState(false)
  const [q, setQ] = useState('')
  const [filtro, setFiltro] = useState<string>('todos')

  useEffect(() => {
    fetch('/api/portal/aldea/session')
      .then(async r => {
        const d = await r.json()
        if (!r.ok) { setError(d.error || 'No autorizado'); return }
        setSes(d)
        if (d.sucursales?.length) setSucursal(d.sucursales[0].id)
      })
      .catch(() => setError('Error de conexión'))
      .finally(() => setLoading(false))
  }, [])

  const cargarStock = useCallback(async (suc: string) => {
    if (!suc) return
    setStockLoading(true)
    try {
      const r = await fetch(`/api/portal/aldea/stock?sucursal=${suc}`)
      const d = await r.json()
      setStock(r.ok ? (d.items || []) : [])
    } catch { setStock([]) }
    setStockLoading(false)
  }, [])

  useEffect(() => { if (vista === 'stock' && sucursal) cargarStock(sucursal) }, [vista, sucursal, cargarStock])

  async function salir() { await supabase.auth.signOut(); router.replace('/portal/aldea/login') }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-6 h-6 text-[#1b2a4a] animate-spin" /></div>

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-5">
        <div className="bg-white rounded-2xl shadow p-7 text-center max-w-sm">
          <Sprout className="w-8 h-8 text-[#c9a24e] mx-auto mb-3" />
          <p className="font-semibold text-[#16233f] mb-1">Acceso no disponible</p>
          <p className="text-sm text-gray-500 mb-4">{error}</p>
          <button onClick={salir} className="text-sm font-semibold text-[#c9a24e]">Cambiar de cuenta</button>
        </div>
      </div>
    )
  }

  const esAdmin = ses?.rol === 'admin_general'
  const sucNombre = ses?.sucursales.find(s => s.id === sucursal)?.nombre || '—'
  const visibles = stock.filter(i => (filtro === 'todos' || i.estado === filtro) && (!q || i.nombre.toLowerCase().includes(q.toLowerCase()) || i.sku.toLowerCase().includes(q.toLowerCase())))

  return (
    <div className="max-w-md mx-auto pb-16">
      {/* Header */}
      <header className="bg-[#16233f] text-white px-5 pt-6 pb-5 rounded-b-3xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {vista !== 'inicio'
              ? <button onClick={() => setVista('inicio')} className="w-9 h-9 rounded-lg bg-white/10 grid place-items-center"><ArrowLeft size={17} /></button>
              : <div className="w-9 h-9 rounded-lg bg-[#c9a24e] text-[#16233f] grid place-items-center font-bold" style={{ fontFamily: 'Georgia, serif' }}>A</div>}
            <div>
              <p className="font-bold text-sm leading-tight">{vista === 'stock' ? 'Mi Stock' : (ses?.organizacion?.nombre || 'Aldea Vegetal')}</p>
              <p className="text-[11px] text-white/60">{vista === 'stock' ? sucNombre : 'Portal de abastecimiento'}</p>
            </div>
          </div>
          <button onClick={salir} className="w-9 h-9 rounded-lg bg-white/10 grid place-items-center" title="Salir"><LogOut size={16} /></button>
        </div>

        <div className="mt-4 flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-[#c9a24e]/20 text-[#c9a24e]">{ses?.rol_label}</span>
          {ses && ses.sucursales.length > 0 && (
            esAdmin ? (
              <div className="inline-flex items-center gap-1.5 bg-white/10 border border-white/15 rounded-full pl-3 pr-2 py-1">
                <span className="text-xs">📍</span>
                <select value={sucursal} onChange={e => setSucursal(e.target.value)} className="bg-transparent text-white text-xs font-semibold outline-none">
                  {ses.sucursales.map(s => <option key={s.id} value={s.id} className="text-black">{s.nombre}</option>)}
                </select>
                <ChevronDown size={13} className="text-white/60" />
              </div>
            ) : (
              <span className="inline-flex items-center gap-1.5 bg-white/10 border border-white/15 rounded-full px-3 py-1 text-xs font-semibold">📍 {sucNombre}</span>
            )
          )}
        </div>
        {vista === 'inicio' && <p className="text-xs text-white/70 mt-3">Hola, {ses?.usuario.nombre.split(' ')[0]} 👋</p>}
      </header>

      {/* ===== INICIO ===== */}
      {vista === 'inicio' && (
        <>
          <div className="px-5 pt-4">
            <div className="bg-[#faf7ef] border border-[#e7d4a6] rounded-xl p-3.5 text-sm text-[#5a4a24]">
              <b>Portal en construcción.</b> Ya está activo <b>Mi Stock</b>{esAdmin ? ` (ves las ${ses?.sucursales.length} sucursales)` : ''}. El resto de módulos se irá activando por partes.
            </div>
          </div>
          <div className="px-5 pt-4">
            <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400 mb-2">Módulos</p>
            <div className="grid grid-cols-2 gap-3">
              {MODULOS.map(m => (
                <button key={m.k} onClick={() => m.on && m.k === 'stock' && setVista('stock')}
                  className={`text-left bg-white rounded-2xl border border-gray-100 p-4 shadow-sm ${m.on ? 'hover:border-[#c9a24e] cursor-pointer' : 'opacity-70 cursor-default'}`}>
                  <div className={`w-9 h-9 rounded-xl grid place-items-center mb-2 ${m.on ? 'bg-[#c9a24e] text-white' : 'bg-[#f5f0e8] text-[#c9a24e]'}`}><m.icon size={18} /></div>
                  <p className="font-semibold text-sm text-[#1a1a1a]">{m.label}</p>
                  <p className="text-[11px] text-gray-400">{m.desc}</p>
                  <span className={`inline-block mt-2 text-[10px] font-bold px-2 py-0.5 rounded-full ${m.on ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>{m.on ? 'Activo' : 'Próximamente'}</span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ===== MI STOCK ===== */}
      {vista === 'stock' && (
        <div className="px-5 pt-4">
          <div className="relative mb-2">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar producto o SKU…" className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#c9a24e]" />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {FILTROS.map(([k, l]) => (
              <button key={k} onClick={() => setFiltro(k)} className={`text-xs font-semibold whitespace-nowrap px-3 py-1.5 rounded-full border ${filtro === k ? 'bg-[#16233f] text-white border-[#16233f]' : 'bg-white text-gray-500 border-gray-200'}`}>{l}</button>
            ))}
          </div>

          {stockLoading ? (
            <div className="py-12 text-center"><Loader2 className="w-5 h-5 text-[#1b2a4a] animate-spin mx-auto" /></div>
          ) : visibles.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 py-12 text-center text-gray-400 text-sm">
              <Package className="w-8 h-8 text-gray-200 mx-auto mb-2" />
              {stock.length === 0 ? 'Aún no hay stock cargado para esta sucursal.' : 'Sin productos con ese filtro.'}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 px-4 shadow-sm">
              {visibles.map(i => {
                const e = EST[i.estado] || EST.ok
                return (
                  <div key={i.product_id} className="flex items-center gap-3 py-3 border-t border-gray-50 first:border-0">
                    <div className="w-11 h-11 rounded-xl bg-[#f5f0e8] grid place-items-center overflow-hidden flex-none">
                      {i.imagen_url ? <img src={i.imagen_url} alt="" className="w-full h-full object-cover" /> : <Package size={18} className="text-[#c9a24e]" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-[#1a1a1a] truncate">{i.nombre}</p>
                      <p className="text-[11px] text-gray-400">{i.sku ? i.sku + ' · ' : ''}{i.unidad} · actual {i.stock_actual} / mín {i.stock_min} / ideal {i.stock_ideal}
                        {i.por_recibir > 0 && <span className="text-blue-600"> · llegan {i.por_recibir}</span>}</p>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-none ${e.c}`}>{e.l}</span>
                  </div>
                )
              })}
            </div>
          )}
          <p className="text-[11px] text-gray-400 mt-3 flex items-center gap-1.5"><Clock size={12} /> El stock refleja lo del local. Cuando se conecte Bsale, se actualizará solo con cada venta.</p>
        </div>
      )}
    </div>
  )
}
