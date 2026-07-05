'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sprout, Loader2, CheckCircle2, Lock } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'

export default function CrearClave() {
  const router = useRouter()
  const [ready, setReady] = useState<boolean | null>(null)
  const [pass, setPass] = useState('')
  const [pass2, setPass2] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [ok, setOk] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setReady(!!data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => { if (session) setReady(true) })
    return () => sub.subscription.unsubscribe()
  }, [])

  async function guardar(e: React.FormEvent) {
    e.preventDefault(); setErr(null)
    if (pass.length < 6) return setErr('La contraseña debe tener al menos 6 caracteres.')
    if (pass !== pass2) return setErr('Las contraseñas no coinciden.')
    setSaving(true)
    const { error } = await supabase.auth.updateUser({ password: pass })
    if (error) { setErr(error.message); setSaving(false); return }
    setOk(true)
    setTimeout(() => router.push('/portal/mayoristas/cuenta'), 1200)
  }

  return (
    <div className="min-h-screen bg-[#1b2a4a] flex items-center justify-center p-5">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-7">
        <div className="flex items-center gap-2 justify-center mb-5"><Sprout className="w-6 h-6 text-[#c9a24e]" /><span className="font-bold tracking-widest text-[#1b2a4a]">NOMMA FOOD</span></div>
        {ok ? (
          <div className="text-center"><CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-2" /><p className="font-semibold text-[#1b2a4a]">¡Contraseña creada!</p><p className="text-sm text-gray-500">Entrando a tu portal…</p></div>
        ) : ready === false ? (
          <div className="text-center text-sm text-gray-600">
            <p className="font-semibold text-[#1b2a4a] mb-1">Enlace inválido o expirado</p>
            <p>Pídele a NOMMA FOOD que te reenvíe la invitación, o <a href="/portal/mayoristas/login" className="text-[#c9a24e] underline">inicia sesión</a> si ya tienes cuenta.</p>
          </div>
        ) : ready === null ? (
          <div className="py-6 flex justify-center"><Loader2 className="w-6 h-6 text-[#1b2a4a] animate-spin" /></div>
        ) : (
          <form onSubmit={guardar} className="space-y-3">
            <p className="text-center text-sm text-gray-600 mb-2">Crea tu contraseña para acceder al Portal Mayorista.</p>
            <div className="relative"><Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><input type="password" value={pass} onChange={e => setPass(e.target.value)} placeholder="Nueva contraseña" className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a24e]" /></div>
            <div className="relative"><Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><input type="password" value={pass2} onChange={e => setPass2(e.target.value)} placeholder="Repite la contraseña" className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a24e]" /></div>
            {err && <p className="text-sm text-red-600">{err}</p>}
            <button type="submit" disabled={saving} className="w-full bg-[#c9a24e] hover:bg-[#b8923f] text-[#1b2a4a] font-bold py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-60">{saving ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Crear contraseña'}</button>
          </form>
        )}
      </div>
    </div>
  )
}
