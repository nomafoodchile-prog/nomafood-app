'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, X, Loader2, SprayCan, ChevronDown, Clock, Printer, Check, MapPin } from 'lucide-react'

const REC: Record<string, { l: string; c: string }> = {
  turno:     { l: 'Cada turno', c: 'bg-blue-50 text-blue-700' },
  diaria:    { l: 'Diaria',     c: 'bg-blue-50 text-blue-700' },
  semanal:   { l: 'Semanal',    c: 'bg-amber-50 text-amber-700' },
  quincenal: { l: 'Quincenal',  c: 'bg-amber-50 text-amber-700' },
  mensual:   { l: 'Mensual',    c: 'bg-purple-50 text-purple-700' },
  anual:     { l: 'Anual',      c: 'bg-purple-50 text-purple-700' },
}
const recLabel = (r: string) => REC[r]?.l || r
const recClass = (r: string) => REC[r]?.c || 'bg-gray-100 text-gray-600'

interface Tarea { id: string; nombre: string; pasos: string[]; tiempo_estimado_min: number | null; recurrencia: string; ultima: any }
interface Area { id: string; nombre: string; tareas: Tarea[] }

function printProc(area: string, t: Tarea) {
  const pasos = (t.pasos || []).map(p => `<li>${p}</li>`).join('')
  const w = window.open('', '_blank', 'width=720,height=900')
  if (!w) return
  w.document.write(`<html><head><title>${t.nombre}</title><style>
    body{font-family:system-ui,Arial,sans-serif;color:#1f2430;padding:30px;max-width:640px;margin:0 auto}
    h1{color:#1b2a4a;font-size:22px;margin:0 0 4px} .meta{color:#6b6f77;font-size:13px;border-bottom:2px solid #c9a24e;padding-bottom:10px;margin-bottom:16px}
    .t{background:#f5f0e8;display:inline-block;padding:4px 12px;border-radius:20px;font-weight:700;color:#7a5c1e;font-size:13px}
    ol{line-height:2;font-size:15px} .foot{margin-top:30px;border-top:1px solid #eee;padding-top:10px;color:#9aa;font-size:11px}
  </style></head><body>
    <h1>${t.nombre}</h1>
    <div class="meta">Limpieza &middot; Área: ${area} &middot; Recurrencia: ${recLabel(t.recurrencia)}</div>
    <p><span class="t">Tiempo estimado: ${t.tiempo_estimado_min ? t.tiempo_estimado_min + ' min' : '—'}</span></p>
    <h3>Paso a paso</h3><ol>${pasos || '<li>(Sin pasos registrados)</li>'}</ol>
    <div class="foot">NOMMA FOOD &middot; Procedimiento de limpieza &middot; Firma responsable: ____________________</div>
  </body></html>`)
  w.document.close(); w.focus(); setTimeout(() => w.print(), 300)
}

export default function LimpiezaPage() {
  const [areas, setAreas] = useState<Area[]>([])
  const [loading, setLoading] = useState(true)
  const [openArea, setOpenArea] = useState<string | null>(null)
  const [openTarea, setOpenTarea] = useState<string | null>(null)
  const [modal, setModal] = useState<null | 'area' | 'tarea'>(null)
  const [saving, setSaving] = useState(false)
  const [areaForm, setAreaForm] = useState('')
  const [tForm, setTForm] = useState({ area_id: '', nombre: '', tiempo_estimado_min: '', recurrencia: 'diaria', pasos: '' })

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/central/limpieza'); const d = await r.json()
      const a = r.ok ? (d.areas || []) : []
      setAreas(a); setOpenArea(prev => prev || (a[0]?.id ?? null))
    } catch { setAreas([]) }
    setLoading(false)
  }, [])
  useEffect(() => { cargar() }, [cargar])

  async function crearArea(e: React.FormEvent) {
    e.preventDefault(); setSaving(true)
    try {
      const r = await fetch('/api/central/limpieza', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'area', nombre: areaForm }) })
      if (!r.ok) throw new Error()
      setAreaForm(''); setModal(null); cargar()
    } catch { alert('No se pudo crear el área') } finally { setSaving(false) }
  }

  async function crearTarea(e: React.FormEvent) {
    e.preventDefault(); setSaving(true)
    try {
      const pasos = tForm.pasos.split('\n').map(s => s.trim()).filter(Boolean)
      const r = await fetch('/api/central/limpieza', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'tarea', ...tForm, pasos }) })
      if (!r.ok) throw new Error()
      setTForm({ area_id: '', nombre: '', tiempo_estimado_min: '', recurrencia: 'diaria', pasos: '' }); setModal(null); cargar()
    } catch { alert('No se pudo crear la tarea') } finally { setSaving(false) }
  }

  async function marcarHecha(tareaId: string) {
    await fetch('/api/central/limpieza', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'ejecutar', tarea_id: tareaId }) })
    cargar()
  }

  const totalTareas = areas.reduce((n, a) => n + a.tareas.length, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#1a1a1a]">Limpieza programada</h1>
          <p className="text-sm text-gray-500 mt-0.5">Tareas de aseo por área, con paso a paso y tiempo estimado.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setModal('area')} className="text-sm flex items-center gap-1.5 border border-gray-200 rounded-lg px-3 py-2 text-gray-600 hover:border-[#c9a24e]"><MapPin size={15} /> Nueva área</button>
          <button onClick={() => setModal('tarea')} className="noma-btn-primary text-sm flex items-center gap-2"><Plus size={16} /> Nueva tarea</button>
        </div>
      </div>

      {loading ? (
        <div className="py-16 text-center"><Loader2 className="w-6 h-6 text-[#1b2a4a] animate-spin mx-auto" /></div>
      ) : areas.length === 0 ? (
        <div className="noma-card text-center py-14 text-gray-400 text-sm">
          <SprayCan className="w-8 h-8 text-gray-200 mx-auto mb-2" />
          Aún no hay áreas ni tareas. Empieza creando un área (ej. &quot;Cocina de producción&quot;) y luego sus tareas.
        </div>
      ) : (
        <>
          <p className="text-xs text-gray-400">{areas.length} área{areas.length !== 1 ? 's' : ''} · {totalTareas} tarea{totalTareas !== 1 ? 's' : ''}</p>
          <div className="space-y-3">
            {areas.map(a => (
              <div key={a.id} className="noma-card !p-0 overflow-hidden">
                <button onClick={() => setOpenArea(openArea === a.id ? null : a.id)} className="w-full flex items-center justify-between p-4 hover:bg-gray-50/50">
                  <span className="font-bold text-[#1a1a1a] flex items-center gap-2"><SprayCan size={16} className="text-[#c9a24e]" /> {a.nombre}</span>
                  <span className="text-xs text-gray-400 flex items-center gap-2">{a.tareas.length} tarea{a.tareas.length !== 1 ? 's' : ''} <ChevronDown size={16} className={`transition-transform ${openArea === a.id ? 'rotate-180' : ''}`} /></span>
                </button>
                {openArea === a.id && (
                  <div className="px-4 pb-3">
                    {a.tareas.length === 0 && <p className="text-xs text-gray-400 py-3">Sin tareas en esta área todavía.</p>}
                    {a.tareas.map(t => (
                      <div key={t.id} className="border-t border-gray-100">
                        <button onClick={() => setOpenTarea(openTarea === t.id ? null : t.id)} className="w-full flex items-center justify-between gap-3 py-3 text-left">
                          <span className="text-sm text-[#1a1a1a] flex items-center gap-2 flex-wrap">{t.nombre}<span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${recClass(t.recurrencia)}`}>{recLabel(t.recurrencia)}</span></span>
                          <span className="flex items-center gap-2 flex-shrink-0 text-xs text-gray-500"><Clock size={13} /> {t.tiempo_estimado_min ? `${t.tiempo_estimado_min} min` : '—'} <ChevronDown size={14} className={`transition-transform ${openTarea === t.id ? 'rotate-180' : ''}`} /></span>
                        </button>
                        {openTarea === t.id && (
                          <div className="pb-3 pl-1">
                            {t.pasos.length > 0 ? (
                              <ol className="list-decimal pl-5 text-sm text-gray-700 space-y-1 mb-3">{t.pasos.map((p, i) => <li key={i}>{p}</li>)}</ol>
                            ) : <p className="text-xs text-gray-400 mb-3">Sin paso a paso registrado.</p>}
                            {t.ultima && <p className="text-xs text-gray-400 mb-2">Última vez: {new Date(t.ultima.fecha_realizada).toLocaleDateString('es-CL')} {t.ultima.realizado_por ? `· ${t.ultima.realizado_por}` : ''}</p>}
                            <div className="flex gap-2 flex-wrap">
                              <button onClick={() => marcarHecha(t.id)} className="text-xs font-semibold flex items-center gap-1.5 bg-green-600 text-white rounded-lg px-3 py-1.5 hover:bg-green-700"><Check size={13} /> Marcar hecha</button>
                              <button onClick={() => printProc(a.nombre, t)} className="text-xs font-semibold flex items-center gap-1.5 border border-gray-200 text-gray-600 rounded-lg px-3 py-1.5 hover:border-[#c9a24e]"><Printer size={13} /> Imprimir procedimiento</button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Modal Nueva área */}
      {modal === 'area' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setModal(null)} />
          <form onSubmit={crearArea} className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4"><h3 className="font-bold text-[#1a1a1a]">Nueva área</h3><button type="button" onClick={() => setModal(null)}><X size={16} className="text-gray-400" /></button></div>
            <input value={areaForm} onChange={e => setAreaForm(e.target.value)} className="noma-input" placeholder="Ej: Cocina de producción" required />
            <button type="submit" disabled={saving} className="noma-btn-primary w-full mt-4 disabled:opacity-60">{saving ? 'Guardando…' : 'Crear área'}</button>
          </form>
        </div>
      )}

      {/* Modal Nueva tarea */}
      {modal === 'tarea' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setModal(null)} />
          <form onSubmit={crearTarea} className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4"><h3 className="font-bold text-[#1a1a1a]">Nueva tarea de limpieza</h3><button type="button" onClick={() => setModal(null)}><X size={16} className="text-gray-400" /></button></div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Área *</label>
                  <select value={tForm.area_id} onChange={e => setTForm(f => ({ ...f, area_id: e.target.value }))} className="noma-input" required>
                    <option value="">Selecciona…</option>
                    {areas.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Recurrencia</label>
                  <select value={tForm.recurrencia} onChange={e => setTForm(f => ({ ...f, recurrencia: e.target.value }))} className="noma-input">
                    {Object.keys(REC).map(k => <option key={k} value={k}>{REC[k].l}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Nombre de la tarea *</label>
                  <input value={tForm.nombre} onChange={e => setTForm(f => ({ ...f, nombre: e.target.value }))} className="noma-input" placeholder="Ej: Limpieza de mesones" required />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Tiempo estimado (min)</label>
                  <input type="number" min="0" value={tForm.tiempo_estimado_min} onChange={e => setTForm(f => ({ ...f, tiempo_estimado_min: e.target.value }))} className="noma-input" placeholder="10" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Paso a paso (uno por línea)</label>
                <textarea value={tForm.pasos} onChange={e => setTForm(f => ({ ...f, pasos: e.target.value }))} rows={5} className="noma-input" placeholder={"Retira utensilios y restos\nAplica sanitizante\nRestriega y enjuaga\nSeca la superficie"} />
              </div>
            </div>
            <button type="submit" disabled={saving} className="noma-btn-primary w-full mt-4 disabled:opacity-60">{saving ? 'Guardando…' : 'Crear tarea'}</button>
          </form>
        </div>
      )}
    </div>
  )
}
