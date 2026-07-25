'use client'

import { useState, type FormEvent, type CSSProperties } from 'react'
import { Ship, PackageSearch, Handshake, Check, ArrowRight } from 'lucide-react'

const NAVY = '#16233f'
const NAVY_DEEP = '#0f1b31'
const GOLD = '#c9a24e'
const GOLD_SOFT = '#e2ca8f'
const LINE = '#eae5d8'
const MUTED = '#6b6a63'
const serif = "Georgia, 'Times New Roman', serif"
const S = (v: unknown) => (v === null || v === undefined ? '' : String(v))
type Row = Record<string, unknown>

export default function ImportacionSection() {
  const empty = {
    tipo: '', rubro: '', descripcion: '', cantidad_estimada: '', presupuesto: '',
    nombre: '', empresa: '', telefono: '', email: '', comentario: '',
    consentimiento: false, website: '',
  }
  const [f, setF] = useState(empty)
  const [estado, setEstado] = useState<'idle' | 'enviando' | 'ok' | 'error'>('idle')
  const [msg, setMsg] = useState('')
  const [numero, setNumero] = useState('')
  const set = (k: string, v: string | boolean) => setF(prev => ({ ...prev, [k]: v }))

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setEstado('enviando'); setMsg('')
    try {
      const r = await fetch('/api/importacion/solicitud', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...f, origen: 'landing' }),
      })
      const d = await r.json()
      if (r.ok && d.ok) { setEstado('ok'); setNumero(S(d.numero)); setF(empty) }
      else { setEstado('error'); setMsg(S(d.error) || 'No pudimos registrar tu solicitud.') }
    } catch { setEstado('error'); setMsg('Hubo un problema de conexión.') }
  }

  const inputStyle: CSSProperties = { width: '100%', padding: '12px 14px', borderRadius: 10, border: `1px solid ${LINE}`, fontSize: 14.5, background: '#fff', color: NAVY, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }
  const labelStyle: CSSProperties = { fontSize: 13, fontWeight: 600, color: NAVY, marginBottom: 6, display: 'block' }
  const field = (k: string, label: string, opts: { type?: string; full?: boolean; ph?: string; req?: boolean } = {}) => (
    <div style={{ gridColumn: opts.full ? '1 / -1' : 'auto' }}>
      <label style={labelStyle}>{label}</label>
      <input style={inputStyle} type={opts.type || 'text'} value={S((f as Row)[k])} onChange={e => set(k, e.target.value)} placeholder={opts.ph || ''} required={opts.req} />
    </div>
  )

  return (
    <section id="importacion" className="nf-sec" style={{ background: `linear-gradient(160deg, ${NAVY} 0%, ${NAVY_DEEP} 100%)`, color: '#fff' }}>
      <div style={{ maxWidth: 1140, margin: '0 auto', padding: '70px 22px' }}>
        <div style={{ textAlign: 'center', color: GOLD, fontSize: 13, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 10 }}>Canal de importación</div>
        <h2 style={{ fontFamily: serif, fontSize: 34, fontWeight: 700, textAlign: 'center', margin: '0 0 12px', lineHeight: 1.15 }}>Importa desde China con nosotros</h2>
        <p style={{ textAlign: 'center', color: 'rgba(255,255,255,.82)', maxWidth: 640, margin: '0 auto 34px', fontSize: 16.5, lineHeight: 1.6 }}>
          ¿Buscas maquinaria o productos para tu negocio? Te ayudamos a encontrarlos, cotizarlos y traerlos desde China, con acompañamiento en todo el proceso.
        </p>

        {/* Beneficios */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 40, maxWidth: 820, marginLeft: 'auto', marginRight: 'auto' }}>
          {[
            { i: <PackageSearch size={20} color={NAVY} />, t: 'Maquinaria y productos', d: 'Desde equipos hasta insumos y mercadería para revender.' },
            { i: <Handshake size={20} color={NAVY} />, t: 'Gestión y asesoría', d: 'Te guiamos en cotización, compra y coordinación.' },
            { i: <Ship size={20} color={NAVY} />, t: 'Sin complicaciones', d: 'Nos encargamos del proceso para que tú te enfoques en vender.' },
          ].map((b, i) => (
            <div key={i} style={{ background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.14)', borderRadius: 14, padding: 18 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: GOLD, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>{b.i}</div>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{b.t}</div>
              <div style={{ fontSize: 13.5, color: 'rgba(255,255,255,.7)', lineHeight: 1.5 }}>{b.d}</div>
            </div>
          ))}
        </div>

        {/* Formulario */}
        {estado === 'ok' ? (
          <div style={{ background: '#fff', color: NAVY, borderRadius: 20, border: `1px solid ${LINE}`, padding: 44, textAlign: 'center', maxWidth: 640, margin: '0 auto' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#e8efd8', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px' }}><Check size={32} color="#5c6b4a" /></div>
            <h3 style={{ fontFamily: serif, fontSize: 26, fontWeight: 700, marginBottom: 10 }}>¡Solicitud recibida! 🌏</h3>
            <p style={{ color: MUTED, fontSize: 16, lineHeight: 1.6, maxWidth: 440, margin: '0 auto' }}>Gracias por tu interés. Revisaremos qué buscas importar y te contactaremos con opciones y una cotización.</p>
            {numero ? <p style={{ color: NAVY, fontWeight: 700, marginTop: 12 }}>N° de solicitud: {numero}</p> : null}
          </div>
        ) : (
          <form onSubmit={submit} style={{ background: '#fff', color: NAVY, borderRadius: 20, border: `1px solid ${LINE}`, padding: 30, maxWidth: 820, margin: '0 auto', boxShadow: '0 20px 50px rgba(0,0,0,.2)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }} className="nf-form-grid">
              <div>
                <label style={labelStyle}>¿Qué buscas importar? *</label>
                <select style={inputStyle} value={f.tipo} onChange={e => set('tipo', e.target.value)} required>
                  <option value="">Selecciona…</option>
                  {['Maquinaria', 'Productos / mercadería', 'Ambos'].map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              {field('rubro', 'Rubro / categoría', { ph: 'Ej: gastronomía, packaging, retail…' })}
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Descríbenos qué necesitas *</label>
                <textarea style={{ ...inputStyle, minHeight: 90, resize: 'vertical' }} value={f.descripcion} onChange={e => set('descripcion', e.target.value)} placeholder="Ej: máquina selladora, moldes, insumos… lo más específico posible." required />
              </div>
              {field('cantidad_estimada', 'Cantidad estimada', { ph: 'Ej: 1 equipo, 500 unidades…' })}
              {field('presupuesto', 'Presupuesto aproximado', { ph: 'Ej: USD 2.000 (opcional)' })}
              {field('nombre', 'Nombre de contacto *', { req: true })}
              {field('empresa', 'Empresa / negocio')}
              {field('telefono', 'Teléfono', { type: 'tel', ph: '+56 9 …' })}
              {field('email', 'Correo', { type: 'email', ph: 'tu@correo.cl' })}
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Comentarios adicionales</label>
                <textarea style={{ ...inputStyle, minHeight: 70, resize: 'vertical' }} value={f.comentario} onChange={e => set('comentario', e.target.value)} placeholder="Plazos, referencias, links, etc." />
              </div>
            </div>

            <input type="text" value={f.website} onChange={e => set('website', e.target.value)} tabIndex={-1} autoComplete="off" style={{ position: 'absolute', left: -9999, width: 1, height: 1, opacity: 0 }} aria-hidden="true" />

            <label style={{ display: 'flex', gap: 11, alignItems: 'flex-start', marginTop: 20, cursor: 'pointer' }}>
              <input type="checkbox" checked={f.consentimiento} onChange={e => set('consentimiento', e.target.checked)} required style={{ marginTop: 3, width: 17, height: 17, accentColor: GOLD }} />
              <span style={{ fontSize: 13.5, color: MUTED, lineHeight: 1.5 }}>Autorizo a NOMMA FOOD a contactarme para gestionar mi solicitud de importación.</span>
            </label>

            <p style={{ fontSize: 12.5, color: '#a5a29a', marginTop: 8 }}>Déjanos al menos un teléfono o correo para poder responderte.</p>

            {estado === 'error' ? <div style={{ marginTop: 14, background: '#fdecec', border: '1px solid #f3c6c6', color: '#a33', borderRadius: 10, padding: '12px 16px', fontSize: 14 }}>{msg}</div> : null}

            <button type="submit" disabled={estado === 'enviando'} style={{ marginTop: 20, width: '100%', background: estado === 'enviando' ? '#9aa' : GOLD, color: NAVY, border: 'none', fontWeight: 800, padding: '15px', borderRadius: 12, fontSize: 15.5, cursor: estado === 'enviando' ? 'default' : 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 9 }}>
              {estado === 'enviando' ? 'Enviando…' : <>Solicitar cotización de importación <ArrowRight size={18} /></>}
            </button>
          </form>
        )}
      </div>
    </section>
  )
}
