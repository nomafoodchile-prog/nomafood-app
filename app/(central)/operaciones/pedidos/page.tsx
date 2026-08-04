'use client'

import { useCallback, useEffect, useState } from 'react'
import { Search, Filter, Loader2, RefreshCw, PackageOpen } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'

interface Pedido {
  id: string
  numero_pedido: string
  estado: string
  estado_entrega: string | null
  total: number
  created_at: string
  fecha_entrega_req: string | null
  mayorista: { nombre: string | null; empresa: string | null } | null
}

const ESTADOS: { key: string; label: string }[] = [
  { key: 'todos', label: 'Todos' },
  { key: 'confirmado', label: 'Confirmado' },
  { key: 'pagado', label: 'Pagado' },
  { key: 'en_preparacion', label: 'En preparación' },
  { key: 'listo_para_despacho', label: 'Listo' },
  { key: 'asignado', label: 'En despacho' },
  { key: 'entregado', label: 'Entregado' },
  { key: 'cancelado', label: 'Cancelado' },
]

function clp(n: number) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n || 0)
}
function fecha(iso: string | null) {
  return iso ? new Date(iso).toLocaleDateString('es-CL') : '—'
}
function badge(estado: string): { t: string; c: string } {
  const map: Record<string, { t: string; c: string }> = {
    borrador:            { t: 'Borrador',       c: 'bg-gray-100 text-gray-600' },
    confirmado:          { t: 'Confirmado',     c: 'bg-blue-100 text-blue-700' },
    pagado:              { t: 'Pagado',         c: 'bg-green-100 text-green-700' },
    en_preparacion:      { t: 'En preparación', c: 'bg-amber-100 text-amber-700' },
    listo_para_despacho: { t: 'Listo',          c: 'bg-amber-100 text-amber-700' },
    asignado:            { t: 'En despacho',    c: 'bg-blue-100 text-blue-700' },
    entregado:           { t: 'Entregado',      c: 'bg-green-100 text-green-700' },
    cancelado:           { t: 'Cancelado',      c: 'bg-red-100 text-red-700' },
  }
  return map[estado] || { t: estado, c: 'bg-gray-100 text-gray-600' }
}

export default function PedidosPage() {
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch] = useState('')
  const [filtro, setFiltro] = useState('todos')

  const cargar = useCallback(async () => {
    const { data } = await supabase
      .from('mayorista_pedidos')
      .select('id, numero_pedido, estado, estado_entrega, total, created_at, fecha_entrega_req, mayorista:mayoristas(nombre, empresa)')
      .order('created_at', { ascending: false })
      .limit(200)
    setPedidos((data as unknown as Pedido[]) || [])
    setLoading(false)
    setRefreshing(false)
  }, [])

  useEffect(() => { cargar() }, [cargar])
  useEffect(() => {
    const ch = supabase.channel('central-pedidos')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mayorista_pedidos' }, () => cargar())
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [cargar])

  const filtrados = pedidos.filter(p => {
    const cli = p.mayorista?.empresa || p.mayorista?.nombre || ''
    const matchSearch = !search
      || p.numero_pedido?.toLowerCase().includes(search.toLowerCase())
      || cli.toLowerCase().includes(search.toLowerCase())
    const matchFiltro = filtro === 'todos' || p.estado === filtro
    return matchSearch && matchFiltro
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1a1a1a]">Pedidos</h1>
          <p className="text-sm text-gray-500 mt-0.5">{filtrados.length} pedidos reales · en vivo</p>
        </div>
        <button
          onClick={() => { setRefreshing(true); cargar() }}
          className="flex items-center gap-2 text-sm text-gray-600 border border-gray-200 rounded-lg px-3 py-2 hover:border-[#c9a24e] transition-colors"
        >
          <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
          Actualizar
        </button>
      </div>

      {/* Filtros */}
      <div className="noma-card !p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por código o cliente..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="noma-input pl-9"
            />
          </div>
          <div className="flex items-center gap-1 bg-gray-50 rounded-lg p-1 overflow-x-auto">
            <Filter size={13} className="text-gray-400 flex-shrink-0 ml-1" />
            {ESTADOS.map(s => (
              <button
                key={s.key}
                onClick={() => setFiltro(s.key)}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap transition-all ${
                  filtro === s.key ? 'bg-[#c9a24e] text-[#1b2a4a]' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="noma-card !p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100 bg-gray-50/50">
              <tr>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wide">Código</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wide">Cliente</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wide hidden md:table-cell">Entrega</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wide">Estado</th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wide">Total</th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wide">Orden</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={6} className="py-12 text-center"><Loader2 className="w-5 h-5 text-[#1b2a4a] animate-spin mx-auto" /></td></tr>
              ) : filtrados.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-400 text-sm">
                    <PackageOpen className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                    No hay pedidos {filtro !== 'todos' ? 'con ese estado' : 'todavía'}.
                  </td>
                </tr>
              ) : (
                filtrados.map(p => {
                  const e = badge(p.estado)
                  const cli = p.mayorista?.empresa || p.mayorista?.nombre || '—'
                  return (
                    <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-3 px-4">
                        <span className="font-mono text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{p.numero_pedido}</span>
                      </td>
                      <td className="py-3 px-4 font-medium text-[#1a1a1a]">{cli}</td>
                      <td className="py-3 px-4 text-gray-500 text-xs hidden md:table-cell">{fecha(p.fecha_entrega_req)}</td>
                      <td className="py-3 px-4">
                        <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${e.c}`}>{e.t}</span>
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-[#1a1a1a]">{clp(p.total)}</td>
                      <td className="py-3 px-4 text-right">
                        <a href={`/orden-compra/${p.id}`} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-[#c9a24e] hover:underline whitespace-nowrap">Orden compra ↗</a>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
