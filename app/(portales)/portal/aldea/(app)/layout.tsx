'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'

export default function AldeaAppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let active = true
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      if (!data.session) router.replace('/portal/aldea/login')
      else setReady(true)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session) router.replace('/portal/aldea/login')
    })
    return () => { active = false; sub.subscription.unsubscribe() }
  }, [router])

  if (!ready) {
    return (
      <div className="min-h-screen bg-[#f7f6f2] flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-[#1b2a4a] animate-spin" />
      </div>
    )
  }
  return <div className="min-h-screen bg-[#f7f6f2]">{children}</div>
}
