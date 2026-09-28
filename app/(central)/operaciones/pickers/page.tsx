'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Loader2, RefreshCw, PackageCheck, UserPlus, X, Copy, Check, Pencil, Trash2, ClipboardList } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'

type Row = Record<string, unknown>
const S = (v: unknown) => v === null || v === undefined ? '' : String(v)

export default function PickersPage() {
  const [loading, setLoading] = useState(true)
  const [ops, setOps] = useState<Row[]>([])
  const [profs, setProfs] = useState<Row[]>([])
  const [peds, setPeds] = useState<Row[]>([])
  const [crearOpen, setCrearOpen] = useState(false)
  const [editing, setEditing] = useState<Row | null>(null)
  const [borrando, setBorrando] = useState(false)
  const [asignando, setAsignando] = useState<string | null>(null)

  const cargar = useCallback(async () => {
    const { data: o } = await supabase.from('operarios').select('profile_id, area, activo')
    const lista = (o as Row[]) || []
    const ids = lista.map(x => S(x.profile_id)).filter(Boolean)
    const { data: p } = ids.length ? await supabase.from('profiles').select('id, full_name, email, role').in('id', ids) : { data: [] }
    const profList = (p as Row[]) || []
    setProfs(profList)
    // Pickers = trabajadores con rol Armado (o área Armado).
    const pickers = lista.filter(x => {
      const pr = profList.find(pp => S(pp.id) === S(x.profile_id))
      return S(pr?.role) === 'Armado' || S(x.area) === 'Armado'
    })
    setOps(pickers)
    const { data: pe } = await supabase.from('mayorista_pedidos')
      .select('id, numero_pedido, estado_armado, picker_id, direccion_entrega, mayorista:mayoristas(nombre, empresa)')
      .order('created_at', { ascending: false })
    setPeds((pe as Row[]) || [])
    setLoading(false)
  }, [])

  useEffect(() => { cargar() }, [cargar])
  useEffect(() => {
    const ch = supabase.channel('central-pickers')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mayorista_pedidos' }, () => cargar())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'operarios' }, () => cargar())
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [cargar])

  const prof = (pid: unknown) => profs.find(p => S(p.id) === S(pid))
  const nombreDe = (pid: unknown) => S(prof(pid)?.full_name) || S(prof(pid)?.email) || 'Picker'

  const stats = useMemo(() => {
    const m = new Map<string, { asignados: number; enArmado: number; armados: number }>()
    for (const o of ops) m.set(S(o.profile_id), { asignados: 0, enArmado: 0, armados: 0 })
    for (const p of peds) {
      const s = m.get(S(p.picker_id)); if (!s) continue
      const e = S(p.estado_armado)
      if (e === 'armado') s.armados++
      else if (e === 'en_armado') s.enArmado++
      else s.asignados++
    }
    return m
  }, [ops, peds])

  const sinAsignar = useMemo(() => peds.filter(p => !p.picker_id && S(p.estado_armado) !== 'armado'), [peds])

  async function asignar(pedidoId: string, pickerProfileId: string) {
    if (!pickerProfileId) return
    setAsignando(pedidoId)
    await fetch('/api/central/pickers/asignar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pedido_id: pedidoId, picker_id: pickerProfileId }) })
    setAsignando(null); setLoading(true); cargar()
  }

  async function eliminar(o: Row) {
    if (!confirm(`¿Eliminar al picker ${nombreDe(o.profile_id)}? Se borra su acceso.`)) return
    setBorrando(true)
    const r = await fetch('/api/central/operarios/gestionar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'eliminar', profile_id: o.profile_id }) })
    setBorrando(false)
    if (!r.ok) { const e = await r.json().catch(() => ({})); alert(e.error || 'No se pudo eliminar.'); return }
    setLoading(true); cargar()
  }

  if (loading) return <div className="py-20 flex justify-center"><Loader2 className="w-6 h-6 text-[#1b2a4a] animate-spin" /></div>

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#1a1a1a] flex items-center gap-2"><PackageCheck size={22} /> Pickers · Armado</h1>
          <p className="text-sm text-gray-500">{ops.length} picker{ops.length === 1 ? '' : 's'} · en tiempo real</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { setLoading(true); cargar() }} className="flex items-center gap-2 text-sm font-semibold text-[#1b2a4a] border border-gray-200 rounded-lg px-3 py-2 hover:bg-gray-50"><RefreshCw size={15} /> Actualizar</button>
          <button onClick={() => setCrearOpen(true)} className="flex items-center gap-2 text-sm font-semibold bg-[#c9a24e] text-[#1b2a4a] rounded-lg px-4 py-2 hover:bg-[#b8923f]"><UserPlus size={15} /> Crear picker</button>
        </div>
      </div>

      {ops.length === 0 ? (
        <div className="noma-card text-center text-gray-400 py-10">
          <PackageCheck className="w-8 h-8 mx-auto text-gray-300 mb-2" />
          <p className="text-sm mb-3">Aún no hay pickers registrados.</p>
          <button onClick={() => setCrearOpen(true)} className="inline-flex items-center gap-2 text-sm font-semibold bg-[#c9a24e] text-[#1b2a4a] rounded-lg px-4 py-2 hover:bg-[#b8923f]"><UserPlus size={15} /> Crear el primero</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {ops.map(o => {
            const st = stats.get(S(o.profile_id)) || { asignados: 0, enArmado: 0, armados: 0 }
            const activo = o.activo !== false
            return (
              <div key={S(o.profile_id)} className="noma-card !p-4">
                <div className="flex items-start justify-between">
                  <div className="min-w-0">
                    <div className="font-semibold text-[#1b2a4a] truncate">{nombreDe(o.profile_id)}</div>
                    <div className="text-xs text-gray-500 truncate">{S(prof(o.profile_id)?.email)}</div>
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${activo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{activo ? 'Activo' : 'Inactivo'}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-3 text-center">
                  <Mini label="Por armar" value={st.asignados} />
                  <Mini label="En armado" value={st.enArmado} tone="mid" />
                  <Mini label="Armados" value={st.armados} tone="pos" />
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <button onClick={() => setEditing(o)} className="flex items-center gap-1.5 text-xs font-semibold text-[#1b2a4a] border border-gray-200 rounded-lg px-2.5 py-1.5 hover:bg-gray-50"><Pencil size={13} /> Editar</button>
                  <button onClick={() => eliminar(o)} disabled={borrando} className="flex items-center gap-1.5 text-xs font-semibold text-[#E24B4A] border border-red-200 rounded-lg px-2.5 py-1.5 hover:bg-red-50 disabled:opacity-50"><Trash2 size={13} /> Eliminar</button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div>
        <h2 className="text-sm font-semibold text-[#1b2a4a] mb-2 flex items-center gap-2"><ClipboardList size={16} /> Pedidos por asignar ({sinAsignar.length})</h2>
        {sinAsignar.length === 0 ? <p className="text-sm text-gray-400">No hay pedidos pendientes de asignar.</p> : (
          <div className="space-y-2">
            {sinAsignar.map(p => (
              <div key={S(p.id)} className="noma-card !p-3 flex items-center justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <div className="font-medium text-[#1a1a1a] truncate">{S((p.mayorista as Row)?.empresa) || S((p.mayorista as Row)?.nombre) || 'Cliente'}</div>
                  <div className="text-xs text-gray-500 truncate">Pedido #{S(p.numero_pedido)} · {S(p.direccion_entrega) || 'Sin dirección'}</div>
                </div>
                <select disabled={asignando === S(p.id) || ops.length === 0} defaultValue="" onChange={e => asignar(S(p.id), e.target.value)}
                  className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 bg-white">
                  <option value="" disabled>Asignar a…</option>
                  {ops.filter(o => o.activo !== false).map(o => <option key={S(o.profile_id)} value={S(o.profile_id)}>{nombreDe(o.profile_id)}</option>)}
                </select>
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="text-xs text-gray-400 flex items-center gap-1"><PackageCheck size={13} /> Cada picker entra en <b>nommafood.cl/picker/login</b>, arma sus pedidos y confirma ítems. El avance se refleja aquí en tiempo real.</p>

      {crearOpen && <CrearPickerModal onClose={() => setCrearOpen(false)} onCreated={() => { setCrearOpen(false); setLoading(true); cargar() }} />}
      {editing && <EditarPickerModal profileId={S(editing.profile_id)} nombreActual={nombreDe(editing.profile_id)} activoActual={editing.activo !== false} onClose={() => setEditing(null)} onDone={() => { setEditing(null); setLoading(true); cargar() }} />}
    </div>
  )
}

function Mini({ label, value, tone }: { label: string; value: number; tone?: 'pos' | 'mid' }) {
  const c = tone === 'pos' ? 'text-[#639922]' : tone === 'mid' ? 'text-[#EF9F27]' : 'text-[#1b2a4a]'
  return <div className="bg-gray-50 rounded-lg py-1.5"><div className={`text-lg font-bold ${c}`}>{value}</div><div className="text-[10px] text-gray-500">{label}</div></div>
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="text-xs font-medium text-gray-600 mb-1 block">{label}</span>{children}</label>
}

function CrearPickerModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [pass, setPass] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [creado, setCreado] = useState<{ nombre: string; email: string; password: string } | null>(null)
  const [copiado, setCopiado] = useState(false)

  async function crear() {
    if (!nombre.trim()) { setError('El nombre es obligatorio'); return }
    setSaving(true); setError(null)
    try {
      const r = await fetch('/api/central/pickers/crear', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nombre, email: email || undefined, password: pass || undefined }) })
      const d = await r.json()
      if (!r.ok || !d.ok) { setError(d.error || 'No se pudo crear'); return }
      setCreado({ nombre: d.nombre, email: d.email, password: d.password })
    } catch { setError('Error de conexión') } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-md w-full max-h-[88vh] overflow-auto" onClick={e => e.stopPropagation()}>
        <div className="p-5 border-b flex items-center justify-between">
          <h2 className="font-bold text-[#1b2a4a]">{creado ? '✅ Picker creado' : 'Crear picker'}</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        {creado ? (
          <div className="p-5 space-y-4">
            <p className="text-sm text-gray-600">Entrégale estas credenciales a <b>{creado.nombre}</b>. Entra en <b>nommafood.cl/picker/login</b>.</p>
            <div className="bg-[#f6f3ec] border border-[#e7ddc4] rounded-xl p-4 text-sm space-y-2">
              <div className="flex justify-between gap-3"><span className="text-gray-500">Correo</span><span className="font-semibold text-[#1b2a4a] break-all">{creado.email}</span></div>
              <div className="flex justify-between gap-3"><span className="text-gray-500">Contraseña</span><span className="font-semibold text-[#1b2a4a]">{creado.password}</span></div>
            </div>
            <button onClick={() => { navigator.clipboard?.writeText(`Portal Picker NOMMA\nEntra en: https://nommafood.cl/picker/login\nCorreo: ${creado.email}\nContraseña: ${creado.password}`); setCopiado(true); setTimeout(() => setCopiado(false), 2000) }}
              className="w-full flex items-center justify-center gap-2 border border-gray-200 rounded-xl py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50">
              {copiado ? <><Check size={15} className="text-green-600" /> Copiado</> : <><Copy size={15} /> Copiar credenciales</>}
            </button>
            <button onClick={onCreated} className="w-full bg-[#c9a24e] text-[#1b2a4a] font-semibold rounded-xl py-2.5 text-sm hover:bg-[#b8923f]">Listo</button>
          </div>
        ) : (
          <div className="p-5 space-y-3">
            <Campo label="Nombre completo *"><input className="noma-input" value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej. Carla Ruiz" /></Campo>
            <Campo label="Correo (opcional)"><input className="noma-input" value={email} onChange={e => setEmail(e.target.value)} placeholder="Vacío = se genera automático" /></Campo>
            <Campo label="Contraseña (opcional)"><input className="noma-input" value={pass} onChange={e => setPass(e.target.value)} placeholder="Vacío = se genera una" /></Campo>
            {error && <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg px-3 py-2">{error}</div>}
            <button onClick={crear} disabled={saving} className="w-full bg-[#c9a24e] text-[#1b2a4a] font-semibold rounded-xl py-2.5 text-sm hover:bg-[#b8923f] flex items-center justify-center gap-2 disabled:opacity-60">
              {saving ? <Loader2 size={15} className="animate-spin" /> : <UserPlus size={15} />} Crear picker
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function EditarPickerModal({ profileId, nombreActual, activoActual, onClose, onDone }: { profileId: string; nombreActual: string; activoActual: boolean; onClose: () => void; onDone: () => void }) {
  const [nombre, setNombre] = useState(nombreActual)
  const [activo, setActivo] = useState(activoActual)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function guardar() {
    setSaving(true); setError(null)
    try {
      const r = await fetch('/api/central/operarios/gestionar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'editar', profile_id: profileId, nombre, activo }) })
      const d = await r.json()
      if (!r.ok || !d.ok) { setError(d.error || 'No se pudo guardar'); return }
      onDone()
    } catch { setError('Error de conexión') } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-md w-full" onClick={e => e.stopPropagation()}>
        <div className="p-5 border-b flex items-center justify-between">
          <h2 className="font-bold text-[#1b2a4a]">Editar picker</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <div className="p-5 space-y-3">
          <Campo label="Nombre completo"><input className="noma-input" value={nombre} onChange={e => setNombre(e.target.value)} /></Campo>
          <label className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={activo} onChange={e => setActivo(e.target.checked)} /> Activo (puede iniciar sesión y armar pedidos)</label>
          {error && <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg px-3 py-2">{error}</div>}
          <button onClick={guardar} disabled={saving} className="w-full bg-[#c9a24e] text-[#1b2a4a] font-semibold rounded-xl py-2.5 text-sm hover:bg-[#b8923f] flex items-center justify-center gap-2 disabled:opacity-60">
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />} Guardar cambios
          </button>
        </div>
      </div>
    </div>
  )
}
