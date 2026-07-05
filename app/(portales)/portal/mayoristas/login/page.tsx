'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sprout, Loader2, Mail, Lock, ArrowLeft, CheckCircle2 } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'

export default function LoginMayorista() {
  const router = useRouter()
  const [modo, setModo] = useState<'login' | 'reset'>('login')
  const [email, setEmail] = useState('')
  const [pass, setPass] = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [resetOk, setResetOk] = useState(false)

  async function entrar(e: React.FormEvent) {
    e.preventDefault(); setErr(null); setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password: pass })
    if (error) { setErr('Correo o contraseña incorrectos.'); setLoading(false); return }
    router.push('/portal/mayoristas/cuenta')
  }

  async function recuperar(e: React.FormEvent) {
    e.preventDefault(); setErr(null)
    if (!email.trim()) { setErr('Escribe tu correo.'); return }
    setLoading(true)
    await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: `${window.location.origin}/portal/mayoristas/crear-clave`,
    })
    // Respuesta genérica (no revelamos si el correo existe)
    setResetOk(true); setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#1b2a4a] flex items-center justify-center p-5">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-7">
        <div className="flex items-center gap-2 justify-center mb-1"><Sprout className="w-6 h-6 text-[#c9a24e]" /><span className="font-bold tracking-widest text-[#1b2a4a]">NOMMA FOOD</span></div>
        <p className="text-center text-sm text-gray-500 mb-5">Portal Mayorista</p>

        {modo === 'reset' ? (
          resetOk ? (
            <div className="text-center">
              <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-2" />
              <p className="font-semibold text-[#1b2a4a]">Revisa tu correo</p>
              <p className="text-sm text-gray-500 mt-1">Si <b>{email}</b> está registrado, te enviamos un enlace para crear una nueva contraseña.</p>
              <button onClick={() => { setModo('login'); setResetOk(false) }} className="mt-4 text-sm text-[#c9a24e] underline flex items-center gap-1 mx-auto"><ArrowLeft size={14} /> Volver a ingresar</button>
            </div>
          ) : (
            <form onSubmit={recuperar} className="space-y-3">
              <p className="text-center text-sm text-gray-600 mb-1">Te enviaremos un enlace para recuperar tu contraseña.</p>
              <div className="relative"><Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="Tu correo" className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a24e]" /></div>
              {err && <p className="text-sm text-red-600">{err}</p>}
              <button type="submit" disabled={loading} className="w-full bg-[#c9a24e] hover:bg-[#b8923f] text-[#1b2a4a] font-bold py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-60">{loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Enviar enlace'}</button>
              <button type="button" onClick={() => { setModo('login'); setErr(null) }} className="w-full text-sm text-gray-500 flex items-center justify-center gap-1"><ArrowLeft size={14} /> Volver</button>
            </form>
          )
        ) : (
          <form onSubmit={entrar} className="space-y-3">
            <div className="relative"><Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="Tu correo" className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a24e]" /></div>
            <div className="relative"><Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><input type="password" required value={pass} onChange={e => setPass(e.target.value)} placeholder="Contraseña" className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a24e]" /></div>
            {err && <p className="text-sm text-red-600">{err}</p>}
            <button type="submit" disabled={loading} className="w-full bg-[#c9a24e] hover:bg-[#b8923f] text-[#1b2a4a] font-bold py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-60">{loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Ingresar'}</button>
            <button type="button" onClick={() => { setModo('reset'); setErr(null) }} className="w-full text-center text-xs text-[#c9a24e] hover:underline">¿Olvidaste tu contraseña?</button>
          </form>
        )}

        <p className="text-center text-xs text-gray-400 mt-4">¿Aún no eres cliente? <a href="/mayoristas" className="text-[#c9a24e] underline">Solicita acceso</a></p>
      </div>
    </div>
  )
}
