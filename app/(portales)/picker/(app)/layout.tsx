'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, LogOut, PackageCheck } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'

export default function PickerAppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let active = true
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      if (!data.session) router.replace('/picker/login')
      else setReady(true)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session) router.replace('/picker/login')
    })
    return () => { active = false; sub.subscription.unsubscribe() }
  }, [router])

  if (!ready) return <div className="min-h-screen flex items-center justify-center bg-[#f7f6f2]"><Loader2 className="w-6 h-6 text-[#1b2a4a] animate-spin" /></div>

  return (
    <div className="min-h-screen bg-[#f7f6f2]">
      <header className="bg-[#1b2a4a] text-white px-4 py-3 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-2"><PackageCheck size={18} className="text-[#c9a24e]" /> <span className="font-semibold text-sm">Picker · Armado</span></div>
        <button onClick={async () => { await supabase.auth.signOut(); router.replace('/picker/login') }} className="text-white/70 hover:text-white"><LogOut size={18} /></button>
      </header>
      <main className="max-w-lg mx-auto">{children}</main>
    </div>
  )
}
