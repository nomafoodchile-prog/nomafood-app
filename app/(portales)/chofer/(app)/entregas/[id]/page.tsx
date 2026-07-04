'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft, Phone, Navigation, AlertTriangle, Check, Truck,
  CheckCircle2, ShoppingBag, CreditCard, Loader2, Camera, X,
} from 'lucide-react'
import { supabase } from '@/lib/supabase/client'

interface Item { producto_nombre: string; cantidad: number; precio_final: number; unidad: string | null }
interface Pedido {
  id: string; numero_pedido: string; estado: string; total: number
  direccion_entrega: string | null; telefono_entrega: string | null
  hora_programada: string | null; lat: number | null; lng: number | null
  mayorista: { nombre: string; empresa: string | null; telefono: string | null } | null
  items: Item[]
}

const FLOW = ['confirmado', 'pagado', 'en_preparacion', 'despachado', 'entregado']
const STEP_LABEL: Record<string, string> = {
  confirmado: 'Confirmado', pagado: 'Pagado', en_preparacion: 'En preparación',
  despachado: 'Despachado', entregado: 'Entregado',
}
const STEP_ICON: Record<string, React.ElementType> = {
  confirmado: Check, pagado: CreditCard, en_preparacion: ShoppingBag, despachado: Truck, entregado: CheckCircle2,
}
const INCIDENCIAS = [
  ['cliente_ausente', 'Cliente ausente'], ['cliente_rechaza', 'Cliente rechaza pedido'],
  ['direccion_incorrecta', 'Dirección incorrecta'], ['producto_danado', 'Producto dañado'],
  ['vehiculo_averiado', 'Vehículo averiado'], ['problema_transito', 'Problema de tránsito'],
  ['no_entregado', 'No fue posible entregar'], ['otro', 'Otro'],
]
function clp(n: number) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n || 0)
}

async function geo(): Promise<{ lat: number | null; lng: number | null }> {
  return new Promise(res => {
    if (!navigator.geolocation) return res({ lat: null, lng: null })
    navigator.geolocation.getCurrentPosition(
      p => res({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => res({ lat: null, lng: null }), { timeout: 4000 }
    )
  })
}

export default function EntregaDetalle() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [pedido, setPedido] = useState<Pedido | null>(null)
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [showEntrega, setShowEntrega] = useState(false)
  const [showIncidencia, setShowIncidencia] = useState(false)

  const cargar = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('mayorista_pedidos')
      .select('id, numero_pedido, estado, total, direccion_entrega, telefono_entrega, hora_programada, lat, lng, mayorista:mayoristas(nombre, empresa, telefono), items:mayorista_pedido_items(producto_nombre, cantidad, precio_final, unidad)')
      .eq('id', id).maybeSingle()
    setPedido(data as unknown as Pedido)
    setLoading(false)
  }, [id])
  useEffect(() => { cargar() }, [cargar])

  async function despachar() {
    setActing(true); setErr(null)
    const g = await geo()
    const { error } = await supabase.rpc('avanzar_estado_pedido', { p_pedido_id: id, p_nuevo_estado: 'despachado', p_lat: g.lat, p_lng: g.lng })
    if (error) setErr(error.message)
    await cargar(); setActing(false)
  }

  function navegar() {
    if (!pedido) return
    const dest = pedido.lat && pedido.lng
      ? `${pedido.lat},${pedido.lng}`
      : encodeURIComponent(pedido.direccion_entrega || '')
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${dest}`, '_blank')
  }

  if (loading) return <div className="min-h-[60vh] flex items-center justify-center"><Loader2 className="w-6 h-6 text-[#1f3d2c] animate-spin" /></div>
  if (!pedido) return <p className="text-center text-gray-400 py-16">Pedido no encontrado.</p>

  const idx = FLOW.indexOf(pedido.estado)
  const tel = pedido.telefono_entrega || pedido.mayorista?.telefono

  return (
    <div className="pb-4">
      <div className="bg-[#1f3d2c] text-white px-4 py-4 flex items-center gap-3">
        <button onClick={() => router.back()}><ArrowLeft className="w-5 h-5" /></button>
        <h1 className="text-base font-semibold flex-1">Entrega {pedido.numero_pedido}</h1>
      </div>

      {/* Stepper */}
      <div className="bg-white px-3 py-5 flex items-start justify-between">
        {FLOW.map((s, i) => {
          const Icon = STEP_ICON[s]
          const done = i <= idx
          return (
            <div key={s} className="flex-1 flex flex-col items-center relative">
              {i > 0 && <div className={`absolute top-4 right-1/2 w-full h-0.5 ${i <= idx ? 'bg-[#1f3d2c]' : 'bg-gray-200'}`} />}
              <span className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center ${done ? 'bg-[#1f3d2c] text-white' : 'bg-gray-100 text-gray-400'}`}>
                <Icon className="w-4 h-4" />
              </span>
              <span className={`text-[10px] mt-1 text-center leading-tight ${done ? 'text-[#1f3d2c] font-semibold' : 'text-gray-400'}`}>{STEP_LABEL[s]}</span>
            </div>
          )
        })}
      </div>

      <div className="px-5 py-4 space-y-3">
        {/* Cliente */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide">Cliente</p>
              <p className="font-semibold text-gray-900 mt-0.5">{pedido.mayorista?.empresa || pedido.mayorista?.nombre}</p>
              <p className="text-sm text-gray-500">{pedido.direccion_entrega || 'Sin dirección'}</p>
            </div>
            {tel && (
              <a href={`tel:${tel}`} className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center text-[#1f3d2c]">
                <Phone className="w-4 h-4" />
              </a>
            )}
          </div>
        </div>

        {/* Detalles */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 text-sm space-y-2">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Detalle del pedido</p>
          {pedido.items?.map((it, i) => (
            <div key={i} className="flex justify-between">
              <span className="text-gray-600">{it.cantidad} {it.unidad || 'un'} · {it.producto_nombre}</span>
              <span className="font-medium text-gray-900">{clp(it.precio_final * it.cantidad)}</span>
            </div>
          ))}
          <div className="flex justify-between border-t border-gray-100 pt-2 mt-2">
            <span className="text-gray-500">Total</span>
            <span className="font-bold text-gray-900">{clp(pedido.total)}</span>
          </div>
        </div>

        {err && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{err}</p>}

        {/* Acción principal según estado */}
        {pedido.estado === 'en_preparacion' && (
          <button onClick={despachar} disabled={acting}
            className="w-full bg-[#1f3d2c] hover:bg-[#16301f] text-white font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2 disabled:opacity-60">
            {acting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Truck className="w-4 h-4" />} Marcar como despachado
          </button>
        )}
        {pedido.estado === 'despachado' && (
          <button onClick={() => setShowEntrega(true)}
            className="w-full bg-[#1f3d2c] hover:bg-[#16301f] text-white font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4" /> Marcar como entregado
          </button>
        )}
        {pedido.estado === 'entregado' && (
          <div className="w-full bg-green-50 text-green-700 font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4" /> Pedido entregado
          </div>
        )}

        {/* Secundarias */}
        {pedido.estado !== 'entregado' && (
          <div className="flex gap-3">
            <button onClick={navegar} className="flex-1 bg-white border border-gray-200 text-gray-700 font-medium py-2.5 rounded-xl flex items-center justify-center gap-2">
              <Navigation className="w-4 h-4 text-[#1f3d2c]" /> Navegar
            </button>
            <button onClick={() => setShowIncidencia(true)} className="flex-1 bg-white border border-gray-200 text-gray-700 font-medium py-2.5 rounded-xl flex items-center justify-center gap-2">
              <AlertTriangle className="w-4 h-4 text-[#c9a24e]" /> Incidencia
            </button>
          </div>
        )}
      </div>

      {showEntrega && <EntregaModal pedidoId={id} onClose={() => setShowEntrega(false)} onDone={() => { setShowEntrega(false); cargar() }} />}
      {showIncidencia && <IncidenciaModal pedidoId={id} onClose={() => setShowIncidencia(false)} onDone={() => { setShowIncidencia(false); cargar() }} />}
    </div>
  )
}

function EntregaModal({ pedidoId, onClose, onDone }: { pedidoId: string; onClose: () => void; onDone: () => void }) {
  const [receptor, setReceptor] = useState('')
  const [obs, setObs] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function confirmar() {
    if (!receptor.trim()) return setErr('Indica quién recibe.')
    if (!file) return setErr('La foto del respaldo es obligatoria.')
    setSaving(true); setErr(null)
    const g = await geo()
    const path = `${pedidoId}/${Date.now()}-${file.name.replace(/[^a-z0-9.]/gi, '_')}`
    const up = await supabase.storage.from('entregas').upload(path, file)
    if (up.error) { setErr('No se pudo subir la foto: ' + up.error.message); setSaving(false); return }
    const { error } = await supabase.rpc('registrar_entrega', {
      p_pedido_id: pedidoId, p_receptor: receptor, p_foto_url: path, p_obs: obs || null, p_lat: g.lat, p_lng: g.lng,
    })
    if (error) { setErr(error.message); setSaving(false); return }
    onDone()
  }

  return (
    <Sheet title="Confirmar entrega" onClose={onClose}>
      <label className="block">
        <span className="text-xs font-semibold text-gray-500">Recibe</span>
        <input value={receptor} onChange={e => setReceptor(e.target.value)} placeholder="Nombre de quien recibe"
          className="w-full mt-1 px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#1f3d2c]" />
      </label>
      <label className="block">
        <span className="text-xs font-semibold text-gray-500">Foto de la guía/factura firmada <span className="text-red-500">*</span></span>
        <div className="mt-1 flex items-center gap-3">
          <label className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-gray-300 text-sm text-gray-600 cursor-pointer">
            <Camera className="w-4 h-4" /> {file ? 'Cambiar foto' : 'Tomar foto'}
            <input type="file" accept="image/*" capture="environment" className="hidden"
              onChange={e => setFile(e.target.files?.[0] || null)} />
          </label>
          {file && <span className="text-xs text-green-600">✓ {file.name.slice(0, 18)}</span>}
        </div>
      </label>
      <label className="block">
        <span className="text-xs font-semibold text-gray-500">Observaciones (opcional)</span>
        <textarea value={obs} onChange={e => setObs(e.target.value)} rows={2}
          className="w-full mt-1 px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#1f3d2c]" />
      </label>
      {err && <p className="text-sm text-red-600">{err}</p>}
      <button onClick={confirmar} disabled={saving}
        className="w-full bg-[#1f3d2c] text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-60">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Confirmar entrega
      </button>
    </Sheet>
  )
}

function IncidenciaModal({ pedidoId, onClose, onDone }: { pedidoId: string; onClose: () => void; onDone: () => void }) {
  const [tipo, setTipo] = useState('cliente_ausente')
  const [comentario, setComentario] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function reportar() {
    setSaving(true); setErr(null)
    const g = await geo()
    const { error } = await supabase.rpc('reportar_incidencia', {
      p_pedido_id: pedidoId, p_tipo: tipo, p_comentario: comentario || null, p_foto_url: null, p_lat: g.lat, p_lng: g.lng,
    })
    if (error) { setErr(error.message); setSaving(false); return }
    onDone()
  }

  return (
    <Sheet title="Reportar incidencia" onClose={onClose}>
      <label className="block">
        <span className="text-xs font-semibold text-gray-500">Tipo</span>
        <select value={tipo} onChange={e => setTipo(e.target.value)}
          className="w-full mt-1 px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#1f3d2c] bg-white">
          {INCIDENCIAS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </label>
      <label className="block">
        <span className="text-xs font-semibold text-gray-500">Comentario</span>
        <textarea value={comentario} onChange={e => setComentario(e.target.value)} rows={3}
          className="w-full mt-1 px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#1f3d2c]" />
      </label>
      {err && <p className="text-sm text-red-600">{err}</p>}
      <button onClick={reportar} disabled={saving}
        className="w-full bg-[#c9a24e] text-[#1f3d2c] font-semibold py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-60">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <AlertTriangle className="w-4 h-4" />} Enviar a la Central
      </button>
    </Sheet>
  )
}

function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white w-full max-w-md rounded-t-2xl p-5 space-y-3" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        {children}
      </div>
    </div>
  )
}
