'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sprout, Loader2, CheckCircle2, Lock } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'

// Marca-consciente: el enlace del correo trae ?marca=brotes para clientes de Brotes.
// Por defecto (sin ese parametro) se muestra NOMMA, sin cambios.
const TEMAS = {
  nomma: { bg: '#16233f', accent: '#c9a24e', btnText: '#16233f', name: 'NOMMA FOOD' },
  brotes: { bg: '#143021', accent: '#4c9a45', btnText: '#ffffff', name: 'BROTES ASIÁTICOS' },
} as const

export default function CrearClave() {
  const router = useRouter()
  const [ready, setReady] = useState<boolean | null>(null)
  const [pass, setPass] = useState('')
  const [pass2, setPass2] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [ok, setOk] = useState(false)
  const [marca, setMarca] = useState<'nomma' | 'brotes'>('nomma')
  const [token, setToken] = useState<string | null>(null)

  useEffect(() => {
    const qs = new URLSearchParams(window.location.search)
    if (qs.get('marca') === 'brotes') setMarca('brotes')

    // Flujo NUEVO: enlace con token propio (durable, no se rompe con Gmail).
    const tk = qs.get('token')
    if (tk) { setToken(tk); setReady(true); return }

    // Flujo legado: el link del correo trae los tokens en el hash (#access_token=...&refresh_token=...).
    // El cliente SSR no siempre los toma solo, así que establecemos la sesión a mano.
    const hash = typeof window !== 'undefined' ? window.location.hash.replace(/^#/, '') : ''
    const hp = new URLSearchParams(hash)
    const access_token = hp.get('access_token')
    const refresh_token = hp.get('refresh_token')

    if (access_token && refresh_token) {
      supabase.auth.setSession({ access_token, refresh_token })
        .then(({ data, error }) => {
          setReady(!!data.session && !error)
          // limpiar el hash de la URL por prolijidad/seguridad
          if (data.session && typeof window !== 'undefined') {
            window.history.replaceState(null, '', window.location.pathname + window.location.search)
          }
        })
        .catch(() => setReady(false))
    } else {
      supabase.auth.getSession().then(({ data }) => setReady(!!data.session))
    }

    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => { if (session) setReady(true) })
    return () => sub.subscription.unsubscribe()
  }, [])

  const t = TEMAS[marca]

  async function guardar(e: React.FormEvent) {
    e.preventDefault(); setErr(null)
    if (pass.length < 6) return setErr('La contraseña debe tener al menos 6 caracteres.')
    if (pass !== pass2) return setErr('Las contraseñas no coinciden.')
    setSaving(true)
    if (token) {
      // Flujo con token propio: guardar via nuestro endpoint (no depende de sesión).
      const r = await fetch('/api/portal/mayoristas/set-password', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password: pass }),
      })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) { setErr(d.error || 'No se pudo guardar la contraseña.'); setSaving(false); return }
      setOk(true)
      setTimeout(() => router.push('/portal/mayoristas/login'), 1500)
      return
    }
    const { error } = await supabase.auth.updateUser({ password: pass })
    if (error) { setErr(error.message); setSaving(false); return }
    setOk(true)
    setTimeout(() => router.push('/portal/mayoristas/cuenta'), 1200)
  }

  const ringStyle = { '--tw-ring-color': t.accent } as React.CSSProperties

  return (
    <div className="min-h-screen flex items-center justify-center p-5" style={{ background: t.bg }}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-7">
        <div className="flex items-center gap-2 justify-center mb-5"><Sprout className="w-6 h-6" style={{ color: t.accent }} /><span className="font-bold tracking-widest" style={{ color: t.bg }}>{t.name}</span></div>
        {ok ? (
          <div className="text-center"><CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-2" /><p className="font-semibold" style={{ color: t.bg }}>¡Contraseña creada!</p><p className="text-sm text-gray-500">Entrando a tu portal…</p></div>
        ) : ready === false ? (
          <div className="text-center text-sm text-gray-600">
            <p className="font-semibold mb-1" style={{ color: t.bg }}>Enlace inválido o expirado</p>
            <p>Pídele a {t.name} que te reenvíe la invitación, o <a href="/portal/mayoristas/login" className="underline" style={{ color: t.accent }}>inicia sesión</a> si ya tienes cuenta.</p>
          </div>
        ) : ready === null ? (
          <div className="py-6 flex justify-center"><Loader2 className="w-6 h-6 animate-spin" style={{ color: t.bg }} /></div>
        ) : (
          <form onSubmit={guardar} className="space-y-3">
            <p className="text-center text-sm text-gray-600 mb-2">Crea tu contraseña para acceder al Portal Mayorista.</p>
            <div className="relative"><Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><input type="password" value={pass} onChange={e => setPass(e.target.value)} placeholder="Nueva contraseña" className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2" style={ringStyle} /></div>
            <div className="relative"><Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><input type="password" value={pass2} onChange={e => setPass2(e.target.value)} placeholder="Repite la contraseña" className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2" style={ringStyle} /></div>
            {err && <p className="text-sm text-red-600">{err}</p>}
            <button type="submit" disabled={saving} className="w-full font-bold py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-60" style={{ background: t.accent, color: t.btnText }}>{saving ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Crear contraseña'}</button>
          </form>
        )}
      </div>
    </div>
  )
}
