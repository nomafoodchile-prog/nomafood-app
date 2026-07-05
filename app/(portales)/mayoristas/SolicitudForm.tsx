'use client'

import { useEffect, useState } from 'react'
import { Loader2, CheckCircle2, Send } from 'lucide-react'

const TIPOS = ['Cafetería', 'Universidad', 'Minimarket', 'Oficina', 'Restaurante', 'Distribuidor', 'Otro']

type Estado = 'idle' | 'sending' | 'ok' | 'error'

export function SolicitudForm() {
  const [f, setF] = useState<Record<string, string>>({})
  const [vitrina, setVitrina] = useState<'si' | 'no' | ''>('')
  const [consent, setConsent] = useState(false)
  const [website, setWebsite] = useState('') // honeypot
  const [origen, setOrigen] = useState('directo')
  const [estado, setEstado] = useState<Estado>('idle')
  const [err, setErr] = useState<string | null>(null)
  const [numero, setNumero] = useState<string | null>(null)

  useEffect(() => {
    try {
      const p = new URLSearchParams(window.location.search)
      const src = p.get('utm_source') || p.get('origen') || (document.referrer ? new URL(document.referrer).hostname.replace('www.', '') : '')
      if (src) setOrigen(src.slice(0, 40))
    } catch { /* nada */ }
  }, [])

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF(s => ({ ...s, [k]: e.target.value }))

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    setErr(null)
    if (!consent) { setErr('Debes aceptar la política de privacidad y contacto comercial.'); return }
    setEstado('sending')
    try {
      const r = await fetch('/api/mayoristas/solicitud', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...f, tiene_vitrina: vitrina === 'si' ? true : vitrina === 'no' ? false : null, consentimiento: consent, origen, website }),
      })
      const d = await r.json()
      if (!r.ok) { setErr(d.error || 'No pudimos enviar tu solicitud.'); setEstado('error'); return }
      setNumero(d.numero); setEstado('ok')
    } catch { setErr('Error de conexión. Intenta de nuevo.'); setEstado('error') }
  }

  if (estado === 'ok') {
    return (
      <div className="bg-white rounded-2xl p-8 text-center shadow-xl max-w-lg mx-auto">
        <CheckCircle2 className="w-14 h-14 text-green-500 mx-auto mb-3" />
        <h3 className="text-xl font-bold text-[#1b2a4a]">¡Solicitud recibida!</h3>
        <p className="text-gray-600 mt-2">Tu número de solicitud es <span className="font-mono font-bold text-[#c9a24e]">{numero}</span>.</p>
        <p className="text-sm text-gray-500 mt-2">Nuestro equipo comercial evaluará tu solicitud y te contactará por WhatsApp o correo. ¡Gracias por querer vender NOMMA FOOD! 🌿</p>
      </div>
    )
  }

  return (
    <form onSubmit={enviar} className="bg-white rounded-2xl p-5 sm:p-7 shadow-xl max-w-2xl mx-auto space-y-4">
      {/* honeypot */}
      <input type="text" value={website} onChange={e => setWebsite(e.target.value)} name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />

      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Nombre y apellido"><input required className="inp" onChange={set('nombre')} /></Field>
        <Field label="Empresa o negocio"><input required className="inp" onChange={set('empresa')} /></Field>
        <Field label="RUT (empresa o personal)"><input required className="inp" onChange={set('rut')} placeholder="76.123.456-7" /></Field>
        <Field label="Giro o tipo de negocio"><input required className="inp" onChange={set('giro')} /></Field>
        <Field label="Comuna"><input required className="inp" onChange={set('comuna')} /></Field>
        <Field label="Dirección"><input required className="inp" onChange={set('direccion')} /></Field>
        <Field label="Teléfono (WhatsApp)"><input required type="tel" className="inp" onChange={set('telefono')} placeholder="+56 9 ..." /></Field>
        <Field label="Correo electrónico"><input required type="email" className="inp" onChange={set('email')} /></Field>
        <Field label="Rol o cargo"><input required className="inp" onChange={set('cargo')} /></Field>
        <Field label="Tipo de cliente">
          <select required className="inp bg-white" onChange={set('tipo_cliente')} defaultValue="">
            <option value="" disabled>Selecciona…</option>
            {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="Volumen estimado de compra"><input required className="inp" onChange={set('volumen_estimado')} placeholder="Ej: $300.000 semanal" /></Field>
        <Field label="Días y horario de recepción"><input className="inp" onChange={set('horario_recepcion')} placeholder="Ej: Lun–Vie 09:00–13:00" /></Field>
      </div>

      <Field label="Productos de interés"><textarea rows={2} className="inp" onChange={set('productos_interes')} /></Field>

      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-[#1b2a4a]">¿Tienes vitrina refrigerada?</span>
        {(['si', 'no'] as const).map(v => (
          <button type="button" key={v} onClick={() => setVitrina(v)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium border ${vitrina === v ? 'bg-[#1b2a4a] text-white border-[#1b2a4a]' : 'bg-white text-gray-600 border-gray-200'}`}>
            {v === 'si' ? 'Sí' : 'No'}
          </button>
        ))}
      </div>

      <Field label="Comentario adicional"><textarea rows={2} className="inp" onChange={set('comentario')} /></Field>

      <label className="flex items-start gap-2 text-sm text-gray-600">
        <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} className="mt-1" />
        <span>Acepto la <a href="#" className="text-[#c9a24e] underline">política de privacidad</a> y el contacto comercial de NOMMA FOOD.</span>
      </label>

      {err && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{err}</p>}

      <button type="submit" disabled={estado === 'sending'}
        className="w-full bg-[#c9a24e] hover:bg-[#b8923f] text-[#1b2a4a] font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 disabled:opacity-60 transition-colors">
        {estado === 'sending' ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />} Enviar solicitud
      </button>

      <style>{`.inp{width:100%;padding:10px 12px;border:1px solid #e5e7eb;border-radius:12px;font-size:14px;outline:none;transition:border-color .15s}.inp:focus{border-color:#c9a24e;box-shadow:0 0 0 3px rgba(201,162,78,.15)}`}</style>
    </form>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="text-xs font-semibold text-[#1b2a4a]">{label}</span><div className="mt-1">{children}</div></label>
}
