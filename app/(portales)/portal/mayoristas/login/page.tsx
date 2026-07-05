'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sprout, Loader2, Mail, Lock } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'

export default function LoginMayorista() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [pass, setPass] = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function entrar(e: React.FormEvent) {
    e.preventDefault(); setErr(null); setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password: pass })
    if (error) { setErr('Correo o contraseña incorrectos.'); setLoading(false); return }
    router.push('/portal/mayoristas/cuenta')
  }

  return (
    <div className="min-h-screen bg-[#1b2a4a] flex items-center justify-center p-5">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-7">
        <div className="flex items-center gap-2 justify-center mb-1"><Sprout className="w-6 h-6 text-[#c9a24e]" /><span className="font-bold tracking-widest text-[#1b2a4a]">NOMMA FOOD</span></div>
        <p className="text-center text-sm text-gray-500 mb-5">Portal Mayorista</p>
        <form onSubmit={entrar} className="space-y-3">
          <div className="relative"><Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="Tu correo" className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a24e]" /></div>
          <div className="relative"><Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><input type="password" required value={pass} onChange={e => setPass(e.target.value)} placeholder="Contraseña" className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a24e]" /></div>
          {err && <p className="text-sm text-red-600">{err}</p>}
          <button type="submit" disabled={loading} className="w-full bg-[#c9a24e] hover:bg-[#b8923f] text-[#1b2a4a] font-bold py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-60">{loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Ingresar'}</button>
        </form>
        <p className="text-center text-xs text-gray-400 mt-4">¿Aún no eres cliente? <a href="/mayoristas" className="text-[#c9a24e] underline">Solicita acceso</a></p>
      </div>
    </div>
  )
}
