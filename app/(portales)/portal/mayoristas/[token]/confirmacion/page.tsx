'use client'

import { Suspense, useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle2, Clock, XCircle, RefreshCw, ArrowLeft } from 'lucide-react'

interface PedidoResumen {
  id: string
  numero_pedido: string
  estado: string
  total: number
  mp_status: string | null
}

const clp = (n: number) =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(n)

function ConfirmacionContent() {
  const params = useParams<{ token: string }>()
  const searchParams = useSearchParams()
  const pedidoId = searchParams.get('pedido')
  const statusParam = searchParams.get('status') || searchParams.get('collection_status') || 'pending'

  const [pedido, setPedido] = useState<PedidoResumen | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function cargar() {
      try {
        const res = await fetch(`/api/portal/mayoristas/${params.token}`)
        if (!res.ok) return
        const data = await res.json()
        const encontrado = (data.pedidos || []).find((p: PedidoResumen) => p.id === pedidoId)
        if (!cancelled && encontrado) setPedido(encontrado)
      } catch {
        // sin conexión: se muestra el estado según la URL
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    cargar()
    return () => { cancelled = true }
  }, [params.token, pedidoId])

  // El estado real del pedido (actualizado por el webhook) manda sobre el parámetro de la URL
  const pagado = pedido?.estado === 'pagado' || (!pedido && (statusParam === 'success' || statusParam === 'approved'))
  const fallido = pedido?.estado === 'cancelado' || (!pedido && (statusParam === 'failure' || statusParam === 'rejected'))

  const icono = pagado
    ? <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
    : fallido
      ? <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
      : <Clock className="w-16 h-16 text-amber-500 mx-auto mb-4" />

  const titulo = pagado ? '¡Pago confirmado!' : fallido ? 'Pago no completado' : 'Pago en proceso'
  const detalle = pagado
    ? 'Recibimos tu pago. Tu pedido pasó a preparación y te avisaremos cuando esté despachado.'
    : fallido
      ? 'El pago fue rechazado o cancelado. Puedes volver al portal e intentarlo nuevamente.'
      : 'Mercado Pago aún está procesando tu pago. El estado del pedido se actualizará automáticamente en unos minutos.'

  return (
    <div className="min-h-screen bg-[#f5f0e8] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-8 text-center shadow-lg max-w-sm w-full">
        {loading ? (
          <RefreshCw className="w-16 h-16 text-gray-300 mx-auto mb-4 animate-spin" />
        ) : icono}
        <h1 className="text-xl font-bold text-gray-900 mb-2">{loading ? 'Verificando pago…' : titulo}</h1>
        {!loading && <p className="text-sm text-gray-500 mb-6">{detalle}</p>}
        {pedido && (
          <div className="bg-gray-50 rounded-xl p-4 mb-6 text-left text-sm">
            <div className="flex justify-between mb-1">
              <span className="text-gray-500">Pedido</span>
              <span className="font-semibold text-gray-900">{pedido.numero_pedido}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Total</span>
              <span className="font-semibold text-gray-900">{clp(pedido.total)}</span>
            </div>
          </div>
        )}
        <Link
          href={`/portal/mayoristas/${params.token}`}
          className="w-full inline-flex items-center justify-center gap-2 bg-[#0f0f0f] hover:bg-black text-white font-semibold py-3 px-6 rounded-xl transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver al portal
        </Link>
      </div>
    </div>
  )
}

export default function ConfirmacionPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f5f0e8]" />}>
      <ConfirmacionContent />
    </Suspense>
  )
}
