'use client'

import { useState, useEffect } from 'react'
import { Loader2, CheckCircle, ArrowLeft, Eye, EyeOff } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'

export default function NuevaContrasenaPage() {
  const [pass, setPass] = useState('')
  const [pass2, setPass2] = useState('')
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)
  const [listo, setListo] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sesionOk, setSesionOk] = useState<boolean | null>(null)

  // El enlace del correo trae el token de recuperación en la URL; el cliente de
  // Supabase lo procesa solo y abre una sesión de recuperación. Verificamos que exista.
  useEffect(() => {
    let activo = true
    supabase.auth.getSession().then(({ data }) => {
      if (activo && data.session) setSesionOk(true)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (!activo) return
      if (event === 'PASSWORD_RECOVERY' || session) setSesionOk(true)
    })
    // Si en 3 s no hay sesión, el enlace no es válido / expiró.
    const t = setTimeout(() => { if (activo) setSesionOk(prev => prev === null ? false : prev) }, 3000)
    return () => { activo = false; sub.subscription.unsubscribe(); clearTimeout(t) }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (pass.length < 8) { setError('La contraseña debe tener al menos 8 caracteres.'); return }
    if (pass !== pass2) { setError('Las contraseñas no coinciden.'); return }
    setLoading(true)
    try {
      const { error: authError } = await supabase.auth.updateUser({ password: pass })
      if (authError) { setError('No se pudo actualizar la contraseña. El enlace pudo expirar; solicita uno nuevo.'); return }
      setListo(true)
    } catch {
      setError('Error de conexión. Intenta nuevamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-sm">
      <div className="bg-white rounded-2xl shadow-card p-8">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-[#c9a24e] rounded-2xl flex items-center justify-center font-black text-[#1b2a4a] text-2xl mb-4 shadow-lg">
            NF
          </div>
          <h1 className="text-2xl font-bold text-[#1a1a1a] tracking-tight">Noma Food</h1>
          <p className="text-xs text-gray-400 mt-1">Alma Libre Grupo SpA</p>
        </div>

        {listo ? (
          <div className="text-center space-y-4">
            <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle size={28} className="text-green-500" />
            </div>
            <div>
              <h2 className="font-bold text-[#1a1a1a] mb-1">¡Contraseña actualizada!</h2>
              <p className="text-sm text-gray-500 leading-relaxed">Ya puedes iniciar sesión con tu nueva contraseña.</p>
            </div>
            <a href="/login" className="inline-block w-full noma-btn-primary py-2.5 mt-2 text-center">Ir a iniciar sesión</a>
          </div>
        ) : sesionOk === false ? (
          <div className="text-center space-y-4">
            <h2 className="font-bold text-[#1a1a1a]">Enlace no válido o expirado</h2>
            <p className="text-sm text-gray-500 leading-relaxed">
              Abre esta página desde el enlace del correo de recuperación. Si expiró, solicita uno nuevo.
            </p>
            <a href="/recuperar" className="inline-block w-full noma-btn-primary py-2.5 mt-2 text-center">Solicitar enlace nuevo</a>
            <a href="/login" className="flex items-center justify-center gap-1.5 text-xs text-[#c9a24e] hover:underline">
              <ArrowLeft size={12} /> Volver al inicio de sesión
            </a>
          </div>
        ) : sesionOk === null ? (
          <div className="text-center py-6"><Loader2 size={24} className="animate-spin text-[#c9a24e] mx-auto" /></div>
        ) : (
          <>
            <div className="mb-6">
              <h2 className="font-bold text-[#1a1a1a] text-center">Nueva contraseña</h2>
              <p className="text-xs text-gray-400 text-center mt-1">Elige una contraseña segura (mínimo 8 caracteres)</p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Nueva contraseña</label>
                <div className="relative">
                  <input
                    type={show ? 'text' : 'password'}
                    value={pass}
                    onChange={e => setPass(e.target.value)}
                    required
                    autoComplete="new-password"
                    placeholder="••••••••"
                    className="noma-input pr-10"
                  />
                  <button type="button" onClick={() => setShow(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {show ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Repite la contraseña</label>
                <input
                  type={show ? 'text' : 'password'}
                  value={pass2}
                  onChange={e => setPass2(e.target.value)}
                  required
                  autoComplete="new-password"
                  placeholder="••••••••"
                  className="noma-input"
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700">{error}</div>
              )}

              <button type="submit" disabled={loading} className="w-full noma-btn-primary flex items-center justify-center gap-2 py-2.5 mt-2">
                {loading && <Loader2 size={16} className="animate-spin" />}
                {loading ? 'Guardando...' : 'Guardar contraseña'}
              </button>
            </form>
          </>
        )}
      </div>
      <p className="text-center text-[10px] text-gray-400 mt-6">Sistema operacional · Noma Food © 2026</p>
    </div>
  )
}
