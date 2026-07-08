'use client'

import { useCallback, useEffect, useState } from 'react'
import { Plus, Trash2, Star, Check, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'

type Row = Record<string, unknown>
const S = (v: unknown) => v === null || v === undefined ? '' : String(v)
const clp = (n: unknown) => { const x = Number(n); return Number.isNaN(x) || !n ? '—' : new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(x) }
const UNIDADES_COMPRA = ['unidad', 'caja', 'saco', 'bolsa', 'rollo', 'pack', 'kilo', 'litro']

export function ProveedoresProducto({ productId }: { productId: string }) {
  const [proveedores, setProveedores] = useState<Row[]>([])
  const [vinculos, setVinculos] = useState<Row[]>([])
  const [nuevo, setNuevo] = useState<Row | null>(null)
  const [nuevoProv, setNuevoProv] = useState<Row | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const cargar = useCallback(async () => {
    const { data: p } = await supabase.from('proveedores').select('id, nombre').eq('activo', true).order('nombre')
    setProveedores((p as Row[]) || [])
    const { data: v } = await supabase.from('proveedor_productos').select('*, proveedor:proveedores(nombre)').eq('product_id', productId).order('es_principal', { ascending: false })
    setVinculos((v as Row[]) || [])
  }, [productId])

  useEffect(() => { cargar() }, [cargar])

  async function api(payload: Row): Promise<Row | null> {
    setError(null)
    const r = await fetch('/api/central/proveedores', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    const d = await r.json() as Row
    if (!r.ok) { setError(S(d.error) || 'Error'); return null }
    return d
  }

  async function vincular() {
    if (!nuevo?.proveedor_id) { setError('Elige un proveedor'); return }
    setSaving(true)
    const ok = await api({ action: 'vincular', product_id: productId, ...nuevo })
    setSaving(false)
    if (ok) { setNuevo(null); cargar() }
  }

  async function crearProveedor() {
    if (!nuevoProv?.nombre) { setError('Nombre del proveedor obligatorio'); return }
    setSaving(true)
    const d = await api({ action: 'crear_proveedor', ...nuevoProv })
    setSaving(false)
    if (d) { setNuevoProv(null); await cargar(); setNuevo({ proveedor_id: S(d.id) }) }
  }

  async function eliminar(id: string) {
    await api({ action: 'eliminar_vinculo', id }); cargar()
  }

  return (
    <div>
      {error && <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700 mb-3">{error}</div>}

      <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-gray-400 text-left text-xs uppercase">
        <th className="py-2 pr-2">Proveedor</th><th className="py-2 pr-2">Código</th><th className="py-2 pr-2">U. compra</th><th className="py-2 pr-2 text-right">Mín.</th><th className="py-2 pr-2 text-right">Precio ref.</th><th className="py-2 pr-2 text-right">Último</th><th className="py-2 pr-2">Plazo</th><th></th>
      </tr></thead><tbody>
        {vinculos.length === 0 ? <tr><td colSpan={8} className="py-4 text-center text-gray-400 text-xs">Sin proveedores. Agrega el primero.</td></tr>
          : vinculos.map(v => (
            <tr key={S(v.id)} className="border-t border-gray-50">
              <td className="py-2 pr-2 font-medium text-[#1a1a1a]">{v.es_principal ? <Star size={12} className="inline text-amber-500 mr-1" /> : null}{S((v.proveedor as Row)?.nombre)}</td>
              <td className="py-2 pr-2 text-gray-500 font-mono text-xs">{S(v.codigo_proveedor) || '—'}</td>
              <td className="py-2 pr-2 text-gray-500">{S(v.unidad_compra) || '—'}</td>
              <td className="py-2 pr-2 text-right">{S(v.cantidad_minima) || '—'}</td>
              <td className="py-2 pr-2 text-right">{clp(v.precio_referencial)}</td>
              <td className="py-2 pr-2 text-right text-gray-500">{clp(v.ultimo_precio)}</td>
              <td className="py-2 pr-2 text-gray-500">{v.plazo_entrega_dias ? `${S(v.plazo_entrega_dias)} d` : '—'}</td>
              <td className="py-2"><button onClick={() => eliminar(S(v.id))} className="text-gray-300 hover:text-red-500"><Trash2 size={14} /></button></td>
            </tr>
          ))}
      </tbody></table></div>

      {!nuevo && !nuevoProv && (
        <div className="flex gap-2 mt-3">
          <button onClick={() => setNuevo({ unidad_compra: 'caja' })} className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 hover:border-[#c9a24e]"><Plus size={14} className="inline" /> Agregar proveedor al producto</button>
          <button onClick={() => setNuevoProv({})} className="text-sm text-gray-500 px-2">+ Crear proveedor nuevo</button>
        </div>
      )}

      {nuevoProv && (
        <div className="mt-3 p-3 border border-gray-100 rounded-lg">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <input className="noma-input" placeholder="Nombre proveedor *" value={S(nuevoProv.nombre)} onChange={e => setNuevoProv({ ...nuevoProv, nombre: e.target.value })} />
            <input className="noma-input" placeholder="Contacto" value={S(nuevoProv.contacto)} onChange={e => setNuevoProv({ ...nuevoProv, contacto: e.target.value })} />
            <input className="noma-input" placeholder="Teléfono" value={S(nuevoProv.telefono)} onChange={e => setNuevoProv({ ...nuevoProv, telefono: e.target.value })} />
          </div>
          <div className="flex gap-2 mt-2"><button onClick={crearProveedor} disabled={saving} className="noma-btn-primary text-sm flex items-center gap-1">{saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Crear y usar</button><button onClick={() => { setNuevoProv(null); setError(null) }} className="text-sm text-gray-500 px-2">Cancelar</button></div>
        </div>
      )}

      {nuevo && (
        <div className="mt-3 p-3 border border-gray-100 rounded-lg">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <select className="noma-input" value={S(nuevo.proveedor_id)} onChange={e => setNuevo({ ...nuevo, proveedor_id: e.target.value })}><option value="">Proveedor…</option>{proveedores.map(p => <option key={S(p.id)} value={S(p.id)}>{S(p.nombre)}</option>)}</select>
            <input className="noma-input" placeholder="Código del proveedor" value={S(nuevo.codigo_proveedor)} onChange={e => setNuevo({ ...nuevo, codigo_proveedor: e.target.value })} />
            <select className="noma-input" value={S(nuevo.unidad_compra)} onChange={e => setNuevo({ ...nuevo, unidad_compra: e.target.value })}>{UNIDADES_COMPRA.map(u => <option key={u} value={u}>{u}</option>)}</select>
            <input className="noma-input" type="number" placeholder="Cantidad mínima" value={S(nuevo.cantidad_minima)} onChange={e => setNuevo({ ...nuevo, cantidad_minima: e.target.value })} />
            <input className="noma-input" type="number" placeholder="Precio referencial" value={S(nuevo.precio_referencial)} onChange={e => setNuevo({ ...nuevo, precio_referencial: e.target.value })} />
            <input className="noma-input" type="number" placeholder="Plazo entrega (días)" value={S(nuevo.plazo_entrega_dias)} onChange={e => setNuevo({ ...nuevo, plazo_entrega_dias: e.target.value })} />
          </div>
          <label className="flex items-center gap-2 mt-2 text-sm text-gray-600"><input type="checkbox" checked={Boolean(nuevo.es_principal)} onChange={e => setNuevo({ ...nuevo, es_principal: e.target.checked })} /> Proveedor principal</label>
          <div className="flex gap-2 mt-2"><button onClick={vincular} disabled={saving} className="noma-btn-primary text-sm flex items-center gap-1">{saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Guardar</button><button onClick={() => { setNuevo(null); setError(null) }} className="text-sm text-gray-500 px-2">Cancelar</button></div>
        </div>
      )}
    </div>
  )
}
