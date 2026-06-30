'use client'

import { useState } from 'react'
import { Loader2, CheckCircle, ArrowLeft } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'

export default function RecuperarPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const { error: authError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/nueva-contrasena`,
      })

      if (authError) {
        setError('No fue posible enviar el correo. Verifica la dirección e intenta nuevamente.')
        return
      }

      setEnviado(true)
    } catch {
      setError('Error de conexión. Intenta nuevamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-sm">
      <div className="bg-white rounded-2xl shadow-card p-8">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-[#c9a84c] rounded-2xl flex items-center justify-center font-black text-[#0f0f0f] text-2xl mb-4 shadow-lg">
            NF
          </div>
          <h1 className="text-2xl font-bold text-[#1a1a1a] tracking-tight">Noma Food</h1>
          <p className="text-xs text-gray-400 mt-1">Alma Libre Grupo SpA</p>
        </div>

        {enviado ? (
          /* Success state */
          <div className="text-center space-y-4">
            <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle size={28} className="text-green-500" />
            </div>
            <div>
              <h2 className="font-bold text-[#1a1a1a] mb-1">Correo enviado</h2>
              <p className="text-sm text-gray-500 leading-relaxed">
                Revisa tu correo — te enviamos las instrucciones para restablecer tu contraseña.
              </p>
            </div>
            <p className="text-xs text-gray-400">
              Si no lo ves en tu bandeja de entrada, revisa la carpeta de spam.
            </p>
            <a
              href="/login"
              className="flex items-center justify-center gap-1.5 text-xs text-[#c9a84c] hover:text-[#b8962e] hover:underline transition-colors mt-2"
            >
              <ArrowLeft size={12} />
              Volver al inicio de sesión
            </a>
          </div>
        ) : (
          /* Form state */
          <>
            <div className="mb-6">
              <h2 className="font-bold text-[#1a1a1a] text-center">Recuperar contraseña</h2>
              <p className="text-xs text-gray-400 text-center mt-1">
                Ingresa tu correo y te enviaremos las instrucciones
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                  Correo electrónico
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  placeholder="tu@nomafood.cl"
                  className="noma-input"
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full noma-btn-primary flex items-center justify-center gap-2 py-2.5 mt-2"
              >
                {loading && <Loader2 size={16} className="animate-spin" />}
                {loading ? 'Enviando...' : 'Enviar instrucciones'}
              </button>
            </form>

            <div className="mt-4 text-center">
              <a
                href="/login"
                className="flex items-center justify-center gap-1.5 text-xs text-[#c9a84c] hover:text-[#b8962e] hover:underline transition-colors"
              >
                <ArrowLeft size={12} />
                Volver al inicio de sesión
              </a>
            </div>
          </>
        )}
      </div>

      <p className="text-center text-[10px] text-gray-400 mt-6">
        Sistema operacional · Noma Food © 2026
      </p>
    </div>
  )
}
