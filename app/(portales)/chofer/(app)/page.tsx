'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  Sprout, Bell, Package, CheckCircle2, AlertTriangle, Clock, MapPin,
  Navigation, Phone, Flag, Play, Loader2, Boxes, RefreshCw, X, Route,
} from 'lucide-react'
import { supabase } from '@/lib/supabase/client'

interface Driver { id: string; nombre: string }
interface Pedido {
  id: string; numero_pedido: string; estado: string; estado_entrega: string; total: number
  direccion_entrega: string | null; telefono_entrega: string | null; hora_programada: string | null
  bultos: number | null; notas: string | null; lat: number | null; lng: number | null
  mayorista: { nombre: string; empresa: string | null; telefono: string | null } | null
}
interface Ruta { id: string; hora_inicio: string | null }

const ACTIVOS = ['pendiente', 'cargado', 'en_ruta', 'llego_cliente']
const EE_LABEL: Record<string, string> = {
  pendiente: 'Por iniciar', cargado: 'Cargado', en_ruta: 'En ruta',
  llego_cliente: 'En el cliente', entregado: 'Entregado', no_entregado: 'No entregado', incidencia: 'Incidencia',
}
function clp(n: number) { return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n || 0) }
function hhmm(iso: string | null) { return iso ? new Date(iso).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }) : '—' }
function elapsed(fromIso: string | null) {
  if (!fromIso) return '—'
  const ms = Math.max(0, Date.now() - new Date(fromIso).getTime())
  const h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000)
  return `${h}h ${String(m).padStart(2, '0')}m`
}

export default function ChoferDashboard() {
  const router = useRouter()
  const [driver, setDriver] = useState<Driver | null>(null)
  const [noDriver, setNoDriver] = useState(false)
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [incidencias, setIncidencias] = useState(0)
  const [ruta, setRuta] = useState<Ruta | null>(null)
  const [cumpl, setCumpl] = useState<number>(100)
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [welcome, setWelcome] = useState<string | null>(null)
  const [sync, setSync] = useState<Date>(new Date())
  const [, setTick] = useState(0)
  const shownWelcome = useRef(false)

  const cargar = useCallback(async () => {
    const { data: d } = await supabase.from('drivers').select('id, nombre').limit(1).maybeSingle()
    if (!d) { setNoDriver(true); setLoading(false); return }
    setDriver(d)
    const hoy = new Date().toISOString().slice(0, 10)
    const [{ data: peds }, { data: rt }, { count: inc }, { data: cp }] = await Promise.all([
      supabase.from('mayorista_pedidos')
        .select('id, numero_pedido, estado, estado_entrega, total, direccion_entrega, telefono_entrega, hora_programada, bultos, notas, lat, lng, mayorista:mayoristas(nombre, empresa, telefono)')
        .eq('chofer_id', d.id).order('hora_programada', { ascending: true, nullsFirst: false }),
      supabase.from('routes').select('id, hora_inicio').eq('driver_id', d.id).eq('fecha', hoy).eq('estado', 'en_ruta').maybeSingle(),
      supabase.from('incidencias').select('id', { count: 'exact', head: true }).gte('created_at', hoy),
      supabase.rpc('calcular_cumplimiento', { p_driver: d.id, p_fecha: hoy }),
    ])
    setPedidos((peds as unknown as Pedido[]) || [])
    setRuta((rt as Ruta) || null)
    setIncidencias(inc || 0)
    setCumpl(typeof cp === 'number' ? cp : 100)
    setSync(new Date())
    setLoading(false)
    return { d, peds: (peds as unknown as Pedido[]) || [] }
  }, [])

  useEffect(() => {
    cargar().then(res => {
      if (res && !shownWelcome.current) {
        shownWelcome.current = true
        const pend = res.peds.filter(p => ACTIVOS.includes(p.estado_entrega)).length
        const nom = res.d.nombre?.split(' ')[0] || 'chofer'
        setWelcome(pend > 0
          ? `Hola, ${nom}. Hoy tienes ${pend} ${pend === 1 ? 'entrega asignada' : 'entregas asignadas'}. ¡Vamos por una gran ruta!`
          : `Hola, ${nom}. Sin entregas pendientes por ahora. ¡Buen trabajo!`)
      }
    })
  }, [cargar])

  // Tiempo real: cualquier cambio de la Central se refleja sin recargar
  useEffect(() => {
    if (!driver) return
    const ch = supabase.channel('chofer-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mayorista_pedidos', filter: `chofer_id=eq.${driver.id}` }, () => cargar())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'incidencias', filter: `driver_id=eq.${driver.id}` }, () => cargar())
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [driver, cargar])

  useEffect(() => { const t = setInterval(() => setTick(x => x + 1), 20000); return () => clearInterval(t) }, [])

  async function iniciarRuta() { setActing(true); setErr(null); const { error } = await supabase.rpc('iniciar_ruta'); if (error) setErr(error.message); await cargar(); setActing(false) }
  async function finalizarRuta() {
    if (!ruta) return
    setActing(true); setErr(null)
    const { error } = await supabase.rpc('finalizar_ruta', { p_route_id: ruta.id })
    if (error) { setErr(error.message); setActing(false); return }
    await cargar(); setActing(false)
  }
  const pendientes = pedidos.filter(p => ACTIVOS.includes(p.estado_entrega))
  const completadas = pedidos.filter(p => p.estado_entrega === 'entregado')
  const proxima = pendientes.find(p => p.estado_entrega === 'llego_cliente') || pendientes[0]
  const cumplColor = cumpl >= 90 ? '#3b6d11' : cumpl >= 70 ? '#c9a24e' : '#c0392b'
  const cumplBg = cumpl >= 90 ? '#eaf3de' : cumpl >= 70 ? '#faf0d7' : '#fbeaea'

  if (loading) return <div className="min-h-[60vh] flex items-center justify-center"><Loader2 className="w-6 h-6 text-[#1b2a4a] animate-spin" /></div>
  if (noDriver) return (
    <div className="p-6"><div className="bg-white rounded-2xl border border-gray-100 p-6 text-center mt-10">
      <AlertTriangle className="w-10 h-10 text-[#c9a24e] mx-auto mb-3" />
      <p className="font-semibold text-gray-800">Tu usuario aún no es chofer</p>
      <p className="text-sm text-gray-500 mt-1">Pídele a la Central que te asigne como chofer.</p>
    </div></div>
  )

  return (
    <div>
      <div className="bg-[#1b2a4a] text-white px-5 pt-5 pb-4 flex items-center justify-between">
        <span className="flex items-center gap-2"><Sprout className="w-6 h-6 text-[#c9a24e]" /><span className="text-sm font-semibold tracking-wide">NOMMA FOOD</span></span>
        <Bell className="w-5 h-5 text-white/70" />
      </div>

      {welcome && (
        <div className="mx-5 mt-4 bg-[#eef1f6] text-[#1b2a4a] text-sm rounded-xl px-4 py-3 flex items-start gap-2">
          <Sprout className="w-4 h-4 mt-0.5 flex-shrink-0 text-[#c9a24e]" />
          <span className="flex-1">{welcome}</span>
          <button onClick={() => setWelcome(null)}><X className="w-4 h-4 text-[#1b2a4a]/50" /></button>
        </div>
      )}

      <div className="px-5 py-4 space-y-4">
        <div>
          <div className="flex items-center gap-3">
            <span className={`text-xs font-semibold px-3 py-1 rounded-full ${ruta ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{ruta ? 'En ruta' : 'Disponible'}</span>
            {ruta && <span className="text-xs text-gray-500">Ruta iniciada {hhmm(ruta.hora_inicio)}</span>}
          </div>
        </div>

        {/* PRÓXIMA ENTREGA (prioridad) */}
        {ruta && proxima ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <p className="text-xs font-semibold text-[#c9a24e] uppercase tracking-wide mb-2">Próxima entrega</p>
            <div className="flex items-start justify-between">
              <div className="min-w-0">
                <p className="font-bold text-gray-900 text-lg truncate">{proxima.mayorista?.empresa || proxima.mayorista?.nombre || 'Cliente'}</p>
                <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5"><MapPin size={14} />{proxima.direccion_entrega || 'Sin dirección'}</p>
              </div>
              <span className="text-xs font-semibold px-2 py-1 rounded-full bg-[#eef1f6] text-[#1b2a4a] flex-shrink-0">{EE_LABEL[proxima.estado_entrega]}</span>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-3 text-xs text-gray-500">
              <span className="flex items-center gap-1"><Clock size={13} />{hhmm(proxima.hora_programada)}</span>
              <span className="flex items-center gap-1"><Boxes size={13} />{proxima.bultos ?? '—'} bultos</span>
              <span className="flex items-center gap-1 justify-end font-semibold text-gray-700">{clp(proxima.total)}</span>
            </div>
            {proxima.notas && <p className="text-xs text-gray-400 mt-2 italic">Obs: {proxima.notas}</p>}

            <div className="grid grid-cols-2 gap-2 mt-4">
              <a href={proxima.telefono_entrega || proxima.mayorista?.telefono ? `tel:${proxima.telefono_entrega || proxima.mayorista?.telefono}` : undefined}
                className="flex items-center justify-center gap-2 py-3 rounded-xl border border-gray-200 text-gray-700 font-medium text-sm">
                <Phone size={16} className="text-[#1b2a4a]" /> Llamar
              </a>
              <button onClick={() => { const u = proxima.lat && proxima.lng ? `https://www.waze.com/ul?ll=${proxima.lat}%2C${proxima.lng}&navigate=yes` : `https://www.waze.com/ul?q=${encodeURIComponent(proxima.direccion_entrega || '')}&navigate=yes`; window.open(u, '_blank') }}
                className="flex items-center justify-center gap-2 py-3 rounded-xl border border-gray-200 text-gray-700 font-medium text-sm">
                <Navigation size={16} className="text-[#1b2a4a]" /> Waze
              </button>
            </div>
            {proxima.estado_entrega === 'en_ruta' ? (
              <button onClick={() => router.push(`/chofer/entregas/${proxima.id}`)}
                className="w-full mt-2 bg-[#c9a24e] hover:bg-[#b8923f] text-[#1b2a4a] font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2">
                <MapPin size={16} /> Llegué al cliente
              </button>
            ) : (
              <button onClick={() => router.push(`/chofer/entregas/${proxima.id}`)}
                className="w-full mt-2 bg-[#1b2a4a] hover:bg-[#142033] text-white font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2">
                <Play size={16} /> Iniciar entrega
              </button>
            )}
          </div>
        ) : ruta ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center">
            <CheckCircle2 className="w-10 h-10 text-green-600 mx-auto mb-2" />
            <p className="font-semibold text-gray-800">¡Todas las entregas cerradas!</p>
            <p className="text-sm text-gray-500">Puedes finalizar tu ruta.</p>
          </div>
        ) : (
          <button onClick={iniciarRuta} disabled={acting}
            className="w-full bg-[#c9a24e] hover:bg-[#b8923f] text-[#1b2a4a] font-bold py-4 rounded-xl flex items-center justify-center gap-2 disabled:opacity-60 text-base">
            {acting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Route className="w-5 h-5" />} Iniciar ruta
          </button>
        )}

        {/* Cumplimiento */}
        {ruta && (
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-semibold text-gray-700">Cumplimiento de hoy</span>
              {completadas.length > 0
                ? <span className="text-sm font-bold px-2 py-0.5 rounded-full" style={{ color: cumplColor, background: cumplBg }}>{cumpl}%</span>
                : <span className="text-xs text-gray-400">Sin entregas aún</span>}
            </div>
            <div className="h-2.5 rounded-full bg-gray-100 overflow-hidden">
              <div className="h-full rounded-full transition-all" style={{ width: completadas.length > 0 ? `${cumpl}%` : '0%', background: cumplColor }} />
            </div>
            {completadas.length === 0 && <p className="text-[11px] text-gray-400 mt-1.5">Se calcula a medida que cierras entregas.</p>}
          </div>
        )}

        {/* Resumen operativo */}
        <div className="grid grid-cols-2 gap-3">
          <Stat icon={Package} label="Pendientes" value={pendientes.length} />
          <Stat icon={CheckCircle2} label="Completadas" value={completadas.length} tone="green" />
          <Stat icon={AlertTriangle} label="Incidencias" value={incidencias} tone="amber" />
          <Stat icon={Clock} label="Tiempo en ruta" value={ruta ? elapsed(ruta.hora_inicio) : '—'} />
        </div>

        {err && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{err}</p>}

        {ruta && (
          <button onClick={finalizarRuta} disabled={acting}
            className="w-full bg-[#1b2a4a] hover:bg-[#142033] text-white font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2 disabled:opacity-60">
            {acting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Flag className="w-4 h-4" />} Finalizar ruta
          </button>
        )}

        <p className="text-center text-[11px] text-gray-400 flex items-center justify-center gap-1">
          <RefreshCw size={11} /> Última sincronización {hhmm(sync.toISOString())}
        </p>
      </div>
    </div>
  )
}

function Stat({ icon: Icon, label, value, tone }: { icon: React.ElementType; label: string; value: string | number; tone?: 'green' | 'amber' }) {
  const color = tone === 'green' ? 'text-green-600' : tone === 'amber' ? 'text-[#c9a24e]' : 'text-gray-900'
  const iconColor = tone === 'amber' ? 'text-[#c9a24e]' : tone === 'green' ? 'text-green-600' : 'text-[#1b2a4a]'
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-3.5">
      <Icon className={`w-5 h-5 ${iconColor} mb-2`} />
      <p className={`text-xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  )
}
