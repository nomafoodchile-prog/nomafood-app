'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sprout, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'

export default function OperarioLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
    if (authError) {
      setError(
        authError.message.includes('Invalid login credentials')
          ? 'Correo o contraseña incorrectos.'
          : authError.message
      )
      setLoading(false)
      return
    }
    router.push('/operario')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-[#f7f6f2] flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-[#1b2a4a] flex items-center justify-center mb-4">
            <Sprout className="w-8 h-8 text-[#c9a24e]" />
          </div>
          <h1 className="text-xl font-bold text-[#1b2a4a] tracking-wide">NOMMA FOOD</h1>
          <p className="text-sm text-gray-500 mt-1">Portal Operario</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Correo</label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="operario@nommafood.cl"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#1b2a4a] focus:outline-none focus:ring-2 focus:ring-[#1b2a4a]/10 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Contraseña</label>
            <input
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#1b2a4a] focus:outline-none focus:ring-2 focus:ring-[#1b2a4a]/10 text-sm"
            />
          </div>
          {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#c9a24e] text-[#1b2a4a] font-semibold rounded-xl py-3 flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Ingresar'}
          </button>
          <p className="text-xs text-gray-400 text-center">Cada operario ve solo su información.</p>
        </form>
      </div>
    </div>
  )
}
