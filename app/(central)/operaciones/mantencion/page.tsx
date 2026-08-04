'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, X, Loader2, Wrench, ChevronDown, Clock, Printer, Check, List, CalendarDays, ChevronLeft, ChevronRight, AlertTriangle, History, ExternalLink, ShieldCheck } from 'lucide-react'

const REC: Record<string, { l: string; c: string }> = {
  semanal:    { l: 'Semanal',    c: 'bg-blue-50 text-blue-700' },
  quincenal:  { l: 'Quincenal',  c: 'bg-blue-50 text-blue-700' },
  mensual:    { l: 'Mensual',    c: 'bg-amber-50 text-amber-700' },
  trimestral: { l: 'Trimestral', c: 'bg-amber-50 text-amber-700' },
  semestral:  { l: 'Semestral',  c: 'bg-purple-50 text-purple-700' },
  anual:      { l: 'Anual',      c: 'bg-purple-50 text-purple-700' },
}
const recLabel = (r: string) => REC[r]?.l || r
const recClass = (r: string) => REC[r]?.c || 'bg-gray-100 text-gray-600'

const ESTADO_MAQ: Record<string, { l: string; c: string }> = {
  operativa:      { l: 'Operativa',      c: 'bg-green-100 text-green-700' },
  en_reparacion:  { l: 'En reparación',  c: 'bg-amber-100 text-amber-700' },
  fuera_servicio: { l: 'Fuera de servicio', c: 'bg-red-100 text-red-700' },
}

interface Tarea { id: string; maquina_id: string; nombre: string; pasos: string[]; tiempo_estimado_min: number | null; recurrencia: string; requiere_tecnico: boolean; ultima: any; proxima: string; estado: 'atrasado' | 'hoy' | 'ok' }
interface Maquina { id: string; codigo: string | null; nombre: string; marca_modelo: string | null; n_serie: string | null; area: string; fecha_compra: string | null; garantia_hasta: string | null; proveedor: string | null; manual_url: string | null; estado: string; tareas: Tarea[]; historial: any[] }
interface AreaLite { id: string; nombre: string }

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
const DIAS = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do']
const toISO = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const fFecha = (s: string | null) => s ? new Date(s + (s.length <= 10 ? 'T00:00:00' : '')).toLocaleDateString('es-CL') : '—'

function printProc(maq: Maquina, t: Tarea) {
  const pasos = (t.pasos || []).map(p => `<li>${p}</li>`).join('')
  const w = window.open('', '_blank', 'width=720,height=900')
  if (!w) return
  w.document.write(`<html><head><title>${t.nombre}</title><style>
    body{font-family:system-ui,Arial,sans-serif;color:#1f2430;padding:30px;max-width:640px;margin:0 auto}
    h1{color:#1b2a4a;font-size:22px;margin:0 0 4px} .meta{color:#6b6f77;font-size:13px;border-bottom:2px solid #c9a24e;padding-bottom:10px;margin-bottom:16px}
    .t{background:#f5f0e8;display:inline-block;padding:4px 12px;border-radius:20px;font-weight:700;color:#7a5c1e;font-size:13px}
    ol{line-height:2;font-size:15px} .foot{margin-top:30px;border-top:1px solid #eee;padding-top:10px;color:#9aa;font-size:11px}
    table{font-size:12px;color:#555;margin:8px 0} td{padding:2px 10px 2px 0}
  </style></head><body>
    <h1>${t.nombre}</h1>
    <div class="meta">Mantención &middot; ${maq.nombre}${maq.codigo ? ' (' + maq.codigo + ')' : ''} &middot; Recurrencia: ${recLabel(t.recurrencia)}</div>
    <table>
      <tr><td>Marca / modelo:</td><td>${maq.marca_modelo || '—'}</td></tr>
      <tr><td>N° de serie:</td><td>${maq.n_serie || '—'}</td></tr>
      <tr><td>Área:</td><td>${maq.area || '—'}</td></tr>
    </table>
    <p><span class="t">Tiempo estimado: ${t.tiempo_estimado_min ? t.tiempo_estimado_min + ' min' : '—'}</span> ${t.requiere_tecnico ? '<span class="t" style="background:#fde;color:#a24">Requiere técnico</span>' : ''}</p>
    <h3>Paso a paso</h3><ol>${pasos || '<li>(Sin pasos registrados)</li>'}</ol>
    <div class="foot">NOMMA FOOD &middot; Procedimiento de mantención &middot; Fecha: ____ / ____ / ______ &middot; Firma responsable: ____________________</div>
  </body></html>`)
  w.document.close(); w.focus(); setTimeout(() => w.print(), 300)
}

export default function MantencionPage() {
  const [maquinas, setMaquinas] = useState<Maquina[]>([])
  const [areas, setAreas] = useState<AreaLite[]>([])
  const [loading, setLoading] = useState(true)
  const [openMaq, setOpenMaq] = useState<string | null>(null)
  const [openTarea, setOpenTarea] = useState<string | null>(null)
  const [histOpen, setHistOpen] = useState<string | null>(null)
  const [modal, setModal] = useState<null | 'maquina' | 'tarea'>(null)
  const [ejecModal, setEjecModal] = useState<null | { tarea_id: string; maquina_id: string; nombre: string }>(null)
  const [saving, setSaving] = useState(false)
  const [vista, setVista] = useState<'lista' | 'calendario'>('lista')
  const [cursor, setCursor] = useState(() => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() } })
  const [diaSel, setDiaSel] = useState<string | null>(null)

  const [mForm, setMForm] = useState({ codigo: '', nombre: '', marca_modelo: '', n_serie: '', area_id: '', fecha_compra: '', garantia_hasta: '', proveedor: '', manual_url: '', estado: 'operativa' })
  const [tForm, setTForm] = useState({ maquina_id: '', nombre: '', tiempo_estimado_min: '', recurrencia: 'mensual', requiere_tecnico: false, pasos: '' })
  const [ejecForm, setEjecForm] = useState({ realizado_por: '', notas: '' })

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/central/mantencion'); const d = await r.json()
      setMaquinas(r.ok ? (d.maquinas || []) : [])
      setAreas(r.ok ? (d.areas || []) : [])
    } catch { setMaquinas([]) }
    setLoading(false)
  }, [])
  useEffect(() => { cargar() }, [cargar])

  async function crearMaquina(e: React.FormEvent) {
    e.preventDefault(); setSaving(true)
    try {
      const r = await fetch('/api/central/mantencion', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'maquina', ...mForm }) })
      if (!r.ok) throw new Error()
      setMForm({ codigo: '', nombre: '', marca_modelo: '', n_serie: '', area_id: '', fecha_compra: '', garantia_hasta: '', proveedor: '', manual_url: '', estado: 'operativa' }); setModal(null); cargar()
    } catch { alert('No se pudo crear la máquina') } finally { setSaving(false) }
  }

  async function crearTarea(e: React.FormEvent) {
    e.preventDefault(); setSaving(true)
    try {
      const pasos = tForm.pasos.split('\n').map(s => s.trim()).filter(Boolean)
      const r = await fetch('/api/central/mantencion', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'tarea', ...tForm, pasos }) })
      if (!r.ok) throw new Error()
      setTForm({ maquina_id: '', nombre: '', tiempo_estimado_min: '', recurrencia: 'mensual', requiere_tecnico: false, pasos: '' }); setModal(null); cargar()
    } catch { alert('No se pudo crear la tarea') } finally { setSaving(false) }
  }

  async function registrarEjec(e: React.FormEvent) {
    e.preventDefault(); if (!ejecModal) return; setSaving(true)
    try {
      const r = await fetch('/api/central/mantencion', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'ejecutar', tarea_id: ejecModal.tarea_id, maquina_id: ejecModal.maquina_id, ...ejecForm }) })
      if (!r.ok) throw new Error()
      setEjecForm({ realizado_por: '', notas: '' }); setEjecModal(null); setDiaSel(null); cargar()
    } catch { alert('No se pudo registrar') } finally { setSaving(false) }
  }

  // Datos para el calendario
  const todasTareas = maquinas.flatMap(m => m.tareas.map(t => ({ ...t, maquina: m.nombre })))
  const atrasadas = todasTareas.filter(t => t.estado === 'atrasado')
  const porDia = new Map<string, typeof todasTareas>()
  for (const t of todasTareas) { const arr = porDia.get(t.proxima) || []; arr.push(t); porDia.set(t.proxima, arr) }

  const primerDia = new Date(cursor.y, cursor.m, 1)
  const offset = (primerDia.getDay() + 6) % 7
  const diasMes = new Date(cursor.y, cursor.m + 1, 0).getDate()
  const celdas: (number | null)[] = [...Array(offset).fill(null), ...Array.from({ length: diasMes }, (_, i) => i + 1)]
  const hoyISO = toISO(new Date())
  const tareasDiaSel = diaSel ? (porDia.get(diaSel) || []) : []
  const mesAnterior = () => setCursor(c => c.m === 0 ? { y: c.y - 1, m: 11 } : { y: c.y, m: c.m - 1 })
  const mesSiguiente = () => setCursor(c => c.m === 11 ? { y: c.y + 1, m: 0 } : { y: c.y, m: c.m + 1 })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#1a1a1a]">Mantención de equipos</h1>
          <p className="text-sm text-gray-500 mt-0.5">Ficha de cada máquina, plan preventivo e historial de cumplimiento.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setModal('maquina')} className="text-sm flex items-center gap-1.5 border border-gray-200 rounded-lg px-3 py-2 text-gray-600 hover:border-[#c9a24e]"><Wrench size={15} /> Nueva máquina</button>
          <button onClick={() => setModal('tarea')} className="noma-btn-primary text-sm flex items-center gap-2" disabled={maquinas.length === 0}><Plus size={16} /> Nueva tarea</button>
        </div>
      </div>

      {/* Toggle Lista / Calendario */}
      <div className="inline-flex items-center gap-1 bg-gray-100 rounded-lg p-1">
        <button onClick={() => setVista('lista')} className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 ${vista === 'lista' ? 'bg-white text-[#1b2a4a] shadow-sm' : 'text-gray-500'}`}><List size={14} /> Máquinas</button>
        <button onClick={() => setVista('calendario')} className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 ${vista === 'calendario' ? 'bg-white text-[#1b2a4a] shadow-sm' : 'text-gray-500'}`}><CalendarDays size={14} /> Calendario</button>
      </div>

      {atrasadas.length > 0 && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-4 py-2.5 text-sm text-red-700">
          <AlertTriangle size={16} /> <span><b>{atrasadas.length}</b> mantención{atrasadas.length !== 1 ? 'es' : ''} atrasada{atrasadas.length !== 1 ? 's' : ''}. Revísalas para no perder garantías ni dañar equipos.</span>
        </div>
      )}

      {loading ? (
        <div className="py-16 text-center"><Loader2 className="w-6 h-6 text-[#1b2a4a] animate-spin mx-auto" /></div>
      ) : maquinas.length === 0 ? (
        <div className="noma-card text-center py-14 text-gray-400 text-sm">
          <Wrench className="w-8 h-8 text-gray-200 mx-auto mb-2" />
          Aún no hay máquinas registradas. Empieza con &quot;Nueva máquina&quot; y carga la ficha de cada equipo de la fábrica.
        </div>
      ) : vista === 'calendario' ? (
        <div className="grid lg:grid-cols-3 gap-4">
          <div className="noma-card lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <button onClick={mesAnterior} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"><ChevronLeft size={18} /></button>
              <h2 className="font-bold text-[#1a1a1a] capitalize">{MESES[cursor.m]} {cursor.y}</h2>
              <button onClick={mesSiguiente} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"><ChevronRight size={18} /></button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center">
              {DIAS.map(d => <div key={d} className="text-[10px] font-bold text-gray-400 uppercase py-1">{d}</div>)}
              {celdas.map((n, i) => {
                if (n === null) return <div key={i} />
                const iso = toISO(new Date(cursor.y, cursor.m, n))
                const items = porDia.get(iso) || []
                const hayAtraso = items.some(t => t.estado === 'atrasado')
                const esHoy = iso === hoyISO
                const sel = iso === diaSel
                return (
                  <button key={i} onClick={() => setDiaSel(sel ? null : iso)}
                    className={`aspect-square rounded-lg text-xs flex flex-col items-center justify-center gap-0.5 border transition-all ${sel ? 'border-[#c9a24e] bg-[#f5f0e8]' : esHoy ? 'border-[#1b2a4a]/30 bg-[#1b2a4a]/5' : 'border-transparent hover:bg-gray-50'}`}>
                    <span className={esHoy ? 'font-bold text-[#1b2a4a]' : 'text-gray-600'}>{n}</span>
                    {items.length > 0 && <span className={`w-1.5 h-1.5 rounded-full ${hayAtraso ? 'bg-red-500' : 'bg-[#c9a24e]'}`} />}
                  </button>
                )
              })}
            </div>
            <div className="flex items-center gap-4 mt-4 text-[11px] text-gray-400">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#c9a24e]" /> Toca mantención</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /> Atrasada</span>
            </div>
          </div>
          <div className="noma-card">
            <h3 className="font-bold text-[#1a1a1a] text-sm mb-3">{diaSel ? `Mantenciones del ${new Date(diaSel + 'T00:00:00').toLocaleDateString('es-CL', { day: 'numeric', month: 'long' })}` : 'Selecciona un día'}</h3>
            {!diaSel ? (
              <p className="text-xs text-gray-400">Haz clic en un día para ver qué mantención toca.</p>
            ) : tareasDiaSel.length === 0 ? (
              <p className="text-xs text-gray-400">Sin mantenciones ese día.</p>
            ) : (
              <div className="space-y-2">
                {tareasDiaSel.map(t => (
                  <div key={t.id} className="border border-gray-100 rounded-lg p-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm text-[#1a1a1a]">{t.nombre}</span>
                      {t.estado === 'atrasado' && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-100 text-red-700">Atrasada</span>}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{t.maquina} · <span className={recClass(t.recurrencia) + ' px-1.5 py-0.5 rounded-full text-[10px] font-bold'}>{recLabel(t.recurrencia)}</span></p>
                    <button onClick={() => setEjecModal({ tarea_id: t.id, maquina_id: t.maquina_id, nombre: t.nombre })} className="text-xs font-semibold flex items-center gap-1.5 text-green-700 mt-2"><Check size={13} /> Registrar mantención</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {maquinas.map(m => (
            <div key={m.id} className="noma-card !p-0 overflow-hidden">
              <button onClick={() => setOpenMaq(openMaq === m.id ? null : m.id)} className="w-full flex items-center justify-between p-4 hover:bg-gray-50/50 gap-3">
                <span className="font-bold text-[#1a1a1a] flex items-center gap-2 text-left"><Wrench size={16} className="text-[#c9a24e] flex-shrink-0" /> {m.nombre} {m.codigo && <span className="text-xs font-normal text-gray-400">· {m.codigo}</span>}</span>
                <span className="flex items-center gap-2 flex-shrink-0">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${ESTADO_MAQ[m.estado]?.c || 'bg-gray-100 text-gray-600'}`}>{ESTADO_MAQ[m.estado]?.l || m.estado}</span>
                  {m.tareas.some(t => t.estado === 'atrasado') && <span className="w-2 h-2 rounded-full bg-red-500" />}
                  <ChevronDown size={16} className={`text-gray-400 transition-transform ${openMaq === m.id ? 'rotate-180' : ''}`} />
                </span>
              </button>
              {openMaq === m.id && (
                <div className="px-4 pb-4">
                  {/* Ficha */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2 text-xs bg-gray-50/70 rounded-xl p-3 mb-3">
                    <div><span className="text-gray-400">Marca / modelo</span><p className="text-[#1a1a1a]">{m.marca_modelo || '—'}</p></div>
                    <div><span className="text-gray-400">N° de serie</span><p className="text-[#1a1a1a]">{m.n_serie || '—'}</p></div>
                    <div><span className="text-gray-400">Área</span><p className="text-[#1a1a1a]">{m.area || '—'}</p></div>
                    <div><span className="text-gray-400">Compra</span><p className="text-[#1a1a1a]">{fFecha(m.fecha_compra)}</p></div>
                    <div><span className="text-gray-400">Garantía hasta</span><p className={m.garantia_hasta && m.garantia_hasta < hoyISO ? 'text-red-600' : 'text-[#1a1a1a]'}>{fFecha(m.garantia_hasta)}</p></div>
                    <div><span className="text-gray-400">Proveedor</span><p className="text-[#1a1a1a]">{m.proveedor || '—'}</p></div>
                    {m.manual_url && <div className="col-span-2 sm:col-span-3"><a href={m.manual_url} target="_blank" rel="noopener noreferrer" className="text-[#c9a24e] font-semibold inline-flex items-center gap-1">Ver manual <ExternalLink size={11} /></a></div>}
                  </div>

                  {/* Plan de mantención */}
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-1">Plan de mantención</p>
                  {m.tareas.length === 0 && <p className="text-xs text-gray-400 py-2">Sin tareas de mantención. Agrégalas con &quot;Nueva tarea&quot;.</p>}
                  {m.tareas.map(t => (
                    <div key={t.id} className="border-t border-gray-100">
                      <button onClick={() => setOpenTarea(openTarea === t.id ? null : t.id)} className="w-full flex items-center justify-between gap-3 py-2.5 text-left">
                        <span className="text-sm text-[#1a1a1a] flex items-center gap-2 flex-wrap">{t.nombre}
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${recClass(t.recurrencia)}`}>{recLabel(t.recurrencia)}</span>
                          {t.requiere_tecnico && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-pink-50 text-pink-700">Técnico</span>}
                          {t.estado === 'atrasado' && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">Atrasada</span>}
                          {t.estado === 'hoy' && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">Hoy</span>}
                        </span>
                        <span className="flex items-center gap-2 flex-shrink-0 text-xs text-gray-500"><Clock size={13} /> {t.tiempo_estimado_min ? `${t.tiempo_estimado_min} min` : '—'} <ChevronDown size={14} className={`transition-transform ${openTarea === t.id ? 'rotate-180' : ''}`} /></span>
                      </button>
                      {openTarea === t.id && (
                        <div className="pb-3 pl-1">
                          <p className="text-xs text-gray-500 mb-2">Próxima: <b>{fFecha(t.proxima)}</b>{t.ultima && ` · última: ${fFecha(t.ultima.fecha_realizada)}${t.ultima.realizado_por ? ' · ' + t.ultima.realizado_por : ''}`}</p>
                          {t.pasos.length > 0 ? (
                            <ol className="list-decimal pl-5 text-sm text-gray-700 space-y-1 mb-3">{t.pasos.map((p, i) => <li key={i}>{p}</li>)}</ol>
                          ) : <p className="text-xs text-gray-400 mb-3">Sin paso a paso registrado.</p>}
                          <div className="flex gap-2 flex-wrap">
                            <button onClick={() => setEjecModal({ tarea_id: t.id, maquina_id: m.id, nombre: t.nombre })} className="text-xs font-semibold flex items-center gap-1.5 bg-green-600 text-white rounded-lg px-3 py-1.5 hover:bg-green-700"><Check size={13} /> Registrar mantención</button>
                            <button onClick={() => printProc(m, t)} className="text-xs font-semibold flex items-center gap-1.5 border border-gray-200 text-gray-600 rounded-lg px-3 py-1.5 hover:border-[#c9a24e]"><Printer size={13} /> Imprimir procedimiento</button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Historial */}
                  <button onClick={() => setHistOpen(histOpen === m.id ? null : m.id)} className="mt-3 text-xs font-semibold text-gray-500 flex items-center gap-1.5 hover:text-[#1b2a4a]"><History size={13} /> Historial de mantenciones ({m.historial.length}) <ChevronDown size={13} className={`transition-transform ${histOpen === m.id ? 'rotate-180' : ''}`} /></button>
                  {histOpen === m.id && (
                    <div className="mt-2 border border-gray-100 rounded-xl overflow-hidden">
                      {m.historial.length === 0 ? (
                        <p className="text-xs text-gray-400 p-3">Todavía no hay mantenciones registradas.</p>
                      ) : m.historial.map((h, i) => (
                        <div key={i} className="flex items-start gap-2 px-3 py-2 border-b border-gray-50 last:border-0 text-xs">
                          <ShieldCheck size={14} className="text-green-500 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-[#1a1a1a] font-medium">{fFecha(h.fecha_realizada)} {h.realizado_por && <span className="text-gray-400 font-normal">· {h.realizado_por}</span>}</p>
                            {h.notas && <p className="text-gray-500">{h.notas}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal Nueva máquina */}
      {modal === 'maquina' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setModal(null)} />
          <form onSubmit={crearMaquina} className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4"><h3 className="font-bold text-[#1a1a1a]">Nueva máquina</h3><button type="button" onClick={() => setModal(null)}><X size={16} className="text-gray-400" /></button></div>
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2"><label className="block text-xs font-semibold text-gray-600 mb-1">Nombre *</label><input value={mForm.nombre} onChange={e => setMForm(f => ({ ...f, nombre: e.target.value }))} className="noma-input" placeholder="Ej: Mezcladora planetaria" required /></div>
                <div><label className="block text-xs font-semibold text-gray-600 mb-1">Código</label><input value={mForm.codigo} onChange={e => setMForm(f => ({ ...f, codigo: e.target.value }))} className="noma-input" placeholder="MAQ-01" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-semibold text-gray-600 mb-1">Marca / modelo</label><input value={mForm.marca_modelo} onChange={e => setMForm(f => ({ ...f, marca_modelo: e.target.value }))} className="noma-input" placeholder="Hobart HL200" /></div>
                <div><label className="block text-xs font-semibold text-gray-600 mb-1">N° de serie</label><input value={mForm.n_serie} onChange={e => setMForm(f => ({ ...f, n_serie: e.target.value }))} className="noma-input" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-semibold text-gray-600 mb-1">Área</label>
                  <select value={mForm.area_id} onChange={e => setMForm(f => ({ ...f, area_id: e.target.value }))} className="noma-input">
                    <option value="">—</option>
                    {areas.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
                  </select>
                </div>
                <div><label className="block text-xs font-semibold text-gray-600 mb-1">Estado</label>
                  <select value={mForm.estado} onChange={e => setMForm(f => ({ ...f, estado: e.target.value }))} className="noma-input">
                    {Object.keys(ESTADO_MAQ).map(k => <option key={k} value={k}>{ESTADO_MAQ[k].l}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-semibold text-gray-600 mb-1">Fecha de compra</label><input type="date" value={mForm.fecha_compra} onChange={e => setMForm(f => ({ ...f, fecha_compra: e.target.value }))} className="noma-input" /></div>
                <div><label className="block text-xs font-semibold text-gray-600 mb-1">Garantía hasta</label><input type="date" value={mForm.garantia_hasta} onChange={e => setMForm(f => ({ ...f, garantia_hasta: e.target.value }))} className="noma-input" /></div>
              </div>
              <div><label className="block text-xs font-semibold text-gray-600 mb-1">Proveedor / servicio técnico</label><input value={mForm.proveedor} onChange={e => setMForm(f => ({ ...f, proveedor: e.target.value }))} className="noma-input" placeholder="Nombre y teléfono" /></div>
              <div><label className="block text-xs font-semibold text-gray-600 mb-1">Link al manual (opcional)</label><input value={mForm.manual_url} onChange={e => setMForm(f => ({ ...f, manual_url: e.target.value }))} className="noma-input" placeholder="https://…" /></div>
            </div>
            <button type="submit" disabled={saving} className="noma-btn-primary w-full mt-4 disabled:opacity-60">{saving ? 'Guardando…' : 'Guardar máquina'}</button>
          </form>
        </div>
      )}

      {/* Modal Nueva tarea */}
      {modal === 'tarea' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setModal(null)} />
          <form onSubmit={crearTarea} className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4"><h3 className="font-bold text-[#1a1a1a]">Nueva tarea de mantención</h3><button type="button" onClick={() => setModal(null)}><X size={16} className="text-gray-400" /></button></div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Máquina *</label>
                <select value={tForm.maquina_id} onChange={e => setTForm(f => ({ ...f, maquina_id: e.target.value }))} className="noma-input" required>
                  <option value="">Selecciona…</option>
                  {maquinas.map(m => <option key={m.id} value={m.id}>{m.nombre}{m.codigo ? ` (${m.codigo})` : ''}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-semibold text-gray-600 mb-1">Nombre de la tarea *</label><input value={tForm.nombre} onChange={e => setTForm(f => ({ ...f, nombre: e.target.value }))} className="noma-input" placeholder="Ej: Cambio de filtros" required /></div>
                <div><label className="block text-xs font-semibold text-gray-600 mb-1">Recurrencia</label>
                  <select value={tForm.recurrencia} onChange={e => setTForm(f => ({ ...f, recurrencia: e.target.value }))} className="noma-input">
                    {Object.keys(REC).map(k => <option key={k} value={k}>{REC[k].l}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 items-end">
                <div><label className="block text-xs font-semibold text-gray-600 mb-1">Tiempo estimado (min)</label><input type="number" min="0" value={tForm.tiempo_estimado_min} onChange={e => setTForm(f => ({ ...f, tiempo_estimado_min: e.target.value }))} className="noma-input" placeholder="30" /></div>
                <label className="flex items-center gap-2 text-sm text-gray-600 pb-2"><input type="checkbox" checked={tForm.requiere_tecnico} onChange={e => setTForm(f => ({ ...f, requiere_tecnico: e.target.checked }))} className="rounded" /> Requiere técnico externo</label>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Paso a paso (uno por línea)</label>
                <textarea value={tForm.pasos} onChange={e => setTForm(f => ({ ...f, pasos: e.target.value }))} rows={5} className="noma-input" placeholder={"Desconectar la máquina\nRetirar y limpiar filtros\nLubricar piezas móviles\nProbar funcionamiento"} />
              </div>
            </div>
            <button type="submit" disabled={saving} className="noma-btn-primary w-full mt-4 disabled:opacity-60">{saving ? 'Guardando…' : 'Crear tarea'}</button>
          </form>
        </div>
      )}

      {/* Modal registrar ejecución */}
      {ejecModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setEjecModal(null)} />
          <form onSubmit={registrarEjec} className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-1"><h3 className="font-bold text-[#1a1a1a]">Registrar mantención</h3><button type="button" onClick={() => setEjecModal(null)}><X size={16} className="text-gray-400" /></button></div>
            <p className="text-xs text-gray-500 mb-4">{ejecModal.nombre}</p>
            <div className="space-y-3">
              <div><label className="block text-xs font-semibold text-gray-600 mb-1">Realizado por</label><input value={ejecForm.realizado_por} onChange={e => setEjecForm(f => ({ ...f, realizado_por: e.target.value }))} className="noma-input" placeholder="Nombre del técnico o trabajador" /></div>
              <div><label className="block text-xs font-semibold text-gray-600 mb-1">Notas (opcional)</label><textarea value={ejecForm.notas} onChange={e => setEjecForm(f => ({ ...f, notas: e.target.value }))} rows={3} className="noma-input" placeholder="Repuestos usados, observaciones…" /></div>
            </div>
            <p className="text-[11px] text-gray-400 mt-2">Queda registrado con la fecha de hoy en el historial del equipo.</p>
            <button type="submit" disabled={saving} className="noma-btn-primary w-full mt-4 disabled:opacity-60">{saving ? 'Guardando…' : 'Registrar como hecha'}</button>
          </form>
        </div>
      )}
    </div>
  )
}
