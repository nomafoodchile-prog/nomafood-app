'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { User, LogOut, Truck } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'

export default function PerfilPage() {
  const router = useRouter()
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email || ''))
    supabase.from('drivers').select('nombre').limit(1).maybeSingle().then(({ data }) => setNombre(data?.nombre || ''))
  }, [])

  async function logout() {
    await supabase.auth.signOut()
    router.replace('/chofer/login')
  }

  return (
    <div>
      <div className="bg-[#1b2a4a] text-white px-5 py-4">
        <h1 className="text-lg font-semibold text-center">Perfil</h1>
      </div>
      <div className="px-5 py-6">
        <div className="bg-white rounded-2xl border border-gray-100 p-6 flex flex-col items-center">
          <div className="w-16 h-16 rounded-full bg-[#eef1f6] flex items-center justify-center mb-3">
            <User className="w-8 h-8 text-[#1b2a4a]" />
          </div>
          <p className="font-semibold text-gray-900">{nombre || 'Chofer'}</p>
          <p className="text-sm text-gray-500">{email}</p>
          <span className="mt-2 flex items-center gap-1 text-xs text-[#1b2a4a] bg-[#eef1f6] px-2.5 py-1 rounded-full">
            <Truck className="w-3 h-3" /> Chofer
          </span>
        </div>

        <button onClick={logout}
          className="w-full mt-5 bg-white border border-gray-200 text-red-600 font-medium py-3 rounded-xl flex items-center justify-center gap-2">
          <LogOut className="w-4 h-4" /> Cerrar sesión
        </button>
      </div>
    </div>
  )
}
