'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sprout, Loader2, Mail, Lock, ArrowLeft, CheckCircle2 } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'

// Marca-consciente: el portal detecta la marca por ?marca=brotes (y la recuerda),
// para que un cliente de Brotes NUNCA vea la marca NOMMA.
const TEMAS = {
  nomma:  { primary: '#16233f', accent: '#c9a24e', accentH: '#b8923f', btnText: '#16233f', name: 'NOMMA FOOD',       solicitar: '/#solicitud-mayorista' },
  brotes: { primary: '#143026', accent: '#e6b23f', accentH: '#d9a83a', btnText: '#143026', name: 'BROTES ASIÁTICOS', solicitar: '/solicitud-mayorista' },
} as const

export default function LoginMayorista() {
  const router = useRouter()
  const [marca, setMarca] = useState<'nomma' | 'brotes'>('nomma')
  const [modo, setModo] = useState<'login' | 'reset'>('login')
  const [email, setEmail] = useState('')
  const [pass, setPass] = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [resetOk, setResetOk] = useState(false)

  useEffect(() => {
    let m: 'nomma' | 'brotes' = 'nomma'
    try {
      const q = new URLSearchParams(window.location.search).get('marca')
      if (q === 'brotes' || q === 'nomma') { m = q; localStorage.setItem('bma_portal_marca', q) }
      else if (localStorage.getItem('bma_portal_marca') === 'brotes') { m = 'brotes' }
    } catch { /* localStorage puede fallar en modo privado */ }
    setMarca(m)
  }, [])

  const t = TEMAS[marca]
  const mq = marca === 'brotes' ? '?marca=brotes' : ''
  const ring = { '--tw-ring-color': t.accent } as React.CSSProperties

  async function entrar(e: React.FormEvent) {
    e.preventDefault(); setErr(null); setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password: pass })
    if (error) { setErr('Correo o contraseña incorrectos.'); setLoading(false); return }
    router.push('/portal/mayoristas/cuenta' + mq)
  }

  async function recuperar(e: React.FormEvent) {
    e.preventDefault(); setErr(null)
    if (!email.trim()) { setErr('Escribe tu correo.'); return }
    setLoading(true)
    await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: `${window.location.origin}/portal/mayoristas/crear-clave${mq}`,
    })
    setResetOk(true); setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-5" style={{ background: t.primary }}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-7">
        <div className="flex items-center gap-2 justify-center mb-1"><Sprout className="w-6 h-6" style={{ color: t.accent }} /><span className="font-bold tracking-widest" style={{ color: t.primary }}>{t.name}</span></div>
        <p className="text-center text-sm text-gray-500 mb-5">Portal Mayorista</p>

        {modo === 'reset' ? (
          resetOk ? (
            <div className="text-center">
              <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-2" />
              <p className="font-semibold" style={{ color: t.primary }}>Revisa tu correo</p>
              <p className="text-sm text-gray-500 mt-1">Si <b>{email}</b> está registrado, te enviamos un enlace para crear una nueva contraseña.</p>
              <button onClick={() => { setModo('login'); setResetOk(false) }} className="mt-4 text-sm underline flex items-center gap-1 mx-auto" style={{ color: t.accent }}><ArrowLeft size={14} /> Volver a ingresar</button>
            </div>
          ) : (
            <form onSubmit={recuperar} className="space-y-3">
              <p className="text-center text-sm text-gray-600 mb-1">Te enviaremos un enlace para recuperar tu contraseña.</p>
              <div className="relative"><Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="Tu correo" className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2" style={ring} /></div>
              {err && <p className="text-sm text-red-600">{err}</p>}
              <button type="submit" disabled={loading} className="w-full font-bold py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-60" style={{ background: t.accent, color: t.btnText }}>{loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Enviar enlace'}</button>
              <button type="button" onClick={() => { setModo('login'); setErr(null) }} className="w-full text-sm text-gray-500 flex items-center justify-center gap-1"><ArrowLeft size={14} /> Volver</button>
            </form>
          )
        ) : (
          <form onSubmit={entrar} className="space-y-3">
            <div className="relative"><Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="Tu correo" className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2" style={ring} /></div>
            <div className="relative"><Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><input type="password" required value={pass} onChange={e => setPass(e.target.value)} placeholder="Contraseña" className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2" style={ring} /></div>
            {err && <p className="text-sm text-red-600">{err}</p>}
            <button type="submit" disabled={loading} className="w-full font-bold py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-60" style={{ background: t.accent, color: t.btnText }}>{loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Ingresar'}</button>
            <button type="button" onClick={() => { setModo('reset'); setErr(null) }} className="w-full text-center text-xs hover:underline" style={{ color: t.accent }}>¿Olvidaste tu contraseña?</button>
          </form>
        )}

        <p className="text-center text-xs text-gray-400 mt-4">¿Aún no eres cliente? <a href={t.solicitar} className="underline" style={{ color: t.accent }}>Solicita acceso</a></p>
      </div>
    </div>
  )
}
