'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, LogOut, Award } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'

type Row = Record<string, unknown>
const S = (v: unknown) => v === null || v === undefined ? '' : String(v)

export default function OperarioPerfilPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<Row | null>(null)
  const [operario, setOperario] = useState<Row | null>(null)

  const cargar = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const [{ data: p }, { data: op }] = await Promise.all([
      supabase.from('profiles').select('full_name, email, role').eq('id', user.id).maybeSingle(),
      supabase.from('operarios').select('area, turno_default, fecha_ingreso').eq('profile_id', user.id).maybeSingle(),
    ])
    setProfile((p as Row) || null)
    setOperario((op as Row) || null)
    setLoading(false)
  }, [])

  useEffect(() => { cargar() }, [cargar])

  async function salir() {
    await supabase.auth.signOut()
    router.replace('/operario/login')
  }

  if (loading) return <div className="min-h-[60vh] flex items-center justify-center"><Loader2 className="w-6 h-6 text-[#1b2a4a] animate-spin" /></div>

  return (
    <div>
      <header className="bg-[#1b2a4a] text-white px-5 pt-6 pb-8 rounded-b-3xl flex flex-col items-center">
        <div className="w-16 h-16 rounded-full bg-[#c9a24e] text-[#1b2a4a] flex items-center justify-center font-bold text-xl">
          {S(profile?.full_name).slice(0, 2).toUpperCase() || 'OP'}
        </div>
        <div className="mt-3 font-semibold">{S(profile?.full_name) || 'Operario'}</div>
        <div className="text-xs text-white/70">{S(profile?.role)} · {S(operario?.area) || 'Sin área'}</div>
      </header>

      <div className="px-5 -mt-4 space-y-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-4 text-sm">
          <Fila label="Correo" valor={S(profile?.email)} />
          <Fila label="Turno" valor={S(operario?.turno_default) || '—'} />
          <Fila label="Ingreso" valor={S(operario?.fecha_ingreso) || '—'} />
        </div>

        <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 text-center text-sm text-gray-500 flex items-center justify-center gap-2">
          <Award size={16} /> Métricas para bonos: en construcción (solo se guardan).
        </div>

        <button onClick={salir} className="w-full bg-white border border-gray-200 rounded-2xl py-4 flex items-center justify-center gap-2 text-[#c0392b] font-medium">
          <LogOut size={18} /> Cerrar sesión
        </button>
      </div>
    </div>
  )
}

function Fila({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="flex justify-between py-2 border-b border-gray-50 last:border-0">
      <span className="text-gray-500">{label}</span>
      <span className="text-[#1a1a1a] font-medium">{valor}</span>
    </div>
  )
}
