'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Loader2, RefreshCw, Truck, UserPlus, X, Copy, Check, Pencil, Trash2, Phone, Package } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'

type Row = Record<string, unknown>
const S = (v: unknown) => v === null || v === undefined ? '' : String(v)
const ACTIVOS = ['pendiente', 'cargado', 'en_ruta', 'llego_cliente', 'incidencia']

export default function ChoferesPage() {
  const [loading, setLoading] = useState(true)
  const [drivers, setDrivers] = useState<Row[]>([])
  const [profs, setProfs] = useState<Row[]>([])
  const [peds, setPeds] = useState<Row[]>([])
  const [crearOpen, setCrearOpen] = useState(false)
  const [editing, setEditing] = useState<Row | null>(null)
  const [borrando, setBorrando] = useState(false)

  const cargar = useCallback(async () => {
    const { data: d } = await supabase.from('drivers').select('id, profile_id, nombre, telefono, activo')
    const lista = (d as Row[]) || []
    setDrivers(lista)
    const ids = lista.map(x => S(x.profile_id)).filter(Boolean)
    const { data: p } = ids.length ? await supabase.from('profiles').select('id, full_name, email').in('id', ids) : { data: [] }
    setProfs((p as Row[]) || [])
    // Pedidos asignados a algún chofer (con su estado de entrega) para las estadísticas.
    const { data: pe } = await supabase.from('mayorista_pedidos')
      .select('chofer_id, estado_entrega, hora_programada').not('chofer_id', 'is', null)
    setPeds((pe as Row[]) || [])
    setLoading(false)
  }, [])

  useEffect(() => { cargar() }, [cargar])
  useEffect(() => {
    const ch = supabase.channel('central-choferes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mayorista_pedidos' }, () => cargar())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'drivers' }, () => cargar())
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [cargar])

  const prof = (pid: unknown) => profs.find(p => S(p.id) === S(pid))
  const nombreDe = (dr: Row) => S(dr.nombre) || S(prof(dr.profile_id)?.full_name) || S(prof(dr.profile_id)?.email) || 'Chofer'

  const stats = useMemo(() => {
    const m = new Map<string, { total: number; entregadas: number; pendientes: number; incidencias: number }>()
    for (const dr of drivers) m.set(S(dr.id), { total: 0, entregadas: 0, pendientes: 0, incidencias: 0 })
    for (const p of peds) {
      const s = m.get(S(p.chofer_id)); if (!s) continue
      s.total++
      const e = S(p.estado_entrega)
      if (e === 'entregado') s.entregadas++
      else if (e === 'incidencia' || e === 'no_entregado') s.incidencias++
      else if (ACTIVOS.includes(e)) s.pendientes++
    }
    return m
  }, [drivers, peds])

  async function eliminar(dr: Row) {
    if (!confirm(`¿Eliminar al chofer ${nombreDe(dr)}? Se borra su acceso y se liberan sus pedidos.`)) return
    setBorrando(true)
    const r = await fetch('/api/central/choferes/gestionar', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'eliminar', profile_id: dr.profile_id }),
    })
    setBorrando(false)
    if (!r.ok) { const e = await r.json().catch(() => ({})); alert(e.error || 'No se pudo eliminar.'); return }
    setLoading(true); cargar()
  }

  if (loading) return <div className="py-20 flex justify-center"><Loader2 className="w-6 h-6 text-[#1b2a4a] animate-spin" /></div>

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#1a1a1a] flex items-center gap-2"><Truck size={22} /> Choferes</h1>
          <p className="text-sm text-gray-500">{drivers.length} chofer{drivers.length === 1 ? '' : 'es'} · en tiempo real</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { setLoading(true); cargar() }} className="flex items-center gap-2 text-sm font-semibold text-[#1b2a4a] border border-gray-200 rounded-lg px-3 py-2 hover:bg-gray-50"><RefreshCw size={15} /> Actualizar</button>
          <button onClick={() => setCrearOpen(true)} className="flex items-center gap-2 text-sm font-semibold bg-[#c9a24e] text-[#1b2a4a] rounded-lg px-4 py-2 hover:bg-[#b8923f]"><UserPlus size={15} /> Crear chofer</button>
        </div>
      </div>

      {drivers.length === 0 ? (
        <div className="noma-card text-center text-gray-400 py-10">
          <Truck className="w-8 h-8 mx-auto text-gray-300 mb-2" />
          <p className="text-sm mb-3">Aún no hay choferes registrados.</p>
          <button onClick={() => setCrearOpen(true)} className="inline-flex items-center gap-2 text-sm font-semibold bg-[#c9a24e] text-[#1b2a4a] rounded-lg px-4 py-2 hover:bg-[#b8923f]"><UserPlus size={15} /> Crear el primero</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {drivers.map(dr => {
            const st = stats.get(S(dr.id)) || { total: 0, entregadas: 0, pendientes: 0, incidencias: 0 }
            const activo = dr.activo !== false
            return (
              <div key={S(dr.id)} className="noma-card !p-4">
                <div className="flex items-start justify-between">
                  <div className="min-w-0">
                    <div className="font-semibold text-[#1b2a4a] truncate">{nombreDe(dr)}</div>
                    <div className="text-xs text-gray-500 truncate">{S(prof(dr.profile_id)?.email)}</div>
                    {dr.telefono ? <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5"><Phone size={11} /> {S(dr.telefono)}</div> : null}
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${activo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{activo ? 'Activo' : 'Inactivo'}</span>
                </div>
                <div className="grid grid-cols-4 gap-2 mt-3 text-center">
                  <Mini label="Total" value={st.total} />
                  <Mini label="Entreg." value={st.entregadas} tone="pos" />
                  <Mini label="Pend." value={st.pendientes} />
                  <Mini label="Incid." value={st.incidencias} tone={st.incidencias > 0 ? 'neg' : undefined} />
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <button onClick={() => setEditing(dr)} className="flex items-center gap-1.5 text-xs font-semibold text-[#1b2a4a] border border-gray-200 rounded-lg px-2.5 py-1.5 hover:bg-gray-50"><Pencil size={13} /> Editar</button>
                  <button onClick={() => eliminar(dr)} disabled={borrando} className="flex items-center gap-1.5 text-xs font-semibold text-[#E24B4A] border border-red-200 rounded-lg px-2.5 py-1.5 hover:bg-red-50 disabled:opacity-50"><Trash2 size={13} /> Eliminar</button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <p className="text-xs text-gray-400 flex items-center gap-1"><Package size={13} /> Cada chofer entra en <b>nommafood.cl/chofer/login</b> y ve solo sus entregas. Los resultados se reflejan aquí en tiempo real.</p>

      {crearOpen && <CrearChoferModal onClose={() => setCrearOpen(false)} onCreated={() => { setCrearOpen(false); setLoading(true); cargar() }} />}
      {editing && <EditarChoferModal driver={editing} email={S(prof(editing.profile_id)?.email)} onClose={() => setEditing(null)} onDone={() => { setEditing(null); setLoading(true); cargar() }} />}
    </div>
  )
}

function Mini({ label, value, tone }: { label: string; value: number; tone?: 'pos' | 'neg' }) {
  const c = tone === 'pos' ? 'text-[#639922]' : tone === 'neg' ? 'text-[#E24B4A]' : 'text-[#1b2a4a]'
  return <div className="bg-gray-50 rounded-lg py-1.5"><div className={`text-lg font-bold ${c}`}>{value}</div><div className="text-[10px] text-gray-500">{label}</div></div>
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="text-xs font-medium text-gray-600 mb-1 block">{label}</span>{children}</label>
}

function CrearChoferModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [nombre, setNombre] = useState('')
  const [telefono, setTelefono] = useState('')
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
      const r = await fetch('/api/central/choferes/crear', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre, telefono, email: email || undefined, password: pass || undefined }),
      })
      const d = await r.json()
      if (!r.ok || !d.ok) { setError(d.error || 'No se pudo crear'); return }
      setCreado({ nombre: d.nombre, email: d.email, password: d.password })
    } catch { setError('Error de conexión') } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-md w-full max-h-[88vh] overflow-auto" onClick={e => e.stopPropagation()}>
        <div className="p-5 border-b flex items-center justify-between">
          <h2 className="font-bold text-[#1b2a4a]">{creado ? '✅ Chofer creado' : 'Crear chofer'}</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        {creado ? (
          <div className="p-5 space-y-4">
            <p className="text-sm text-gray-600">Entrégale estas credenciales a <b>{creado.nombre}</b>. Entra en <b>nommafood.cl/chofer/login</b>.</p>
            <div className="bg-[#f6f3ec] border border-[#e7ddc4] rounded-xl p-4 text-sm space-y-2">
              <div className="flex justify-between gap-3"><span className="text-gray-500">Correo</span><span className="font-semibold text-[#1b2a4a] break-all">{creado.email}</span></div>
              <div className="flex justify-between gap-3"><span className="text-gray-500">Contraseña</span><span className="font-semibold text-[#1b2a4a]">{creado.password}</span></div>
            </div>
            <button onClick={() => { navigator.clipboard?.writeText(`Portal Chofer NOMMA\nEntra en: https://nommafood.cl/chofer/login\nCorreo: ${creado.email}\nContraseña: ${creado.password}`); setCopiado(true); setTimeout(() => setCopiado(false), 2000) }}
              className="w-full flex items-center justify-center gap-2 border border-gray-200 rounded-xl py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50">
              {copiado ? <><Check size={15} className="text-green-600" /> Copiado</> : <><Copy size={15} /> Copiar credenciales</>}
            </button>
            <button onClick={onCreated} className="w-full bg-[#c9a24e] text-[#1b2a4a] font-semibold rounded-xl py-2.5 text-sm hover:bg-[#b8923f]">Listo</button>
          </div>
        ) : (
          <div className="p-5 space-y-3">
            <Campo label="Nombre completo *"><input className="noma-input" value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej. Pedro Soto" /></Campo>
            <Campo label="Teléfono"><input className="noma-input" value={telefono} onChange={e => setTelefono(e.target.value)} placeholder="+56 9 ..." /></Campo>
            <Campo label="Correo (opcional)"><input className="noma-input" value={email} onChange={e => setEmail(e.target.value)} placeholder="Vacío = se genera automático" /></Campo>
            <Campo label="Contraseña (opcional)"><input className="noma-input" value={pass} onChange={e => setPass(e.target.value)} placeholder="Vacío = se genera una" /></Campo>
            {error && <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg px-3 py-2">{error}</div>}
            <button onClick={crear} disabled={saving} className="w-full bg-[#c9a24e] text-[#1b2a4a] font-semibold rounded-xl py-2.5 text-sm hover:bg-[#b8923f] flex items-center justify-center gap-2 disabled:opacity-60">
              {saving ? <Loader2 size={15} className="animate-spin" /> : <UserPlus size={15} />} Crear chofer
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function EditarChoferModal({ driver, email, onClose, onDone }: { driver: Row; email?: string; onClose: () => void; onDone: () => void }) {
  const [nombre, setNombre] = useState(S(driver.nombre))
  const [telefono, setTelefono] = useState(S(driver.telefono))
  const [activo, setActivo] = useState(driver.activo !== false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resetting, setResetting] = useState(false)
  const [nuevaPass, setNuevaPass] = useState<string | null>(null)
  const [copiado, setCopiado] = useState(false)

  async function resetearPass() {
    if (!confirm('¿Generar una contraseña nueva para este chofer? La anterior dejará de funcionar.')) return
    setResetting(true); setError(null)
    try {
      const r = await fetch('/api/central/choferes/gestionar', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'password', profile_id: driver.profile_id }),
      })
      const d = await r.json()
      if (!r.ok || !d.ok) { setError(d.error || 'No se pudo resetear la contraseña'); return }
      setNuevaPass(d.password)
    } catch { setError('Error de conexión') } finally { setResetting(false) }
  }

  async function guardar() {
    setSaving(true); setError(null)
    try {
      const r = await fetch('/api/central/choferes/gestionar', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'editar', profile_id: driver.profile_id, nombre, telefono, activo }),
      })
      const d = await r.json()
      if (!r.ok || !d.ok) { setError(d.error || 'No se pudo guardar'); return }
      onDone()
    } catch { setError('Error de conexión') } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-md w-full" onClick={e => e.stopPropagation()}>
        <div className="p-5 border-b flex items-center justify-between">
          <h2 className="font-bold text-[#1b2a4a]">Editar chofer</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <div className="p-5 space-y-3">
          <Campo label="Nombre completo"><input className="noma-input" value={nombre} onChange={e => setNombre(e.target.value)} /></Campo>
          <Campo label="Teléfono"><input className="noma-input" value={telefono} onChange={e => setTelefono(e.target.value)} /></Campo>
          <label className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={activo} onChange={e => setActivo(e.target.checked)} /> Activo (puede iniciar sesión y recibir entregas)</label>
          {error && <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg px-3 py-2">{error}</div>}
          <button onClick={guardar} disabled={saving} className="w-full bg-[#c9a24e] text-[#1b2a4a] font-semibold rounded-xl py-2.5 text-sm hover:bg-[#b8923f] flex items-center justify-center gap-2 disabled:opacity-60">
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />} Guardar cambios
          </button>

          <div className="pt-3 mt-1 border-t">
            <div className="text-xs font-medium text-gray-600 mb-2">Contraseña de acceso</div>
            {nuevaPass ? (
              <div className="bg-[#f6f3ec] border border-[#e7ddc4] rounded-xl p-3 text-sm space-y-2">
                <p className="text-gray-600 text-xs">Entrégale estos datos al chofer. Entra en <b>nommafood.cl/chofer/login</b></p>
                {email ? <div className="flex justify-between gap-3"><span className="text-gray-500">Correo</span><span className="font-semibold text-[#1b2a4a] break-all">{email}</span></div> : null}
                <div className="flex justify-between gap-3"><span className="text-gray-500">Contraseña</span><span className="font-bold text-[#1b2a4a]">{nuevaPass}</span></div>
                <button onClick={() => { navigator.clipboard?.writeText(`Portal Chofer NOMMA\nEntra en: https://nommafood.cl/chofer/login\nCorreo: ${email || ''}\nContraseña: ${nuevaPass}`); setCopiado(true); setTimeout(() => setCopiado(false), 2000) }}
                  className="w-full flex items-center justify-center gap-2 border border-gray-200 bg-white rounded-xl py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">
                  {copiado ? <><Check size={15} className="text-green-600" /> Copiado</> : <><Copy size={15} /> Copiar credenciales</>}
                </button>
              </div>
            ) : (
              <button onClick={resetearPass} disabled={resetting} className="w-full flex items-center justify-center gap-2 border border-gray-200 rounded-xl py-2.5 text-sm font-semibold text-[#1b2a4a] hover:bg-gray-50 disabled:opacity-60">
                {resetting ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />} Resetear contraseña
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
