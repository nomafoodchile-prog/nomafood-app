'use client'

import { useCallback, useEffect, useState } from 'react'
import { Users, Loader2, RefreshCw, X, Check, Ban, UserPlus, MessageSquarePlus, Building2, MapPin, Phone, Mail, Send, Link2, Copy, KeyRound, CheckCircle2 } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'

interface Sol {
  id: string; numero: string; nombre: string; empresa: string | null; rut: string | null; giro: string | null
  comuna: string | null; direccion: string | null; telefono: string | null; email: string | null; cargo: string | null
  tipo_cliente: string | null; volumen_estimado: string | null; productos_interes: string | null; horario_recepcion: string | null
  tiene_vitrina: boolean | null; comentario: string | null; origen: string | null; estado: string; cantidad_sucursales: number | null
  mayorista_id: string | null; created_at: string
}
interface Evt { id: string; tipo: string; estado: string | null; canal: string | null; mensaje: string | null; created_at: string }

const EST: Record<string, string> = { nueva: 'noma-badge-blue', en_revision: 'noma-badge-gold', contactado: 'noma-badge-gold', aprobado: 'noma-badge-green', rechazado: 'noma-badge-red', cuenta_creada: 'noma-badge-green' }
const EST_L: Record<string, string> = { nueva: 'Nueva', en_revision: 'En revisión', contactado: 'Contactado', aprobado: 'Aprobado', rechazado: 'Rechazado', cuenta_creada: 'Cuenta creada' }
function cuando(iso: string) { return new Date(iso).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' }) }

export default function SolicitudesAcceso() {
  const [rows, setRows] = useState<Sol[]>([])
  const [loading, setLoading] = useState(true)
  const [fEstado, setFEstado] = useState('todas')
  const [q, setQ] = useState('')
  const [sel, setSel] = useState<Sol | null>(null)
  const [eventos, setEventos] = useState<Evt[]>([])
  const [nota, setNota] = useState('')
  const [busy, setBusy] = useState(false)
  const [acceso, setAcceso] = useState<{ email: string; emailSent: boolean; link: string | null; waLink: string | null } | null>(null)
  // Definir contraseña (sin depender del correo)
  const [pwOpen, setPwOpen] = useState(false)
  const [pwValue, setPwValue] = useState('')
  const [pwSaving, setPwSaving] = useState(false)
  const [pwErr, setPwErr] = useState<string | null>(null)
  const [pwOk, setPwOk] = useState<{ email: string } | null>(null)

  async function definirClave(e: React.FormEvent) {
    e.preventDefault(); if (!sel?.mayorista_id) return
    setPwErr(null)
    if (pwValue.length < 6) { setPwErr('La contraseña debe tener al menos 6 caracteres.'); return }
    setPwSaving(true)
    try {
      const r = await fetch('/api/central/clientes/password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mayorista_id: sel.mayorista_id, password: pwValue }) })
      const d = await r.json()
      if (!r.ok) { setPwErr(d.error || 'No se pudo guardar.'); setPwSaving(false); return }
      setPwOk({ email: d.email || sel.email || '' })
    } catch { setPwErr('Error de conexión.') }
    setPwSaving(false)
  }

  const cargar = useCallback(async () => {
    const { data } = await supabase.from('access_requests').select('*').order('created_at', { ascending: false }).limit(300)
    setRows((data as Sol[]) || [])
    setLoading(false)
  }, [])
  useEffect(() => { cargar() }, [cargar])
  useEffect(() => {
    const ch = supabase.channel('central-solicitudes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'access_requests' }, () => cargar())
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [cargar])

  const recargarEventos = useCallback(async (id: string) => {
    const { data } = await supabase.from('access_request_events').select('*').eq('request_id', id).order('created_at', { ascending: false })
    setEventos((data as Evt[]) || [])
  }, [])
  const abrir = useCallback(async (s: Sol) => {
    setSel(s); setNota(''); setAcceso(null)
    setPwOpen(false); setPwValue(''); setPwErr(null); setPwOk(null)
    await recargarEventos(s.id)
  }, [recargarEventos])

  async function crearCuenta(mayoristaId: string, requestId: string, telefono?: string | null) {
    setBusy(true)
    try {
      const r = await fetch('/api/mayoristas/crear-cuenta', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mayorista_id: mayoristaId, request_id: requestId }) })
      const d = await r.json()
      if (r.ok) {
        const wa = telefono && d.link ? `https://wa.me/${telefono.replace(/[^0-9]/g, '')}?text=${encodeURIComponent('¡Hola! Tu cuenta del Portal Mayorista NOMMA FOOD ya está lista. Crea tu contraseña aquí: ' + d.link)}` : null
        setAcceso({ email: d.email, emailSent: d.emailSent, link: d.link, waLink: wa })
      }
      await cargar(); await recargarEventos(requestId)
    } catch { /* nada */ }
    setBusy(false)
  }

  async function cambiar(nuevo: string) {
    if (!sel) return
    setBusy(true)
    await supabase.from('access_requests').update({ estado: nuevo }).eq('id', sel.id)
    await supabase.from('access_request_events').insert({ request_id: sel.id, tipo: 'estado', estado: nuevo, canal: 'sistema', mensaje: nota || null })
    setNota(''); await cargar(); await abrir({ ...sel, estado: nuevo }); setBusy(false)
  }
  async function agregarNota() {
    if (!sel || !nota.trim()) return
    setBusy(true)
    await supabase.from('access_request_events').insert({ request_id: sel.id, tipo: 'nota', canal: 'sistema', mensaje: nota.trim() })
    setNota(''); await recargarEventos(sel.id); setBusy(false)
  }
  async function crearCliente() {
    if (!sel) return
    setBusy(true)
    const { data: may } = await supabase.from('mayoristas').insert({
      nombre: sel.nombre, empresa: sel.empresa, email: sel.email, telefono: sel.telefono, rut: sel.rut, activo: true,
      notas: `Creado desde solicitud ${sel.numero}`,
    }).select('id, token').single()
    await supabase.from('access_requests').update({ estado: 'cuenta_creada', mayorista_id: may?.id }).eq('id', sel.id)
    await supabase.from('access_request_events').insert({ request_id: sel.id, tipo: 'estado', estado: 'cuenta_creada', canal: 'sistema', mensaje: 'Cliente creado.' })
    await cargar()
    // Crea la cuenta del cliente (Supabase Auth) y le envía la invitación por email
    if (may?.id) await crearCuenta(may.id, sel.id, sel.telefono)
    else { await recargarEventos(sel.id); setBusy(false) }
  }

  const filtradas = rows.filter(r =>
    (fEstado === 'todas' || r.estado === fEstado) &&
    (q === '' || [r.empresa, r.nombre, r.comuna, r.numero, r.tipo_cliente].some(v => v?.toLowerCase().includes(q.toLowerCase())))
  )
  const c = (e: string) => rows.filter(r => r.estado === e).length
  const conversion = rows.length ? Math.round((c('cuenta_creada') / rows.length) * 100) : 0

  if (loading) return <div className="min-h-[60vh] flex items-center justify-center"><Loader2 className="w-6 h-6 text-[#1b2a4a] animate-spin" /></div>

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1b2a4a] flex items-center gap-2"><Users className="w-6 h-6 text-[#c9a24e]" /> Solicitudes de acceso</h1>
          <p className="text-sm text-gray-500 mt-0.5">Solicitudes mayoristas desde la landing pública, en tiempo real.</p>
        </div>
        <button onClick={cargar} className="flex items-center gap-1.5 text-xs font-medium text-[#1b2a4a] border border-gray-200 bg-white px-3 py-1.5 rounded-full hover:bg-gray-50"><RefreshCw size={13} /> Actualizar</button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Kpi label="Nuevas" value={c('nueva')} tone="blue" />
        <Kpi label="En revisión" value={c('en_revision') + c('contactado')} tone="gold" />
        <Kpi label="Aprobadas" value={c('aprobado')} tone="green" />
        <Kpi label="Cuentas creadas" value={c('cuenta_creada')} tone="green" />
        <Kpi label="Conversión" value={`${conversion}%`} tone="navy" />
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2">
        {['todas', 'nueva', 'en_revision', 'contactado', 'aprobado', 'rechazado', 'cuenta_creada'].map(e => (
          <button key={e} onClick={() => setFEstado(e)}
            className={`text-xs font-medium px-3 py-1.5 rounded-full border ${fEstado === e ? 'bg-[#1b2a4a] text-white border-[#1b2a4a]' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
            {e === 'todas' ? 'Todas' : EST_L[e]}
          </button>
        ))}
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar empresa, comuna, N°…"
          className="ml-auto text-sm px-3 py-1.5 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-[#c9a24e] w-52" />
      </div>

      {/* Lista */}
      {filtradas.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-card p-10 text-center text-sm text-gray-400">No hay solicitudes con estos filtros.</div>
      ) : (
        <div className="bg-white rounded-2xl shadow-card overflow-hidden divide-y divide-gray-50">
          {filtradas.map(s => (
            <button key={s.id} onClick={() => abrir(s)} className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50/60">
              <div className="w-9 h-9 rounded-lg bg-[#f5f0e8] flex items-center justify-center flex-shrink-0"><Building2 size={16} className="text-[#c9a24e]" /></div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-[#1b2a4a] truncate">{s.empresa || s.nombre}</p>
                <p className="text-xs text-gray-400 truncate">{s.numero} · {s.tipo_cliente || '—'} · {s.comuna || '—'} · {s.origen || 'directo'}</p>
              </div>
              <span className="text-[11px] text-gray-400 hidden sm:block">{cuando(s.created_at)}</span>
              <span className={EST[s.estado] || 'noma-badge-gray'}>{EST_L[s.estado] || s.estado}</span>
            </button>
          ))}
        </div>
      )}

      {/* Detalle */}
      {sel && (
        <div className="fixed inset-0 z-[1000] bg-black/50 flex items-center justify-center p-4" onClick={() => setSel(null)}>
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[88vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="bg-[#1b2a4a] text-white px-5 py-3 flex items-center justify-between">
              <div><p className="font-semibold text-sm">{sel.empresa || sel.nombre}</p><p className="text-[11px] text-white/60">{sel.numero}</p></div>
              <div className="flex items-center gap-2">
                <span className={EST[sel.estado] || 'noma-badge-gray'}>{EST_L[sel.estado] || sel.estado}</span>
                <button onClick={() => setSel(null)}><X size={18} /></button>
              </div>
            </div>
            <div className="p-5 space-y-3 overflow-y-auto">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <Dato label="Contacto" v={`${sel.nombre}${sel.cargo ? ` · ${sel.cargo}` : ''}`} />
                <Dato label="RUT" v={sel.rut} />
                <Dato label="Tipo" v={sel.tipo_cliente} />
                <Dato label="Giro" v={sel.giro} />
                <Dato label="Volumen" v={sel.volumen_estimado} />
                <Dato label="Vitrina refrig." v={sel.tiene_vitrina == null ? '—' : sel.tiene_vitrina ? 'Sí' : 'No'} />
                <Dato label="Horario" v={sel.horario_recepcion} />
                <Dato label="Origen" v={sel.origen} />
                <Dato label="Sucursales" v={sel.cantidad_sucursales != null ? String(sel.cantidad_sucursales) : '—'} />
              </div>
              <p className="text-sm text-gray-600 flex items-center gap-2"><MapPin size={14} className="text-[#c9a24e]" />{sel.direccion}, {sel.comuna}</p>
              <div className="flex flex-wrap gap-3 text-sm">
                {sel.telefono && <a href={`https://wa.me/${sel.telefono.replace(/[^0-9]/g, '')}`} target="_blank" rel="noreferrer" className="text-green-700 flex items-center gap-1"><Phone size={14} />{sel.telefono}</a>}
                {sel.email && <a href={`mailto:${sel.email}`} className="text-[#1b2a4a] flex items-center gap-1"><Mail size={14} />{sel.email}</a>}
              </div>
              {sel.productos_interes && <p className="text-xs text-gray-500"><b>Productos de interés:</b> {sel.productos_interes}</p>}
              {sel.comentario && <p className="text-xs text-gray-500 italic">“{sel.comentario}”</p>}

              {/* Historial */}
              <div className="border-t border-gray-100 pt-3">
                <p className="text-xs font-semibold text-gray-500 mb-1.5">Historial</p>
                <div className="space-y-1.5 max-h-32 overflow-y-auto">
                  {eventos.map(ev => (
                    <div key={ev.id} className="text-xs text-gray-500 flex gap-2">
                      <span className="text-gray-300">{new Date(ev.created_at).toLocaleString('es-CL', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                      <span>{ev.estado ? `→ ${EST_L[ev.estado] || ev.estado}` : ev.tipo}{ev.mensaje ? `: ${ev.mensaje}` : ''}</span>
                    </div>
                  ))}
                  {eventos.length === 0 && <p className="text-xs text-gray-300">Sin eventos.</p>}
                </div>
              </div>

              {/* Cuenta + invitación (tras crear cliente) */}
              {acceso && (
                <div className="border border-[#c9a24e]/40 bg-[#faf7ef] rounded-xl p-3 space-y-2">
                  <p className="text-xs font-semibold text-[#1b2a4a] flex items-center gap-1"><Link2 size={13} /> Cuenta del Portal Mayorista</p>
                  <p className="text-xs text-gray-600">Cuenta creada para <b>{acceso.email}</b>. {acceso.emailSent ? '✓ Invitación enviada por email' : 'Email no enviado — envía el enlace manualmente'}.</p>
                  {acceso.link && (
                    <div className="flex items-center gap-2">
                      <input readOnly value={acceso.link} onFocus={e => e.currentTarget.select()} className="flex-1 text-xs px-2 py-1.5 border border-gray-200 rounded-lg bg-white" />
                      <button onClick={() => navigator.clipboard?.writeText(acceso.link!)} className="text-xs px-2 py-1.5 border border-gray-200 rounded-lg flex items-center gap-1"><Copy size={12} /> Copiar</button>
                    </div>
                  )}
                  {acceso.waLink && <a href={acceso.waLink} target="_blank" rel="noreferrer" className="block text-center text-sm font-semibold bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg">Enviar invitación por WhatsApp</a>}
                  <p className="text-[11px] text-gray-400">El cliente crea su contraseña con ese enlace y luego entra en /portal/mayoristas/login</p>
                </div>
              )}

              {/* Nota + acciones */}
              <div className="flex gap-2">
                <input value={nota} onChange={e => setNota(e.target.value)} placeholder="Nota / motivo…" className="flex-1 text-sm px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c9a24e]" />
                <button onClick={agregarNota} disabled={busy || !nota.trim()} className="px-3 rounded-lg border border-gray-200 text-[#1b2a4a] flex items-center gap-1 text-sm disabled:opacity-50"><MessageSquarePlus size={15} /></button>
              </div>
            </div>

            <div className="border-t border-gray-100 p-3 flex flex-wrap gap-2">
              {sel.estado === 'nueva' && <Accion onClick={() => cambiar('en_revision')} busy={busy} label="En revisión" />}
              {sel.estado === 'en_revision' && <Accion onClick={() => cambiar('contactado')} busy={busy} label="Marcar contactado" />}
              {['en_revision', 'contactado'].includes(sel.estado) && <Accion onClick={() => cambiar('aprobado')} busy={busy} label="Aprobar" icon={Check} tone="green" />}
              {sel.estado === 'aprobado' && <Accion onClick={crearCliente} busy={busy} label="Crear cliente + acceso" icon={UserPlus} tone="gold" />}
              {sel.estado === 'cuenta_creada' && sel.mayorista_id && <Accion onClick={() => { setPwOpen(true); setPwValue(''); setPwErr(null); setPwOk(null) }} busy={busy} label="Definir contraseña" icon={KeyRound} tone="gold" />}
              {sel.estado === 'cuenta_creada' && sel.mayorista_id && <Accion onClick={() => crearCuenta(sel.mayorista_id!, sel.id, sel.telefono)} busy={busy} label="Reenviar invitación" icon={Send} />}
              {!['rechazado', 'cuenta_creada'].includes(sel.estado) && <Accion onClick={() => cambiar('rechazado')} busy={busy} label="Rechazar" icon={Ban} tone="red" />}
            </div>
          </div>
        </div>
      )}

      {/* Modal Definir contraseña */}
      {pwOpen && sel && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setPwOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-bold text-[#1a1a1a] flex items-center gap-2"><KeyRound size={16} className="text-[#c9a24e]" /> Contraseña de acceso</h3>
              <button onClick={() => setPwOpen(false)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"><X size={16} /></button>
            </div>
            <p className="text-xs text-gray-500 mb-4">{sel.empresa || sel.nombre}{sel.email ? ` · ${sel.email}` : ''}</p>

            {!sel.email ? (
              <div className="text-sm text-amber-700 bg-amber-50 rounded-xl p-3">Esta solicitud no tiene correo. No se puede crear el acceso.</div>
            ) : pwOk ? (
              <div>
                <div className="flex items-center gap-2 text-green-700 bg-green-50 rounded-xl p-3 mb-3 text-sm"><CheckCircle2 size={18} /> ¡Listo! Ya puede entrar con su correo y esta clave.</div>
                <div className="bg-gray-50 rounded-xl p-3 text-sm space-y-2">
                  <div className="flex items-center justify-between gap-2"><span className="text-gray-400 text-xs">Correo</span><span className="font-mono text-[#1a1a1a] text-xs">{pwOk.email}</span></div>
                  <div className="flex items-center justify-between gap-2"><span className="text-gray-400 text-xs">Contraseña</span><span className="font-mono text-[#1a1a1a]">{pwValue}</span></div>
                  <div className="flex items-center justify-between gap-2"><span className="text-gray-400 text-xs">Portal</span><span className="text-[#1a1a1a] text-xs">nommafood.cl/portal/mayoristas/login</span></div>
                </div>
                <button onClick={() => navigator.clipboard?.writeText(`Ingresa a NOMMA FOOD:\nPortal: https://nommafood.cl/portal/mayoristas/login\nCorreo: ${pwOk.email}\nContraseña: ${pwValue}`)} className="w-full mt-3 flex items-center justify-center gap-2 text-sm font-semibold border border-gray-200 rounded-xl py-2.5 text-gray-600 hover:border-[#c9a24e]"><Copy size={14} /> Copiar datos para enviar al cliente</button>
                <button onClick={() => setPwOpen(false)} className="w-full mt-2 bg-[#c9a24e] hover:bg-[#b8923f] text-[#1b2a4a] font-bold py-2.5 rounded-xl">Cerrar</button>
              </div>
            ) : (
              <form onSubmit={definirClave} className="space-y-3">
                <p className="text-xs text-gray-500">Define una contraseña y entrégasela al cliente. Entra directo, sin correo de invitación.</p>
                <input type="text" value={pwValue} onChange={e => setPwValue(e.target.value)} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#c9a24e]" placeholder="Mínimo 6 caracteres" autoFocus />
                {pwErr && <p className="text-sm text-red-600">{pwErr}</p>}
                <button type="submit" disabled={pwSaving} className="w-full bg-[#c9a24e] hover:bg-[#b8923f] text-[#1b2a4a] font-bold py-2.5 rounded-xl disabled:opacity-60">{pwSaving ? 'Guardando…' : 'Definir contraseña'}</button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function Kpi({ label, value, tone }: { label: string; value: string | number; tone: 'blue' | 'gold' | 'green' | 'navy' }) {
  const col = tone === 'blue' ? 'text-blue-600' : tone === 'gold' ? 'text-[#c9a24e]' : tone === 'green' ? 'text-green-600' : 'text-[#1b2a4a]'
  return <div className="bg-white rounded-2xl shadow-card p-4"><p className={`text-2xl font-bold ${col}`}>{value}</p><p className="text-xs text-gray-500">{label}</p></div>
}
function Dato({ label, v }: { label: string; v: string | null | undefined }) {
  return <div><p className="text-[11px] text-gray-400">{label}</p><p className="text-sm text-gray-800">{v || '—'}</p></div>
}
function Accion({ onClick, busy, label, icon: Icon, tone }: { onClick: () => void; busy: boolean; label: string; icon?: React.ElementType; tone?: 'green' | 'red' | 'gold' }) {
  const cls = tone === 'green' ? 'bg-green-600 text-white hover:bg-green-700' : tone === 'red' ? 'bg-red-600 text-white hover:bg-red-700' : tone === 'gold' ? 'bg-[#c9a24e] text-[#1b2a4a] hover:bg-[#b8923f]' : 'bg-[#1b2a4a] text-white hover:bg-[#142033]'
  return <button onClick={onClick} disabled={busy} className={`text-sm font-semibold px-3 py-2 rounded-xl flex items-center gap-1.5 disabled:opacity-50 ${cls}`}>{Icon && <Icon size={15} />}{label}</button>
}
