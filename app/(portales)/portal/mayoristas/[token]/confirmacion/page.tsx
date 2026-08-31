'use client'

import { Suspense, useEffect, useState, type CSSProperties } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { Sprout, CheckCircle2, Clock, XCircle, Loader2, ArrowRight, ShoppingBag } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'

const TEMAS = {
  nomma:  { name: 'NOMMA FOOD',       vars: { '--c-primary': '#16233f', '--c-primary-h': '#142033', '--c-accent': '#c9a24e', '--c-cream': '#f6f3ec' } },
  brotes: { name: 'BROTES ASIÁTICOS', vars: { '--c-primary': '#143026', '--c-primary-h': '#0f2419', '--c-accent': '#e6b23f', '--c-cream': '#f1e4c9' } },
} as const

type Estado = 'verificando' | 'pagado' | 'pendiente' | 'fallido'

function ConfirmacionInner() {
  const params = useParams<{ token: string }>()
  const search = useSearchParams()
  const router = useRouter()
  const [estado, setEstado] = useState<Estado>('verificando')
  const [marcaKey, setMarcaKey] = useState<'nomma' | 'brotes'>('nomma')

  useEffect(() => {
    let cancel = false
    if (params?.token) {
      supabase.from('mayoristas').select('marca').eq('token', params.token).maybeSingle()
        .then(({ data }) => { if (!cancel && (data as { marca?: string } | null)?.marca === 'Brotes Asiáticos') setMarcaKey('brotes') })
    }
    return () => { cancel = true }
  }, [params?.token])

  const t = TEMAS[marcaKey]
  const vars = t.vars as CSSProperties

  const pedidoId = search.get('pedido') || search.get('external_reference') || ''
  const statusUrl = search.get('status') || search.get('collection_status') || ''
  const paymentId = search.get('payment_id') || search.get('collection_id') || ''

  useEffect(() => {
    let cancelado = false

    async function verificar(intento = 0) {
      try {
        const r = await fetch('/api/portal/mayoristas/verificar-pago', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pedido_id: pedidoId, payment_id: paymentId }),
        })
        const d = await r.json()
        if (cancelado) return
        if (d.estado === 'pagado') { setEstado('pagado'); return }
        if (d.estado === 'cancelado') { setEstado('fallido'); return }
        // Mercado Pago puede tardar unos segundos en dejar el pago disponible: reintentamos
        if (intento < 4) { setTimeout(() => verificar(intento + 1), 2000); return }
        setEstado(statusUrl === 'approved' ? 'pagado' : 'pendiente')
      } catch {
        if (!cancelado) setEstado(statusUrl === 'approved' ? 'pagado' : 'pendiente')
      }
    }

    if (statusUrl === 'failure' || statusUrl === 'rejected') { setEstado('fallido'); return }
    if (pedidoId) verificar()
    else setEstado('pendiente')

    return () => { cancelado = true }
  }, [pedidoId, paymentId, statusUrl])

  const volverCatalogo = () => router.replace(`/portal/mayoristas/${params.token}`)
  const irCuenta = () => router.replace('/portal/mayoristas/cuenta')

  return (
    <div className="min-h-screen bg-[var(--c-cream)] flex flex-col" style={vars}>
      <header className="bg-[var(--c-primary)] text-white px-5 py-4 flex items-center gap-2">
        <Sprout className="w-6 h-6 text-[var(--c-accent)]" />
        <span className="font-bold tracking-wide text-sm">{t.name}</span>
      </header>

      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white rounded-3xl border border-gray-100 shadow-sm p-8 text-center">
          {estado === 'verificando' && (
            <>
              <Loader2 className="w-12 h-12 text-[var(--c-primary)] animate-spin mx-auto" />
              <h1 className="mt-5 text-lg font-bold text-[var(--c-primary)]">Confirmando tu pago…</h1>
              <p className="mt-2 text-sm text-gray-500">Estamos verificando tu pago con Mercado Pago. Un momento por favor.</p>
            </>
          )}

          {estado === 'pagado' && (
            <>
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-9 h-9 text-green-600" />
              </div>
              <h1 className="mt-5 text-xl font-bold text-[var(--c-primary)]">¡Pago confirmado!</h1>
              <p className="mt-2 text-sm text-gray-600">Tu pedido fue recibido y ya está en preparación. Te avisaremos cuando salga a despacho.</p>
              <button onClick={irCuenta} className="mt-6 w-full bg-[var(--c-primary)] hover:bg-[var(--c-primary-h)] text-white font-semibold rounded-xl py-3 flex items-center justify-center gap-2 transition-colors">
                Ver mis pedidos <ArrowRight size={18} className="text-[var(--c-accent)]" />
              </button>
              <button onClick={volverCatalogo} className="mt-3 w-full text-[var(--c-accent)] font-medium text-sm underline">Seguir comprando</button>
            </>
          )}

          {estado === 'pendiente' && (
            <>
              <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto">
                <Clock className="w-9 h-9 text-amber-600" />
              </div>
              <h1 className="mt-5 text-xl font-bold text-[var(--c-primary)]">Pago en proceso</h1>
              <p className="mt-2 text-sm text-gray-600">Tu pago se está procesando. En cuanto se acredite, tu pedido pasará a preparación automáticamente.</p>
              <button onClick={irCuenta} className="mt-6 w-full bg-[var(--c-primary)] hover:bg-[var(--c-primary-h)] text-white font-semibold rounded-xl py-3 flex items-center justify-center gap-2 transition-colors">
                Ver mis pedidos <ArrowRight size={18} className="text-[var(--c-accent)]" />
              </button>
            </>
          )}

          {estado === 'fallido' && (
            <>
              <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto">
                <XCircle className="w-9 h-9 text-red-600" />
              </div>
              <h1 className="mt-5 text-xl font-bold text-[var(--c-primary)]">El pago no se completó</h1>
              <p className="mt-2 text-sm text-gray-600">No pudimos confirmar tu pago. Puedes intentarlo nuevamente desde el catálogo.</p>
              <button onClick={volverCatalogo} className="mt-6 w-full bg-[var(--c-primary)] hover:bg-[var(--c-primary-h)] text-white font-semibold rounded-xl py-3 flex items-center justify-center gap-2 transition-colors">
                <ShoppingBag size={18} className="text-[var(--c-accent)]" /> Volver al catálogo
              </button>
            </>
          )}
        </div>
      </main>
    </div>
  )
}

export default function ConfirmacionPago() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f6f3ec] flex items-center justify-center"><Loader2 className="w-6 h-6 text-gray-400 animate-spin" /></div>}>
      <ConfirmacionInner />
    </Suspense>
  )
}
