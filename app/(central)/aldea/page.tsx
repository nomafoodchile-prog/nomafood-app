'use client'

import { useState, useEffect, useCallback } from 'react'
import { Loader2, Sprout, ChevronDown, Check, Store, MessageCircle, ClipboardList, Users, UserPlus, Copy, Receipt, ShieldCheck } from 'lucide-react'

interface Item { id: string; producto_nombre: string; unidad: string; cantidad_solicitada: number; cantidad_aprobada: number | null; cantidad_preparada: number | null; cantidad_despachada: number | null; cantidad_recibida: number | null }
interface Sol { id: string; folio: string; sucursal: string; estado: string; prioridad: string; fecha_requerida: string | null; observaciones: string | null; chofer_nombre: string | null; chofer_telefono: string | null; hora_estimada: string | null; created_at: string; items: Item[] }

const EST: Record<string, { l: string; c: string }> = {
  solicitud_enviada: { l: 'Enviada', c: 'bg-blue-100 text-blue-700' }, en_revision: { l: 'En revisión', c: 'bg-amber-100 text-amber-700' },
  aprobada: { l: 'Aprobada', c: 'bg-teal-100 text-teal-700' }, en_preparacion: { l: 'En preparación', c: 'bg-amber-100 text-amber-700' },
  en_picking: { l: 'En picking', c: 'bg-amber-100 text-amber-700' }, listo_despacho: { l: 'Listo despacho', c: 'bg-amber-100 text-amber-700' },
  en_ruta: { l: 'En ruta', c: 'bg-blue-100 text-blue-700' }, entregada: { l: 'Entregada', c: 'bg-green-100 text-green-700' },
  entregada_diferencias: { l: 'Con diferencias', c: 'bg-red-100 text-red-700' }, cancelada: { l: 'Cancelada', c: 'bg-gray-100 text-gray-500' },
}
const ESTADOS_SEL = ['solicitud_enviada', 'en_revision', 'aprobada', 'en_preparacion', 'en_picking', 'listo_despacho', 'en_ruta', 'entregada', 'cancelada']
const fFecha = (s: string | null) => s ? new Date(s + (s.length <= 10 ? 'T00:00:00' : '')).toLocaleDateString('es-CL') : '—'
const TIPO_INC: Record<string, string> = { diferencia_recepcion: 'Diferencia de recepción', pedido_incompleto: 'Pedido incompleto', producto_danado: 'Producto dañado', producto_incorrecto: 'Producto incorrecto', cantidad: 'Cantidad incorrecta', calidad: 'Calidad', temperatura: 'Temperatura', atraso: 'Atraso', chofer: 'Chofer', falta_stock: 'Falta de stock', consulta: 'Consulta', otro: 'Otro' }
const EST_INC: Record<string, { l: string; c: string }> = { nueva: { l: 'Nueva', c: 'bg-blue-100 text-blue-700' }, en_revision: { l: 'En revisión', c: 'bg-amber-100 text-amber-700' }, en_solucion: { l: 'En solución', c: 'bg-amber-100 text-amber-700' }, resuelta: { l: 'Resuelta', c: 'bg-green-100 text-green-700' }, cerrada: { l: 'Cerrada', c: 'bg-gray-100 text-gray-500' } }
const EST_INC_SEL = ['nueva', 'en_revision', 'en_solucion', 'resuelta', 'cerrada']
const clp = (n: number) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n || 0)
const EST_FACT: Record<string, { l: string; c: string }> = { por_pagar: { l: 'Por pagar', c: 'bg-amber-100 text-amber-700' }, vencida: { l: 'Vencida', c: 'bg-red-100 text-red-700' }, pagada: { l: 'Pagada', c: 'bg-green-100 text-green-700' } }
const EST_RSV: Record<string, { l: string; c: string; bar: string }> = { normal: { l: 'Normal', c: 'bg-green-100 text-green-700', bar: '#2f7a54' }, reponer: { l: 'Reponer pronto', c: 'bg-amber-100 text-amber-700', bar: '#b0801f' }, critico: { l: 'Crítico', c: 'bg-red-100 text-red-700', bar: '#b23b3b' } }

export default function AldeaCentralPage() {
  const [sols, setSols] = useState<Sol[]>([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState('todos')
  const [abierto, setAbierto] = useState<string | null>(null)
  const [draft, setDraft] = useState<Record<string, { estado: string; cn: string; ct: string; he: string; items: Record<string, { a: string; p: string; d: string }> }>>({})
  const [guardando, setGuardando] = useState<string | null>(null)
  const [tab, setTab] = useState<'resumen' | 'solicitudes' | 'reserva' | 'incidencias' | 'usuarios' | 'facturas'>('resumen')
  const [rsv, setRsv] = useState<any>({ items: [], organizacion_id: null, alertas: 0 }); const [rsvLoad, setRsvLoad] = useState(true)
  const [rDraft, setRDraft] = useState<Record<string, any>>({}); const [guardR, setGuardR] = useState<string | null>(null)

  const cargarReserva = useCallback(async () => {
    setRsvLoad(true)
    try {
      const r = await fetch('/api/central/aldea/reserva'); const d = await r.json()
      if (r.ok) {
        setRsv(d)
        const dr: Record<string, any> = {}
        for (const it of d.items || []) dr[it.product_id] = { objetivo: String(it.objetivo), minimo: String(it.minimo), critico: String(it.critico), fisico: String(it.fisico), comprometido: String(it.comprometido) }
        setRDraft(dr)
      }
    } catch { /* nada */ }
    setRsvLoad(false)
  }, [])
  function setRField(pid: string, campo: string, val: string) { setRDraft(p => ({ ...p, [pid]: { ...p[pid], [campo]: val.replace(/[^0-9]/g, '') } })) }
  async function guardarReserva(it: any) {
    const d = rDraft[it.product_id]; if (!d) return
    setGuardR(it.product_id)
    try {
      const r = await fetch('/api/central/aldea/reserva', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ product_id: it.product_id, organizacion_id: rsv.organizacion_id, ...d }) })
      if (!r.ok) { alert('No se pudo guardar.'); setGuardR(null); return }
      await cargarReserva()
    } catch { alert('Error de conexión.') }
    setGuardR(null)
  }
  const [res, setRes] = useState<any>({ locales: [], consolidado: {} }); const [resLoad, setResLoad] = useState(true)
  const [facts, setFacts] = useState<any[]>([]); const [factLoad, setFactLoad] = useState(true)

  const cargarResumen = useCallback(async () => {
    setResLoad(true)
    try { const r = await fetch('/api/central/aldea/resumen'); const d = await r.json(); if (r.ok) setRes(d) } catch { /* nada */ }
    setResLoad(false)
  }, [])
  const [fForm, setFForm] = useState({ mayorista_id: '', numero: '', monto: '', fecha_emision: '', fecha_vencimiento: '' }); const [creandoF, setCreandoF] = useState(false)

  const cargarFacts = useCallback(async () => {
    setFactLoad(true)
    try { const r = await fetch('/api/central/aldea/facturas'); const d = await r.json(); setFacts(r.ok ? (d.facturas || []) : []) } catch { setFacts([]) }
    setFactLoad(false)
  }, [])
  async function crearFactura(e: React.FormEvent) {
    e.preventDefault(); setCreandoF(true)
    try {
      const r = await fetch('/api/central/aldea/facturas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(fForm) })
      const d = await r.json()
      if (!r.ok) { alert(d.error || 'No se pudo registrar.'); setCreandoF(false); return }
      setFForm(f => ({ ...f, numero: '', monto: '', fecha_emision: '', fecha_vencimiento: '' })); cargarFacts()
    } catch { alert('Error de conexión.') }
    setCreandoF(false)
  }
  async function marcarFactura(id: string, estado: string) {
    try { await fetch('/api/central/aldea/facturas', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, estado }) }); cargarFacts() } catch { alert('Error') }
  }
  const [orgs, setOrgs] = useState<any[]>([]); const [usuarios, setUsuarios] = useState<any[]>([]); const [usrLoad, setUsrLoad] = useState(true)
  const [uForm, setUForm] = useState({ nombre: '', email: '', rol: 'encargado_local', mayorista_id: '', password: '', organizacion_id: '' })
  const [creandoU, setCreandoU] = useState(false); const [okUser, setOkUser] = useState<{ email: string; password: string } | null>(null)

  const cargarUsuarios = useCallback(async () => {
    setUsrLoad(true)
    try {
      const r = await fetch('/api/central/aldea/usuarios'); const d = await r.json()
      if (r.ok) { setOrgs(d.organizaciones || []); setUsuarios(d.usuarios || []); setUForm(f => ({ ...f, organizacion_id: f.organizacion_id || (d.organizaciones?.[0]?.id || '') })) }
    } catch { /* nada */ }
    setUsrLoad(false)
  }, [])
  async function crearUsuario(e: React.FormEvent) {
    e.preventDefault(); setCreandoU(true); setOkUser(null)
    try {
      const r = await fetch('/api/central/aldea/usuarios', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(uForm) })
      const d = await r.json()
      if (!r.ok) { alert(d.error || 'No se pudo crear.'); setCreandoU(false); return }
      setOkUser({ email: d.email, password: uForm.password })
      setUForm(f => ({ ...f, nombre: '', email: '', password: '', mayorista_id: '' }))
      cargarUsuarios()
    } catch { alert('Error de conexión.') }
    setCreandoU(false)
  }
  const [incs, setIncs] = useState<any[]>([]); const [incLoad, setIncLoad] = useState(true); const [incAbiertas, setIncAbiertas] = useState(0)
  const [resp, setResp] = useState<Record<string, string>>({}); const [estInc, setEstInc] = useState<Record<string, string>>({}); const [guardInc, setGuardInc] = useState<string | null>(null)

  const cargarIncs = useCallback(async () => {
    setIncLoad(true)
    try { const r = await fetch('/api/central/aldea/incidencias'); const d = await r.json(); setIncs(r.ok ? (d.incidencias || []) : []); setIncAbiertas(d.abiertas || 0) } catch { setIncs([]) }
    setIncLoad(false)
  }, [])
  async function guardarInc(i: any) {
    setGuardInc(i.id)
    try {
      const r = await fetch('/api/central/aldea/incidencias', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: i.id, respuesta_central: resp[i.id] ?? i.respuesta_central ?? '', estado: estInc[i.id] || i.estado }) })
      if (!r.ok) { alert('No se pudo guardar.'); setGuardInc(null); return }
      await cargarIncs()
    } catch { alert('Error de conexión.') }
    setGuardInc(null)
  }

  const cargar = useCallback(async () => {
    setLoading(true)
    try { const r = await fetch('/api/central/aldea/solicitudes'); const d = await r.json(); setSols(r.ok ? (d.solicitudes || []) : []) }
    catch { setSols([]) }
    setLoading(false)
  }, [])
  useEffect(() => { cargarResumen(); cargar(); cargarIncs(); cargarUsuarios(); cargarFacts(); cargarReserva() }, [cargarResumen, cargar, cargarIncs, cargarUsuarios, cargarFacts, cargarReserva])

  function abrir(s: Sol) {
    if (abierto === s.id) { setAbierto(null); return }
    setAbierto(s.id)
    const items: Record<string, { a: string; p: string; d: string }> = {}
    for (const it of s.items) items[it.id] = {
      a: it.cantidad_aprobada != null ? String(it.cantidad_aprobada) : '',
      p: it.cantidad_preparada != null ? String(it.cantidad_preparada) : '',
      d: it.cantidad_despachada != null ? String(it.cantidad_despachada) : '',
    }
    setDraft(prev => ({ ...prev, [s.id]: { estado: s.estado, cn: s.chofer_nombre || '', ct: s.chofer_telefono || '', he: s.hora_estimada || '', items } }))
  }

  function setField(solId: string, itemId: string, campo: 'a' | 'p' | 'd', val: string) {
    setDraft(prev => ({ ...prev, [solId]: { ...prev[solId], items: { ...prev[solId].items, [itemId]: { ...prev[solId].items[itemId], [campo]: val.replace(/[^0-9]/g, '') } } } }))
  }
  function aprobarTodo(s: Sol) {
    setDraft(prev => {
      const items = { ...prev[s.id].items }
      for (const it of s.items) items[it.id] = { ...items[it.id], a: String(it.cantidad_solicitada) }
      return { ...prev, [s.id]: { ...prev[s.id], items, estado: 'aprobada' } }
    })
  }

  async function guardar(s: Sol) {
    const d = draft[s.id]; if (!d) return
    setGuardando(s.id)
    try {
      const items = s.items.map(it => ({ id: it.id, cantidad_aprobada: d.items[it.id]?.a ?? '', cantidad_preparada: d.items[it.id]?.p ?? '', cantidad_despachada: d.items[it.id]?.d ?? '' }))
      const r = await fetch(`/api/central/aldea/solicitudes/${s.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ estado: d.estado, chofer_nombre: d.cn, chofer_telefono: d.ct, hora_estimada: d.he, items }) })
      if (!r.ok) { const e = await r.json(); alert(e.error || 'No se pudo guardar.'); setGuardando(null); return }
      await cargar()
    } catch { alert('Error de conexión.') }
    setGuardando(null)
  }

  const vis = sols.filter(s => filtro === 'todos' || s.estado === filtro)
  const nuevas = sols.filter(s => s.estado === 'solicitud_enviada').length
  const sucursalesFlat = orgs.flatMap((o: any) => o.sucursales || [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1a1a1a] flex items-center gap-2"><Sprout className="text-[#c9a24e]" size={22} /> Aldea Vegetal</h1>
        <p className="text-sm text-gray-500 mt-0.5">Solicitudes e incidencias de las cafeterías.</p>
      </div>

      {/* Pestañas */}
      <div className="inline-flex items-center gap-1 bg-gray-100 rounded-lg p-1 overflow-x-auto max-w-full">
        <button onClick={() => setTab('resumen')} className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap ${tab === 'resumen' ? 'bg-white text-[#1b2a4a] shadow-sm' : 'text-gray-500'}`}><Store size={14} /> Resumen</button>
        <button onClick={() => setTab('solicitudes')} className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap ${tab === 'solicitudes' ? 'bg-white text-[#1b2a4a] shadow-sm' : 'text-gray-500'}`}><ClipboardList size={14} /> Solicitudes{nuevas ? ` · ${nuevas}` : ''}</button>
        <button onClick={() => setTab('reserva')} className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap ${tab === 'reserva' ? 'bg-white text-[#1b2a4a] shadow-sm' : 'text-gray-500'}`}><ShieldCheck size={14} /> Reserva{rsv.alertas ? ` · ${rsv.alertas}` : ''}</button>
        <button onClick={() => setTab('incidencias')} className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 ${tab === 'incidencias' ? 'bg-white text-[#1b2a4a] shadow-sm' : 'text-gray-500'}`}><MessageCircle size={14} /> Incidencias{incAbiertas ? ` · ${incAbiertas}` : ''}</button>
        <button onClick={() => setTab('usuarios')} className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 ${tab === 'usuarios' ? 'bg-white text-[#1b2a4a] shadow-sm' : 'text-gray-500'}`}><Users size={14} /> Usuarios</button>
        <button onClick={() => setTab('facturas')} className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 ${tab === 'facturas' ? 'bg-white text-[#1b2a4a] shadow-sm' : 'text-gray-500'}`}><Receipt size={14} /> Facturación</button>
      </div>

      {tab === 'resumen' && (
        resLoad ? <div className="py-16 text-center"><Loader2 className="w-6 h-6 text-[#1b2a4a] animate-spin mx-auto" /></div>
        : <div className="space-y-4">
          {/* Consolidado */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { l: 'Solicitudes abiertas', v: res.consolidado?.solicitudes_abiertas ?? 0, c: 'text-[#1b2a4a]' },
              { l: 'Pedidos (total)', v: res.consolidado?.pedidos_total ?? 0, c: 'text-[#1b2a4a]' },
              { l: 'Con diferencias', v: res.consolidado?.diferencias ?? 0, c: 'text-amber-600' },
              { l: 'Incidencias abiertas', v: res.consolidado?.incidencias_abiertas ?? 0, c: 'text-red-600' },
              { l: 'Stock crítico', v: res.consolidado?.stock_critico ?? 0, c: 'text-red-600' },
              { l: 'Por cobrar', v: clp(res.consolidado?.facturas_por_pagar ?? 0), c: 'text-[#c9a24e]', small: true },
            ].map((k, i) => (
              <div key={i} className="noma-card !p-3.5">
                <p className="text-[10px] uppercase font-bold text-gray-400">{k.l}</p>
                <p className={`font-bold ${k.small ? 'text-lg' : 'text-2xl'} ${k.c}`} style={{ fontFamily: 'Georgia, serif' }}>{k.v}</p>
              </div>
            ))}
          </div>
          {/* Por sucursal */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {(res.locales || []).map((l: any) => (
              <div key={l.id} className="noma-card !p-0 overflow-hidden">
                <div className="bg-[#1b2a4a] text-white px-4 py-3 flex items-center gap-2"><Store size={15} className="text-[#c9a24e]" /><span className="font-bold text-sm">{l.nombre}</span></div>
                <div className="p-4 space-y-2.5 text-sm">
                  <div className="flex items-center justify-between"><span className="text-gray-500">Stock crítico</span><span className={`font-bold ${l.stock_critico > 0 ? 'text-red-600' : 'text-green-600'}`}>{l.stock_critico}</span></div>
                  <div className="flex items-center justify-between"><span className="text-gray-500">Pedido actual</span>{l.ultimo_pedido ? <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${(EST[l.ultimo_pedido.estado]?.c) || 'bg-gray-100 text-gray-600'}`}>{EST[l.ultimo_pedido.estado]?.l || l.ultimo_pedido.estado}</span> : <span className="text-gray-400 text-xs">—</span>}</div>
                  <div className="flex items-center justify-between"><span className="text-gray-500">Incidencias</span><span className={`font-bold ${l.incidencias_abiertas > 0 ? 'text-amber-600' : 'text-gray-500'}`}>{l.incidencias_abiertas}</span></div>
                  <div className="flex items-center justify-between"><span className="text-gray-500">Por cobrar</span><span className="font-semibold text-[#1a1a1a]">{clp(l.facturas_por_pagar)}</span></div>
                  <div className="flex items-center justify-between"><span className="text-gray-500">Última entrega</span><span className="text-gray-500 text-xs">{l.ultima_entrega ? fFecha(l.ultima_entrega) : '—'}</span></div>
                </div>
              </div>
            ))}
          </div>
          {(res.locales || []).length === 0 && <div className="noma-card text-center py-14 text-gray-400 text-sm">Aún no hay sucursales cargadas.</div>}
        </div>
      )}

      {tab === 'solicitudes' && (<>
      <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 w-fit overflow-x-auto max-w-full">
        {([['todos', `Todas${nuevas ? ` · ${nuevas} nuevas` : ''}`], ['solicitud_enviada', 'Enviadas'], ['aprobada', 'Aprobadas'], ['en_preparacion', 'En preparación'], ['en_ruta', 'En ruta'], ['entregada', 'Entregadas']] as const).map(([k, l]) => (
          <button key={k} onClick={() => setFiltro(k)} className={`px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap ${filtro === k ? 'bg-white text-[#1b2a4a] shadow-sm' : 'text-gray-500'}`}>{l}</button>
        ))}
      </div>

      {loading ? (
        <div className="py-16 text-center"><Loader2 className="w-6 h-6 text-[#1b2a4a] animate-spin mx-auto" /></div>
      ) : vis.length === 0 ? (
        <div className="noma-card text-center py-14 text-gray-400 text-sm"><Store className="w-8 h-8 text-gray-200 mx-auto mb-2" />No hay solicitudes {filtro !== 'todos' ? 'en este estado' : 'todavía'}.</div>
      ) : (
        <div className="space-y-3">
          {vis.map(s => {
            const e = EST[s.estado] || { l: s.estado, c: 'bg-gray-100 text-gray-600' }
            const open = abierto === s.id
            const d = draft[s.id]
            return (
              <div key={s.id} className="noma-card !p-0 overflow-hidden">
                <button onClick={() => abrir(s)} className="w-full flex items-center justify-between gap-3 p-4 hover:bg-gray-50/50 text-left">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-mono text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{s.folio}</span>
                    <span className="font-semibold text-[#1a1a1a] text-sm flex items-center gap-1.5"><Store size={13} className="text-[#c9a24e]" /> {s.sucursal}</span>
                    {s.prioridad === 'alta' && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-600">⚡ Alta</span>}
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-xs text-gray-400 hidden sm:block">{s.items.length} ítems · {fFecha(s.created_at)}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${e.c}`}>{e.l}</span>
                    <ChevronDown size={16} className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
                  </div>
                </button>

                {open && d && (
                  <div className="px-4 pb-4 border-t border-gray-100 pt-3">
                    {s.fecha_requerida && <p className="text-xs text-gray-500 mb-2">Entrega solicitada: <b>{fFecha(s.fecha_requerida)}</b></p>}
                    {s.observaciones && <p className="text-xs text-gray-500 mb-3">📝 {s.observaciones}</p>}
                    <div className="overflow-x-auto rounded-xl border border-gray-100 mb-3">
                      <table className="w-full text-xs" style={{ minWidth: 520 }}>
                        <thead className="bg-gray-50/60"><tr>
                          <th className="text-left py-2 px-3 font-bold text-gray-400 uppercase text-[10px]">Producto</th>
                          <th className="py-2 px-2 font-bold text-gray-400 uppercase text-[10px]">Solic.</th>
                          <th className="py-2 px-2 font-bold text-gray-400 uppercase text-[10px]">Aprobado</th>
                          <th className="py-2 px-2 font-bold text-gray-400 uppercase text-[10px]">Preparado</th>
                          <th className="py-2 px-2 font-bold text-gray-400 uppercase text-[10px]">Despachado</th>
                          <th className="py-2 px-2 font-bold text-gray-400 uppercase text-[10px]">Recib.</th>
                        </tr></thead>
                        <tbody>
                          {s.items.map(it => (
                            <tr key={it.id} className="border-t border-gray-50">
                              <td className="py-2 px-3 font-medium text-[#1a1a1a]">{it.producto_nombre || 'Producto'}<span className="text-gray-400 font-normal"> · {it.unidad}</span></td>
                              <td className="py-2 px-2 text-center font-bold tabular-nums">{it.cantidad_solicitada}</td>
                              <td className="py-2 px-2 text-center"><input value={d.items[it.id]?.a ?? ''} onChange={ev => setField(s.id, it.id, 'a', ev.target.value)} placeholder="—" className="w-14 text-center border border-gray-200 rounded-md py-1 tabular-nums" /></td>
                              <td className="py-2 px-2 text-center"><input value={d.items[it.id]?.p ?? ''} onChange={ev => setField(s.id, it.id, 'p', ev.target.value)} placeholder="—" className="w-14 text-center border border-gray-200 rounded-md py-1 tabular-nums" /></td>
                              <td className="py-2 px-2 text-center"><input value={d.items[it.id]?.d ?? ''} onChange={ev => setField(s.id, it.id, 'd', ev.target.value)} placeholder="—" className="w-14 text-center border border-gray-200 rounded-md py-1 tabular-nums" /></td>
                              <td className="py-2 px-2 text-center tabular-nums text-gray-500">{it.cantidad_recibida != null ? it.cantidad_recibida : '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="grid sm:grid-cols-3 gap-2 mb-3">
                      <div><label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Chofer</label><input value={d.cn} onChange={ev => setDraft(p => ({ ...p, [s.id]: { ...p[s.id], cn: ev.target.value } }))} className="noma-input !py-1.5 text-sm" placeholder="Nombre" /></div>
                      <div><label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Teléfono chofer</label><input value={d.ct} onChange={ev => setDraft(p => ({ ...p, [s.id]: { ...p[s.id], ct: ev.target.value } }))} className="noma-input !py-1.5 text-sm" placeholder="+56 9…" /></div>
                      <div><label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Hora estimada</label><input value={d.he} onChange={ev => setDraft(p => ({ ...p, [s.id]: { ...p[s.id], he: ev.target.value } }))} className="noma-input !py-1.5 text-sm" placeholder="Ej: 14:30" /></div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <button onClick={() => aprobarTodo(s)} className="text-xs font-semibold border border-gray-200 rounded-lg px-3 py-1.5 text-gray-600 hover:border-[#c9a24e]">Aprobar todo (= solicitado)</button>
                      <div className="flex items-center gap-1.5 ml-auto">
                        <label className="text-xs text-gray-500">Estado:</label>
                        <select value={d.estado} onChange={ev => setDraft(prev => ({ ...prev, [s.id]: { ...prev[s.id], estado: ev.target.value } }))} className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white">
                          {ESTADOS_SEL.map(k => <option key={k} value={k}>{EST[k]?.l || k}</option>)}
                        </select>
                        <button onClick={() => guardar(s)} disabled={guardando === s.id} className="text-xs font-semibold flex items-center gap-1.5 bg-green-600 text-white rounded-lg px-3 py-1.5 hover:bg-green-700 disabled:opacity-60">
                          {guardando === s.id ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Guardar
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
      </>)}

      {tab === 'incidencias' && (
        incLoad ? <div className="py-16 text-center"><Loader2 className="w-6 h-6 text-[#1b2a4a] animate-spin mx-auto" /></div>
        : incs.length === 0 ? <div className="noma-card text-center py-14 text-gray-400 text-sm"><MessageCircle className="w-8 h-8 text-gray-200 mx-auto mb-2" />No hay incidencias ni consultas.</div>
        : <div className="space-y-3">
          {incs.map(i => { const e = EST_INC[i.estado] || { l: i.estado, c: 'bg-gray-100 text-gray-600' }; return (
            <div key={i.id} className="noma-card">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="font-semibold text-sm text-[#1a1a1a] flex items-center gap-2"><Store size={13} className="text-[#c9a24e]" /> {i.sucursal} · {TIPO_INC[i.tipo] || i.tipo}{i.folio && <span className="font-mono text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">{i.folio}</span>}</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${e.c}`}>{e.l}</span>
              </div>
              <p className="text-sm text-gray-600 mt-1.5">{i.descripcion}</p>
              <p className="text-[11px] text-gray-400 mt-0.5">{fFecha(i.created_at)}</p>
              <div className="mt-3 flex items-end gap-2 flex-wrap">
                <div className="flex-1 min-w-[180px]">
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Respuesta al local</label>
                  <input defaultValue={i.respuesta_central || ''} onChange={ev => setResp(r => ({ ...r, [i.id]: ev.target.value }))} placeholder="Escribe la respuesta…" className="noma-input !py-2 text-sm" />
                </div>
                <select defaultValue={i.estado} onChange={ev => setEstInc(s => ({ ...s, [i.id]: ev.target.value }))} className="text-xs border border-gray-200 rounded-lg px-2 py-2 bg-white">
                  {EST_INC_SEL.map(k => <option key={k} value={k}>{EST_INC[k]?.l || k}</option>)}
                </select>
                <button onClick={() => guardarInc(i)} disabled={guardInc === i.id} className="text-xs font-semibold flex items-center gap-1.5 bg-green-600 text-white rounded-lg px-3 py-2 hover:bg-green-700 disabled:opacity-60">
                  {guardInc === i.id ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Guardar
                </button>
              </div>
            </div>)})}
        </div>
      )}

      {tab === 'reserva' && (
        rsvLoad ? <div className="py-16 text-center"><Loader2 className="w-6 h-6 text-[#1b2a4a] animate-spin mx-auto" /></div>
        : <div className="space-y-4">
          <div className="bg-[#faf7ef] border border-[#e7d4a6] rounded-xl px-4 py-3 text-sm text-[#5a4a24]">
            <b>Reserva Aldea (interno).</b> Stock protegido por SKU. Regla: <b>Disponible = Físico − Comprometido</b> · <b>Reposición = Objetivo − Físico</b>. El cliente solo ve "Disponible".
          </div>
          {(rsv.items || []).map((it: any) => {
            const e = EST_RSV[it.estado] || EST_RSV.normal
            const d = rDraft[it.product_id] || {}
            const pct = it.objetivo > 0 ? Math.min(100, Math.round((it.disponible / it.objetivo) * 100)) : 0
            return (
              <div key={it.product_id} className="noma-card">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="font-semibold text-[#1a1a1a] flex items-center gap-2">
                    <span className="w-8 h-8 rounded-lg bg-[#f5f0e8] grid place-items-center overflow-hidden">{it.imagen_url ? <img src={it.imagen_url} alt="" className="w-full h-full object-cover" /> : <ShieldCheck size={14} className="text-[#c9a24e]" />}</span>
                    {it.nombre}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${e.c}`}>{it.configurada ? e.l : 'Sin reserva'}</span>
                </div>
                {it.configurada && (
                  <div className="mt-3">
                    <div className="h-2 rounded-full bg-gray-100 overflow-hidden"><div className="h-full rounded-full" style={{ width: `${pct}%`, background: e.bar }} /></div>
                    <div className="flex items-center gap-4 mt-2 text-xs">
                      <span className="text-gray-500">Disponible: <b className="text-[#1a1a1a]">{it.disponible}</b></span>
                      <span className="text-gray-500">Reposición sugerida: <b className="text-[#c9a24e]">{it.reposicion}</b></span>
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-3">
                  {([['objetivo', 'Objetivo'], ['minimo', 'Mínimo'], ['critico', 'Crítico'], ['fisico', 'Físico res.'], ['comprometido', 'Comprom.']] as const).map(([k, l]) => (
                    <div key={k}><label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">{l}</label>
                      <input value={d[k] ?? ''} onChange={ev => setRField(it.product_id, k, ev.target.value)} className="noma-input !py-1.5 text-sm text-center tabular-nums" placeholder="0" /></div>
                  ))}
                </div>
                <div className="flex justify-end mt-3">
                  <button onClick={() => guardarReserva(it)} disabled={guardR === it.product_id} className="text-xs font-semibold flex items-center gap-1.5 bg-green-600 text-white rounded-lg px-3 py-1.5 hover:bg-green-700 disabled:opacity-60">
                    {guardR === it.product_id ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Guardar reserva
                  </button>
                </div>
              </div>
            )
          })}
          {(rsv.items || []).length === 0 && <div className="noma-card text-center py-14 text-gray-400 text-sm">No hay productos en el catálogo Aldea.</div>}
        </div>
      )}

      {tab === 'usuarios' && (
        <div className="grid lg:grid-cols-2 gap-4 items-start">
          {/* Crear usuario */}
          <form onSubmit={crearUsuario} className="noma-card space-y-3">
            <h3 className="font-bold text-[#1a1a1a] flex items-center gap-2"><UserPlus size={16} className="text-[#c9a24e]" /> Crear usuario Aldea</h3>
            {okUser && (
              <div className="bg-green-50 border border-green-100 rounded-xl p-3 text-sm">
                <p className="text-green-700 font-semibold mb-1">✓ Usuario listo</p>
                <div className="bg-white rounded-lg p-2 text-xs font-mono text-[#1a1a1a] space-y-0.5">
                  <div>Correo: {okUser.email}</div><div>Clave: {okUser.password}</div><div>Portal: nommafood.cl/portal/aldea/login</div>
                </div>
                <button type="button" onClick={() => navigator.clipboard?.writeText(`Portal Aldea Vegetal: https://nommafood.cl/portal/aldea/login\nCorreo: ${okUser.email}\nContraseña: ${okUser.password}`)} className="mt-2 text-xs font-semibold text-[#c9a24e] flex items-center gap-1"><Copy size={12} /> Copiar datos</button>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-xs font-semibold text-gray-600 mb-1">Nombre</label><input value={uForm.nombre} onChange={e => setUForm(f => ({ ...f, nombre: e.target.value }))} className="noma-input !py-2 text-sm" placeholder="Nombre del encargado" /></div>
              <div><label className="block text-xs font-semibold text-gray-600 mb-1">Correo *</label><input type="email" value={uForm.email} onChange={e => setUForm(f => ({ ...f, email: e.target.value }))} className="noma-input !py-2 text-sm" placeholder="correo@…" required /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-xs font-semibold text-gray-600 mb-1">Rol</label>
                <select value={uForm.rol} onChange={e => setUForm(f => ({ ...f, rol: e.target.value }))} className="noma-input !py-2 text-sm">
                  <option value="encargado_local">Encargado de Local</option><option value="admin_general">Administrador General</option>
                </select></div>
              <div><label className="block text-xs font-semibold text-gray-600 mb-1">Contraseña *</label><input type="text" value={uForm.password} onChange={e => setUForm(f => ({ ...f, password: e.target.value }))} className="noma-input !py-2 text-sm font-mono" placeholder="mín. 6" required /></div>
            </div>
            {uForm.rol === 'encargado_local' && (
              <div><label className="block text-xs font-semibold text-gray-600 mb-1">Sucursal *</label>
                <select value={uForm.mayorista_id} onChange={e => setUForm(f => ({ ...f, mayorista_id: e.target.value }))} className="noma-input !py-2 text-sm" required>
                  <option value="">Elige la cafetería…</option>
                  {(orgs.find(o => o.id === uForm.organizacion_id)?.sucursales || []).map((s: any) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                </select></div>
            )}
            <button type="submit" disabled={creandoU} className="noma-btn-primary w-full disabled:opacity-60">{creandoU ? 'Creando…' : 'Crear usuario'}</button>
            <p className="text-[11px] text-gray-400">El usuario entra en nommafood.cl/portal/aldea/login con su correo y contraseña.</p>
          </form>

          {/* Lista de usuarios */}
          <div className="noma-card !p-0 overflow-hidden">
            <div className="p-4 border-b border-gray-100"><h3 className="font-bold text-[#1a1a1a] text-sm">Usuarios de Aldea</h3></div>
            {usrLoad ? <div className="py-10 text-center"><Loader2 className="w-5 h-5 text-[#1b2a4a] animate-spin mx-auto" /></div>
              : usuarios.length === 0 ? <p className="p-4 text-sm text-gray-400">Aún no hay usuarios.</p>
              : <div className="divide-y divide-gray-50">
                {usuarios.map(u => (
                  <div key={u.id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <div><p className="text-sm font-medium text-[#1a1a1a]">{u.nombre || u.email}</p><p className="text-xs text-gray-400">{u.email}</p></div>
                    <div className="text-right"><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${u.rol === 'admin_general' ? 'bg-[#f5f0e8] text-[#7a5c1e]' : 'bg-blue-50 text-blue-700'}`}>{u.rol === 'admin_general' ? 'Admin General' : 'Encargado'}</span><p className="text-[11px] text-gray-400 mt-0.5">{u.sucursal}</p></div>
                  </div>
                ))}
              </div>}
          </div>
        </div>
      )}

      {tab === 'facturas' && (
        <div className="grid lg:grid-cols-2 gap-4 items-start">
          <form onSubmit={crearFactura} className="noma-card space-y-3">
            <h3 className="font-bold text-[#1a1a1a] flex items-center gap-2"><Receipt size={16} className="text-[#c9a24e]" /> Registrar factura</h3>
            <div><label className="block text-xs font-semibold text-gray-600 mb-1">Sucursal *</label>
              <select value={fForm.mayorista_id} onChange={e => setFForm(f => ({ ...f, mayorista_id: e.target.value }))} className="noma-input !py-2 text-sm" required>
                <option value="">Elige la cafetería…</option>
                {sucursalesFlat.map((s: any) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
              </select></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-xs font-semibold text-gray-600 mb-1">N° factura</label><input value={fForm.numero} onChange={e => setFForm(f => ({ ...f, numero: e.target.value }))} className="noma-input !py-2 text-sm" placeholder="1052" /></div>
              <div><label className="block text-xs font-semibold text-gray-600 mb-1">Monto *</label><input type="number" min="0" value={fForm.monto} onChange={e => setFForm(f => ({ ...f, monto: e.target.value }))} className="noma-input !py-2 text-sm" placeholder="0" required /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-xs font-semibold text-gray-600 mb-1">Emisión</label><input type="date" value={fForm.fecha_emision} onChange={e => setFForm(f => ({ ...f, fecha_emision: e.target.value }))} className="noma-input !py-2 text-sm" /></div>
              <div><label className="block text-xs font-semibold text-gray-600 mb-1">Vencimiento</label><input type="date" value={fForm.fecha_vencimiento} onChange={e => setFForm(f => ({ ...f, fecha_vencimiento: e.target.value }))} className="noma-input !py-2 text-sm" /></div>
            </div>
            <button type="submit" disabled={creandoF} className="noma-btn-primary w-full disabled:opacity-60">{creandoF ? 'Registrando…' : 'Registrar factura'}</button>
          </form>

          <div className="noma-card !p-0 overflow-hidden">
            <div className="p-4 border-b border-gray-100"><h3 className="font-bold text-[#1a1a1a] text-sm">Facturas de Aldea</h3></div>
            {factLoad ? <div className="py-10 text-center"><Loader2 className="w-5 h-5 text-[#1b2a4a] animate-spin mx-auto" /></div>
              : facts.length === 0 ? <p className="p-4 text-sm text-gray-400">Aún no hay facturas.</p>
              : <div className="divide-y divide-gray-50">
                {facts.map(f => { const e = EST_FACT[f.estado_real] || EST_FACT.por_pagar; return (
                  <div key={f.id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <div><p className="text-sm font-medium text-[#1a1a1a]">{f.sucursal} · N° {f.numero || 's/n'}</p><p className="text-xs text-gray-400">{f.fecha_vencimiento ? `Vence ${fFecha(f.fecha_vencimiento)}` : 'Sin vencimiento'}</p></div>
                    <div className="flex items-center gap-3">
                      <div className="text-right"><p className="font-bold text-sm text-[#1a1a1a]">{clp(f.monto)}</p><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${e.c}`}>{e.l}</span></div>
                      {f.estado === 'pagada'
                        ? <button onClick={() => marcarFactura(f.id, 'por_pagar')} className="text-[11px] font-semibold text-gray-400 hover:text-gray-600">Reabrir</button>
                        : <button onClick={() => marcarFactura(f.id, 'pagada')} className="text-[11px] font-semibold text-green-700 hover:underline whitespace-nowrap">Marcar pagada</button>}
                    </div>
                  </div>)})}
              </div>}
          </div>
        </div>
      )}
    </div>
  )
}
