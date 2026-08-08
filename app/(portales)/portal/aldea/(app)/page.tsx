'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sprout, LogOut, Loader2, ChevronDown, BarChart3, Package, PlusCircle, Truck, Receipt, AlertTriangle, MessageCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'

interface Sesion {
  organizacion: { id: string; nombre: string } | null
  rol: 'admin_general' | 'encargado_local'
  rol_label: string
  usuario: { nombre: string; email: string }
  sucursales: { id: string; nombre: string }[]
}

const MODULOS = [
  { k: 'stock', label: 'Mi Stock', icon: Package, desc: 'Inventario del local' },
  { k: 'pedir', label: 'Nueva solicitud', icon: PlusCircle, desc: 'Pedir reposición' },
  { k: 'pedidos', label: 'Pedidos', icon: Truck, desc: 'Seguimiento y mapa' },
  { k: 'facturas', label: 'Facturación', icon: Receipt, desc: 'Facturas por pagar' },
  { k: 'incidencias', label: 'Incidencias', icon: AlertTriangle, desc: 'Reportes y consultas' },
  { k: 'consultas', label: 'Consultas', icon: MessageCircle, desc: 'Preguntas a NOMMA' },
]

export default function AldeaDashboard() {
  const router = useRouter()
  const [ses, setSes] = useState<Sesion | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [sucursal, setSucursal] = useState<string>('')

  useEffect(() => {
    fetch('/api/portal/aldea/session')
      .then(async r => {
        const d = await r.json()
        if (!r.ok) { setError(d.error || 'No autorizado'); return }
        setSes(d)
        if (d.sucursales?.length) setSucursal(d.sucursales[0].id)
      })
      .catch(() => setError('Error de conexión'))
      .finally(() => setLoading(false))
  }, [])

  async function salir() { await supabase.auth.signOut(); router.replace('/portal/aldea/login') }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-6 h-6 text-[#1b2a4a] animate-spin" /></div>

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-5">
        <div className="bg-white rounded-2xl shadow p-7 text-center max-w-sm">
          <Sprout className="w-8 h-8 text-[#c9a24e] mx-auto mb-3" />
          <p className="font-semibold text-[#16233f] mb-1">Acceso no disponible</p>
          <p className="text-sm text-gray-500 mb-4">{error}</p>
          <button onClick={salir} className="text-sm font-semibold text-[#c9a24e]">Cambiar de cuenta</button>
        </div>
      </div>
    )
  }

  const esAdmin = ses?.rol === 'admin_general'
  const sucNombre = ses?.sucursales.find(s => s.id === sucursal)?.nombre || '—'

  return (
    <div className="max-w-md mx-auto pb-16">
      {/* Header */}
      <header className="bg-[#16233f] text-white px-5 pt-6 pb-5 rounded-b-3xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-[#c9a24e] text-[#16233f] grid place-items-center font-bold" style={{ fontFamily: 'Georgia, serif' }}>A</div>
            <div>
              <p className="font-bold text-sm leading-tight">{ses?.organizacion?.nombre || 'Aldea Vegetal'}</p>
              <p className="text-[11px] text-white/60">Portal de abastecimiento</p>
            </div>
          </div>
          <button onClick={salir} className="w-9 h-9 rounded-lg bg-white/10 grid place-items-center" title="Salir"><LogOut size={16} /></button>
        </div>

        <div className="mt-4 flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-[#c9a24e]/20 text-[#c9a24e]">{ses?.rol_label}</span>
          {ses && ses.sucursales.length > 0 && (
            esAdmin ? (
              <div className="inline-flex items-center gap-1.5 bg-white/10 border border-white/15 rounded-full pl-3 pr-2 py-1">
                <span className="text-xs">📍</span>
                <select value={sucursal} onChange={e => setSucursal(e.target.value)} className="bg-transparent text-white text-xs font-semibold outline-none">
                  {ses.sucursales.map(s => <option key={s.id} value={s.id} className="text-black">{s.nombre}</option>)}
                </select>
                <ChevronDown size={13} className="text-white/60" />
              </div>
            ) : (
              <span className="inline-flex items-center gap-1.5 bg-white/10 border border-white/15 rounded-full px-3 py-1 text-xs font-semibold">📍 {sucNombre}</span>
            )
          )}
        </div>
        <p className="text-xs text-white/70 mt-3">Hola, {ses?.usuario.nombre.split(' ')[0]} 👋</p>
      </header>

      {/* Aviso fundación */}
      <div className="px-5 pt-4">
        <div className="bg-[#faf7ef] border border-[#e7d4a6] rounded-xl p-3.5 text-sm text-[#5a4a24]">
          <b>Portal en construcción.</b> La estructura corporativa ya está lista{esAdmin ? ` (ves las ${ses?.sucursales.length} sucursales)` : ''}. Los módulos se irán activando por partes.
        </div>
      </div>

      {/* Módulos (placeholder) */}
      <div className="px-5 pt-4">
        <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400 mb-2">Módulos</p>
        <div className="grid grid-cols-2 gap-3">
          {MODULOS.map(m => (
            <div key={m.k} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm opacity-90">
              <div className="w-9 h-9 rounded-xl bg-[#f5f0e8] text-[#c9a24e] grid place-items-center mb-2"><m.icon size={18} /></div>
              <p className="font-semibold text-sm text-[#1a1a1a]">{m.label}</p>
              <p className="text-[11px] text-gray-400">{m.desc}</p>
              <span className="inline-block mt-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-400">Próximamente</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
