'use client'

import { useCallback, useEffect, useState } from 'react'
import { Loader2, Plus, Send, CalendarCheck, Ban, Pause, ShieldAlert, Mail, Image as ImageIcon, Tag, Users, ArrowLeft, Check } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'

type Row = Record<string, unknown>
const S = (v: unknown) => v === null || v === undefined ? '' : String(v)
const N = (v: unknown) => { const n = Number(v); return Number.isNaN(n) ? 0 : n }
const clp = (n: number) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n)
const VER = ['SuperAdmin', 'Administracion', 'Gerencia', 'Comercial']
const ENVIAR = ['SuperAdmin', 'Administracion', 'Gerencia']
const TIPOGRAFIAS = ['Poppins', 'Inter', 'Playfair', 'Montserrat']
const TIPOS = ['restaurante', 'universidad', 'minimarket', 'retail', 'oficina']
const CATEGORIAS = ['pasteleria', 'salados', 'vegano', 'asiatica']
const SEGMENTOS: [string, string][] = [['todos', 'Todos los mayoristas'], ['activos', 'Mayoristas activos'], ['inactivos', 'Mayoristas inactivos'], ['nuevos', 'Nuevos (30 días)'], ['tipo', 'Por tipo de cliente'], ['categoria', 'Por categoría de compra'], ['minorista', 'Clientes minorista (retail)']]
// Marca de la audiencia: separa NOMMA de Brotes para no mezclar públicos.
const MARCAS: [string, string][] = [['', 'Todas las marcas'], ['NOMMA FOOD', 'Solo NOMMA FOOD'], ['Brotes Asiáticos', 'Solo Brotes Asiáticos']]
const ESTADO: Record<string, { l: string; c: string }> = {
  borrador: { l: 'Borrador', c: 'bg-gray-100 text-gray-500' }, programada: { l: 'Programada', c: 'bg-blue-100 text-blue-700' },
  enviada: { l: 'Enviada', c: 'bg-green-100 text-green-700' }, pausada: { l: 'Pausada', c: 'bg-amber-100 text-amber-700' },
  anulada: { l: 'Anulada', c: 'bg-red-100 text-red-600' }, error: { l: 'Error', c: 'bg-red-100 text-red-700' },
}

export default function CampanasPage() {
  const [loading, setLoading] = useState(true)
  const [role, setRole] = useState('')
  const [camps, setCamps] = useState<Row[]>([])
  const [cupones, setCupones] = useState<Row[]>([])
  const [plantillas, setPlantillas] = useState<Row[]>([])
  const [productos, setProductos] = useState<Row[]>([])
  const [ed, setEd] = useState<Row | null>(null)
  const [cuenta, setCuenta] = useState<number | null>(null)
  const [prueba, setPrueba] = useState('')
  const [conf, setConf] = useState<'enviar' | 'programar' | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)

  const puedeEnviar = ENVIAR.includes(role)

  const cargar = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }
    const { data: p } = await supabase.from('profiles').select('role, email').eq('id', user.id).maybeSingle()
    const r = S((p as Row)?.role); setRole(r); setPrueba(S((p as Row)?.email))
    if (!VER.includes(r)) { setLoading(false); return }
    const [{ data: c }, { data: cu }, { data: pl }, { data: pr }] = await Promise.all([
      supabase.from('mkt_campanas').select('*').order('created_at', { ascending: false }),
      supabase.from('mkt_cupones').select('*').eq('activo', true).order('created_at', { ascending: false }),
      supabase.from('mkt_plantillas').select('*').order('nombre'),
      supabase.from('products').select('id, nombre, foto_oficial_url, precio_venta').eq('visible_catalogo', true).order('nombre').limit(200),
    ])
    setCamps((c as Row[]) || []); setCupones((cu as Row[]) || []); setPlantillas((pl as Row[]) || []); setProductos((pr as Row[]) || [])
    setLoading(false)
  }, [])
  useEffect(() => { cargar() }, [cargar])

  async function api(payload: Row): Promise<Row | null> {
    setError(null)
    const r = await fetch('/api/central/marketing', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    const d = await r.json() as Row
    if (!r.ok) { setError(S(d.error) || 'Error'); return null }
    return d
  }

  const aud = (ed?.audiencia as Row) || {}
  const contarAudiencia = useCallback(async (a: Row) => {
    if (!a.segmento) { setCuenta(null); return }
    const r = await fetch('/api/central/marketing', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'audiencia', audiencia: a }) })
    const d = await r.json() as Row
    if (r.ok) setCuenta(N(d.total))
  }, [])
  useEffect(() => { if (ed) contarAudiencia((ed.audiencia as Row) || {}) }, [ed, contarAudiencia])

  function set(k: string, v: unknown) { setEd(e => e ? { ...e, [k]: v } : e) }
  function setAud(k: string, v: unknown) { setEd(e => e ? { ...e, audiencia: { ...(e.audiencia as Row), [k]: v } } : e) }

  async function guardar(): Promise<string | null> {
    if (!ed) return null
    const d = await api({ action: 'guardar', campana: ed })
    if (d) { const id = S(d.id); setEd(e => e ? { ...e, id } : e); return id }
    return null
  }
  async function guardarYVolver() { setBusy(true); const id = await guardar(); setBusy(false); if (id) { setEd(null); cargar() } }

  async function enviarPrueba() {
    setBusy(true)
    const id = await guardar()
    if (id) { const d = await api({ action: 'enviar_prueba', id, email: prueba }); if (d) { setEd(e => e ? { ...e, prueba_enviada: true } : e); setMsg(`Prueba enviada a ${prueba}.`) } }
    setBusy(false)
  }
  async function ejecutar() {
    if (!ed?.id) return
    setBusy(true)
    const d = conf === 'programar'
      ? await api({ action: 'programar', id: ed.id, programada_para: ed.programada_para })
      : await api({ action: 'enviar_ahora', id: ed.id })
    setBusy(false)
    if (d) { setConf(null); setEd(null); setMsg(conf === 'programar' ? 'Campaña programada.' : `Enviada: ${N(d.enviados)} correos (${N(d.errores)} errores).`); cargar() }
  }
  async function cambiarEstado(id: unknown, estado: string) {
    const ok = await api({ action: 'estado', id, estado }); if (ok) cargar()
  }
  async function onImagen(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return
    setBusy(true)
    const path = `mkt/${Date.now()}-${f.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
    const { error: eUp } = await supabase.storage.from('evidencias').upload(path, f, { upsert: true })
    if (!eUp) set('imagen_url', supabase.storage.from('evidencias').getPublicUrl(path).data.publicUrl)
    setBusy(false)
  }
  function agregarProducto(pid: string) {
    const p = productos.find(x => S(x.id) === pid); if (!p) return
    const arr = Array.isArray(ed?.productos) ? (ed?.productos as Row[]) : []
    set('productos', [...arr, { nombre: S(p.nombre), foto: S(p.foto_oficial_url), precio: N(p.precio_venta) }])
  }
  function cargarPlantilla(pid: string) {
    const t = plantillas.find(x => S(x.id) === pid); if (!t) return
    setEd(e => e ? { ...e, asunto: S(t.asunto), contenido_html: S(t.contenido_html) || S(e.contenido_html), nombre: S(e.nombre) || S(t.nombre) } : e)
  }

  if (loading) return <div className="min-h-[60vh] flex items-center justify-center"><Loader2 className="w-6 h-6 text-[#1b2a4a] animate-spin" /></div>
  if (!VER.includes(role)) return (
    <div className="p-6"><div className="noma-card text-center py-12 max-w-md mx-auto">
      <ShieldAlert className="w-9 h-9 mx-auto text-gray-300 mb-3" />
      <p className="font-semibold text-[#1b2a4a]">Acceso restringido</p>
      <p className="text-sm text-gray-500 mt-1">Solo Administración, Gerencia y Comercial pueden ver Campañas.</p>
    </div></div>
  )

  if (ed) {
    const prods = Array.isArray(ed.productos) ? (ed.productos as Row[]) : []
    const segLbl = SEGMENTOS.find(s => s[0] === S(aud.segmento))?.[1] || 'Sin audiencia'
    return (
      <div className="space-y-4 max-w-3xl">
        <button onClick={() => { setEd(null); cargar() }} className="flex items-center gap-1 text-sm text-gray-500 hover:text-[#1b2a4a]"><ArrowLeft size={15} /> Volver a campañas</button>
        {error ? <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700">{error}</div> : null}
        {msg ? <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-sm text-green-800">{msg}</div> : null}

        <div className="noma-card space-y-4">
          <div className="flex gap-2">
            <div className="flex-1"><label className="text-xs text-gray-500">Nombre de la campaña</label><input className="noma-input mt-1" value={S(ed.nombre)} onChange={e => set('nombre', e.target.value)} /></div>
            <div><label className="text-xs text-gray-500">Plantilla</label><select className="noma-input mt-1" onChange={e => cargarPlantilla(e.target.value)} defaultValue=""><option value="">—</option>{plantillas.map(t => <option key={S(t.id)} value={S(t.id)}>{S(t.nombre)}</option>)}</select></div>
          </div>
          <div className="flex gap-2">
            <span className="flex-1 text-center text-sm py-2 rounded-lg bg-[#1b2a4a] text-white"><Mail size={14} className="inline mr-1" /> Email</span>
            <span className="flex-1 text-center text-sm py-2 rounded-lg bg-gray-100 text-gray-400">WhatsApp (próximamente)</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div><label className="text-xs text-gray-500">Marca</label><select className="noma-input mt-1" value={S(aud.marca)} onChange={e => setAud('marca', e.target.value)}>{MARCAS.map(m => <option key={m[0]} value={m[0]}>{m[1]}</option>)}</select></div>
            <div><label className="text-xs text-gray-500">Audiencia</label><select className="noma-input mt-1" value={S(aud.segmento)} onChange={e => setAud('segmento', e.target.value)}><option value="">Elegir…</option>{SEGMENTOS.map(s => <option key={s[0]} value={s[0]}>{s[1]}</option>)}</select></div>
            {S(aud.segmento) === 'tipo' ? <div><label className="text-xs text-gray-500">Tipo</label><select className="noma-input mt-1" value={S(aud.tipo)} onChange={e => setAud('tipo', e.target.value)}><option value="">—</option>{TIPOS.map(t => <option key={t} value={t}>{t}</option>)}</select></div> : null}
            {S(aud.segmento) === 'categoria' ? <div><label className="text-xs text-gray-500">Categoría</label><select className="noma-input mt-1" value={S(aud.categoria)} onChange={e => setAud('categoria', e.target.value)}><option value="">—</option>{CATEGORIAS.map(t => <option key={t} value={t}>{t}</option>)}</select></div> : null}
            <div className="flex items-end"><div className="text-sm text-gray-600 flex items-center gap-1.5"><Users size={15} className="text-[#c9a24e]" /> {cuenta === null ? '—' : `${cuenta} destinatarios`}</div></div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2"><label className="text-xs text-gray-500">Asunto</label><input className="noma-input mt-1" value={S(ed.asunto)} onChange={e => set('asunto', e.target.value)} /></div>
            <div className="sm:col-span-2"><label className="text-xs text-gray-500">Preheader (texto de vista previa)</label><input className="noma-input mt-1" value={S(ed.preheader)} onChange={e => set('preheader', e.target.value)} /></div>
            <div><label className="text-xs text-gray-500">Tipografía</label><select className="noma-input mt-1" value={S(ed.tipografia) || 'Poppins'} onChange={e => set('tipografia', e.target.value)}>{TIPOGRAFIAS.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
            <div><label className="text-xs text-gray-500">Imagen de cabecera</label><input type="file" accept="image/*" className="noma-input mt-1" onChange={onImagen} />{ed.imagen_url ? <span className="text-[11px] text-green-600">Imagen cargada</span> : null}</div>
            <div className="sm:col-span-2"><label className="text-xs text-gray-500">Contenido</label><textarea className="noma-input mt-1" rows={4} value={S(ed.contenido_html)} onChange={e => set('contenido_html', e.target.value)} /></div>
          </div>

          <div>
            <label className="text-xs text-gray-500">Productos del catálogo</label>
            <select className="noma-input mt-1" onChange={e => { if (e.target.value) agregarProducto(e.target.value); e.currentTarget.value = '' }} defaultValue=""><option value="">+ Agregar producto…</option>{productos.map(p => <option key={S(p.id)} value={S(p.id)}>{S(p.nombre)}</option>)}</select>
            {prods.length ? <div className="flex flex-wrap gap-2 mt-2">{prods.map((p, i) => <span key={i} className="text-xs bg-gray-100 rounded-full px-2.5 py-1 flex items-center gap-1.5">{S(p.nombre)} {p.precio ? clp(N(p.precio)) : ''}<button onClick={() => set('productos', prods.filter((_, x) => x !== i))} className="text-gray-400">×</button></span>)}</div> : null}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div><label className="text-xs text-gray-500">Texto del botón</label><input className="noma-input mt-1" value={S(ed.boton_texto)} onChange={e => set('boton_texto', e.target.value)} placeholder="Comprar ahora" /></div>
            <div className="sm:col-span-2"><label className="text-xs text-gray-500">Link del botón *</label><input className="noma-input mt-1" value={S(ed.boton_url)} onChange={e => set('boton_url', e.target.value)} placeholder="https://nomafood.cl/tienda" /></div>
            <div className="sm:col-span-3"><label className="text-xs text-gray-500">Cupón (opcional)</label><select className="noma-input mt-1" value={S(ed.cupon_id)} onChange={e => set('cupon_id', e.target.value)}><option value="">Sin cupón</option>{cupones.map(c => <option key={S(c.id)} value={S(c.id)}>{S(c.codigo)} · {S(c.tipo) === 'porcentaje' ? N(c.valor) + '%' : clp(N(c.valor))}</option>)}</select></div>
          </div>

          <div className="border-t border-gray-100 pt-3 flex flex-wrap items-end gap-3">
            <div><label className="text-xs text-gray-500 flex items-center gap-1"><Tag size={12} /> Programar (opcional)</label><input type="datetime-local" className="noma-input mt-1" value={S(ed.programada_para).slice(0, 16)} onChange={e => set('programada_para', e.target.value)} /></div>
            <button onClick={guardarYVolver} disabled={busy} className="text-sm border border-gray-200 rounded-lg px-3 py-2 text-gray-600">Guardar borrador</button>
          </div>

          <div className="bg-gray-50 rounded-xl p-3 space-y-2">
            <div className="text-xs font-semibold text-[#1b2a4a]">Seguridad de envío</div>
            <div className="flex flex-wrap gap-2 items-end">
              <div className="flex-1 min-w-[180px]"><label className="text-[11px] text-gray-500">Correo de prueba</label><input className="noma-input mt-1" value={prueba} onChange={e => setPrueba(e.target.value)} /></div>
              <button onClick={enviarPrueba} disabled={busy} className="text-sm border border-gray-200 rounded-lg px-3 py-2 flex items-center gap-1.5">{ed.prueba_enviada ? <Check size={14} className="text-green-600" /> : <Send size={14} />} Enviar prueba</button>
            </div>
            <div className="text-[11px] text-gray-500">Obligatoria antes de enviar/programar. {ed.prueba_enviada ? 'Prueba enviada.' : 'Aún sin prueba.'}</div>
          </div>

          {puedeEnviar ? (
            <div className="flex gap-2">
              <button onClick={() => setConf('programar')} disabled={!ed.prueba_enviada || !ed.programada_para} className={`flex-1 text-sm rounded-lg py-2.5 flex items-center justify-center gap-2 ${ed.prueba_enviada && ed.programada_para ? 'bg-white border border-[#1b2a4a] text-[#1b2a4a]' : 'bg-gray-100 text-gray-400'}`}><CalendarCheck size={15} /> Programar</button>
              <button onClick={() => setConf('enviar')} disabled={!ed.prueba_enviada} className={`flex-1 text-sm rounded-lg py-2.5 flex items-center justify-center gap-2 font-semibold ${ed.prueba_enviada ? 'bg-[#c9a24e] text-[#1b2a4a]' : 'bg-gray-100 text-gray-400'}`}><Send size={15} /> Enviar ahora</button>
            </div>
          ) : <div className="text-xs text-gray-400">Como Comercial puedes crear y guardar borradores. El envío lo hace Administración o Gerencia.</div>}
        </div>

        {conf ? (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50" onClick={() => setConf(null)}>
            <div className="bg-white rounded-2xl p-5 w-full max-w-sm text-center" onClick={e => e.stopPropagation()}>
              <h3 className="font-bold text-[#1b2a4a]">{conf === 'programar' ? 'Confirmar programación' : 'Confirmar envío'}</h3>
              <p className="text-sm text-gray-600 mt-2">Se {conf === 'programar' ? 'programará' : 'enviará'} a <strong>{cuenta ?? 0} destinatarios</strong> ({segLbl}).{conf === 'programar' ? ` Para el ${S(ed.programada_para).replace('T', ' ')}.` : ''}</p>
              <div className="flex gap-2 mt-4">
                <button onClick={() => setConf(null)} className="flex-1 text-sm border border-gray-200 rounded-lg py-2.5">Cancelar</button>
                <button onClick={ejecutar} disabled={busy} className="flex-1 noma-btn-primary text-sm flex items-center justify-center gap-2">{busy ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />} Confirmar</button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-2xl font-bold text-[#1a1a1a]">Campañas de marketing</h1><p className="text-sm text-gray-500 mt-0.5">Email por Resend · WhatsApp preparado</p></div>
        <button onClick={() => { setEd({ nombre: '', canal: 'email', tipografia: 'Poppins', audiencia: {} }); setCuenta(null); setError(null); setMsg(null) }} className="noma-btn-primary flex items-center gap-2 text-sm"><Plus size={16} /> Nueva campaña</button>
      </div>
      {msg ? <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-sm text-green-800">{msg}</div> : null}

      <div className="noma-card !p-0 overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-sm">
        <thead className="bg-gray-50/50 text-gray-400 text-xs text-left"><tr>
          <th className="py-2.5 px-3 font-medium">Campaña</th><th className="py-2.5 px-3 font-medium">Estado</th><th className="py-2.5 px-3 font-medium">Métricas</th><th className="py-2.5 px-3"></th>
        </tr></thead>
        <tbody className="divide-y divide-gray-50">
          {camps.length === 0 ? <tr><td colSpan={4} className="py-10 text-center text-gray-400 text-sm">Sin campañas. Crea la primera.</td></tr>
          : camps.map(c => { const e = ESTADO[S(c.estado)] || ESTADO.borrador; const st = (c.stats as Row) || {}; return (
            <tr key={S(c.id)}>
              <td className="py-2.5 px-3"><button onClick={() => { setEd({ ...c }); setError(null); setMsg(null) }} className="font-medium text-[#1a1a1a] hover:text-[#c9a24e] text-left">{S(c.nombre)}</button><div className="text-[11px] text-gray-400">{S(c.asunto)}</div></td>
              <td className="py-2.5 px-3"><span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${e.c}`}>{e.l}</span></td>
              <td className="py-2.5 px-3 text-xs text-gray-500">{S(c.estado) === 'enviada' ? `${N(st.enviados)} enviados · ${N(st.errores)} errores · ${N(st.abiertos)} abiertos · ${N(st.clics)} clics` : '—'}</td>
              <td className="py-2.5 px-3 text-right whitespace-nowrap">
                {puedeEnviar && ['programada', 'enviada'].includes(S(c.estado)) ? <button onClick={() => cambiarEstado(c.id, 'pausada')} className="text-gray-300 hover:text-amber-600 mr-2" title="Pausar"><Pause size={14} /></button> : null}
                {puedeEnviar && !['anulada', 'enviada'].includes(S(c.estado)) ? <button onClick={() => cambiarEstado(c.id, 'anulada')} className="text-gray-300 hover:text-red-500" title="Anular"><Ban size={14} /></button> : null}
              </td>
            </tr>
          )})}
        </tbody>
      </table></div></div>

      <p className="text-xs text-gray-400"><ImageIcon size={12} className="inline" /> Aperturas, clics y compras se llenan al conectar los webhooks de Resend y el flujo de cupones (preparado).</p>
    </div>
  )
}
