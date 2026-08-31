'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, X, Search, Users, TrendingUp, AlertCircle, Building2, Loader2, KeyRound, CheckCircle2, Copy, ShoppingCart } from 'lucide-react'
import { NOMMA_PORTAL_URL, BROTES_PORTAL_URL } from '@/lib/marca-portal'

interface Cliente {
  id: string
  empresa: string
  rut: string
  email: string
  telefono: string
  ciudad: string
  tipo: string
  saldoPendiente: number
  estado: string
  contacto?: string
  marca?: string
}

// Datos de marca para el mensaje que se copia y se envía al cliente.
// Brotes usa su dominio propio (mayoristas.brotesasiaticos.cl); NOMMA, nommafood.cl.
const MARCA_INFO = {
  nomma:  { nombre: 'NOMMA FOOD',       login: `${NOMMA_PORTAL_URL}/portal/mayoristas/login` },
  brotes: { nombre: 'BROTES ASIÁTICOS', login: `${BROTES_PORTAL_URL}/portal/mayoristas/login?marca=brotes` },
} as const
const marcaDe = (c?: { marca?: string } | null): 'nomma' | 'brotes' =>
  String(c?.marca || '').toLowerCase().includes('brotes') ? 'brotes' : 'nomma'

function clp(n: number) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n)
}

function tipoBadge(tipo: string) {
  const t = (tipo || '').toLowerCase()
  if (t.includes('mayor')) return <span className="noma-badge-gold">{tipo}</span>
  if (t.includes('rest') || t.includes('cafe') || t.includes('café')) return <span className="noma-badge-blue">{tipo}</span>
  return <span className="noma-badge-gray">{tipo || '—'}</span>
}

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState<'Todos' | 'Activo' | 'Inactivo'>('Todos')
  const [form, setForm] = useState({ empresa: '', rut: '', email: '', telefono: '', contacto: '', estado: 'Activo' })
  // Interruptor de compras del portal (marcha blanca)
  const [pedOn, setPedOn] = useState<boolean | null>(null)
  const [pedSaving, setPedSaving] = useState(false)
  useEffect(() => {
    fetch('/api/central/config').then(r => r.ok ? r.json() : { pedidos_habilitados: false })
      .then(d => setPedOn(!!d.pedidos_habilitados)).catch(() => setPedOn(false))
  }, [])
  async function togglePedidos(next: boolean) {
    setPedSaving(true)
    try {
      const r = await fetch('/api/central/config', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ habilitado: next }) })
      if (r.ok) setPedOn(next); else { const d = await r.json(); alert(d.error || 'No se pudo cambiar.') }
    } catch { alert('Error de conexión.') }
    setPedSaving(false)
  }

  // Modal de contraseña
  const [pwCliente, setPwCliente] = useState<Cliente | null>(null)
  const [pwEmail, setPwEmail] = useState('')
  const [pwValue, setPwValue] = useState('')
  const [pwSaving, setPwSaving] = useState(false)
  const [pwErr, setPwErr] = useState<string | null>(null)
  const [pwOk, setPwOk] = useState(false)

  function abrirClave(c: Cliente) {
    setPwCliente(c); setPwEmail(c.email || ''); setPwValue(''); setPwErr(null); setPwOk(false)
  }
  async function definirClave(e: React.FormEvent) {
    e.preventDefault(); if (!pwCliente) return
    setPwErr(null)
    if (!pwEmail.trim().includes('@')) { setPwErr('Escribe un correo válido.'); return }
    if (pwValue.length < 6) { setPwErr('La contraseña debe tener al menos 6 caracteres.'); return }
    setPwSaving(true)
    try {
      const res = await fetch('/api/central/clientes/password', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mayorista_id: pwCliente.id, email: pwEmail.trim(), password: pwValue }),
      })
      const d = await res.json()
      if (!res.ok) { setPwErr(d.error || 'No se pudo guardar.'); setPwSaving(false); return }
      if (d.email) setPwEmail(d.email)
      setPwOk(true)
    } catch { setPwErr('Error de conexión.') }
    setPwSaving(false)
  }

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/central/clientes')
      const d = await res.json()
      setClientes(res.ok ? (d.clientes || []) : [])
    } catch { setClientes([]) }
    setLoading(false)
  }, [])

  useEffect(() => { cargar() }, [cargar])

  const filtrados = clientes.filter(c => {
    const q = busqueda.toLowerCase()
    const matchBusqueda = c.empresa.toLowerCase().includes(q) || c.email.toLowerCase().includes(q) || c.rut.includes(busqueda)
    const matchEstado = filtroEstado === 'Todos' || c.estado === filtroEstado
    return matchBusqueda && matchEstado
  })

  const activos = clientes.filter(c => c.estado === 'Activo').length
  const totalSaldo = clientes.reduce((s, c) => s + c.saldoPendiente, 0)
  const conSaldo = clientes.filter(c => c.saldoPendiente > 0).length

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault()
    setSaving(true)
    try {
      const res = await fetch('/api/central/clientes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const d = await res.json()
      if (!res.ok || !d.ok) throw new Error(d.error || 'No se pudo crear')
      setShowForm(false)
      setForm({ empresa: '', rut: '', email: '', telefono: '', contacto: '', estado: 'Activo' })
      cargar()
    } catch (e: any) {
      alert(e?.message || 'Error al crear el cliente')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1a1a1a]">Clientes</h1>
          <p className="text-sm text-gray-500 mt-0.5">Gestión de clientes y cuentas — Alma Libre Grupo SpA</p>
        </div>
        <button onClick={() => setShowForm(true)} className="noma-btn-primary text-sm flex items-center gap-2">
          <Plus size={16} />
          Nuevo cliente
        </button>
      </div>

      {/* Interruptor de compras del portal */}
      <div className={`rounded-2xl border p-4 flex items-center justify-between gap-4 flex-wrap ${pedOn ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'}`}>
        <div className="flex items-center gap-3">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${pedOn ? 'bg-green-100' : 'bg-gray-100'}`}>
            <ShoppingCart size={20} className={pedOn ? 'text-green-600' : 'text-gray-400'} />
          </div>
          <div>
            <p className="font-bold text-[#1a1a1a]">Compras del portal {pedOn === null ? '' : pedOn ? '· ACTIVADAS' : '· en marcha blanca'}</p>
            <p className="text-xs text-gray-500">
              {pedOn === null ? 'Cargando…' : pedOn
                ? 'Los clientes pueden agregar al carrito y hacer pedidos.'
                : 'Los clientes solo pueden mirar el catálogo, todavía no comprar.'}
            </p>
          </div>
        </div>
        <button
          onClick={() => togglePedidos(!pedOn)}
          disabled={pedOn === null || pedSaving}
          className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors disabled:opacity-50 ${pedOn ? 'bg-green-600' : 'bg-gray-300'}`}
          title={pedOn ? 'Apagar compras' : 'Activar compras'}
        >
          <span className={`inline-block h-6 w-6 transform rounded-full bg-white shadow transition-transform ${pedOn ? 'translate-x-7' : 'translate-x-1'}`} />
        </button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="noma-card bg-gradient-to-br from-[#1b2a4a] to-gray-800 text-white">
          <div className="w-9 h-9 bg-[#c9a24e]/20 rounded-xl flex items-center justify-center mb-3"><Users size={16} className="text-[#c9a24e]" /></div>
          <p className="text-xs text-gray-400">Total clientes</p>
          <p className="text-2xl font-bold text-[#c9a24e]">{clientes.length}</p>
        </div>
        <div className="noma-card border-l-4 border-green-400">
          <div className="w-9 h-9 bg-green-50 rounded-xl flex items-center justify-center mb-3"><Building2 size={16} className="text-green-600" /></div>
          <p className="text-xs text-gray-500">Activos</p>
          <p className="text-2xl font-bold text-green-600">{activos}</p>
        </div>
        <div className="noma-card border-l-4 border-red-400">
          <div className="w-9 h-9 bg-red-50 rounded-xl flex items-center justify-center mb-3"><AlertCircle size={16} className="text-red-500" /></div>
          <p className="text-xs text-gray-500">Con saldo pendiente</p>
          <p className="text-2xl font-bold text-red-600">{conSaldo}</p>
        </div>
        <div className="noma-card border-l-4 border-[#c9a24e]">
          <div className="w-9 h-9 bg-amber-50 rounded-xl flex items-center justify-center mb-3"><TrendingUp size={16} className="text-[#c9a24e]" /></div>
          <p className="text-xs text-gray-500">Total por cobrar</p>
          <p className="text-lg font-bold text-[#c9a24e]">{clp(totalSaldo)}</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar por empresa, RUT o email..." className="noma-input pl-9" />
        </div>
        <div className="flex items-center gap-1 bg-gray-50 rounded-lg p-1 self-start">
          {(['Todos', 'Activo', 'Inactivo'] as const).map(t => (
            <button key={t} onClick={() => setFiltroEstado(t)}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${filtroEstado === t ? 'bg-[#c9a24e] text-[#1b2a4a]' : 'text-gray-500 hover:text-gray-700'}`}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Tabla */}
      <div className="noma-card !p-0 overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h2 className="font-bold text-[#1a1a1a]">{filtrados.length} cliente{filtrados.length !== 1 ? 's' : ''}</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50/50 border-b border-gray-100">
              <tr>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wide">Empresa</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wide hidden md:table-cell">RUT</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wide hidden sm:table-cell">Email</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wide hidden lg:table-cell">Ciudad</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wide">Tipo</th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wide">Saldo</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wide hidden sm:table-cell">Estado</th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wide">Acceso</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={8} className="py-12 text-center"><Loader2 className="w-5 h-5 text-[#1b2a4a] animate-spin mx-auto" /></td></tr>
              ) : filtrados.length === 0 ? (
                <tr><td colSpan={8} className="py-12 text-center text-gray-400 text-sm">
                  <Users className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                  Aún no tienes clientes. Se crean al aprobar solicitudes (Solicitudes de acceso) o con "Nuevo cliente".
                </td></tr>
              ) : (
                filtrados.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-3 px-4">
                      <p className="font-medium text-[#1a1a1a]">{c.empresa}</p>
                      {c.contacto && <p className="text-xs text-gray-400">{c.contacto}{c.telefono ? ` · ${c.telefono}` : ''}</p>}
                    </td>
                    <td className="py-3 px-4 text-xs text-gray-500 hidden md:table-cell font-mono">{c.rut || '—'}</td>
                    <td className="py-3 px-4 text-xs text-gray-500 hidden sm:table-cell">{c.email || '—'}</td>
                    <td className="py-3 px-4 text-xs text-gray-500 hidden lg:table-cell">{c.ciudad || '—'}</td>
                    <td className="py-3 px-4">{tipoBadge(c.tipo)}</td>
                    <td className="py-3 px-4 text-right">
                      {c.saldoPendiente > 0 ? <span className="font-bold text-red-600">{clp(c.saldoPendiente)}</span> : <span className="text-xs text-gray-400">—</span>}
                    </td>
                    <td className="py-3 px-4 hidden sm:table-cell">
                      {c.estado === 'Activo' ? <span className="noma-badge-green">Activo</span> : <span className="noma-badge-gray">Inactivo</span>}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button onClick={() => abrirClave(c)} title="Definir contraseña de acceso" className="inline-flex items-center gap-1.5 text-xs font-semibold border border-gray-200 rounded-lg px-2.5 py-1.5 text-gray-600 hover:border-[#c9a24e] hover:text-[#1b2a4a]">
                        <KeyRound size={13} /> Contraseña
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-[#1a1a1a]">Nuevo cliente</h3>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"><X size={16} /></button>
            </div>
            <p className="text-xs text-gray-500 mb-4">Crea un cliente manualmente. Nota: esto no genera su acceso al portal (eso se hace aprobando su solicitud).</p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Razón social *</label>
                <input type="text" value={form.empresa} onChange={e => setForm(f => ({ ...f, empresa: e.target.value }))} className="noma-input" placeholder="Razón social" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">RUT</label>
                  <input type="text" value={form.rut} onChange={e => setForm(f => ({ ...f, rut: e.target.value }))} className="noma-input" placeholder="76.123.456-7" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Estado</label>
                  <select value={form.estado} onChange={e => setForm(f => ({ ...f, estado: e.target.value }))} className="noma-input">
                    <option value="Activo">Activo</option>
                    <option value="Inactivo">Inactivo</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Email</label>
                <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="noma-input" placeholder="compras@empresa.cl" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Teléfono</label>
                  <input type="tel" value={form.telefono} onChange={e => setForm(f => ({ ...f, telefono: e.target.value }))} className="noma-input" placeholder="+56 9 1234 5678" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Contacto principal</label>
                  <input type="text" value={form.contacto} onChange={e => setForm(f => ({ ...f, contacto: e.target.value }))} className="noma-input" placeholder="Nombre contacto" />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2 rounded-lg border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">Cancelar</button>
                <button type="submit" disabled={saving} className="flex-1 noma-btn-primary disabled:opacity-60">{saving ? 'Guardando…' : 'Guardar cliente'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal contraseña */}
      {pwCliente && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setPwCliente(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-bold text-[#1a1a1a] flex items-center gap-2"><KeyRound size={16} className="text-[#c9a24e]" /> Contraseña de acceso</h3>
              <button onClick={() => setPwCliente(null)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"><X size={16} /></button>
            </div>
            <p className="text-xs text-gray-500 mb-4">{pwCliente.empresa}</p>

            {pwOk ? (
              <div>
                <div className="flex items-center gap-2 text-green-700 bg-green-50 rounded-xl p-3 mb-3 text-sm">
                  <CheckCircle2 size={18} /> ¡Listo! Ya puede entrar con su correo y esta clave.
                </div>
                <div className="bg-gray-50 rounded-xl p-3 text-sm space-y-2">
                  <div className="flex items-center justify-between gap-2"><span className="text-gray-400 text-xs">Correo</span><span className="font-mono text-[#1a1a1a] text-xs">{pwEmail}</span></div>
                  <div className="flex items-center justify-between gap-2"><span className="text-gray-400 text-xs">Contraseña</span><span className="font-mono text-[#1a1a1a]">{pwValue}</span></div>
                  <div className="flex items-center justify-between gap-2"><span className="text-gray-400 text-xs">Portal</span><span className="text-[#1a1a1a] text-xs">{MARCA_INFO[marcaDe(pwCliente)].login.replace('https://', '')}</span></div>
                </div>
                <button
                  onClick={() => { const mi = MARCA_INFO[marcaDe(pwCliente)]; navigator.clipboard?.writeText(`Ingresa a ${mi.nombre}:\nPortal: ${mi.login}\nCorreo: ${pwEmail}\nContraseña: ${pwValue}`) }}
                  className="w-full mt-3 flex items-center justify-center gap-2 text-sm font-semibold border border-gray-200 rounded-xl py-2.5 text-gray-600 hover:border-[#c9a24e]">
                  <Copy size={14} /> Copiar datos para enviar al cliente
                </button>
                <button onClick={() => setPwCliente(null)} className="w-full mt-2 noma-btn-primary">Cerrar</button>
              </div>
            ) : (
              <form onSubmit={definirClave} className="space-y-3">
                <p className="text-xs text-gray-500">Revisa el correo (corrígelo si tiene un error), define una contraseña y entrégasela al cliente.</p>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Correo del cliente</label>
                  <input type="email" value={pwEmail} onChange={e => setPwEmail(e.target.value)} className="noma-input" placeholder="cliente@correo.com" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Nueva contraseña</label>
                  <input type="text" value={pwValue} onChange={e => setPwValue(e.target.value)} className="noma-input font-mono" placeholder="Mínimo 6 caracteres" />
                </div>
                {pwErr && <p className="text-sm text-red-600">{pwErr}</p>}
                <button type="submit" disabled={pwSaving} className="w-full noma-btn-primary disabled:opacity-60">{pwSaving ? 'Guardando…' : 'Definir contraseña'}</button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
