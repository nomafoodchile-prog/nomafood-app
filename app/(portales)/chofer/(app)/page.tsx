'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import {
  Sprout, Bell, Package, CheckCircle2, AlertTriangle, Clock,
  MapPin, Flag, Play, Loader2, ChevronRight,
} from 'lucide-react'
import { supabase } from '@/lib/supabase/client'

interface Driver { id: string; nombre: string }
interface Pedido {
  id: string; numero_pedido: string; estado: string; total: number
  direccion_entrega: string | null; hora_programada: string | null
  mayorista: { nombre: string; empresa: string | null } | null
}
interface Ruta { id: string; hora_inicio: string | null }

const PENDIENTES = ['confirmado', 'pagado', 'en_preparacion', 'despachado']

function clp(n: number) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n || 0)
}
function hhmm(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })
}
function elapsed(fromIso: string | null) {
  if (!fromIso) return '0h 00m'
  const ms = Date.now() - new Date(fromIso).getTime()
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  return `${h}h ${String(m).padStart(2, '0')}m`
}

export default function ChoferDashboard() {
  const [driver, setDriver] = useState<Driver | null>(null)
  const [noDriver, setNoDriver] = useState(false)
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [incidencias, setIncidencias] = useState(0)
  const [ruta, setRuta] = useState<Ruta | null>(null)
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState(false)
  const [, setTick] = useState(0)

  const cargar = useCallback(async () => {
    setLoading(true)
    const { data: d } = await supabase.from('drivers').select('id, nombre').limit(1).maybeSingle()
    if (!d) { setNoDriver(true); setLoading(false); return }
    setDriver(d)

    const hoy = new Date().toISOString().slice(0, 10)
    const [{ data: peds }, { data: rt }, { count: inc }] = await Promise.all([
      supabase.from('mayorista_pedidos')
        .select('id, numero_pedido, estado, total, direccion_entrega, hora_programada, mayorista:mayoristas(nombre, empresa)')
        .eq('chofer_id', d.id).order('hora_programada', { ascending: true, nullsFirst: false }),
      supabase.from('routes').select('id, hora_inicio')
        .eq('driver_id', d.id).eq('fecha', hoy).eq('estado', 'en_ruta').maybeSingle(),
      supabase.from('incidencias').select('id', { count: 'exact', head: true })
        .gte('created_at', hoy),
    ])
    setPedidos((peds as unknown as Pedido[]) || [])
    setRuta((rt as Ruta) || null)
    setIncidencias(inc || 0)
    setLoading(false)
  }, [])

  useEffect(() => { cargar() }, [cargar])
  useEffect(() => {
    const t = setInterval(() => setTick(x => x + 1), 30000)
    return () => clearInterval(t)
  }, [])

  async function iniciarRuta() {
    setActing(true)
    await supabase.rpc('iniciar_ruta')
    await cargar()
    setActing(false)
  }
  async function finalizarRuta() {
    if (!ruta) return
    setActing(true)
    await supabase.rpc('finalizar_ruta', { p_route_id: ruta.id })
    await cargar()
    setActing(false)
  }

  const pendientes = pedidos.filter(p => PENDIENTES.includes(p.estado))
  const completadas = pedidos.filter(p => p.estado === 'entregado')
  const proxima = pendientes[0]
  const fecha = new Date().toLocaleDateString('es-CL', { weekday: 'long', day: '2-digit', month: 'long' })

  if (loading) {
    return <div className="min-h-[60vh] flex items-center justify-center"><Loader2 className="w-6 h-6 text-[#1f3d2c] animate-spin" /></div>
  }

  if (noDriver) {
    return (
      <div className="p-6">
        <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center mt-10">
          <AlertTriangle className="w-10 h-10 text-[#c9a24e] mx-auto mb-3" />
          <p className="font-semibold text-gray-800">Tu usuario aún no es chofer</p>
          <p className="text-sm text-gray-500 mt-1">Pídele a la Central que te asigne como chofer para ver tus despachos.</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="bg-[#1f3d2c] text-white px-5 pt-5 pb-4">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Sprout className="w-6 h-6 text-[#c9a24e]" />
            <span className="text-sm font-semibold tracking-wide">NOMMA FOOD</span>
          </span>
          <Bell className="w-5 h-5 text-white/70" />
        </div>
      </div>

      <div className="px-5 py-5 space-y-4">
        {/* Greeting + estado */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">¡Hola, {driver?.nombre?.split(' ')[0]}!</h1>
          <p className="text-sm text-gray-500 capitalize">{fecha}</p>
          <div className="mt-3 flex items-center gap-3">
            <span className={`text-xs font-semibold px-3 py-1 rounded-full ${ruta ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
              {ruta ? 'En ruta' : 'Disponible'}
            </span>
            {ruta && <span className="text-xs text-gray-500">Ruta iniciada: {hhmm(ruta.hora_inicio)}</span>}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <Stat icon={Package} label="Pendientes" value={pendientes.length} />
          <Stat icon={CheckCircle2} label="Completadas hoy" value={completadas.length} tone="green" />
          <Stat icon={AlertTriangle} label="Incidencias" value={incidencias} tone="amber" />
          <Stat icon={Clock} label="Tiempo en ruta" value={ruta ? elapsed(ruta.hora_inicio) : '—'} />
        </div>

        {/* Próxima entrega */}
        {proxima && (
          <Link href={`/chofer/entregas/${proxima.id}`} className="block bg-white rounded-2xl border border-gray-100 p-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Próxima entrega</p>
            <div className="flex items-center gap-3">
              <span className="w-11 h-11 rounded-full bg-[#eef3ee] flex items-center justify-center flex-shrink-0">
                <MapPin className="w-5 h-5 text-[#1f3d2c]" />
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 truncate">{proxima.mayorista?.empresa || proxima.mayorista?.nombre || 'Cliente'}</p>
                <p className="text-xs text-gray-500 truncate">{proxima.direccion_entrega || 'Sin dirección'}</p>
              </div>
              {proxima.hora_programada && <span className="text-xs text-gray-500">{hhmm(proxima.hora_programada)}</span>}
              <ChevronRight className="w-4 h-4 text-gray-300" />
            </div>
          </Link>
        )}

        {/* Resumen */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 text-sm">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Resumen del día</p>
          <Row label="Entregas asignadas" value={String(pedidos.length)} />
          <Row label="Completadas" value={String(completadas.length)} />
          <Row label="Restantes" value={String(pendientes.length)} last />
        </div>

        {/* Iniciar / Finalizar ruta */}
        {ruta ? (
          <button onClick={finalizarRuta} disabled={acting}
            className="w-full bg-[#1f3d2c] hover:bg-[#16301f] text-white font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2 disabled:opacity-60">
            {acting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Flag className="w-4 h-4" />} Finalizar ruta
          </button>
        ) : (
          <button onClick={iniciarRuta} disabled={acting}
            className="w-full bg-[#c9a24e] hover:bg-[#b8923f] text-[#1f3d2c] font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2 disabled:opacity-60">
            {acting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />} Iniciar ruta
          </button>
        )}
      </div>
    </div>
  )
}

function Stat({ icon: Icon, label, value, tone }: { icon: React.ElementType; label: string; value: string | number; tone?: 'green' | 'amber' }) {
  const color = tone === 'green' ? 'text-green-600' : tone === 'amber' ? 'text-[#c9a24e]' : 'text-gray-900'
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-3.5">
      <Icon className={`w-5 h-5 ${tone === 'amber' ? 'text-[#c9a24e]' : tone === 'green' ? 'text-green-600' : 'text-[#1f3d2c]'} mb-2`} />
      <p className={`text-xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  )
}

function Row({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <div className={`flex justify-between py-2 ${last ? '' : 'border-b border-gray-50'}`}>
      <span className="text-gray-500">{label}</span>
      <span className="font-semibold text-gray-900">{value}</span>
    </div>
  )
}
