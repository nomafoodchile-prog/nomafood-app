'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { Eye, EyeOff, Loader2 } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) {
        if (authError.message.includes('Invalid login credentials')) {
          setError('Email o contraseña incorrectos.')
        } else {
          setError(authError.message)
        }
        return
      }

      router.push('/dashboard')
      router.refresh()
    } catch {
      setError('Error de conexión. Intenta nuevamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-sm">
      {/* Card */}
      <div className="bg-white rounded-2xl shadow-card p-8">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-[#c9a84c] rounded-2xl flex items-center justify-center font-black text-[#0f0f0f] text-2xl mb-4 shadow-lg">
            NF
          </div>
          <h1 className="text-2xl font-bold text-[#1a1a1a] tracking-tight">Noma Food</h1>
          <p className="text-xs text-gray-400 mt-1">Alma Libre Grupo SpA</p>
        </div>

        {/* Form */}
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

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
              Contraseña
            </label>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="••••••••"
                className="noma-input pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPass(s => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
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
            {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
          </button>
        </form>

        {/* Forgot password */}
        <div className="mt-4 text-center">
          <a
            href="/recuperar"
            className="text-xs text-[#c9a84c] hover:text-[#b8962e] hover:underline transition-colors"
          >
            ¿Olvidaste tu contraseña?
          </a>
        </div>
      </div>

      {/* Footer */}
      <p className="text-center text-[10px] text-gray-400 mt-6">
        Sistema operacional · Noma Food © 2026
      </p>
    </div>
  )
}
